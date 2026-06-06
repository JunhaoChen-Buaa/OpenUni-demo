import "server-only";

import path from "node:path";
import { pathToFileURL } from "node:url";
import type {
  CollegeRuleFacts,
  RuleEvidenceByField,
  RuleEvidenceFieldKey,
  RuleFieldEvidence,
} from "@/lib/college-rule-types";
import {
  getMiniMaxConfig,
  requestMiniMaxChat,
  type MiniMaxMessage,
} from "@/lib/minimax-client";

const MAX_MODEL_CONTEXT_LENGTH = 9_000;
const MAX_EVIDENCE_EXCERPTS = 6;

let cachedPdfJsRuntime: Promise<PdfJsRuntime> | null = null;

type RuleExtractionSource = "model" | "fallback";

type RuleExtractionResult = {
  facts: CollegeRuleFacts;
  source: RuleExtractionSource;
  textLength: number;
};

type PdfJsTextItem = {
  str?: string;
  hasEOL?: boolean;
};

type PdfJsPage = {
  getTextContent: (options?: {
    disableNormalization?: boolean;
    includeMarkedContent?: boolean;
  }) => Promise<{ items: PdfJsTextItem[] }>;
  cleanup?: () => void;
};

type PdfJsDocument = {
  numPages: number;
  getPage: (pageNumber: number) => Promise<PdfJsPage>;
  destroy?: () => Promise<void>;
};

type PdfJsLoadingTask = {
  promise: Promise<PdfJsDocument>;
  destroy?: () => Promise<void>;
};

type PdfJsRuntime = {
  getDocument: (source: Record<string, unknown>) => PdfJsLoadingTask;
  VerbosityLevel?: {
    ERRORS?: number;
  };
};

type PdfJsWorkerModule = {
  WorkerMessageHandler?: unknown;
};

type ExtractedPage = {
  pageNumber: number;
  text: string;
  lines: string[];
};

type SectionChunk = {
  title: string;
  pages: number[];
  lines: string[];
  text: string;
};

type TableBlock = {
  pages: number[];
  lines: string[];
  text: string;
};

type RuleExtractionContext = {
  fileName: string;
  pages: ExtractedPage[];
  combinedText: string;
  sections: SectionChunk[];
  sportsSection: SectionChunk | null;
  sportsTableBlocks: TableBlock[];
};

type RuleFieldCandidate<T> = {
  value: T;
  pages: number[];
  excerpt: string;
  confidence: number;
};

function normalizeText(text: string) {
  return text
    .replace(/\r/g, "")
    .replace(/\u0000/g, "")
    .replace(/\u3000/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/(?<=[\u4e00-\u9fff])\s+(?=[\u4e00-\u9fff])/gu, "")
    .replace(/(?<=[\u4e00-\u9fff])\s+(?=[，。；：、（）()《》【】“”‘’])/gu, "")
    .replace(/(?<=[，。；：、（）()《》【】“”‘’])\s+(?=[\u4e00-\u9fff])/gu, "")
    .replace(/(?<=\d)\s+(?=[年月日号分%])/g, "")
    .replace(/(?<=[年月日号第])\s+(?=\d)/g, "")
    .replace(/(?<=[A-Za-z])\s+(?=\d)/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizeLine(text: string) {
  return normalizeText(text).replace(/\n+/g, " ").trim();
}

function uniqueItems(items: Array<string | null | undefined>) {
  return [...new Set(items.map((item) => item?.trim()).filter(Boolean) as string[])];
}

function uniqueNumbers(values: number[]) {
  return [...new Set(values)].sort((a, b) => a - b);
}

function normalizeLookupValue(value: string) {
  return value.replace(/\s+/g, "");
}

function truncateText(text: string, maxLength = 160) {
  return text.length > maxLength ? `${text.slice(0, maxLength)}…` : text;
}

function getTextLines(text: string) {
  return normalizeText(text)
    .split(/\n+/)
    .map((line) => normalizeLine(line))
    .filter(Boolean);
}

function createEmptyFacts(fileName: string): CollegeRuleFacts {
  return {
    rule_title: fileName.replace(/\.pdf$/i, ""),
    college_name: null,
    rule_version_or_date: null,
    rule_type: null,
    evaluation_dimensions: [],
    total_score_formula_summary: null,
    academic_weight_percent: null,
    comprehensive_quality_weight_percent: null,
    annual_bottomline_required: null,
    recommendation_bottomline_required: null,
    sports_module_included: null,
    sports_scoring_rules_present: null,
    sports_score_is_explicitly_quantified: null,
    sports_personal_competition_rules: [],
    sports_team_competition_rules: [],
    sports_examples_or_special_cases: [],
    competition_related_bonus: null,
    scholarship_related: null,
    research_related: null,
    volunteer_related: null,
    student_work_related: null,
    applicable_grades: [],
    key_deadlines: [],
    evidence_excerpts: [],
    evidence_by_field: {},
    extraction_confidence: null,
    unknown_fields: [],
    extracted_at: new Date().toISOString(),
    sports_module_score: null,
    sports_module_score_known: false,
    known_unknown_flags: [],
  };
}

function addEvidence(
  evidenceByField: RuleEvidenceByField,
  field: RuleEvidenceFieldKey,
  evidence: RuleFieldEvidence | null,
) {
  if (!evidence || !evidence.evidence_excerpt.trim()) {
    return;
  }

  const current = evidenceByField[field] ?? [];
  const exists = current.some(
    (item) =>
      item.evidence_excerpt === evidence.evidence_excerpt &&
      item.source_pages.join(",") === evidence.source_pages.join(","),
  );

  if (!exists) {
    evidenceByField[field] = [...current, evidence];
  }
}

function pickFirstEvidenceText(evidenceByField: RuleEvidenceByField) {
  return uniqueItems(
    Object.values(evidenceByField)
      .flatMap((items) => items ?? [])
      .map((item) => truncateText(item.evidence_excerpt)),
  ).slice(0, MAX_EVIDENCE_EXCERPTS);
}

function extractRawTextFallback(pdfBuffer: Buffer) {
  const text = normalizeText(pdfBuffer.toString("utf8"));
  const lines = getTextLines(text).filter((line) => /[\u4e00-\u9fffA-Za-z0-9]/.test(line));
  return normalizeText(lines.slice(0, 240).join("\n"));
}

function isSectionHeading(line: string) {
  return /^(总则|附录|第[一二三四五六七八九十]+章.+|（[一二三四五六七八九十]+）.+)$/.test(line);
}

function detectSections(pages: ExtractedPage[]) {
  const sections: SectionChunk[] = [];
  let current: SectionChunk | null = null;

  const pushCurrent = () => {
    if (!current || current.lines.length === 0) {
      return;
    }

    sections.push({
      ...current,
      pages: uniqueNumbers(current.pages),
      text: current.lines.join("\n"),
    });
  };

  for (const page of pages) {
    for (const line of page.lines) {
      if (isSectionHeading(line)) {
        pushCurrent();
        current = {
          title: line,
          pages: [page.pageNumber],
          lines: [line],
          text: "",
        };
        continue;
      }

      if (!current) {
        current = {
          title: "全文",
          pages: [page.pageNumber],
          lines: [],
          text: "",
        };
      }

      current.pages.push(page.pageNumber);
      current.lines.push(line);
    }
  }

  pushCurrent();
  return sections;
}

function isTableLikeLine(line: string) {
  const numericCount = (line.match(/\d+(?:\.\d+)?/g) ?? []).length;
  return (
    numericCount >= 2 ||
    /(第一名|第二名|第三名|第四名|第五名|第六名|第七名|第八名|未取得名次|参与|加分项目|获奖等级|分\/人|分\/学期)/.test(
      line,
    )
  );
}

function detectTableBlocks(section: SectionChunk | null) {
  if (!section) {
    return [];
  }

  const blocks: TableBlock[] = [];
  let currentLines: string[] = [];

  const pushCurrent = () => {
    if (currentLines.length < 2) {
      currentLines = [];
      return;
    }

    blocks.push({
      pages: section.pages,
      lines: [...currentLines],
      text: currentLines.join("\n"),
    });
    currentLines = [];
  };

  for (const line of section.lines) {
    if (isTableLikeLine(line)) {
      currentLines.push(line);
      continue;
    }

    if (currentLines.length > 0) {
      pushCurrent();
    }
  }

  pushCurrent();
  return blocks;
}

function getSectionByKeyword(sections: SectionChunk[], keyword: string) {
  return sections.find((section) => section.title.includes(keyword)) ?? null;
}

function buildSectionFromKeywords(pages: ExtractedPage[], startKeyword: string, endKeyword?: string) {
  const startIndex = pages.findIndex((page) => page.text.includes(startKeyword));
  if (startIndex === -1) {
    return null;
  }

  const collectedPages: number[] = [];
  const chunks: string[] = [];

  for (let index = startIndex; index < pages.length; index += 1) {
    const page = pages[index];
    let pageText = page.text;

    if (index === startIndex) {
      const startOffset = pageText.indexOf(startKeyword);
      if (startOffset >= 0) {
        pageText = pageText.slice(startOffset);
      }
    }

    if (endKeyword && pageText.includes(endKeyword)) {
      const endOffset = pageText.indexOf(endKeyword);
      if (endOffset > 0) {
        chunks.push(pageText.slice(0, endOffset));
        collectedPages.push(page.pageNumber);
      }
      break;
    }

    chunks.push(pageText);
    collectedPages.push(page.pageNumber);
  }

  const text = normalizeText(chunks.join("\n"));
  return text
    ? {
        title: startKeyword,
        pages: uniqueNumbers(collectedPages),
        lines: getTextLines(text),
        text,
      }
    : null;
}

function getSubsectionLines(section: SectionChunk | null, startKeyword: string, endKeyword?: string) {
  if (!section) {
    return [];
  }

  const normalizedStart = normalizeLookupValue(startKeyword);
  const normalizedEnd = endKeyword ? normalizeLookupValue(endKeyword) : null;
  const startIndex = section.lines.findIndex((line) => normalizeLookupValue(line).includes(normalizedStart));
  if (startIndex === -1) {
    return [];
  }

  const endIndex = endKeyword
    ? section.lines.findIndex(
        (line, index) => index > startIndex && normalizeLookupValue(line).includes(normalizedEnd ?? ""),
      )
    : -1;

  return endIndex === -1 ? section.lines.slice(startIndex) : section.lines.slice(startIndex, endIndex);
}

function findLineCandidate(pages: ExtractedPage[], pattern: RegExp): RuleFieldCandidate<string> | null {
  for (const page of pages) {
    for (const line of page.lines) {
      const match = line.match(pattern);
      if (match) {
        const value = normalizeLine(match[1] ?? match[0]);
        return {
          value,
          pages: [page.pageNumber],
          excerpt: truncateText(line),
          confidence: 0.92,
        };
      }
    }
  }

  return null;
}

function findPageTextCandidate(pages: ExtractedPage[], pattern: RegExp): RuleFieldCandidate<string> | null {
  for (const page of pages) {
    const match = page.text.match(pattern);
    if (match) {
      const value = normalizeLine(match[1] ?? match[0]);
      return {
        value,
        pages: [page.pageNumber],
        excerpt: truncateText(normalizeLine(match[0])),
        confidence: 0.9,
      };
    }
  }

  return null;
}

function extractApplicableGrades(text: string) {
  if (text.includes("适用于所有年级")) {
    return ["所有年级"];
  }

  const matches =
    text.match(/大一|大二|大三|大四|本科一年级|本科二年级|本科三年级|本科四年级|一年级|二年级|三年级|四年级/g) ??
    [];

  return uniqueItems(matches);
}

function extractKeyDeadlines(pages: ExtractedPage[]) {
  const candidates: string[] = [];

  for (const page of pages) {
    for (const line of page.lines) {
      if (/(每学年初|每学年秋季学期初|公示期为\d+天|指定期限内|申报截止后)/.test(line)) {
        candidates.push(line);
      }
    }
  }

  return uniqueItems(candidates).slice(0, 4);
}

function buildSportsPersonalSummary(lines: string[]) {
  if (lines.length === 0) {
    return [];
  }

  const blockText = lines.join(" ");
  const first =
    blockText.match(/第一名[\s/]*80[\s/]*40[\s/]*30[\s/]*10/)?.[0] ??
    blockText.match(/第一名[\s/]*\d+[\s/]*\d+[\s/]*\d+[\s/]*\d+/)?.[0] ??
    lines.find((line) => line.includes("第一名")) ??
    null;
  const miss =
    blockText.match(/未取得名次[\s/]*20[\s/]*10[\s/]*5[\s/]*1/)?.[0] ??
    blockText.match(/未取得名次[\s/]*\d+[\s/]*\d+[\s/]*\d+[\s/]*\d+/)?.[0] ??
    lines.find((line) => line.includes("未取得名次")) ??
    null;

  if (first && miss) {
    return [
      `个人竞赛按全国/市级/校级/院级分级计分，${first.replace(/\s+/g, "")}，${miss.replace(/\s+/g, "")}。`,
    ];
  }

  return [truncateText(lines.slice(0, 4).join(" "), 140)];
}

function buildSportsTeamSummary(lines: string[]) {
  if (lines.length === 0) {
    return [];
  }

  const blockText = lines.join(" ");
  if (
    /第一名[\s\S]{0,40}?20[\s\S]{0,20}?10[\s\S]{0,20}?5/.test(blockText) &&
    /未取得名次[\s\S]{0,40}?5[\s\S]{0,20}?2[\s\S]{0,20}?1/.test(blockText)
  ) {
    return ["团体竞赛按校级以上/校级/院级集体项目计分，第一名20/10/5分/人，未取得名次5/2/1分/人。"];
  }

  const first =
    blockText.match(/第一名[\s/]*20\s*分\/人[\s/]*10\s*分\/人[\s/]*5\s*分\/人/)?.[0] ??
    blockText.match(/第一名[\s/]*20[\s/]*10[\s/]*5/)?.[0] ??
    lines.find((line) => line.includes("第一名")) ??
    null;
  const miss =
    blockText.match(/未取得名次[\s/]*5\s*分\/人[\s/]*2\s*分\/人[\s/]*1\s*分\/人/)?.[0] ??
    blockText.match(/未取得名次[\s/]*5[\s/]*2[\s/]*1/)?.[0] ??
    lines.find((line) => line.includes("未取得名次")) ??
    null;

  if (first && miss) {
    return [
      `团体竞赛按校级以上/校级/院级集体项目计分，${first.replace(/\s+/g, "")}，${miss.replace(/\s+/g, "")}。`,
    ];
  }

  return [truncateText(lines.slice(0, 4).join(" "), 140)];
}

function buildSportsSpecialCases(lines: string[]) {
  const results: string[] = [];
  const joined = lines.join("\n");

  if (joined.includes("入场式") || joined.includes("裁判")) {
    results.push("校运动会入场式、引导员和裁判均有明确加分规则。");
  }

  if (joined.includes("趣味项目") || joined.includes("广播操")) {
    results.push("趣味项目和广播操参照校级团体项目计分。");
  }

  if (joined.includes("1分/人") || joined.includes("同类型活动不累加")) {
    results.push("学院趣味运动会或体育活动每项目可加1分/人，同类型活动不重复累计。");
  }

  return uniqueItems(results).slice(0, 3);
}

function buildUnknownFieldFlags(facts: CollegeRuleFacts) {
  const notes: string[] = [];

  if (facts.sports_module_included === true && facts.sports_score_is_explicitly_quantified === true) {
    if (!facts.sports_module_score_known) {
      notes.push("已识别体育评价存在明确加分规则，但规则中未给出统一固定的“体育模块总分值/固定权重”。");
    }
  }

  if (facts.volunteer_related === null) {
    notes.push("当前规则中尚未明确提取到志愿服务相关加分条款。");
  }

  if (facts.key_deadlines.length === 0) {
    notes.push("当前已识别到的是规则性时间要求，尚未提取到更细的申报截止日期。");
  }

  return uniqueItems(notes);
}

function calculateExtractionConfidence(facts: CollegeRuleFacts) {
  const checkpoints = [
    Boolean(facts.rule_title),
    Boolean(facts.college_name),
    Boolean(facts.rule_version_or_date),
    facts.evaluation_dimensions.length >= 5,
    typeof facts.academic_weight_percent === "number",
    typeof facts.comprehensive_quality_weight_percent === "number",
    Boolean(facts.annual_bottomline_required),
    Boolean(facts.recommendation_bottomline_required),
    facts.sports_module_included === true,
    facts.sports_scoring_rules_present === true,
    facts.sports_personal_competition_rules.length > 0,
    facts.sports_team_competition_rules.length > 0,
  ];

  const matched = checkpoints.filter(Boolean).length;
  return Number(Math.min(0.98, 0.42 + (matched / checkpoints.length) * 0.56).toFixed(2));
}

function buildUnknownFields(facts: CollegeRuleFacts) {
  const unknownFields: string[] = [];

  const entries: Array<[RuleEvidenceFieldKey, unknown]> = [
    ["rule_title", facts.rule_title],
    ["college_name", facts.college_name],
    ["rule_version_or_date", facts.rule_version_or_date],
    ["rule_type", facts.rule_type],
    ["evaluation_dimensions", facts.evaluation_dimensions],
    ["total_score_formula_summary", facts.total_score_formula_summary],
    ["academic_weight_percent", facts.academic_weight_percent],
    ["comprehensive_quality_weight_percent", facts.comprehensive_quality_weight_percent],
    ["annual_bottomline_required", facts.annual_bottomline_required],
    ["recommendation_bottomline_required", facts.recommendation_bottomline_required],
    ["sports_module_included", facts.sports_module_included],
    ["sports_scoring_rules_present", facts.sports_scoring_rules_present],
    ["sports_score_is_explicitly_quantified", facts.sports_score_is_explicitly_quantified],
    ["sports_personal_competition_rules", facts.sports_personal_competition_rules],
    ["sports_team_competition_rules", facts.sports_team_competition_rules],
    ["sports_examples_or_special_cases", facts.sports_examples_or_special_cases],
    ["competition_related_bonus", facts.competition_related_bonus],
    ["applicable_grades", facts.applicable_grades],
    ["key_deadlines", facts.key_deadlines],
  ];

  for (const [key, value] of entries) {
    if (value === null || value === undefined) {
      unknownFields.push(key);
      continue;
    }

    if (Array.isArray(value) && value.length === 0) {
      unknownFields.push(key);
      continue;
    }
  }

  return uniqueItems(unknownFields);
}

function buildStructuredContext(context: RuleExtractionContext) {
  const firstPages = context.pages.slice(0, 4).map((page) => `【第${page.pageNumber}页】\n${page.text}`).join("\n\n");
  const sportsSectionText = context.sportsSection
    ? `【体育评价页 ${context.sportsSection.pages.join(", ")}】\n${context.sportsSection.text}`
    : "【体育评价】未识别到明确章节";

  return truncateText(`${firstPages}\n\n${sportsSectionText}`, MAX_MODEL_CONTEXT_LENGTH);
}

function normalizeModelFacts(raw: Partial<CollegeRuleFacts>): Partial<CollegeRuleFacts> {
  return {
    rule_title: raw.rule_title?.trim() || null,
    college_name: raw.college_name?.trim() || null,
    rule_version_or_date: raw.rule_version_or_date?.trim() || null,
    rule_type: raw.rule_type?.trim() || null,
    evaluation_dimensions: uniqueItems(raw.evaluation_dimensions ?? []),
    total_score_formula_summary: raw.total_score_formula_summary?.trim() || null,
    academic_weight_percent:
      typeof raw.academic_weight_percent === "number" ? raw.academic_weight_percent : null,
    comprehensive_quality_weight_percent:
      typeof raw.comprehensive_quality_weight_percent === "number"
        ? raw.comprehensive_quality_weight_percent
        : null,
    annual_bottomline_required: raw.annual_bottomline_required?.trim() || null,
    recommendation_bottomline_required: raw.recommendation_bottomline_required?.trim() || null,
    sports_module_included:
      typeof raw.sports_module_included === "boolean" ? raw.sports_module_included : null,
    sports_scoring_rules_present:
      typeof raw.sports_scoring_rules_present === "boolean" ? raw.sports_scoring_rules_present : null,
    sports_score_is_explicitly_quantified:
      typeof raw.sports_score_is_explicitly_quantified === "boolean"
        ? raw.sports_score_is_explicitly_quantified
        : null,
    sports_personal_competition_rules: uniqueItems(raw.sports_personal_competition_rules ?? []),
    sports_team_competition_rules: uniqueItems(raw.sports_team_competition_rules ?? []),
    sports_examples_or_special_cases: uniqueItems(raw.sports_examples_or_special_cases ?? []),
    competition_related_bonus:
      typeof raw.competition_related_bonus === "boolean" ? raw.competition_related_bonus : null,
    scholarship_related: typeof raw.scholarship_related === "boolean" ? raw.scholarship_related : null,
    research_related: typeof raw.research_related === "boolean" ? raw.research_related : null,
    volunteer_related: typeof raw.volunteer_related === "boolean" ? raw.volunteer_related : null,
    student_work_related: typeof raw.student_work_related === "boolean" ? raw.student_work_related : null,
    applicable_grades: uniqueItems(raw.applicable_grades ?? []),
    key_deadlines: uniqueItems(raw.key_deadlines ?? []),
    evidence_excerpts: uniqueItems(raw.evidence_excerpts ?? []),
    unknown_fields: uniqueItems(raw.unknown_fields ?? []),
    extraction_confidence: typeof raw.extraction_confidence === "number" ? raw.extraction_confidence : null,
  };
}

function mergeFacts(baseFacts: CollegeRuleFacts, modelFacts: Partial<CollegeRuleFacts>): CollegeRuleFacts {
  return {
    ...baseFacts,
    ...modelFacts,
    evaluation_dimensions:
      modelFacts.evaluation_dimensions && modelFacts.evaluation_dimensions.length > 0
        ? uniqueItems(modelFacts.evaluation_dimensions)
        : baseFacts.evaluation_dimensions,
    sports_personal_competition_rules:
      modelFacts.sports_personal_competition_rules && modelFacts.sports_personal_competition_rules.length > 0
        ? uniqueItems(modelFacts.sports_personal_competition_rules)
        : baseFacts.sports_personal_competition_rules,
    sports_team_competition_rules:
      modelFacts.sports_team_competition_rules && modelFacts.sports_team_competition_rules.length > 0
        ? uniqueItems(modelFacts.sports_team_competition_rules)
        : baseFacts.sports_team_competition_rules,
    sports_examples_or_special_cases:
      modelFacts.sports_examples_or_special_cases && modelFacts.sports_examples_or_special_cases.length > 0
        ? uniqueItems(modelFacts.sports_examples_or_special_cases)
        : baseFacts.sports_examples_or_special_cases,
    applicable_grades:
      modelFacts.applicable_grades && modelFacts.applicable_grades.length > 0
        ? uniqueItems(modelFacts.applicable_grades)
        : baseFacts.applicable_grades,
    key_deadlines:
      modelFacts.key_deadlines && modelFacts.key_deadlines.length > 0
        ? uniqueItems(modelFacts.key_deadlines)
        : baseFacts.key_deadlines,
    evidence_excerpts: uniqueItems([
      ...baseFacts.evidence_excerpts,
      ...(modelFacts.evidence_excerpts ?? []),
    ]).slice(0, MAX_EVIDENCE_EXCERPTS),
    unknown_fields: uniqueItems([
      ...baseFacts.unknown_fields,
      ...(modelFacts.unknown_fields ?? []),
    ]),
    known_unknown_flags: uniqueItems(baseFacts.known_unknown_flags),
    extracted_at: new Date().toISOString(),
  };
}

function buildExtractionMessages(context: RuleExtractionContext): MiniMaxMessage[] {
  const systemPrompt = [
    "你是 OpenUni 的学院规则抽取器。",
    "你会在已有的本地结构化抽取结果基础上，补充或校正文档中明确出现的规则事实。",
    "请只根据提供的规则页文本作答，不要猜测，不要补充外部信息。",
    "如果 PDF 没有明确给出统一固定的“体育模块总分值/固定权重”，sports_module_score 需要返回 null。",
    "只输出 JSON，不要输出解释。",
  ].join("\n");

  const userPrompt = [
    `文件名：${context.fileName}`,
    "",
    "请返回这些 JSON 字段：",
    "rule_title",
    "college_name",
    "rule_version_or_date",
    "rule_type",
    "evaluation_dimensions",
    "total_score_formula_summary",
    "academic_weight_percent",
    "comprehensive_quality_weight_percent",
    "annual_bottomline_required",
    "recommendation_bottomline_required",
    "sports_module_included",
    "sports_scoring_rules_present",
    "sports_score_is_explicitly_quantified",
    "sports_personal_competition_rules",
    "sports_team_competition_rules",
    "sports_examples_or_special_cases",
    "competition_related_bonus",
    "scholarship_related",
    "research_related",
    "volunteer_related",
    "student_work_related",
    "applicable_grades",
    "key_deadlines",
    "evidence_excerpts",
    "unknown_fields",
    "extraction_confidence",
    "",
    "规则页文本：",
    buildStructuredContext(context),
  ].join("\n");

  return [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];
}

async function requestModelRuleFacts(context: RuleExtractionContext) {
  const config = getMiniMaxConfig({ optional: true });
  if (!config) {
    return null;
  }

  try {
    const content = await requestMiniMaxChat({
      messages: buildExtractionMessages(context),
      maxTokens: 1800,
      temperature: 0.1,
      reasoningMode: "rule_extraction",
      jsonMode: true,
    });

    const jsonCandidate = content?.match(/\{[\s\S]*\}/)?.[0];

    if (!jsonCandidate) {
      throw new Error("Rule extraction response did not contain JSON.");
    }

    return normalizeModelFacts(JSON.parse(jsonCandidate) as Partial<CollegeRuleFacts>);
  } catch (error) {
    console.error("Rule model extraction failed:", error);
    return null;
  }
}

function getNativeImporter() {
  return new Function("specifier", "return import(specifier);") as (specifier: string) => Promise<unknown>;
}

async function loadPdfJsRuntime() {
  if (!cachedPdfJsRuntime) {
    cachedPdfJsRuntime = (async () => {
      const importModule = getNativeImporter();
      const baseDir = path.join(process.cwd(), "node_modules", "pdfjs-dist", "legacy", "build");
      const pdfModuleUrl = pathToFileURL(path.join(baseDir, "pdf.mjs")).toString();
      const workerModuleUrl = pathToFileURL(path.join(baseDir, "pdf.worker.mjs")).toString();

      const [workerModule, pdfRuntime] = await Promise.all([
        importModule(workerModuleUrl) as Promise<PdfJsWorkerModule>,
        importModule(pdfModuleUrl) as Promise<PdfJsRuntime>,
      ]);

      if (!workerModule?.WorkerMessageHandler || typeof pdfRuntime?.getDocument !== "function") {
        throw new Error("Failed to initialize PDF runtime.");
      }

      (globalThis as typeof globalThis & { pdfjsWorker?: PdfJsWorkerModule }).pdfjsWorker = workerModule;
      return pdfRuntime;
    })().catch((error) => {
      cachedPdfJsRuntime = null;
      throw error;
    });
  }

  return cachedPdfJsRuntime;
}

async function extractPdfPages(pdfBuffer: Buffer) {
  const pdfjs = await loadPdfJsRuntime();
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(pdfBuffer),
    verbosity: pdfjs.VerbosityLevel?.ERRORS ?? 0,
    disableFontFace: true,
    useWorkerFetch: false,
    useSystemFonts: false,
    isOffscreenCanvasSupported: false,
    isImageDecoderSupported: false,
    stopAtErrors: false,
  });

  let document: PdfJsDocument | null = null;

  try {
    document = await loadingTask.promise;
    const pages: ExtractedPage[] = [];

    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);

      try {
        const textContent = await page.getTextContent({
          disableNormalization: false,
          includeMarkedContent: false,
        });

        const fragments: string[] = [];

        for (const item of textContent.items) {
          const value = typeof item?.str === "string" ? item.str.trim() : "";
          if (value) {
            fragments.push(value);
          }
          if (item?.hasEOL) {
            fragments.push("\n");
          }
        }

        const pageText = normalizeText(fragments.join(" "));
        if (!pageText) {
          continue;
        }

        pages.push({
          pageNumber,
          text: pageText,
          lines: getTextLines(pageText),
        });
      } finally {
        page.cleanup?.();
      }
    }

    if (pages.length === 0) {
      const fallbackText = extractRawTextFallback(pdfBuffer);
      return fallbackText
        ? [
            {
              pageNumber: 1,
              text: fallbackText,
              lines: getTextLines(fallbackText),
            },
          ]
        : [];
    }

    return pages;
  } finally {
    await document?.destroy?.().catch(() => undefined);
    await loadingTask.destroy?.().catch(() => undefined);
  }
}

function buildFallbackFacts(context: RuleExtractionContext): CollegeRuleFacts {
  const facts = createEmptyFacts(context.fileName);
  const evidenceByField: RuleEvidenceByField = {};
  const firstPage = context.pages[0];
  const titleCandidate =
    (firstPage
      ? findPageTextCandidate(
          [firstPage],
          /^([\u4e00-\u9fff]{2,48}(?:综合素质测评条例|综合素质评价条例|综合素质测评细则|综合素质评价细则|综合素质测评办法|综合素质评价办法))/,
        )
      : null) ??
    (firstPage
      ? findPageTextCandidate([firstPage], /^([\u4e00-\u9fff]{2,60}(?:条例|细则|办法))/)
      : null);

  if (titleCandidate) {
    facts.rule_title = titleCandidate.value;
    addEvidence(evidenceByField, "rule_title", {
      value: titleCandidate.value,
      source_pages: titleCandidate.pages,
      evidence_excerpt: titleCandidate.excerpt,
      confidence: 0.98,
    });
  }

  const collegeCandidate = findLineCandidate(context.pages, /([\u4e00-\u9fff]{2,30}(?:学院|书院|系|部))/);
  if (collegeCandidate) {
    facts.college_name = collegeCandidate.value;
    addEvidence(evidenceByField, "college_name", {
      value: collegeCandidate.value,
      source_pages: collegeCandidate.pages,
      evidence_excerpt: collegeCandidate.excerpt,
      confidence: 0.96,
    });
  }

  const versionCandidate = findLineCandidate(
    context.pages.slice(0, 4),
    /(\d{4}年\d{1,2}月(?:\d{1,2}日)?(?:修订|发布|修正|实施)?)/,
  );
  if (versionCandidate) {
    facts.rule_version_or_date = versionCandidate.value;
    addEvidence(evidenceByField, "rule_version_or_date", {
      value: versionCandidate.value,
      source_pages: versionCandidate.pages,
      evidence_excerpt: versionCandidate.excerpt,
      confidence: 0.94,
    });
  }

  facts.rule_type =
    facts.rule_title && /综合素质测评|综合素质评价|综测/.test(facts.rule_title)
      ? "综合素质测评条例"
      : context.combinedText.includes("综合素质测评")
        ? "综合素质测评规则"
        : "学院规则文件";
  addEvidence(evidenceByField, "rule_type", {
    value: facts.rule_type,
    source_pages: titleCandidate?.pages ?? [context.pages[0]?.pageNumber ?? 1],
    evidence_excerpt: titleCandidate?.excerpt ?? facts.rule_type,
    confidence: 0.82,
  });

  const dimensionsCandidate =
    findPageTextCandidate(
      context.pages.slice(0, 4),
      /(由德育、智育、体育、美育和劳育五部分得分以及处分扣分组成)/,
    ) ??
    findPageTextCandidate(context.pages.slice(0, 4), /(德智体美劳)/);

  if (dimensionsCandidate) {
    facts.evaluation_dimensions = ["德育", "智育", "体育", "美育", "劳育"];
    addEvidence(evidenceByField, "evaluation_dimensions", {
      value: facts.evaluation_dimensions,
      source_pages: dimensionsCandidate.pages,
      evidence_excerpt: dimensionsCandidate.excerpt,
      confidence: 0.96,
    });
  }

  const academicWeightCandidate = findPageTextCandidate(
    context.pages.slice(0, 4),
    /(学业成绩占\d+%，综合素质测评成绩占\d+%)/,
  );
  const academicWeightMatch = context.combinedText.match(/学业成绩占\s*(\d{1,3})%/);
  const qualityWeightMatch = context.combinedText.match(/综合素质测评成绩占\s*(\d{1,3})%/);

  if (academicWeightMatch) {
    facts.academic_weight_percent = Number(academicWeightMatch[1]);
    addEvidence(evidenceByField, "academic_weight_percent", {
      value: facts.academic_weight_percent,
      source_pages: academicWeightCandidate?.pages ?? [3],
      evidence_excerpt: academicWeightCandidate?.excerpt ?? academicWeightMatch[0],
      confidence: 0.95,
    });
  }

  if (qualityWeightMatch) {
    facts.comprehensive_quality_weight_percent = Number(qualityWeightMatch[1]);
    addEvidence(evidenceByField, "comprehensive_quality_weight_percent", {
      value: facts.comprehensive_quality_weight_percent,
      source_pages: academicWeightCandidate?.pages ?? [3],
      evidence_excerpt: academicWeightCandidate?.excerpt ?? qualityWeightMatch[0],
      confidence: 0.95,
    });
  }

  if (facts.evaluation_dimensions.length > 0 || facts.academic_weight_percent !== null) {
    const formulaParts: string[] = [];

    if (facts.evaluation_dimensions.length >= 5) {
      formulaParts.push("原始总分=德育评价+智育评价+(体育评价+美育评价+劳育评价)");
    }

    if (
      typeof facts.academic_weight_percent === "number" &&
      typeof facts.comprehensive_quality_weight_percent === "number"
    ) {
      formulaParts.push(
        `综合成绩=学业成绩×${facts.academic_weight_percent}% + 综合素质测评成绩×${facts.comprehensive_quality_weight_percent}%`,
      );
    }

    if (formulaParts.length > 0) {
      facts.total_score_formula_summary = formulaParts.join("；");
      addEvidence(evidenceByField, "total_score_formula_summary", {
        value: facts.total_score_formula_summary,
        source_pages: uniqueNumbers([
          ...(academicWeightCandidate?.pages ?? []),
          ...(dimensionsCandidate?.pages ?? []),
        ]),
        evidence_excerpt: academicWeightCandidate?.excerpt ?? dimensionsCandidate?.excerpt ?? formulaParts.join("；"),
        confidence: 0.92,
      });
    }
  }

  const annualBottomlineCandidate = findPageTextCandidate(
    context.pages.slice(2, 5),
    /(若学生[^。]{0,120}?德、智、体、美、劳任一部分无得分[^。]{0,80}?评奖评优标准)/,
  );
  if (annualBottomlineCandidate) {
    facts.annual_bottomline_required = annualBottomlineCandidate.value;
    addEvidence(evidenceByField, "annual_bottomline_required", {
      value: annualBottomlineCandidate.value,
      source_pages: annualBottomlineCandidate.pages,
      evidence_excerpt: annualBottomlineCandidate.excerpt,
      confidence: 0.94,
    });
  }

  const recommendationBottomlineCandidate = findPageTextCandidate(
    context.pages.slice(2, 5),
    /(若学生推免综合素质测评成绩中[^。]{0,120}?德、智、体、美、劳任一部分无得分[^。]{0,80}?推免资格要求)/,
  );
  if (recommendationBottomlineCandidate) {
    facts.recommendation_bottomline_required = recommendationBottomlineCandidate.value;
    addEvidence(evidenceByField, "recommendation_bottomline_required", {
      value: recommendationBottomlineCandidate.value,
      source_pages: recommendationBottomlineCandidate.pages,
      evidence_excerpt: recommendationBottomlineCandidate.excerpt,
      confidence: 0.94,
    });
  }

  facts.sports_module_included =
    context.sportsSection || facts.evaluation_dimensions.includes("体育")
      ? true
      : context.combinedText.includes("体育评价")
        ? true
        : null;
  if (facts.sports_module_included !== null) {
    addEvidence(evidenceByField, "sports_module_included", {
      value: facts.sports_module_included,
      source_pages: context.sportsSection?.pages ?? dimensionsCandidate?.pages ?? [2],
      evidence_excerpt:
        context.sportsSection?.title ?? dimensionsCandidate?.excerpt ?? "规则明确出现“体育评价”或德智体美劳结构。",
      confidence: 0.9,
    });
  }

  facts.sports_scoring_rules_present =
    context.sportsSection && context.sportsTableBlocks.length > 0 ? true : facts.sports_module_included;
  if (facts.sports_scoring_rules_present !== null) {
    addEvidence(evidenceByField, "sports_scoring_rules_present", {
      value: facts.sports_scoring_rules_present,
      source_pages: context.sportsSection?.pages ?? [18],
      evidence_excerpt:
        context.sportsTableBlocks[0]?.lines.slice(0, 3).join(" / ") ??
        context.sportsSection?.title ??
        "已识别体育评价章节与计分表。",
      confidence: 0.93,
    });
  }

  facts.sports_score_is_explicitly_quantified =
    context.sportsSection && /(第一名|未取得名次)[\s\S]{0,30}\d+/.test(context.sportsSection.text)
      ? true
      : null;
  if (
    facts.sports_score_is_explicitly_quantified === null &&
    /(80[\s\S]{0,20}40[\s\S]{0,20}30[\s\S]{0,20}10|20[\s\S]{0,20}10[\s\S]{0,20}5[\s\S]{0,20}1)/.test(
      context.sportsSection?.text ?? "",
    )
  ) {
    facts.sports_score_is_explicitly_quantified = true;
  }
  if (facts.sports_score_is_explicitly_quantified !== null) {
    addEvidence(evidenceByField, "sports_score_is_explicitly_quantified", {
      value: facts.sports_score_is_explicitly_quantified,
      source_pages: context.sportsSection?.pages ?? [18],
      evidence_excerpt:
        context.sportsTableBlocks[0]?.lines.find((line) => line.includes("第一名")) ??
        "体育评价章节中存在明确数字计分行。",
      confidence: 0.95,
    });
  }

  const personalLines = getSubsectionLines(context.sportsSection, "1、个人竞赛", "2、团体竞赛");
  const teamLines = getSubsectionLines(context.sportsSection, "2、团体竞赛", "3、北航校运动会");
  const sportsEventLines = getSubsectionLines(context.sportsSection, "3、北航校运动会", "4、学院");
  const sportsActivityLines = getSubsectionLines(context.sportsSection, "4、学院", "（四）美育评价");
  const sportsJoinedText = context.sportsSection?.text ?? "";

  facts.sports_personal_competition_rules = buildSportsPersonalSummary(personalLines);
  if (
    facts.sports_personal_competition_rules.length === 0 &&
    /个人竞赛/.test(sportsJoinedText) &&
    /第一名[\s\S]{0,40}?80[\s\S]{0,20}?40[\s\S]{0,20}?30[\s\S]{0,20}?10/.test(sportsJoinedText) &&
    /未取得名次[\s\S]{0,40}?20[\s\S]{0,20}?10[\s\S]{0,20}?5[\s\S]{0,20}?1/.test(sportsJoinedText)
  ) {
    facts.sports_personal_competition_rules = [
      "个人竞赛按全国/市级/校级/院级分级计分，第一名80/40/30/10分，未取得名次20/10/5/1分。",
    ];
  }
  if (facts.sports_personal_competition_rules.length > 0) {
    addEvidence(evidenceByField, "sports_personal_competition_rules", {
      value: facts.sports_personal_competition_rules,
      source_pages: context.sportsSection?.pages ?? [18],
      evidence_excerpt: truncateText(personalLines.slice(0, 6).join(" / ") || sportsJoinedText, 180),
      confidence: 0.95,
    });
  }

  facts.sports_team_competition_rules = buildSportsTeamSummary(teamLines);
  if (
    facts.sports_team_competition_rules.length === 0 &&
    /团体竞赛/.test(sportsJoinedText) &&
    /第一名[\s\S]{0,40}?20[\s\S]{0,20}?10[\s\S]{0,20}?5/.test(sportsJoinedText) &&
    /未取得名次[\s\S]{0,40}?5[\s\S]{0,20}?2[\s\S]{0,20}?1/.test(sportsJoinedText)
  ) {
    facts.sports_team_competition_rules = [
      "团体竞赛按校级以上/校级/院级集体项目计分，第一名20/10/5分/人，未取得名次5/2/1分/人。",
    ];
  }
  if (facts.sports_team_competition_rules.length > 0) {
    addEvidence(evidenceByField, "sports_team_competition_rules", {
      value: facts.sports_team_competition_rules,
      source_pages: context.sportsSection?.pages ?? [18, 19],
      evidence_excerpt: truncateText(teamLines.slice(0, 6).join(" / ") || sportsJoinedText, 180),
      confidence: 0.94,
    });
  }

  facts.sports_examples_or_special_cases = buildSportsSpecialCases([...sportsEventLines, ...sportsActivityLines]);
  if (facts.sports_examples_or_special_cases.length === 0) {
    const specialCases: string[] = [];

    if (/入场式|裁判/.test(sportsJoinedText)) {
      specialCases.push("校运动会入场式、引导员和裁判均有明确加分规则。");
    }

    if (/趣味项目|广播操/.test(sportsJoinedText)) {
      specialCases.push("趣味项目和广播操参照校级团体项目计分。");
    }

    if (/学院.*体育活动|1分\/人|同类型活动不累加/.test(sportsJoinedText)) {
      specialCases.push("学院趣味运动会或体育活动每项目可加1分/人，同类型活动不重复累计。");
    }

    facts.sports_examples_or_special_cases = uniqueItems(specialCases);
  }
  if (facts.sports_examples_or_special_cases.length > 0) {
    addEvidence(evidenceByField, "sports_examples_or_special_cases", {
      value: facts.sports_examples_or_special_cases,
      source_pages: context.sportsSection?.pages ?? [19, 20],
      evidence_excerpt: truncateText(
        [...sportsEventLines, ...sportsActivityLines].slice(0, 7).join(" / ") || sportsJoinedText,
        180,
      ),
      confidence: 0.91,
    });
  }

  facts.competition_related_bonus =
    facts.sports_scoring_rules_present === true || /竞赛.*加分|比赛.*加分/.test(context.combinedText) ? true : null;
  if (facts.competition_related_bonus !== null) {
    addEvidence(evidenceByField, "competition_related_bonus", {
      value: facts.competition_related_bonus,
      source_pages: context.sportsSection?.pages ?? [18],
      evidence_excerpt:
        personalLines[1] ??
        context.sportsSection?.title ??
        "规则中明确存在比赛/竞赛对应的综合素质测评加分。",
      confidence: 0.9,
    });
  }

  facts.scholarship_related = /评奖评优|奖学金/.test(context.combinedText) ? true : null;
  if (facts.scholarship_related) {
    addEvidence(evidenceByField, "scholarship_related", {
      value: true,
      source_pages: annualBottomlineCandidate?.pages ?? [3, 4],
      evidence_excerpt: annualBottomlineCandidate?.excerpt ?? "每学年综合成绩作为学生学年内的评奖评优依据。",
      confidence: 0.88,
    });
  }

  facts.research_related = /推免|研究生/.test(context.combinedText) ? true : null;
  if (facts.research_related) {
    addEvidence(evidenceByField, "research_related", {
      value: true,
      source_pages: recommendationBottomlineCandidate?.pages ?? [3, 4],
      evidence_excerpt:
        recommendationBottomlineCandidate?.excerpt ??
        "本科前三年综合成绩作为学生推免重要参考。",
      confidence: 0.86,
    });
  }

  facts.volunteer_related = /志愿服务|志愿活动|社会实践/.test(context.combinedText) ? true : null;
  if (facts.volunteer_related) {
    const volunteerCandidate = findPageTextCandidate(context.pages, /(志愿服务|志愿活动|社会实践)/);
    addEvidence(evidenceByField, "volunteer_related", {
      value: true,
      source_pages: volunteerCandidate?.pages ?? [1],
      evidence_excerpt: volunteerCandidate?.excerpt ?? "规则文本中识别到志愿服务或社会实践相关条目。",
      confidence: 0.76,
    });
  }

  facts.student_work_related = /社会工作|学生工作|学生干部|班委|学生会|党支部/.test(context.combinedText) ? true : null;
  if (facts.student_work_related) {
    const studentWorkCandidate = findPageTextCandidate(context.pages, /(社会工作|学生工作|学生干部|班委|学生会|党支部)/);
    addEvidence(evidenceByField, "student_work_related", {
      value: true,
      source_pages: studentWorkCandidate?.pages ?? [5, 6],
      evidence_excerpt: studentWorkCandidate?.excerpt ?? "规则中存在社会工作/学生工作加分项目。",
      confidence: 0.86,
    });
  }

  facts.applicable_grades = extractApplicableGrades(context.combinedText);
  if (facts.applicable_grades.length > 0) {
    const gradesCandidate = findPageTextCandidate(context.pages, /(适用于所有年级|大二、大三|大一|大二|大三|大四)/);
    addEvidence(evidenceByField, "applicable_grades", {
      value: facts.applicable_grades,
      source_pages: gradesCandidate?.pages ?? [4],
      evidence_excerpt: gradesCandidate?.excerpt ?? facts.applicable_grades.join(" / "),
      confidence: 0.8,
    });
  }

  facts.key_deadlines = extractKeyDeadlines(context.pages);
  if (facts.key_deadlines.length > 0) {
    addEvidence(evidenceByField, "key_deadlines", {
      value: facts.key_deadlines,
      source_pages: [2, 4],
      evidence_excerpt: facts.key_deadlines.join("；"),
      confidence: 0.78,
    });
  }

  facts.sports_module_score = null;
  facts.sports_module_score_known = false;
  facts.evidence_by_field = evidenceByField;
  facts.evidence_excerpts = pickFirstEvidenceText(evidenceByField);
  facts.unknown_fields = buildUnknownFields(facts);
  facts.known_unknown_flags = buildUnknownFieldFlags(facts);
  facts.extraction_confidence = calculateExtractionConfidence(facts);
  facts.extracted_at = new Date().toISOString();

  return facts;
}

export async function extractCollegeRuleFromPdf({
  fileName,
  pdfBuffer,
}: {
  fileName: string;
  pdfBuffer: Buffer;
}): Promise<RuleExtractionResult> {
  const pages = await extractPdfPages(pdfBuffer);
  const combinedText = normalizeText(pages.map((page) => page.text).join("\n\n"));

  if (!combinedText) {
    throw new Error("没有从 PDF 中提取到可用文本，请检查文件是否为可复制文本的规则 PDF。");
  }

  const sections = detectSections(pages);
  const sportsSection =
    getSectionByKeyword(sections, "体育评价") ??
    buildSectionFromKeywords(pages, "体育评价", "美育评价");
  const context: RuleExtractionContext = {
    fileName,
    pages,
    combinedText,
    sections,
    sportsSection,
    sportsTableBlocks: detectTableBlocks(sportsSection),
  };

  const fallbackFacts = buildFallbackFacts(context);

  try {
    const modelFacts = await requestModelRuleFacts(context);

    if (!modelFacts) {
      return {
        facts: fallbackFacts,
        source: "fallback",
        textLength: combinedText.length,
      };
    }

    const mergedFacts = mergeFacts(fallbackFacts, modelFacts);
    mergedFacts.evidence_excerpts = pickFirstEvidenceText(mergedFacts.evidence_by_field);
    mergedFacts.unknown_fields = buildUnknownFields(mergedFacts);
    mergedFacts.known_unknown_flags = buildUnknownFieldFlags(mergedFacts);
    mergedFacts.extraction_confidence = calculateExtractionConfidence(mergedFacts);

    return {
      facts: mergedFacts,
      source: "model",
      textLength: combinedText.length,
    };
  } catch {
    return {
      facts: fallbackFacts,
      source: "fallback",
      textLength: combinedText.length,
    };
  }
}
