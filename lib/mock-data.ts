import type {
  AskBlock,
  AskEvidenceItem,
  AskFollowUps,
  AskQuestionType,
} from "@/lib/ask-contract";
import {
  buildDiscoveryPageData,
  type DiscoveryCandidateItem,
  type DiscoveryPageData,
  type DiscoverySourceItem,
} from "@/lib/buaa-discovery";
import {
  buildCredibilityModules,
  buildDetailSections,
  buildMainSignalCard,
  buildReminderState,
  buildSignalAskContext,
  classifyAskQuestion,
  getFeaturedSignalContext,
  getHomeSignals,
  homeTabs as kbHomeTabs,
  type CredibilityModule,
  type DetailSection,
  type HomeTabKey,
  type MainSignal,
  type RelatedSignal,
  type SecondarySignal,
  type SignalAskContext,
} from "@/lib/openuni-demo";

export type UserProfile = {
  grade: string;
  college: string;
  focus: string;
  preference: string;
};

export type AskResultSource = "model" | "fallback" | "guardrail";

export type AskResult = {
  question: string;
  questionType: AskQuestionType;
  headline: string;
  summaryLine: string;
  blocks: AskBlock[];
  evidence: AskEvidenceItem[];
  followUps: AskFollowUps;
  source: AskResultSource;
};

export type ReminderStatus = "已提醒" | "即将截止" | "待判断";

export type ReminderItem = {
  title: string;
  description: string;
  status: ReminderStatus;
  note: string;
};

export type ReminderPageData = {
  reminded: ReminderItem[];
  deadlines: ReminderItem[];
  pending: ReminderItem[];
};

export type StagePageData = {
  profileLine: string;
  currentGoal: string;
  currentPreference: string;
  recommendationBasis: string[];
  signalFeatures: string[];
  summary: string;
};

export type {
  CredibilityModule,
  DiscoveryCandidateItem,
  DiscoveryPageData,
  DiscoverySourceItem,
  DetailSection,
  HomeTabKey,
  MainSignal,
  RelatedSignal,
  SecondarySignal,
  SignalAskContext,
};

const SCOPE_KEYWORDS = [
  "游泳",
  "女生游泳",
  "比赛",
  "综测",
  "体育",
  "体育模块",
  "报名",
  "截止",
  "优先级",
  "值得",
  "适合",
  "规则",
  "条款",
  "门槛",
  "资格",
  "英语竞赛",
  "创新项目",
  "科研训练营",
  "类似机会",
];

const NEGATIVE_DECISION_KEYWORDS = [
  "时间完全排不开",
  "排不开",
  "没时间",
  "时间有限",
  "冲突",
  "赶不过来",
  "来不及",
  "不想投入",
];

const SCORE_FACT_KEYWORDS = ["多少分", "占多少", "具体分值", "具体占比"];
const DEADLINE_FACT_KEYWORDS = ["截止", "截止时间", "什么时候", "何时"];
const ELIGIBILITY_FACT_KEYWORDS = ["门槛", "资格", "要求", "谁可以", "能不能报名"];
const RULE_FACT_KEYWORDS = ["规则", "怎么写", "条款", "依据", "计入", "是否算", "综测"];

export const defaultProfile: UserProfile = {
  grade: "大一",
  college: "XX学院",
  focus: "综测 / 评优",
  preference: "高收益、值得优先抓",
};

export const onboardingOptions = {
  grades: ["大一", "大二", "大三", "大四"],
  colleges: ["XX学院"],
  focuses: ["综测 / 评优", "竞赛 / 科研", "履历积累", "项目参与", "能力提升"],
  preferences: ["低门槛、可执行", "高收益、值得优先抓", "当前阶段最相关", "快截止、别错过"],
};

export const homeTabs = kbHomeTabs;

export const suggestedQuestions = [
  "我游泳水平一般，也值得参加吗？",
  "如果我这学期时间有限，这件事优先级高吗？",
  "类似这种隐藏机会还有哪些？",
];

export const successSteps = [
  {
    title: "查看报名路径",
    description: "现在就确认参与方式和时间安排",
  },
  {
    title: "收藏到“本阶段值得做”",
    description: "后续统一回看，不再散落在多个入口里",
  },
  {
    title: "继续发现类似机会",
    description: "看看还有哪些对你当前阶段有帮助的事项",
  },
];

function mapSecondaryToReminderItem(signal: SecondarySignal, status: ReminderStatus): ReminderItem {
  return {
    title: signal.title,
    description: signal.description,
    status,
    note: signal.badge,
  };
}

function containsAny(question: string, keywords: string[]) {
  return keywords.some((keyword) => question.includes(keyword));
}

function normalizeQuestion(question: string) {
  return question.replace(/\s+/g, "");
}

function buildBasisLine(profile: UserProfile, signalContext: SignalAskContext) {
  return [
    `用户画像：${profile.grade} · ${profile.college} · 关注${profile.focus}`,
    ...signalContext.judgementBasis.slice(1, 4),
  ];
}

function buildDecisionFollowUps(): AskFollowUps {
  return {
    explain: "为什么 OpenUni 会把它判断成高优先级？",
    explore: "类似这种隐藏机会还有哪些？",
    compare: "和英语竞赛相比，哪个更值得优先做？",
  };
}

function buildFactFollowUps(): AskFollowUps {
  return {
    explain: "这条规则和我的综测判断有什么关系？",
    explore: "还有哪些来源也支持这个判断？",
    compare: "和类似活动相比，这条事实信息更关键吗？",
  };
}

function buildExploreFollowUps(): AskFollowUps {
  return {
    explain: "为什么你会把它放在更前面？",
    explore: "还有哪些同类机会值得继续看？",
    compare: "如果我只能抓两件事，应该怎么排？",
  };
}

function makeBlocks(entries: Array<[string, string]>): AskBlock[] {
  return entries.map(([label, content]) => ({ label, content }));
}

function buildConstraintAskResult(
  question: string,
  questionType: AskQuestionType,
  signalContext: SignalAskContext,
): AskResult {
  const message =
    "这个问题暂时不在当前信号的判断范围内。OpenUni 会优先围绕这条游泳比赛信号，以及和它直接相关的规则、报名信息和优先级来回答。";

  if (questionType === "fact") {
    return {
      question,
      questionType,
      headline: "当前未覆盖该事实",
      summaryLine: "这个问题不在当前信号知识范围内，建议先回到这条信号本身的事实依据。",
      blocks: makeBlocks([
        ["直接回答", "这个问题不在当前信号的事实范围内，我现在不做泛化回答。"],
        ["信息来源", signalContext.sources.slice(0, 2).map((item) => `${item.title}（${item.authorityLevel}）`).join(" / ")],
        ["当前是否已明确提取", "未覆盖该问题对应的事实字段。"],
        ["可继续查看的依据/下一步", "你可以继续问我这条游泳比赛的规则、报名时间、门槛，或让我定位最相关的来源。"],
      ]),
      evidence: signalContext.factContext.evidence.slice(0, 2),
      followUps: buildFactFollowUps(),
      source: "guardrail",
    };
  }

  if (questionType === "explore_compare") {
    return {
      question,
      questionType,
      headline: "先围绕当前信号继续判断",
      summaryLine: "这个问题太泛了，建议先把比较范围收回到当前这条游泳比赛信号附近。",
      blocks: makeBlocks([
        ["简要结论", "我现在更适合围绕这条游泳比赛信号继续做比较，而不是跳到泛校园问答。"],
        ["比较理由 / 探索理由", message],
        ["适合什么类型的用户", `更适合当前画像为“${signalContext.userProfileLabel}”且正在判断这条机会的人。`],
        ["下一步建议", "你可以继续问“和英语竞赛相比哪个更值得优先做”或“如果我只能抓两件事，哪两个更适合我”。"],
      ]),
      evidence: signalContext.factContext.evidence.slice(0, 2),
      followUps: buildExploreFollowUps(),
      source: "guardrail",
    };
  }

  return {
    question,
    questionType: "decision",
    headline: "先围绕当前信号判断",
    summaryLine: "这个问题超出了当前信号范围，建议先回到“这件事值不值得做”。",
    blocks: makeBlocks([
      ["判断结论", "这个问题暂时不在当前信号范围内，我不建议把它当成泛聊天来回答。"],
      ["为什么这样判断", message],
      ["判断依据", signalContext.judgementBasis.slice(0, 3).join("；")],
      ["下一步建议", "你可以继续问我这条信号值不值得做、为什么对你重要、或和英语竞赛相比哪个更优先。"],
    ]),
    evidence: signalContext.factContext.evidence.slice(0, 2),
    followUps: buildDecisionFollowUps(),
    source: "guardrail",
  };
}

function buildDecisionAskResult(
  question: string,
  signalContext: SignalAskContext,
  profile: UserProfile,
): AskResult {
  const isNegative = containsAny(normalizeQuestion(question), NEGATIVE_DECISION_KEYWORDS);
  const headline = isNegative ? "暂不建议优先做" : "建议优先做";
  const summaryLine = isNegative
    ? "暂不建议优先做，除非你已经确认时间安排仍有余量。"
    : "建议优先做，因为它和你的阶段目标直接相关，且窗口偏短。";

  return {
    question,
    questionType: "decision",
    headline,
    summaryLine,
    blocks: makeBlocks([
      [
        "判断结论",
        isNegative
          ? "如果你这学期时间已经明显排不开，这件事可以先不放到最前面。它仍然有价值，但前提是你能留出最基本的准备和参与时间。"
          : "这件事值得优先进入你的待判断清单。对你当前阶段来说，它不是普通活动信息，而是一条可能影响综测判断的机会型信号。",
      ],
      [
        "为什么这样判断",
        isNegative
          ? "它的规则关联和收益都成立，但你的时间约束会直接影响实际回报。一旦无法投入最基本的报名和安排成本，这条机会就很容易变成认知上的“高收益”、执行上的“低完成”。"
          : "你当前画像是大一、关注综测 / 评优，这条信号同时满足规则关联明确、可见回报、窗口较短三个条件，优先级会高于一般校园活动。",
      ],
      [
        "判断依据",
        [...buildBasisLine(profile, signalContext), `信号特征：${signalContext.signalFeatures.join(" / ")}`].join("；"),
      ],
      [
        "下一步建议",
        isNegative
          ? "先确认你这周的时间安排是否真的冲突。如果已经冲突明显，就把注意力转向同样能补充阶段成果、但投入更稳的机会。"
          : "先确认报名截止时间和你的时间安排是否冲突，再决定是否报名。只要时间可行，这条信号建议尽快进入行动阶段。",
      ],
    ]),
    evidence: signalContext.factContext.evidence.slice(0, 2),
    followUps: buildDecisionFollowUps(),
    source: "fallback",
  };
}

function buildFactAskResult(
  question: string,
  signalContext: SignalAskContext,
): AskResult {
  const normalized = normalizeQuestion(question);
  const facts = signalContext.factContext;
  const evidence = facts.evidence.slice(0, 3);

  let directAnswer = "当前知识库中还没有提取到与你这个问题直接对应的明确事实。";
  let extractionStatus = "当前未明确提取";
  let nextStep = "你可以继续查看规则原文，或让我帮你定位最相关的来源。";

  if (containsAny(normalized, SCORE_FACT_KEYWORDS)) {
    directAnswer = facts.scoreRuleKnown && facts.sportsModuleScore
      ? `当前知识库已提取到体育模块分值：${facts.sportsModuleScore}。`
      : "当前知识库中尚未提取到“体育模块具体占多少分”的明确数值。";
    extractionStatus = facts.scoreRuleKnown && facts.sportsModuleScore
      ? "已明确提取到具体分值。"
      : "目前只识别到“体育模块计入综合素质评价”，但未解析出具体分值字段。";
    nextStep = "你可以继续查看学院综测细则原文，或让我继续定位和“体育模块分值”最相关的条款。";
  } else if (containsAny(normalized, DEADLINE_FACT_KEYWORDS)) {
    directAnswer = facts.deadline
      ? `当前知识库提取到的报名截止时间是：${facts.deadline}。`
      : "当前知识库中还没有提取到明确的报名截止时间。";
    extractionStatus = facts.deadline ? "已明确提取到时间字段。" : "截止时间字段尚未明确提取。";
    nextStep = "如果你准备继续判断值不值得做，建议下一步结合截止时间和你的课程安排一起看。";
  } else if (containsAny(normalized, ELIGIBILITY_FACT_KEYWORDS)) {
    directAnswer = facts.eligibility
      ? `当前知识库提取到的报名门槛是：${facts.eligibility}`
      : "当前知识库中还没有提取到更细的门槛条件，只确认到它处于开放报名阶段。";
    extractionStatus = facts.eligibility ? "已明确提取到基础资格描述。" : "门槛字段目前仍偏粗略。";
    nextStep = "你可以继续问我“这个门槛对我算不算低”，我会再结合你的画像做判断。";
  } else if (containsAny(normalized, RULE_FACT_KEYWORDS)) {
    directAnswer =
      facts.sportsModuleIncluded === true
        ? "当前知识库已明确识别到：体育模块计入综合素质评价，相关赛事表现可作为阶段性评价依据。"
        : "当前知识库还没有提取到足够明确的规则表达。";
    extractionStatus =
      facts.sportsModuleIncluded === true
        ? "规则关联已明确提取。"
        : "规则关联尚未明确提取。";
    nextStep = "你可以继续查看规则原文，或让我帮你解释这条规则为什么会影响这次机会的优先级。";
  } else if (facts.knownUnknownFlags.length > 0) {
    directAnswer = facts.knownUnknownFlags[0];
    extractionStatus = "当前未提取到更细事实。";
  }

  const sourceLine = signalContext.sources
    .slice(0, 3)
    .map((item) => `${item.title}（${item.authorityLevel}）`)
    .join(" / ");

  return {
    question,
    questionType: "fact",
    headline: extractionStatus.startsWith("已") ? "当前已明确提取" : "当前未明确提取",
    summaryLine: directAnswer,
    blocks: makeBlocks([
      ["直接回答", directAnswer],
      ["信息来源", sourceLine || "当前仅识别到与该信号直接相关的来源。"],
      ["当前是否已明确提取", extractionStatus],
      ["可继续查看的依据/下一步", nextStep],
    ]),
    evidence,
    followUps: buildFactFollowUps(),
    source: "fallback",
  };
}

function buildExploreAskResult(
  question: string,
  signalContext: SignalAskContext,
  profile: UserProfile,
): AskResult {
  const normalized = normalizeQuestion(question);
  const isCompare = normalized.includes("相比") || normalized.includes("哪个") || normalized.includes("哪两个");

  let headline = "可以继续看这 3 类类似机会";
  let summaryLine = "除了游泳比赛，当前还可以继续看创新项目、英语竞赛和科研训练营这几类机会。";
  let reason =
    "这些机会都和当前阶段成果积累有关，但回报方式、投入强度和时间窗口不同，适合放在同一个判断视野里比较。";
  let fitFor =
    `更适合当前画像为“${profile.grade} · 关注${profile.focus}”的学生继续做阶段选择。`;
  let nextStep = "你可以继续点开类似机会，或直接问我“如果我本学期只能抓两件事，应该优先哪两个”。";

  if (normalized.includes("英语竞赛")) {
    headline = "当前更值得优先的是游泳比赛";
    summaryLine = "和英语竞赛相比，这条游泳比赛信号更适合先进入判断。";
    reason =
      "对你当前画像来说，游泳比赛和综测规则的关联更直接，且属于低可见、强时效机会；英语竞赛更像阶段补充项，但规则回报没有这条信号这么直接。";
    fitFor = "更适合大一、当前重点关注综测 / 评优、且希望抓高收益机会的学生。";
    nextStep = "如果你时间只够处理一件优先事项，先确认游泳比赛的时间与报名安排，再决定是否保留英语竞赛。";
  } else if (normalized.includes("两件事") || normalized.includes("哪两个")) {
    headline = "可优先抓：游泳比赛 + 新生创新项目";
    summaryLine = "如果你本学期只能抓两件事，建议优先保留游泳比赛和新生创新项目。";
    reason =
      "游泳比赛更偏短窗高收益，适合补充综测判断；新生创新项目更偏长期积累，能补充履历与项目经历。两者组合比单纯堆活动更均衡。";
    fitFor = "更适合大一且同时关心阶段评价与履历积累的学生。";
    nextStep = "先处理游泳比赛的时间敏感事项，再看创新项目是否需要尽早准备材料或找队友。";
  } else if (isCompare) {
    headline = "当前可以继续做轻量比较";
    summaryLine = "这类问题适合继续围绕“规则关联、回报、时效”三个维度来排优先级。";
  }

  return {
    question,
    questionType: "explore_compare",
    headline,
    summaryLine,
    blocks: makeBlocks([
      ["简要结论", summaryLine],
      ["比较理由 / 探索理由", reason],
      ["适合什么类型的用户", fitFor],
      ["下一步建议", nextStep],
    ]),
    evidence: signalContext.factContext.evidence.slice(0, 2),
    followUps: buildExploreFollowUps(),
    source: "fallback",
  };
}

export function getMainSignal(profile: UserProfile): MainSignal {
  return (
    buildMainSignalCard(profile) ??
    buildMainSignalCard(defaultProfile) ?? {
      title: "暂无推荐信号",
      tags: [],
      detailTags: [],
      description: "",
      reason: "",
      plainReason: "",
      sourceSummary: "",
      sources: [],
      metrics: [],
    }
  );
}

export function getOtherSignals(profile: UserProfile): SecondarySignal[] {
  return getHomeSignals(profile);
}

export function getDetailSections(signalId: string, profile: UserProfile): DetailSection[] {
  return buildDetailSections(profile, signalId);
}

export function getCredibilityModules(signalId: string, profile: UserProfile): CredibilityModule[] {
  return buildCredibilityModules(profile, signalId);
}

export function getSaveReminderState(signalId: string, profile: UserProfile) {
  return buildReminderState(profile, signalId);
}

export function getSignalAskContext(
  signalId: string,
  profile: UserProfile = defaultProfile,
): SignalAskContext | null {
  return buildSignalAskContext(profile, signalId);
}

export { classifyAskQuestion };

export function getReminderPageData(
  profile: UserProfile = defaultProfile,
  reminderEnabled = false,
): ReminderPageData {
  const main = getMainSignal(profile);
  const others = getOtherSignals(profile);

  return {
    reminded: reminderEnabled
      ? [
          {
            title: main.title,
            description: main.description,
            status: "已提醒",
            note: "设置报名提醒",
          },
        ]
      : [],
    deadlines: others
      .filter((item) => item.tab === "deadline" || item.tab === "reward")
      .slice(0, 2)
      .map((item) => mapSecondaryToReminderItem(item, "即将截止")),
    pending: others
      .filter((item) => item.tab === "stage" || item.tab === "related")
      .slice(0, 3)
      .map((item) => mapSecondaryToReminderItem(item, "待判断")),
  };
}

export function getStagePageData(profile: UserProfile = defaultProfile): StagePageData {
  const signalContext =
    getSignalAskContext("swim", profile) ?? getSignalAskContext("swim", defaultProfile)!;

  return {
    profileLine: `${profile.grade} · ${profile.college}`,
    currentGoal: profile.focus,
    currentPreference: profile.preference,
    recommendationBasis: signalContext.judgementBasis.slice(0, 4),
    signalFeatures: signalContext.signalFeatures,
    summary: "OpenUni 会根据你的阶段和目标，优先识别与你当前最相关的关键信号。",
  };
}

export function getDiscoveryPageData(lastSyncedAtOverride?: string): DiscoveryPageData {
  return buildDiscoveryPageData({
    lastSyncedAtOverride,
  });
}

export function getRelatedAskSignals(
  signalId: string,
  profile: UserProfile = defaultProfile,
): RelatedSignal[] {
  return getSignalAskContext(signalId, profile)?.relatedSignals ?? [];
}

export function getFeaturedSignalSourceItems(profile: UserProfile = defaultProfile) {
  return getFeaturedSignalContext(profile)?.linkedSources ?? [];
}

export function isQuestionOutsideSignalScope(question: string) {
  const normalized = normalizeQuestion(question);

  if (!normalized) {
    return false;
  }

  return !containsAny(normalized, SCOPE_KEYWORDS);
}

export function getFallbackAskResult(
  question: string,
  profile: UserProfile = defaultProfile,
  signalId = "swim",
): AskResult {
  const normalized = question.trim();
  const signalContext = getSignalAskContext(signalId, profile) ?? getSignalAskContext(signalId, defaultProfile)!;
  const questionType = classifyAskQuestion(normalized);

  if (!normalized) {
    return buildConstraintAskResult("这个问题暂时不在当前信号判断范围内。", questionType, signalContext);
  }

  if (isQuestionOutsideSignalScope(normalized)) {
    return buildConstraintAskResult(normalized, questionType, signalContext);
  }

  if (questionType === "fact") {
    return buildFactAskResult(normalized, signalContext);
  }

  if (questionType === "explore_compare") {
    return buildExploreAskResult(normalized, signalContext, profile);
  }

  return buildDecisionAskResult(normalized, signalContext, profile);
}

export const mainSignal = getMainSignal(defaultProfile);
export const otherSignals = getOtherSignals(defaultProfile);
export const detailSections = getDetailSections("swim", defaultProfile);
export const credibilityModules = getCredibilityModules("swim", defaultProfile);
export const saveReminderState = getSaveReminderState("swim", defaultProfile);
export const relatedAskSignals = getRelatedAskSignals("swim", defaultProfile);
export const swimSignalAskContext = getSignalAskContext("swim", defaultProfile);
