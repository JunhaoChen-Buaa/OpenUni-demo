import "server-only";

import { buaaSourceWatchlist, type SourceKind, type SourceWatchRecord } from "@/data/buaa-discovery-kb";
import { requestMiniMaxSourceResolution } from "@/lib/deepseek";

type FollowPreset = {
  keywords: string[];
  source_name: string;
  source_kind: SourceKind;
  organization_or_college: string;
  source_home_url: string;
};

export type ParsedFollowSourceIntent = {
  raw_input: string;
  source_name: string;
  source_kind: SourceKind | null;
  organization_or_college: string;
  school: string;
  source_home_url: string;
  seed_url: string | null;
  notes: string;
  confidence: number;
  missing_fields: Array<"source_name" | "source_kind" | "source_home_url">;
  follow_summary: string;
};

export type ResolvedSourceCandidate = {
  source_name: string;
  source_kind: SourceKind | null;
  organization_or_college: string;
  school: string;
  source_home_url: string;
  seed_url: string | null;
  aliases: string[];
  normalized_name: string;
  resolution_confidence: number;
  matched_existing: boolean;
  matched_source_id: string | null;
  matched_source_name: string | null;
  matched_source_origin: "seeded" | "user_followed" | null;
  found_readable_entry: boolean;
  needs_user_entry: boolean;
  recognized_as_public_account: boolean;
  resolution_steps: string[];
  notes: string;
  should_confirm: boolean;
  candidate_label: string;
  user_facing_explanation: string;
  clarification_question: string | null;
};

const DEFAULT_SCHOOL = "北航";

const FOLLOW_PRESETS: FollowPreset[] = [
  {
    keywords: ["微言航语", "北航公众号微言航语", "北航公众号", "微言航语公众号"],
    source_name: "微言航语",
    source_kind: "微信公众号",
    organization_or_college: "北航公众号来源",
    source_home_url: "",
  },
  {
    keywords: ["可靠性学院通知", "可靠性学院官网通知", "可靠性学院"],
    source_name: "可靠性与系统工程学院官网通知",
    source_kind: "学院官网",
    organization_or_college: "可靠性与系统工程学院",
    source_home_url: "https://rse.buaa.edu.cn/",
  },
  {
    keywords: ["本科生院通知", "本科生院", "教务处通知"],
    source_name: "本科生院通知",
    source_kind: "通知栏目",
    organization_or_college: "本科生院",
    source_home_url: "https://jiaowu.buaa.edu.cn/",
  },
  {
    keywords: ["体育部群体竞赛通知", "体育部通知", "群体竞赛通知"],
    source_name: "体育部群体竞赛通知",
    source_kind: "通知栏目",
    organization_or_college: "体育部",
    source_home_url: "https://sports.buaa.edu.cn/",
  },
];

function normalizeInput(input: string) {
  return input.replace(/\s+/g, " ").trim();
}

function normalizeName(input: string) {
  return input.replace(/[""'“”‘’\s]/g, "").toLowerCase();
}

function extractFirstUrl(input: string) {
  const match = input.match(/https?:\/\/[^\s]+/i);
  return match?.[0]?.replace(/[),.;]+$/, "") ?? "";
}

function extractQuotedName(input: string) {
  const quoted =
    input.match(/[“"']([^“"']{2,30})[”"']/) ||
    input.match(/公众号([^到列表关注持续跟进\s]{2,20})/) ||
    input.match(/关注([^官网通知栏目公众号来源\s]{2,20})/);

  return quoted?.[1]?.trim() ?? "";
}

function inferSourceKind(input: string): SourceKind | null {
  if (/公众号|微信|微言航语/i.test(input)) {
    return "微信公众号";
  }
  if (/讲座|活动发布|赛事发布|招募发布/i.test(input)) {
    return "活动发布页";
  }
  if (/通知|栏目/i.test(input)) {
    return "通知栏目";
  }
  if (/学院官网|学院通知/i.test(input)) {
    return "学院官网";
  }
  if (/部门官网|本科生院|体育部|教务处/i.test(input)) {
    return "部门官网";
  }
  return null;
}

function findPreset(input: string) {
  return FOLLOW_PRESETS.find((preset) => preset.keywords.some((keyword) => input.includes(keyword)));
}

function inferOrganization(input: string, preset?: FollowPreset) {
  if (preset) {
    return preset.organization_or_college;
  }

  const match = input.match(
    /(可靠性与系统工程学院|可靠性学院|本科生院|体育部|北航公众号来源|北航本科生院|北航体育部)/,
  );

  if (match?.[1]) {
    return match[1];
  }

  if (/公众号|微信/i.test(input)) {
    return "北航公众号来源";
  }

  return "用户关注来源";
}

function inferSourceName(
  input: string,
  sourceKind: SourceKind | null,
  organization: string,
  preset?: FollowPreset,
) {
  if (preset) {
    return preset.source_name;
  }

  const quoted = extractQuotedName(input);
  if (quoted) {
    return quoted;
  }

  if (sourceKind === "微信公众号" && /公众号/.test(input)) {
    return input
      .replace(/^添加|^关注|^持续关注|^帮我关注|到关注列表|来源|北航公众号|公众号/g, "")
      .trim();
  }

  if (organization !== "用户关注来源" && organization !== "北航公众号来源") {
    return sourceKind === "微信公众号" ? `${organization}` : `${organization}通知`;
  }

  return "";
}

function buildFollowSummary(sourceName: string, organization: string, sourceKind: SourceKind | null) {
  const kindLabel = sourceKind ?? "来源";
  return `已识别到候选来源：${organization} / ${sourceName} / ${kindLabel}`;
}

function buildAliases(sourceName: string, organization: string) {
  const aliases = new Set<string>();
  if (sourceName) aliases.add(sourceName);
  if (organization && sourceName && !sourceName.includes(organization)) {
    aliases.add(`${organization}${sourceName}`);
  }
  if (sourceName.includes("公众号")) {
    aliases.add(sourceName.replace(/公众号/g, ""));
  }
  if (sourceName.includes("通知")) {
    aliases.add(sourceName.replace(/通知/g, ""));
  }
  return Array.from(aliases).slice(0, 6);
}

function buildKnownSources(runtimeSources: SourceWatchRecord[] = []) {
  return [...runtimeSources, ...buaaSourceWatchlist];
}

function matchKnownSource(
  candidate: {
    source_name: string;
    organization_or_college: string;
    source_kind: SourceKind | null;
    aliases: string[];
  },
  knownSources: SourceWatchRecord[],
) {
  const targetTokens = [
    normalizeName(candidate.source_name),
    normalizeName(candidate.organization_or_college),
    ...candidate.aliases.map(normalizeName),
  ].filter(Boolean);

  let best: { source: SourceWatchRecord; score: number } | null = null;

  for (const source of knownSources) {
    const sourceTokens = [
      normalizeName(source.source_name),
      normalizeName(source.organization_or_college),
      normalizeName(source.source_kind),
    ];

    let score = 0;

    for (const token of targetTokens) {
      if (sourceTokens.some((sourceToken) => sourceToken === token)) {
        score += 4;
      } else if (sourceTokens.some((sourceToken) => sourceToken.includes(token) || token.includes(sourceToken))) {
        score += 2;
      }
    }

    if (candidate.source_kind && source.source_kind === candidate.source_kind) {
      score += 2;
    }

    if (!best || score > best.score) {
      best = { source, score };
    }
  }

  return best && best.score >= 4 ? best : null;
}

function sanitizeModelUrl(
  value: string | null | undefined,
  inputUrl: string,
  knownSources: SourceWatchRecord[],
) {
  const raw = value?.trim();
  if (!raw) {
    return "";
  }

  const knownUrls = new Set<string>();
  for (const source of knownSources) {
    if (source.source_home_url) knownUrls.add(source.source_home_url);
    if (source.seed_url) knownUrls.add(source.seed_url);
  }
  if (inputUrl) {
    knownUrls.add(inputUrl);
  }

  return knownUrls.has(raw) ? raw : "";
}

function buildExplanation(input: {
  matched: ReturnType<typeof matchKnownSource>;
  recognizedAsPublicAccount: boolean;
  foundReadableEntry: boolean;
  candidateLabel: string;
}) {
  if (input.matched) {
    return `我已识别并匹配到已知来源：${input.candidateLabel}`;
  }

  if (input.recognizedAsPublicAccount && !input.foundReadableEntry) {
    return `我已经识别出这是一个公众号来源，当前先锁定为 ${input.candidateLabel}，但还缺稳定入口。`;
  }

  if (input.foundReadableEntry) {
    return `我已经完成来源解析，并找到了可继续跟踪的入口：${input.candidateLabel}`;
  }

  return `我已经先帮你完成来源解析，当前候选是：${input.candidateLabel}`;
}

export function buildFollowSourcePrompt(parsed: ParsedFollowSourceIntent) {
  if (!parsed.missing_fields.length) {
    return null;
  }

  if (parsed.source_kind === "微信公众号") {
    return "我已经识别出这是一个公众号来源。为了更稳定地持续关注它，建议补充最近一篇文章链接。";
  }

  if (parsed.missing_fields.includes("source_name")) {
    return "我还没有完全识别出你要关注的是哪个来源，能再说得更具体一点吗？";
  }

  if (parsed.missing_fields.includes("source_home_url")) {
    return "我已经识别到来源了，但还缺稳定入口。可以补充栏目入口、主页入口或最近文章链接。";
  }

  return "我已经先做了来源解析，如果你愿意，可以再补一条入口线索，让 OpenUni 后续跟得更稳。";
}

export function parseFollowSourceIntent(input: string): ParsedFollowSourceIntent {
  const normalized = normalizeInput(input);
  const url = extractFirstUrl(normalized);
  const preset = findPreset(normalized);
  const inferredKind = inferSourceKind(normalized) ?? preset?.source_kind ?? null;
  const organization = inferOrganization(normalized, preset);
  const sourceName = inferSourceName(normalized, inferredKind, organization, preset);

  const looksLikeSeedOnly = Boolean(url) && /article|mp\.weixin|detail|content/i.test(url);
  const sourceHomeUrl = preset?.source_home_url ?? (looksLikeSeedOnly ? "" : url);
  const seedUrl = looksLikeSeedOnly ? url : url || null;

  const missingFields: ParsedFollowSourceIntent["missing_fields"] = [];
  if (!sourceName) missingFields.push("source_name");
  if (!inferredKind) missingFields.push("source_kind");
  if (!sourceHomeUrl) missingFields.push("source_home_url");

  return {
    raw_input: normalized,
    source_name: sourceName,
    source_kind: inferredKind,
    organization_or_college: organization,
    school: DEFAULT_SCHOOL,
    source_home_url: sourceHomeUrl,
    seed_url: seedUrl,
    notes: `用户以自然语言请求 OpenUni 持续关注该来源：${normalized}`,
    confidence: preset ? 0.9 : sourceName && inferredKind ? 0.78 : sourceName ? 0.62 : 0.35,
    missing_fields: missingFields,
    follow_summary:
      sourceName && inferredKind
        ? buildFollowSummary(sourceName, organization, inferredKind)
        : `我已先识别到一个来源方向：${organization}`,
  };
}

export async function resolveFollowSourceIntent(input: string, runtimeSources: SourceWatchRecord[] = []) {
  const parsed = parseFollowSourceIntent(input);
  const inputUrl = extractFirstUrl(parsed.raw_input);
  const knownSources = buildKnownSources(runtimeSources);
  const steps = ["正在识别来源类型", "正在匹配已知北航来源", "正在调用模型辅助解析来源"];

  let candidate = {
    source_name: parsed.source_name,
    source_kind: parsed.source_kind,
    organization_or_college: parsed.organization_or_college,
    source_home_url: parsed.source_home_url,
    seed_url: parsed.seed_url,
    aliases: buildAliases(parsed.source_name, parsed.organization_or_college),
    confidence: parsed.confidence,
    notes: parsed.notes,
  };

  const preMatched = matchKnownSource(candidate, knownSources);
  if (preMatched) {
    steps.push(`已初步匹配到已知来源：${preMatched.source.source_name}`);
    candidate = {
      ...candidate,
      source_name: candidate.source_name || preMatched.source.source_name,
      source_kind: candidate.source_kind || preMatched.source.source_kind,
      organization_or_college:
        candidate.organization_or_college || preMatched.source.organization_or_college,
      source_home_url: candidate.source_home_url || preMatched.source.source_home_url,
      seed_url: candidate.seed_url || preMatched.source.seed_url,
      aliases: Array.from(
        new Set([...candidate.aliases, preMatched.source.source_name, preMatched.source.organization_or_college]),
      ).slice(0, 6),
      confidence: Math.max(candidate.confidence, 0.84),
    };
  } else {
    steps.push("本地未命中高置信来源，继续用模型做解析");
  }

  try {
    const modelResolution = await requestMiniMaxSourceResolution({
      input: parsed.raw_input,
      knownSources: knownSources.map((source) => ({
        source_name: source.source_name,
        source_kind: source.source_kind,
        organization_or_college: source.organization_or_college,
        source_home_url: source.source_home_url,
      })),
    });

    const safeModelHomeUrl = sanitizeModelUrl(modelResolution.source_home_url, inputUrl, knownSources);
    const safeModelSeedUrl = sanitizeModelUrl(modelResolution.seed_url, inputUrl, knownSources);

    candidate = {
      source_name: candidate.source_name || modelResolution.source_name,
      source_kind: candidate.source_kind || modelResolution.source_kind,
      organization_or_college:
        candidate.organization_or_college || modelResolution.organization_or_college,
      source_home_url: candidate.source_home_url || safeModelHomeUrl,
      seed_url: candidate.seed_url || safeModelSeedUrl || (inputUrl ? inputUrl : null),
      aliases: Array.from(new Set([...candidate.aliases, ...modelResolution.aliases])).slice(0, 6),
      confidence: Math.max(candidate.confidence, modelResolution.confidence),
      notes: `${candidate.notes}\n模型辅助解析：${modelResolution.reasoning}`,
    };

    steps.push("模型已返回来源解析结果");
  } catch {
    steps.push("模型解析失败，先保留本地解析结果");
  }

  const matched = matchKnownSource(candidate, knownSources);
  if (matched) {
    steps.push(`已匹配到一个高置信来源候选：${matched.source.source_name}`);
    candidate = {
      ...candidate,
      source_name: candidate.source_name || matched.source.source_name,
      source_kind: candidate.source_kind || matched.source.source_kind,
      organization_or_college:
        candidate.organization_or_college || matched.source.organization_or_college,
      source_home_url: candidate.source_home_url || matched.source.source_home_url,
      seed_url: candidate.seed_url || matched.source.seed_url,
      aliases: Array.from(
        new Set([...candidate.aliases, matched.source.source_name, matched.source.organization_or_college]),
      ).slice(0, 6),
      confidence: Math.max(candidate.confidence, 0.9),
    };
  } else {
    steps.push("还没有匹配到现成来源实体");
  }

  const recognizedAsPublicAccount = candidate.source_kind === "微信公众号";
  if (recognizedAsPublicAccount) {
    steps.push("已识别为微信公众号来源");
  }

  const foundReadableEntry = Boolean(candidate.seed_url || candidate.source_home_url);
  const needsUserEntry = !foundReadableEntry;
  if (needsUserEntry) {
    steps.push(
      recognizedAsPublicAccount
        ? "尚未找到稳定入口，建议补充最近文章链接"
        : "尚未找到稳定入口，建议补充栏目入口或主页入口",
    );
  } else {
    steps.push("已匹配到现有来源入口");
  }

  const candidateLabel = [
    candidate.organization_or_college || "来源待确认",
    candidate.source_name || "未识别到明确名称",
    candidate.source_kind || "来源类型待确认",
  ].join(" / ");

  const shouldConfirm =
    Boolean(candidate.source_name && candidate.source_kind) &&
    (Boolean(matched) || candidate.confidence >= 0.72 || recognizedAsPublicAccount);

  const explanation = buildExplanation({
    matched,
    recognizedAsPublicAccount,
    foundReadableEntry,
    candidateLabel,
  });

  return {
    parsed: {
      ...parsed,
      source_name: candidate.source_name,
      source_kind: candidate.source_kind,
      organization_or_college: candidate.organization_or_college,
      source_home_url: candidate.source_home_url,
      seed_url: candidate.seed_url,
      confidence: candidate.confidence,
      missing_fields: [
        ...(candidate.source_name ? [] : (["source_name"] as const)),
        ...(candidate.source_kind ? [] : (["source_kind"] as const)),
        ...(candidate.source_home_url ? [] : (["source_home_url"] as const)),
      ],
      notes: candidate.notes,
      follow_summary:
        candidate.source_name && candidate.source_kind
          ? buildFollowSummary(candidate.source_name, candidate.organization_or_college, candidate.source_kind)
          : parsed.follow_summary,
    } satisfies ParsedFollowSourceIntent,
    resolution: {
      source_name: candidate.source_name,
      source_kind: candidate.source_kind,
      organization_or_college: candidate.organization_or_college,
      school: DEFAULT_SCHOOL,
      source_home_url: candidate.source_home_url,
      seed_url: candidate.seed_url,
      aliases: candidate.aliases,
      normalized_name: normalizeName(candidate.source_name || parsed.raw_input),
      resolution_confidence: candidate.confidence,
      matched_existing: Boolean(matched),
      matched_source_id: matched?.source.id ?? null,
      matched_source_name: matched?.source.source_name ?? null,
      matched_source_origin: matched?.source.source_origin ?? null,
      found_readable_entry: foundReadableEntry,
      needs_user_entry: needsUserEntry,
      recognized_as_public_account: recognizedAsPublicAccount,
      resolution_steps: steps,
      notes: candidate.notes,
      should_confirm: shouldConfirm,
      candidate_label: candidateLabel,
      user_facing_explanation: explanation,
      clarification_question: shouldConfirm ? `我猜你说的是：${candidateLabel}。要把它加入关注列表吗？` : null,
    } satisfies ResolvedSourceCandidate,
  };
}
