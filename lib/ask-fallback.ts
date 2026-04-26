import type { AskApiResponse, AskQuestionType } from "@/lib/ask-contract";
import type { SignalAskContext, UserProfile } from "@/lib/mock-data";
import type { StoredCollegeRule } from "@/lib/college-rule-types";
import { buildRuleAwareFactResponse } from "@/lib/college-rule-ask";

function normalizeQuestion(question: string) {
  return question.replace(/\s+/g, "");
}

function buildRelated(signal: SignalAskContext) {
  return signal.relatedSignals.map((item) => ({
    title: item.title,
    recommendation_reason: item.recommendationReason,
  }));
}

function buildDecisionResponse(
  question: string,
  signal: SignalAskContext,
  profile: UserProfile,
  source: AskApiResponse["source"],
  notice?: string,
): AskApiResponse {
  const normalized = normalizeQuestion(question);
  const negativeIntent =
    normalized.includes("时间完全排不开") ||
    normalized.includes("没有时间") ||
    normalized.includes("来不及") ||
    normalized.includes("不想参加");

  const headline = negativeIntent ? "暂不建议优先做" : "建议优先评估";
  const summaryLine = negativeIntent
    ? "如果你这学期时间冲突非常明显，这件事可以先不作为最高优先级，但不建议完全忽略。"
    : "这条信号仍值得你优先评估，因为它兼具规则关联、潜在回报和时间窗口。";

  return {
    question_type: "decision",
    headline,
    summary_line: summaryLine,
    blocks: [
      { label: "判断结论", content: summaryLine },
      {
        label: "为什么这样判断",
        content: negativeIntent
          ? "它本身仍是高价值信号，但你的真实时间约束会影响是否值得立刻投入。OpenUni 会优先推荐“高价值且你能执行”的事项。"
          : "这条机会与当前阶段常见关注目标高度重合，同时具备低可见、强时效、高收益三个特征，所以不适合被当作普通活动对待。",
      },
      {
        label: "判断依据",
        content: [
          `用户画像：${profile.grade} · ${profile.college} · ${profile.focus}`,
          `信号特征：${signal.signalFeatures.join(" / ")}`,
          ...signal.judgementBasis.slice(1, 3),
        ].join("；"),
      },
      {
        label: "下一步建议",
        content: negativeIntent
          ? "先确认本周时间安排。如果冲突很大，可以把它降为“待判断”；如果还有余量，再优先确认报名条件和时间。"
          : signal.suggestedAction,
      },
    ],
    evidence: signal.factContext.evidence.slice(0, 3),
    follow_ups: {
      explain: "如果我最后没拿到名次，这件事还值得做吗？",
      explore: "类似这种隐藏机会还有哪些？",
      compare: "和英语竞赛相比，哪个更值得优先做？",
    },
    related_opportunities: buildRelated(signal),
    source,
    notice,
  };
}

function buildFactResponse(
  question: string,
  signal: SignalAskContext,
  source: AskApiResponse["source"],
  notice?: string,
): AskApiResponse {
  const normalized = normalizeQuestion(question);
  const asksScore = normalized.includes("多少分") || normalized.includes("分值");
  const asksDeadline = normalized.includes("截止") || normalized.includes("报名时间");
  const asksEligibility = normalized.includes("门槛") || normalized.includes("资格");
  const asksRule = normalized.includes("规则") || normalized.includes("条款") || normalized.includes("依据");

  let directAnswer = "当前知识库里还没有提取到与你这个问题完全对应的明确字段。";
  let extractionStatus = "当前知识层已接入，但该事实尚未明确提取。";
  let nextStep = "你可以继续查看相关来源，或让我帮你定位最相关的规则条款。";

  if (asksScore) {
    if (signal.factContext.scoreRuleKnown && signal.factContext.sportsModuleScore) {
      directAnswer = `当前知识库已提取到体育相关分值：${signal.factContext.sportsModuleScore}。`;
      extractionStatus = "该分值已被明确提取。";
    } else if (signal.factContext.sportsModuleIncluded === true) {
      directAnswer = "当前知识库中尚未提取到“体育模块具体占多少分”的明确数值。";
      extractionStatus = "目前只识别到“体育模块计入综合素质评价”，但未解析出具体分值字段。";
      nextStep = "你可以继续查看规则原文，或让我帮你定位和“体育模块”最相关的条款。";
    }
  } else if (asksDeadline) {
    if (signal.factContext.deadline) {
      directAnswer = `当前知识库已识别到的时间信息是：${signal.factContext.deadline}。`;
      extractionStatus = "时间字段已明确提取。";
    }
  } else if (asksEligibility) {
    if (signal.factContext.eligibility) {
      directAnswer = `当前知识库已识别到的基础条件是：${signal.factContext.eligibility}`;
      extractionStatus = "门槛信息已明确提取。";
    }
  } else if (asksRule) {
    if (signal.factContext.sportsModuleIncluded === true) {
      directAnswer = "当前知识库识别到：体育模块计入综合素质评价，因此这条机会具备规则关联基础。";
      extractionStatus = "规则关系已被提取。";
    }
  }

  return {
    question_type: "fact",
    headline: directAnswer.includes("尚未提取") ? "当前知识库尚未提取到明确事实" : "已找到相关事实依据",
    summary_line: directAnswer,
    blocks: [
      { label: "直接回答", content: directAnswer },
      {
        label: "信息来源",
        content:
          signal.sources
            .slice(0, 3)
            .map((item) => `${item.title}（${item.authorityLevel}）`)
            .join(" / ") || "当前信号关联来源",
      },
      { label: "当前是否已明确提取", content: extractionStatus },
      { label: "可继续查看的依据 / 下一步", content: nextStep },
    ],
    evidence: signal.factContext.evidence.slice(0, 3),
    follow_ups: {
      explain: "继续解释一下这条规则为什么会影响这次比赛判断",
      explore: "类似这种会被规则影响的机会还有哪些？",
      compare: "和英语竞赛相比，哪个更值得优先做？",
    },
    related_opportunities: buildRelated(signal),
    source,
    notice,
  };
}

function buildExploreResponse(
  signal: SignalAskContext,
  profile: UserProfile,
  source: AskApiResponse["source"],
  notice?: string,
): AskApiResponse {
  const topRelated = signal.relatedSignals.slice(0, 2).map((item) => item.title).join("、");

  return {
    question_type: "explore_compare",
    headline: "值得继续比较和延展",
    summary_line: `如果你这学期只能优先抓少数几件事，这条信号通常应该和 ${topRelated || "一到两条高价值机会"} 一起进入优先判断名单。`,
    blocks: [
      {
        label: "简要结论",
        content: `这类问题不需要一次性扩展很多信息，先围绕当前信号和最相近的 2-3 条机会做轻量比较更有价值。`,
      },
      {
        label: "比较理由 / 探索理由",
        content: `当前这条信号的优势在于 ${signal.signalFeatures.join(" / ")}。如果和其它机会比较，优先看规则关联是否明确、收益是否可见、窗口是否短。`,
      },
      {
        label: "适合什么类型的用户",
        content: `${profile.grade}、当前更关注 ${profile.focus}，且希望优先抓 ${profile.preference} 的用户，更适合先比较这类“高收益且容易被忽略”的机会。`,
      },
      {
        label: "下一步建议",
        content: "你可以继续追问具体比较对象，例如“和英语竞赛相比哪个更值得优先做”，让判断更直接。 ",
      },
    ],
    evidence: signal.factContext.evidence.slice(0, 2),
    follow_ups: {
      explain: "为什么这类隐藏机会更应该提前进入视野？",
      explore: "类似这种隐藏机会还有哪些？",
      compare: "如果我本学期只能抓两件事，应该优先哪两个？",
    },
    related_opportunities: buildRelated(signal),
    source,
    notice,
  };
}

export function buildAskFallbackResponse({
  question,
  questionType,
  signal,
  profile,
  source,
  notice,
  activeRule,
  guardrail = false,
}: {
  question: string;
  questionType: AskQuestionType;
  signal: SignalAskContext;
  profile: UserProfile;
  source: AskApiResponse["source"];
  notice?: string;
  activeRule?: StoredCollegeRule | null;
  guardrail?: boolean;
}): AskApiResponse {
  if (guardrail) {
    return {
      question_type: questionType,
      headline: "我会先聚焦这条信号本身",
      summary_line: "OpenUni 当前只围绕这条信号、你的用户画像和相近机会来给出判断，避免变成泛聊天。",
      blocks: [
        {
          label: questionType === "fact" ? "直接回答" : questionType === "explore_compare" ? "简要结论" : "判断结论",
          content: "这个问题已经超出了当前信号范围，我建议先回到这条信号本身，或改问和规则、优先级、报名条件更相关的问题。",
        },
        {
          label: questionType === "fact" ? "信息来源" : questionType === "explore_compare" ? "比较理由 / 探索理由" : "为什么这样判断",
          content: "OpenUni 在这个页面里主要做信号判断，而不是泛搜索或日常闲聊。",
        },
        {
          label: questionType === "fact" ? "当前是否已明确提取" : questionType === "explore_compare" ? "适合什么类型的用户" : "判断依据",
          content: `当前上下文只包含这条信号、你的画像以及相关来源：${signal.sources
            .slice(0, 2)
            .map((item) => item.title)
            .join(" / ")}。`,
        },
        {
          label: "下一步建议",
          content: "你可以直接问：值不值得做、优先级高吗、报名截止时间是什么时候、类似机会还有哪些。",
        },
      ],
      evidence: signal.factContext.evidence.slice(0, 2),
      follow_ups: {
        explain: "为什么 OpenUni 认为它和综测相关？",
        explore: "类似这种隐藏机会还有哪些？",
        compare: "和英语竞赛相比，哪个更值得优先做？",
      },
      related_opportunities: buildRelated(signal),
      source,
      notice,
    };
  }

  const ruleResponse = buildRuleAwareFactResponse({
    question,
    questionType,
    signal,
    profile,
    rule: activeRule ?? null,
    source,
  });

  if (ruleResponse) {
    return notice ? { ...ruleResponse, notice } : ruleResponse;
  }

  if (questionType === "fact") {
    return buildFactResponse(question, signal, source, notice);
  }

  if (questionType === "explore_compare") {
    return buildExploreResponse(signal, profile, source, notice);
  }

  return buildDecisionResponse(question, signal, profile, source, notice);
}
