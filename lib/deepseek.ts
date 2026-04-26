import type {
  AskApiResponse,
  AskBlock,
  AskEvidenceItem,
  AskFollowUps,
  AskQuestionType,
  RelatedOpportunityReason,
} from "@/lib/ask-contract";
import type {
  DiscoveryCandidateType,
  DiscoveryScreeningStatus,
  SourceKind,
  SourceWatchRecord,
} from "@/data/buaa-discovery-kb";
import type { SignalAskContext, UserProfile } from "@/lib/mock-data";
import type { StoredCollegeRule } from "@/lib/college-rule-types";

type DeepSeekMessage = {
  role: "system" | "user";
  content: string;
};

type DeepSeekResponse = {
  choices?: Array<{
    message?: {
      content?: string;
      reasoning_content?: string;
    };
  }>;
};

type ModelAnswer = Omit<AskApiResponse, "source" | "notice">;

export type DiscoveryExtractionCandidate = {
  title: string;
  published_at: string | null;
  candidate_type: DiscoveryCandidateType;
  deadline: string | null;
  target_audience: string;
  raw_excerpt: string;
  structured_summary: string;
  extracted_value_signals: string[];
  screening_status: DiscoveryScreeningStatus;
  reason_summary: string;
  confidence: number;
};

export type DiscoveryExtractionResult = {
  page_summary: string;
  candidates: DiscoveryExtractionCandidate[];
};

export type SourceResolutionModelResult = {
  source_name: string;
  source_kind: SourceKind | null;
  organization_or_college: string;
  source_home_url: string;
  seed_url: string | null;
  aliases: string[];
  confidence: number;
  reasoning: string;
};

const REQUEST_TIMEOUT_MS = 12000;

function getDeepSeekConfig() {
  const apiKey = process.env.DEEPSEEK_API_KEY?.trim();
  const baseUrl = process.env.DEEPSEEK_BASE_URL?.trim();
  const model = process.env.DEEPSEEK_MODEL?.trim();

  if (!apiKey || !baseUrl || !model) {
    throw new Error("Missing DeepSeek environment configuration.");
  }

  return {
    apiKey,
    baseUrl: baseUrl.replace(/\/$/, ""),
    model,
  };
}

type DeepSeekReasoningMode = "decision" | "discovery_extraction" | "source_resolution";

function supportsDeepSeekThinking(model: string) {
  return /^deepseek-v4/i.test(model);
}

function buildDeepSeekRequestBody({
  model,
  messages,
  maxTokens,
  temperature,
  reasoningMode,
}: {
  model: string;
  messages: DeepSeekMessage[];
  maxTokens: number;
  temperature?: number;
  reasoningMode: DeepSeekReasoningMode;
}) {
  const useThinking =
    supportsDeepSeekThinking(model) &&
    (reasoningMode === "decision" || reasoningMode === "source_resolution");

  return {
    model,
    messages,
    max_tokens: maxTokens,
    ...(useThinking
      ? {
          thinking: { type: "enabled" as const },
          reasoning_effort: reasoningMode === "decision" ? "high" : "medium",
        }
      : typeof temperature === "number"
        ? { temperature }
        : {}),
  };
}

function getDefaultFollowUps(questionType: AskQuestionType): AskFollowUps {
  if (questionType === "fact") {
    return {
      explain: "继续解释一下这条规则为什么会影响这次比赛判断",
      explore: "类似这种会被规则影响的机会还有哪些？",
      compare: "和英语竞赛相比，哪个更值得优先做？",
    };
  }

  if (questionType === "explore_compare") {
    return {
      explain: "为什么这类隐藏机会更应该提前进入视野？",
      explore: "类似这种隐藏机会还有哪些？",
      compare: "如果我本学期只能抓两件事，应该优先哪两个？",
    };
  }

  return {
    explain: "如果我最后没拿到名次，这件事还值得做吗？",
    explore: "类似这种隐藏机会还有哪些？",
    compare: "和英语竞赛相比，哪个更值得优先做？",
  };
}

function getDefaultBlocks(questionType: AskQuestionType): AskBlock[] {
  if (questionType === "fact") {
    return [
      { label: "直接回答", content: "当前我会优先基于已接入的规则、来源和事实字段来回答这个问题。" },
      { label: "信息来源", content: "优先使用当前信号关联来源和已导入的学院规则。" },
      { label: "当前是否已明确提取", content: "如果事实没有被明确提取，我会直接说明未知，而不是猜测。" },
      { label: "可继续查看的依据 / 下一步", content: "你可以继续问我具体条款、报名条件或相关来源。" },
    ];
  }

  if (questionType === "explore_compare") {
    return [
      { label: "简要结论", content: "我会先给出轻量比较结论，避免把页面变成长聊天。" },
      { label: "比较理由 / 探索理由", content: "优先看规则关联、收益可见度和时间窗口。" },
      { label: "适合什么类型的用户", content: "结合当前画像和当前信号特征给出适配判断。" },
      { label: "下一步建议", content: "继续追问具体比较对象时，判断会更有帮助。" },
    ];
  }

  return [
    { label: "判断结论", content: "我会先给出明确结论，而不是泛泛聊天。" },
    { label: "为什么这样判断", content: "重点解释这条机会为什么与你当前阶段相关。" },
    { label: "判断依据", content: "依据会来自用户画像、信号特征、来源和规则信息。" },
    { label: "下一步建议", content: "最后会给出最直接的下一步行动建议。" },
  ];
}

function summarizeRuleFacts(activeRule?: StoredCollegeRule | null) {
  if (!activeRule) {
    return null;
  }

  const facts = activeRule.facts;

  return [
    `当前导入规则：${activeRule.basis_label}`,
    `规则标题：${facts.rule_title ?? "未识别"}`,
    `学院名称：${facts.college_name ?? "未识别"}`,
    `版本 / 时间：${facts.rule_version_or_date ?? "未识别"}`,
    `规则类型：${facts.rule_type ?? "未识别"}`,
    `评价维度：${facts.evaluation_dimensions.join(" / ") || "未识别"}`,
    `总分结构：${facts.total_score_formula_summary ?? "未提取到明确公式"}`,
    `学业成绩占比：${facts.academic_weight_percent ?? "未识别"}%`,
    `综合素质测评占比：${facts.comprehensive_quality_weight_percent ?? "未识别"}%`,
    `学年评优底线：${facts.annual_bottomline_required ?? "未识别"}`,
    `推免底线：${facts.recommendation_bottomline_required ?? "未识别"}`,
    `体育模块是否计入：${facts.sports_module_included === null ? "未知" : facts.sports_module_included ? "是" : "否"}`,
    `体育是否存在明确计分规则：${facts.sports_scoring_rules_present === null ? "未知" : facts.sports_scoring_rules_present ? "是" : "否"}`,
    `体育是否存在明确数字计分：${facts.sports_score_is_explicitly_quantified === null ? "未知" : facts.sports_score_is_explicitly_quantified ? "是" : "否"}`,
    `个人竞赛规则：${facts.sports_personal_competition_rules.join(" / ") || "未识别"}`,
    `团体竞赛规则：${facts.sports_team_competition_rules.join(" / ") || "未识别"}`,
    `校运会 / 特例：${facts.sports_examples_or_special_cases.join(" / ") || "未识别"}`,
    `比赛相关加分：${facts.competition_related_bonus === null ? "未知" : facts.competition_related_bonus ? "是" : "否"}`,
    `适用年级：${facts.applicable_grades.join(" / ") || "未识别"}`,
    `关键时间：${facts.key_deadlines.join(" / ") || "未识别"}`,
    `证据片段：${facts.evidence_excerpts.slice(0, 3).join(" / ") || "暂无"}`,
    `未知字段：${facts.unknown_fields.join(" / ") || "暂无"}`,
    `未知说明：${facts.known_unknown_flags.join(" / ") || "暂无"}`,
  ].join("\n");
}

function buildMessages({
  profile,
  signal,
  question,
  questionType,
  activeRule,
}: {
  profile: UserProfile;
  signal: SignalAskContext;
  question: string;
  questionType: AskQuestionType;
  activeRule?: StoredCollegeRule | null;
}): DeepSeekMessage[] {
  const systemPrompt = [
    "你是 OpenUni，一名 AI 校园关键信号助手。",
    "你的任务不是泛聊天，而是帮助大学生围绕当前信号做判断、核事实、做轻量比较。",
    "请严格限制在以下上下文里作答：当前信号、当前用户画像、当前信号来源、当前已导入学院规则。",
    "不要编造外部数据，不要假装知道未提供的真实规则细节。",
    "如果问题是事实型且当前上下文里没有明确值，要直接说“当前知识库中尚未提取到明确数值/事实”。",
    "回答要简短、冷静、产品化，适合在 demo 中直接阅读。",
    "只返回 JSON，不要输出额外解释。",
  ].join("\n");

  const ruleContext = summarizeRuleFacts(activeRule);

  const userPrompt = [
    `问题类型：${questionType}`,
    "",
    "用户画像",
    `- 年级：${profile.grade}`,
    `- 学院：${profile.college}`,
    `- 当前目标：${profile.focus}`,
    `- 当前偏好：${profile.preference}`,
    "",
    "当前信号",
    `- 标题：${signal.title}`,
    `- 标签：${signal.tags.join(" / ")}`,
    `- 摘要：${signal.summary}`,
    `- 为什么推荐：${signal.whyRecommended}`,
    `- 优先级：${signal.priority}`,
    `- 回报预期：${signal.returnExpectation}`,
    `- 错过成本：${signal.missCost}`,
    `- 建议行动：${signal.suggestedAction}`,
    "",
    "用户画像匹配理由",
    ...signal.profileMatchReasons.map((reason, index) => `${index + 1}. ${reason}`),
    "",
    "信号特征",
    signal.signalFeatures.join(" / "),
    "",
    "判断依据",
    ...signal.judgementBasis.map((item, index) => `${index + 1}. ${item}`),
    "",
    "来源",
    ...signal.sources.map(
      (source, index) =>
        `${index + 1}. ${source.title}｜${source.authorityLevel}｜${source.relationType}｜${source.excerpt}`,
    ),
    "",
    "已知事实字段",
    `- 体育模块计入：${signal.factContext.sportsModuleIncluded === null ? "未知" : signal.factContext.sportsModuleIncluded ? "是" : "否"}`,
    `- 体育模块分值：${signal.factContext.sportsModuleScore ?? "未提取到明确数值"}`,
    `- 分值是否明确：${signal.factContext.scoreRuleKnown ? "是" : "否"}`,
    `- 截止时间：${signal.factContext.deadline ?? "未提取"}`,
    `- 资格 / 门槛：${signal.factContext.eligibility ?? "未提取"}`,
    `- 未知说明：${signal.factContext.knownUnknownFlags.join(" / ") || "暂无"}`,
    "",
    "相关机会",
    ...signal.relatedSignals.map(
      (item, index) =>
        `${index + 1}. ${item.title}｜${item.badge}｜推荐理由：${item.recommendationReason}`,
    ),
    ...(ruleContext ? ["", "当前导入学院规则", ruleContext] : []),
    "",
    `用户问题：${question}`,
    "",
    "请返回 JSON，格式如下：",
    "{",
    '  "question_type": "decision | fact | explore_compare",',
    '  "headline": "短标题",',
    '  "summary_line": "一句话总结",',
    '  "blocks": [{"label":"...","content":"..."},{"label":"...","content":"..."},{"label":"...","content":"..."},{"label":"...","content":"..."}],',
    '  "evidence": [{"source":"...","authority_level":"...","relation_type":"...","excerpt":"..."}],',
    '  "follow_ups": {"explain":"...","explore":"...","compare":"..."},',
    '  "related_opportunities": [{"title":"...","recommendation_reason":"..."}]',
    "}",
    "",
    "输出要求：",
    "1. 决策型问题用：判断结论 / 为什么这样判断 / 判断依据 / 下一步建议。",
    "2. 事实型问题用：直接回答 / 信息来源 / 当前是否已明确提取 / 可继续查看的依据或下一步。",
    "3. 探索或比较型问题用：简要结论 / 比较理由或探索理由 / 适合什么类型的用户 / 下一步建议。",
    "4. blocks 必须始终返回 4 个。",
    "5. evidence 返回 1 到 3 条最相关来源。",
    "6. 不要写长文，不要输出营销式语言。",
  ].join("\n");

  return [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];
}

function normalizeText(value: unknown, fallback: string) {
  if (typeof value !== "string") {
    return fallback;
  }

  const cleaned = value.replace(/\r/g, "").replace(/\n{3,}/g, "\n\n").trim();
  return cleaned || fallback;
}

function normalizeBlocks(value: unknown, questionType: AskQuestionType): AskBlock[] {
  const defaults = getDefaultBlocks(questionType);

  if (!Array.isArray(value)) {
    return defaults;
  }

  const blocks = value
    .filter((item): item is { label?: unknown; content?: unknown } => typeof item === "object" && item !== null)
    .map((item, index) => ({
      label: normalizeText(item.label, defaults[index]?.label ?? `模块 ${index + 1}`),
      content: normalizeText(item.content, defaults[index]?.content ?? ""),
    }))
    .slice(0, 4);

  return blocks.length === 4 ? blocks : defaults;
}

function normalizeEvidence(value: unknown, signal: SignalAskContext): AskEvidenceItem[] {
  if (!Array.isArray(value)) {
    return signal.factContext.evidence.slice(0, 3);
  }

  const evidence = value
    .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
    .map((item) => ({
      source: normalizeText(item.source, "当前信号来源"),
      authority_level: normalizeText(item.authority_level, "来源"),
      relation_type: normalizeText(item.relation_type, "判断依据"),
      excerpt: normalizeText(item.excerpt, "当前未提供更具体的证据片段。"),
    }))
    .slice(0, 3);

  return evidence.length > 0 ? evidence : signal.factContext.evidence.slice(0, 3);
}

function normalizeRelatedOpportunities(
  value: unknown,
  signal: SignalAskContext,
): RelatedOpportunityReason[] {
  const fallback = signal.relatedSignals.map((item) => ({
    title: item.title,
    recommendation_reason: item.recommendationReason,
  }));

  if (!Array.isArray(value)) {
    return fallback;
  }

  const reasonByTitle = new Map<string, string>();

  value.forEach((item) => {
    if (typeof item !== "object" || item === null) {
      return;
    }

    const title = normalizeText((item as { title?: unknown }).title, "");
    const reason = normalizeText(
      (item as { recommendation_reason?: unknown }).recommendation_reason,
      "",
    );

    if (title && reason) {
      reasonByTitle.set(title, reason);
    }
  });

  return fallback.map((item) => ({
    title: item.title,
    recommendation_reason: reasonByTitle.get(item.title) || item.recommendation_reason,
  }));
}

function parseModelAnswer(
  content: string,
  signal: SignalAskContext,
  questionType: AskQuestionType,
): ModelAnswer {
  const jsonCandidate = content.trim().match(/\{[\s\S]*\}/)?.[0];

  if (!jsonCandidate) {
    throw new Error("DeepSeek response did not contain JSON.");
  }

  const parsed = JSON.parse(jsonCandidate) as Partial<ModelAnswer>;
  const defaultBlocks = getDefaultBlocks(questionType);

  return {
    question_type: questionType,
    headline: normalizeText(
      parsed.headline,
      questionType === "fact"
        ? "已返回事实判断"
        : questionType === "explore_compare"
          ? "已返回比较建议"
          : "已返回决策判断",
    ),
    summary_line: normalizeText(parsed.summary_line, defaultBlocks[0].content),
    blocks: normalizeBlocks(parsed.blocks, questionType),
    evidence: normalizeEvidence(parsed.evidence, signal),
    follow_ups:
      typeof parsed.follow_ups === "object" && parsed.follow_ups !== null
        ? {
            explain: normalizeText(parsed.follow_ups.explain, getDefaultFollowUps(questionType).explain),
            explore: normalizeText(parsed.follow_ups.explore, getDefaultFollowUps(questionType).explore),
            compare: normalizeText(parsed.follow_ups.compare, getDefaultFollowUps(questionType).compare),
          }
        : getDefaultFollowUps(questionType),
    related_opportunities: normalizeRelatedOpportunities(parsed.related_opportunities, signal),
  };
}

export async function requestDeepSeekDecision({
  profile,
  signal,
  question,
  questionType,
  activeRule,
}: {
  profile: UserProfile;
  signal: SignalAskContext;
  question: string;
  questionType: AskQuestionType;
  activeRule?: StoredCollegeRule | null;
}): Promise<ModelAnswer> {
  const { apiKey, baseUrl, model } = getDeepSeekConfig();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(
        buildDeepSeekRequestBody({
          model,
          messages: buildMessages({ profile, signal, question, questionType, activeRule }),
          maxTokens: 900,
          temperature: 0.2,
          reasoningMode: "decision",
        }),
      ),
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`DeepSeek request failed with status ${response.status}.`);
    }

    const data = (await response.json()) as DeepSeekResponse;
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("DeepSeek response content was empty.");
    }

    return parseModelAnswer(content, signal, questionType);
  } finally {
    clearTimeout(timeoutId);
  }
}

function normalizeDiscoveryCandidateType(value: unknown): DiscoveryCandidateType {
  if (
    value === "活动" ||
    value === "讲座" ||
    value === "比赛" ||
    value === "招募" ||
    value === "规则更新" ||
    value === "通知" ||
    value === "说明会" ||
    value === "机会" ||
    value === "节点"
  ) {
    return value as DiscoveryCandidateType;
  }

  return "通知";
}

function normalizeDiscoveryScreeningStatus(value: unknown): DiscoveryScreeningStatus {
  if (
    value === "new" ||
    value === "useful" ||
    value === "promoted_to_signal" ||
    value === "ignored"
  ) {
    return value;
  }

  return "new";
}

function normalizeSourceKindValue(value: unknown): SourceKind | null {
  if (
    value === "微信公众号" ||
    value === "部门官网" ||
    value === "通知栏目" ||
    value === "学院官网" ||
    value === "活动发布页" ||
    value === "文章详情页"
  ) {
    return value as SourceKind;
  }

  return null;
}

function parseSourceResolution(content: string): SourceResolutionModelResult {
  const jsonCandidate = content.trim().match(/\{[\s\S]*\}/)?.[0];

  if (!jsonCandidate) {
    throw new Error("DeepSeek source resolution response did not contain JSON.");
  }

  const parsed = JSON.parse(jsonCandidate) as Partial<SourceResolutionModelResult>;

  return {
    source_name: normalizeText(parsed.source_name, ""),
    source_kind: normalizeSourceKindValue(parsed.source_kind),
    organization_or_college: normalizeText(parsed.organization_or_college, ""),
    source_home_url: normalizeText(parsed.source_home_url, ""),
    seed_url: typeof parsed.seed_url === "string" && parsed.seed_url.trim() ? parsed.seed_url.trim() : null,
    aliases: Array.isArray(parsed.aliases)
      ? parsed.aliases.filter((item): item is string => typeof item === "string" && item.trim().length > 0).slice(0, 5)
      : [],
    confidence:
      typeof parsed.confidence === "number"
        ? Math.min(Math.max(parsed.confidence, 0.2), 0.95)
        : 0.55,
    reasoning: normalizeText(parsed.reasoning, "模型帮助补充了来源类型与组织判断。"),
  };
}

function parseDiscoveryExtraction(content: string): DiscoveryExtractionResult {
  const jsonCandidate = content.trim().match(/\{[\s\S]*\}/)?.[0];

  if (!jsonCandidate) {
    throw new Error("DeepSeek discovery response did not contain JSON.");
  }

  const parsed = JSON.parse(jsonCandidate) as Partial<DiscoveryExtractionResult>;
  const candidates = Array.isArray(parsed.candidates) ? parsed.candidates : [];

  return {
    page_summary: normalizeText(
      parsed.page_summary,
      "OpenUni 已读取这个来源，但本轮没有提取到足够明确的候选内容。",
    ),
    candidates: candidates
      .filter((item) => typeof item === "object" && item !== null)
      .map((item) => {
        const safeItem = item as Partial<DiscoveryExtractionCandidate>;

        return {
        title: normalizeText(safeItem.title, "未命名候选"),
        published_at:
          typeof safeItem.published_at === "string" && safeItem.published_at.trim().length > 0
            ? safeItem.published_at
            : null,
        candidate_type: normalizeDiscoveryCandidateType(safeItem.candidate_type),
        deadline:
          typeof safeItem.deadline === "string" && safeItem.deadline.trim().length > 0 ? safeItem.deadline : null,
        target_audience: normalizeText(safeItem.target_audience, "北航学生"),
        raw_excerpt: normalizeText(safeItem.raw_excerpt, "OpenUni 从来源页里提取到了这条内容。"),
        structured_summary: normalizeText(
          safeItem.structured_summary,
          "OpenUni 认为这条内容值得进入“北航最近发生了什么”的发现层。",
        ),
        extracted_value_signals: Array.isArray(safeItem.extracted_value_signals)
          ? safeItem.extracted_value_signals
              .filter((signal): signal is string => typeof signal === "string" && signal.trim().length > 0)
              .slice(0, 4)
          : [],
        screening_status: normalizeDiscoveryScreeningStatus(safeItem.screening_status),
        reason_summary: normalizeText(
          safeItem.reason_summary,
          "这条内容已被整理成发现候选，可继续观察或进入信号流。",
        ),
        confidence:
          typeof safeItem.confidence === "number"
            ? Math.min(Math.max(safeItem.confidence, 0.2), 0.98)
            : 0.62,
      };
      })
      .slice(0, 4),
  };
}

export async function requestDeepSeekDiscoveryExtraction({
  source,
  pageTitle,
  pageText,
}: {
  source: SourceWatchRecord;
  pageTitle: string | null;
  pageText: string;
}): Promise<DiscoveryExtractionResult> {
  const { apiKey, baseUrl, model } = getDeepSeekConfig();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  const systemPrompt = [
    "你是 OpenUni 的北航发现层提取助手。",
    "你的任务不是做泛化摘要，而是从单个北航来源页面里提取可进入“北航最近发生了什么”发现层的结构化候选。",
    "页面可能是通知列表页、栏目页或文章详情页。",
    "优先识别活动、讲座、比赛、招募、说明会、通知更新、规则更新和值得继续观察的校园动态。",
    "不要编造页面里没有出现的信息。",
    "如果信息不明确，就保留为空、null 或更保守的表述。",
    "只返回 JSON。",
  ].join("\n");

  const userPrompt = [
    `来源名称：${source.source_name}`,
    `来源类型：${source.source_kind}`,
    `来源主页：${source.source_home_url}`,
    ...(source.seed_url ? [`最近文章或样例链接：${source.seed_url}`] : []),
    `组织归属：${source.organization_or_college}`,
    `来源备注：${source.notes}`,
    pageTitle ? `页面标题：${pageTitle}` : "页面标题：未识别到明确标题",
    "",
    "页面正文摘录：",
    pageText.slice(0, 12000),
    "",
    "请输出 JSON：",
    "{",
    '  "page_summary": "一句话概括这个来源页这轮主要发生了什么",',
    '  "candidates": [',
    "    {",
    '      "title": "候选标题",',
    '      "published_at": "ISO 时间或 null",',
    '      "candidate_type": "活动 | 讲座 | 比赛 | 招募 | 说明会 | 规则更新 | 通知 | 机会 | 节点",',
    '      "deadline": "截止时间字符串或 null",',
    '      "target_audience": "适合什么人",',
    '      "raw_excerpt": "页面里的短摘录",',
    '      "structured_summary": "OpenUni 风格的简短总结",',
    '      "extracted_value_signals": ["短标签1", "短标签2"],',
    '      "screening_status": "new | useful | promoted_to_signal | ignored",',
    '      "reason_summary": "为什么这样判断",',
    '      "confidence": 0.0',
    "    }",
    "  ]",
    "}",
    "",
    "规则：",
    "1. 最多输出 4 条候选。",
    "2. 如果页面大多是噪音内容，也可以输出空数组。",
    "3. promoted_to_signal 只用于明显高价值、强时效、可行动的内容。",
    "4. useful 用于值得继续观察但还没必要直接进入信号页的内容。",
    "5. ignored 代表可保留为校园动态，但不重点推进。",
  ].join("\n");

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(
        buildDeepSeekRequestBody({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          maxTokens: 1000,
          temperature: 0.1,
          reasoningMode: "discovery_extraction",
        }),
      ),
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`DeepSeek discovery request failed with status ${response.status}.`);
    }

    const data = (await response.json()) as DeepSeekResponse;
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("DeepSeek discovery response content was empty.");
    }

    return parseDiscoveryExtraction(content);
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function requestDeepSeekSourceResolution({
  input,
  knownSources,
}: {
  input: string;
  knownSources: Array<{
    source_name: string;
    source_kind: string;
    organization_or_college: string;
    source_home_url: string;
  }>;
}): Promise<SourceResolutionModelResult> {
  const { apiKey, baseUrl, model } = getDeepSeekConfig();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  const systemPrompt = [
    "你是 OpenUni 的来源解析助手。",
    "任务是把用户一句自然语言里的“想关注的来源”解析成结构化来源信息。",
    "你可以帮助识别来源类型、所属组织、可能的别名，但绝不能编造 URL。",
    "如果不知道真实入口，就返回空字符串，不要猜测。",
    "如果看起来像微信公众号，请优先输出“微信公众号”。",
    "只输出 JSON。",
  ].join("\n");

  const userPrompt = [
    `用户输入：${input}`,
    "",
    "当前已知来源样本：",
    ...knownSources.slice(0, 12).map(
      (source, index) =>
        `${index + 1}. ${source.organization_or_college} / ${source.source_name} / ${source.source_kind} / ${source.source_home_url || "无入口"}`,
    ),
    "",
    "请输出：",
    "{",
    '  "source_name": "尽量标准化后的来源名",',
    '  "source_kind": "微信公众号 | 通知栏目 | 部门官网 | 学院官网 | 活动发布页 | null",',
    '  "organization_or_college": "尽量识别出的组织归属",',
    '  "source_home_url": "只有在你能从已知来源样本中确认时才填，否则留空",',
    '  "seed_url": "只有明确知道时才填，否则为 null",',
    '  "aliases": ["别名1", "别名2"],',
    '  "confidence": 0.0,',
    '  "reasoning": "一句话说明你为什么这样判断"',
    "}",
  ].join("\n");

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(
        buildDeepSeekRequestBody({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          maxTokens: 500,
          temperature: 0.1,
          reasoningMode: "source_resolution",
        }),
      ),
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`DeepSeek source resolution request failed with status ${response.status}.`);
    }

    const data = (await response.json()) as DeepSeekResponse;
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("DeepSeek source resolution response content was empty.");
    }

    return parseSourceResolution(content);
  } finally {
    clearTimeout(timeoutId);
  }
}


