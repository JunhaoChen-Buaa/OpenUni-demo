import type {
  AskEvidenceItem,
  AskQuestionType,
} from "@/lib/ask-contract";
import {
  demoMatchRules,
  demoSignalSourceLinks,
  demoSignals,
  demoSources,
  type DemoFactFields,
  type DemoMatchRule,
  type DemoSignal,
} from "@/data/openuni-demo-kb";

export type HomeTabKey = "related" | "reward" | "deadline" | "stage";

type UserProfile = {
  grade: string;
  college: string;
  focus: string;
  preference: string;
};

export type MainSignal = {
  title: string;
  tags: string[];
  detailTags: string[];
  description: string;
  reason: string;
  plainReason: string;
  sourceSummary: string;
  sources: Array<{ name: string; type: string }>;
  metrics: Array<{ label: string; value: string }>;
};

export type SecondarySignal = {
  title: string;
  description: string;
  badge: string;
  tab: HomeTabKey;
};

export type DetailSection = {
  title: string;
  highlight?: string;
  content: string;
};

export type CredibilityModule = {
  title: string;
  description: string;
  bullets: string[];
};

export type RelatedSignal = {
  title: string;
  description: string;
  badge: string;
  recommendationReason: string;
};

export type LinkedSource = {
  id: string;
  title: string;
  authorityLevel: string;
  sourceType: string;
  relationType: string;
  confidence: number;
  excerpt: string;
  publishDate: string;
  tags: string[];
  factFields: DemoFactFields;
};

export type SignalFactContext = {
  sportsModuleIncluded: boolean | null;
  sportsModuleScore: string | null;
  scoreRuleKnown: boolean;
  deadline: string | null;
  eligibility: string | null;
  knownUnknownFlags: string[];
  evidence: AskEvidenceItem[];
};

export type SignalAskContext = {
  id: string;
  title: string;
  tags: string[];
  summary: string;
  whyRecommended: string;
  priority: string;
  returnExpectation: string;
  missCost: string;
  suggestedAction: string;
  relatedSignals: RelatedSignal[];
  sources: Array<{
    id: string;
    title: string;
    authorityLevel: string;
    relationType: string;
    excerpt: string;
    sourceType: string;
    publishDate: string;
    factFields: DemoFactFields;
  }>;
  profileMatchReasons: string[];
  judgementBasis: string[];
  signalFeatures: string[];
  userProfileLabel: string;
  factContext: SignalFactContext;
};

type SignalContextObject = {
  signal: DemoSignal;
  linkedSources: LinkedSource[];
  profileMatchRules: DemoMatchRule[];
  profileScore: number;
  sourceSummary: string;
  sourceTitles: string[];
  signalFeatures: string[];
  judgementBasis: string[];
  relatedSignals: RelatedSignal[];
  userProfileLabel: string;
  factContext: SignalFactContext;
};

const EXPLORE_COMPARE_KEYWORDS = [
  "类似",
  "还有哪些",
  "同类",
  "相比",
  "比较",
  "哪个更",
  "哪个更值得",
  "选哪两个",
  "只能抓两件事",
  "只能抓",
  "和英语竞赛相比",
];

const FACT_KEYWORDS = [
  "多少分",
  "占多少",
  "具体分值",
  "具体占比",
  "截止",
  "截止时间",
  "什么时候",
  "门槛",
  "资格",
  "要求",
  "规则",
  "怎么写",
  "条款",
  "依据",
  "报名路径",
  "报名入口",
  "计入",
  "是否算",
];

const DECISION_KEYWORDS = [
  "值不值得",
  "优先级",
  "优先",
  "适合我",
  "适合",
  "要不要",
  "该不该",
  "值得做",
  "建议",
];

export const homeTabs = [
  { key: "related", label: "与我强相关" },
  { key: "reward", label: "高收益机会" },
  { key: "deadline", label: "即将截止" },
  { key: "stage", label: "当前阶段推荐" },
] satisfies Array<{ key: HomeTabKey; label: string }>;

function containsAny(question: string, keywords: string[]) {
  return keywords.some((keyword) => question.includes(keyword));
}

function normalizeQuestion(question: string) {
  return question.replace(/\s+/g, "").toLowerCase();
}

function formatProfileLabel(profile: UserProfile) {
  return `${profile.grade} · ${profile.college} · 关注${profile.focus}`;
}

function getSignalById(signalId: string) {
  return demoSignals.find((signal) => signal.id === signalId) ?? null;
}

function getSignalSourceItems(signalId: string): LinkedSource[] {
  return demoSignalSourceLinks.reduce<LinkedSource[]>((result, link) => {
    if (link.signal_id !== signalId) {
      return result;
    }

    const source = demoSources.find((item) => item.id === link.source_id);
    if (!source) {
      return result;
    }

    result.push({
      id: source.id,
      title: source.title,
      authorityLevel: source.authority_level,
      sourceType: source.source_type,
      relationType: link.relation_type,
      confidence: link.confidence,
      excerpt: source.content_excerpt,
      publishDate: source.publish_date,
      tags: source.tags,
      factFields: source.fact_fields ?? {},
    });

    return result;
  }, []);
}

function getProfileMatchRules(signalId: string, profile: UserProfile) {
  return demoMatchRules
    .filter((rule) => rule.signal_id === signalId)
    .filter((rule) => profile[rule.profile_key] === rule.expected_value)
    .sort((a, b) => b.match_score - a.match_score);
}

function buildRelatedSignals(currentSignalId: string): RelatedSignal[] {
  return demoSignals
    .filter((signal) => signal.id !== currentSignalId)
    .slice(0, 3)
    .map((signal) => ({
      title: signal.title,
      description: signal.home_description,
      badge: signal.home_badge,
      recommendationReason: signal.why_important,
    }));
}

export function classifyAskQuestion(question: string): AskQuestionType {
  const normalized = normalizeQuestion(question);

  if (!normalized) {
    return "decision";
  }

  if (containsAny(normalized, EXPLORE_COMPARE_KEYWORDS)) {
    return "explore_compare";
  }

  if (containsAny(normalized, FACT_KEYWORDS)) {
    return "fact";
  }

  if (containsAny(normalized, DECISION_KEYWORDS)) {
    return "decision";
  }

  return "decision";
}

export function buildSignalFactContext(signalId: string): SignalFactContext {
  const linkedSources = getSignalSourceItems(signalId);
  const factFields = linkedSources.map((source) => source.factFields);

  const sportsModuleIncluded =
    factFields.find((item) => typeof item.sports_module_included === "boolean")
      ?.sports_module_included ?? null;
  const sportsModuleScore =
    factFields.find((item) => item.sports_module_score !== undefined)?.sports_module_score ?? null;
  const scoreRuleKnown =
    factFields.find((item) => typeof item.score_rule_known === "boolean")?.score_rule_known ?? false;
  const deadline = factFields.find((item) => item.deadline)?.deadline ?? null;
  const eligibility = factFields.find((item) => item.eligibility)?.eligibility ?? null;
  const knownUnknownFlags = Array.from(
    new Set(
      factFields.flatMap((item) => item.known_unknown_flags ?? []).filter(Boolean),
    ),
  );

  return {
    sportsModuleIncluded,
    sportsModuleScore,
    scoreRuleKnown,
    deadline,
    eligibility,
    knownUnknownFlags,
    evidence: linkedSources
      .filter((source) => source.excerpt)
      .slice(0, 3)
      .map((source) => ({
        source: source.title,
        authority_level: source.authorityLevel,
        relation_type: source.relationType,
        excerpt: source.factFields.evidence_excerpt ?? source.excerpt,
      })),
  };
}

export function buildSignalContextObject(
  signalId: string,
  profile: UserProfile,
): SignalContextObject | null {
  const signal = getSignalById(signalId);
  if (!signal) {
    return null;
  }

  const linkedSources = getSignalSourceItems(signalId);
  const profileMatchRules = getProfileMatchRules(signalId, profile);
  const userProfileLabel = formatProfileLabel(profile);
  const sourceTitles = linkedSources.map((item) => item.title);
  const signalFeatures = [
    signal.signal_type,
    signal.benefit_type,
    signal.visibility_level,
    signal.time_sensitivity,
  ];

  return {
    signal,
    linkedSources,
    profileMatchRules,
    profileScore: profileMatchRules.reduce((total, rule) => total + rule.match_score, 0),
    sourceSummary:
      sourceTitles.length > 0
        ? `来源：${sourceTitles.join(" / ")}`
        : "来源：当前仅展示已识别信号",
    sourceTitles,
    signalFeatures,
    judgementBasis: [
      `用户画像：${userProfileLabel}`,
      ...profileMatchRules.slice(0, 2).map((rule) => `用户画像匹配：${rule.match_reason}`),
      ...linkedSources.slice(0, 2).map((source) => `来源：${source.title} · ${source.authorityLevel}`),
      `信号特征：${signalFeatures.join(" / ")}`,
    ],
    relatedSignals: buildRelatedSignals(signalId),
    userProfileLabel,
    factContext: buildSignalFactContext(signalId),
  };
}

export function buildDecisionContext(signalId: string, profile: UserProfile) {
  const context = buildSignalContextObject(signalId, profile);
  if (!context) {
    return null;
  }

  return {
    userProfileLabel: context.userProfileLabel,
    profileMatchReasons: context.profileMatchRules.map((rule) => rule.match_reason),
    signalFeatures: context.signalFeatures,
    judgementBasis: context.judgementBasis,
  };
}

export function getFeaturedSignalContext(profile: UserProfile) {
  const featuredSignal = demoSignals.find((signal) => signal.featured) ?? demoSignals[0];
  return featuredSignal ? buildSignalContextObject(featuredSignal.id, profile) : null;
}

export function getHomeSignals(profile: UserProfile, bucket?: HomeTabKey) {
  return demoSignals
    .filter((signal) => !signal.featured)
    .filter((signal) => (bucket ? signal.home_bucket === bucket : true))
    .map(
      (signal): SecondarySignal => ({
        title: signal.title,
        description: signal.home_description,
        badge: signal.home_badge,
        tab: signal.home_bucket,
      }),
    );
}

export function buildMainSignalCard(profile: UserProfile): MainSignal | null {
  const context = getFeaturedSignalContext(profile);
  if (!context) {
    return null;
  }

  return {
    title: context.signal.title,
    tags: context.signal.home_tags,
    detailTags: context.signal.detail_tags,
    description: context.signal.home_description,
    reason: context.signal.home_reason,
    plainReason: context.signal.home_plain_reason,
    sourceSummary: context.sourceSummary,
    sources: context.linkedSources.map((source) => ({
      name: source.title,
      type: source.authorityLevel,
    })),
    metrics: context.signal.metrics,
  };
}

export function buildDetailSections(profile: UserProfile, signalId: string): DetailSection[] {
  const context = buildSignalContextObject(signalId, profile);
  if (!context) {
    return [];
  }

  return [
    {
      title: "这是什么",
      highlight: "这是一个已进入报名窗口、且和阶段评价有关的机会型信号。",
      content: context.signal.detail_sections.what_is_it,
    },
    {
      title: "为什么推荐给你",
      highlight:
        context.profileMatchRules[0]?.match_reason ??
        "这条信号会结合用户画像、规则关联和时效性来判断是否优先进入视野。",
      content: context.signal.detail_sections.why_recommended,
    },
    {
      title: "值不值得做",
      highlight: `当前判断为${context.signal.priority_level}优先级，回报预期${context.signal.return_expectation}，错过成本${context.signal.miss_cost}。`,
      content: context.signal.detail_sections.worth_doing,
    },
    {
      title: "现在建议怎么做",
      highlight: context.signal.action_suggestion,
      content: context.signal.detail_sections.next_action,
    },
  ];
}

export function buildCredibilityModules(profile: UserProfile, signalId: string): CredibilityModule[] {
  const context = buildSignalContextObject(signalId, profile);
  if (!context) {
    return [];
  }

  const rulesSource =
    context.linkedSources.find((source) => source.relationType === "规则依据") ??
    context.linkedSources[0];
  const noticeSource =
    context.linkedSources.find((source) => source.relationType === "报名信息") ??
    context.linkedSources[1];

  return [
    {
      title: "OpenUni 如何识别这条信号",
      description:
        "OpenUni 不是把它当成普通活动信息，而是把它识别成一条与你当前阶段判断直接相关的机会型信号。",
      bullets: [
        `规则关联：已识别到“${rulesSource?.title ?? "相关规则"}”中与综合素质评价相关的依据。`,
        `信号特征：当前判断为${context.signal.visibility_level}、${context.signal.time_sensitivity}、${context.signal.benefit_type}。`,
        `用户画像匹配：已与你的画像“${context.userProfileLabel}”进行匹配，并识别到阶段相关性。`,
      ],
    },
    {
      title: "这条信号来自哪里",
      description: "当前展示的是 OpenUni 已归并的关键来源，不等于完整原文，但足够支撑演示中的判断。",
      bullets: context.linkedSources.map(
        (source) => `${source.title} · ${source.authorityLevel} · ${source.relationType}`,
      ),
    },
  ];
}

export function buildReminderState(profile: UserProfile, signalId: string) {
  const context = buildSignalContextObject(signalId, profile);
  if (!context) {
    return [];
  }

  return [
    {
      label: "优先级",
      value: context.signal.priority_level,
      note: "这是当前阶段值得先确认的一类机会。",
    },
    {
      label: "回报预期",
      value: context.signal.return_expectation,
      note: context.signal.benefit_type,
    },
    {
      label: "错过成本",
      value: context.signal.miss_cost,
      note: context.signal.why_important,
    },
  ];
}

export function buildSignalAskContext(profile: UserProfile, signalId: string): SignalAskContext | null {
  const context = buildSignalContextObject(signalId, profile);
  if (!context) {
    return null;
  }

  return {
    id: context.signal.id,
    title: context.signal.title,
    tags: context.signal.detail_tags,
    summary: context.signal.summary,
    whyRecommended: context.signal.why_important,
    priority: context.signal.priority_level,
    returnExpectation: context.signal.return_expectation,
    missCost: context.signal.miss_cost,
    suggestedAction: context.signal.action_suggestion,
    relatedSignals: context.relatedSignals,
    sources: context.linkedSources.map((source) => ({
      id: source.id,
      title: source.title,
      authorityLevel: source.authorityLevel,
      relationType: source.relationType,
      excerpt: source.excerpt,
      sourceType: source.sourceType,
      publishDate: source.publishDate,
      factFields: source.factFields,
    })),
    profileMatchReasons: context.profileMatchRules.map((rule) => rule.match_reason),
    judgementBasis: context.judgementBasis,
    signalFeatures: context.signalFeatures,
    userProfileLabel: context.userProfileLabel,
    factContext: context.factContext,
  };
}

export function getAllDemoSignalIds() {
  return demoSignals.map((signal) => signal.id);
}
