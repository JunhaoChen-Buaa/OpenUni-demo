import type { AskApiResponse, AskQuestionType } from "@/lib/ask-contract";
import type { SignalAskContext, UserProfile } from "@/lib/mock-data";
import type { StoredCollegeRule } from "@/lib/college-rule-types";

function normalizeQuestion(question: string) {
  return question.replace(/\s+/g, "");
}

function collectRuleEvidence(rule: StoredCollegeRule) {
  const fieldEvidence = Object.values(rule.facts.evidence_by_field)
    .flatMap((items) => items ?? [])
    .slice(0, 4)
    .map((item) => ({
      source: rule.facts.rule_title ?? rule.file_name,
      authority_level: "用户导入",
      relation_type: `规则依据 · 第${item.source_pages.join("/") || "?"}页`,
      excerpt: item.evidence_excerpt,
    }));

  if (fieldEvidence.length > 0) {
    return fieldEvidence;
  }

  return rule.facts.evidence_excerpts.slice(0, 3).map((excerpt) => ({
    source: rule.facts.rule_title ?? rule.file_name,
    authority_level: "用户导入",
    relation_type: "学院规则",
    excerpt,
  }));
}

function buildRuleNotice(rule: StoredCollegeRule, profile: UserProfile, signal: SignalAskContext) {
  return [
    `当前判断依据：${rule.basis_label}`,
    `用户画像：${profile.grade} · ${profile.college} · ${profile.focus}`,
    `信号特征：${signal.signalFeatures.join(" / ")}`,
  ].join("｜");
}

function buildFactBlocks({
  directAnswer,
  extractionStatus,
  nextStep,
  rule,
}: {
  directAnswer: string;
  extractionStatus: string;
  nextStep: string;
  rule: StoredCollegeRule;
}) {
  return [
    { label: "直接回答", content: directAnswer },
    { label: "信息来源", content: rule.basis_label },
    { label: "当前是否已明确提取", content: extractionStatus },
    { label: "可继续查看的依据 / 下一步", content: nextStep },
  ];
}

export function buildRuleAwareFactResponse({
  question,
  questionType,
  signal,
  profile,
  rule,
  source = "model",
}: {
  question: string;
  questionType: AskQuestionType;
  signal: SignalAskContext;
  profile: UserProfile;
  rule: StoredCollegeRule | null;
  source?: AskApiResponse["source"];
}): AskApiResponse | null {
  if (!rule || questionType !== "fact") {
    return null;
  }

  const normalized = normalizeQuestion(question);
  const facts = rule.facts;
  const evidence = collectRuleEvidence(rule);

  const asksSportsFixedScore =
    normalized.includes("体育模块") &&
    (normalized.includes("多少分") || normalized.includes("具体占多少") || normalized.includes("固定权重"));
  const asksWeight =
    normalized.includes("95%") ||
    normalized.includes("5%") ||
    normalized.includes("占多少") ||
    normalized.includes("权重") ||
    normalized.includes("比例");
  const asksDeadline =
    normalized.includes("截止") || normalized.includes("申报时间") || normalized.includes("什么时候");
  const asksEligibility =
    normalized.includes("门槛") || normalized.includes("资格") || normalized.includes("适用年级");
  const asksRule =
    normalized.includes("规则") ||
    normalized.includes("条款") ||
    normalized.includes("依据") ||
    normalized.includes("怎么算");
  const asksSportsDetail =
    normalized.includes("个人竞赛") ||
    normalized.includes("团体竞赛") ||
    normalized.includes("校运会") ||
    normalized.includes("体育评价");

  if (!asksSportsFixedScore && !asksWeight && !asksDeadline && !asksEligibility && !asksRule && !asksSportsDetail) {
    return null;
  }

  let directAnswer = "当前导入的学院规则里，还没有提取到与你这个问题直接对应的明确字段。";
  let extractionStatus = "当前知识层已接入，但该项事实尚未明确提取。";
  let nextStep = "你可以继续查看规则原文，或让我帮你定位与这个问题最相关的条款。";

  if (asksSportsFixedScore) {
    if (facts.sports_module_score_known && facts.sports_module_score) {
      directAnswer = `当前导入规则中已提取到体育相关固定分值：${facts.sports_module_score}。`;
      extractionStatus = "该分值已被明确提取，可直接作为当前判断依据。";
    } else if (facts.sports_scoring_rules_present) {
      directAnswer =
        "当前导入规则已明确识别到体育评价存在分级加分规则，但没有给出统一固定的“体育模块总分值 / 固定权重”。";
      extractionStatus = "体育评价规则已明确提取，统一固定分值仍属于未明确字段。";
      nextStep = "你可以继续问我：体育个人竞赛怎么计分，或体育团体竞赛怎么计分。";
    }
  } else if (asksWeight) {
    if (
      typeof facts.academic_weight_percent === "number" &&
      typeof facts.comprehensive_quality_weight_percent === "number"
    ) {
      directAnswer = `当前导入规则明确写到：学业成绩占${facts.academic_weight_percent}%，综合素质测评成绩占${facts.comprehensive_quality_weight_percent}%。`;
      extractionStatus = "权重信息已明确提取。";
      nextStep = "你可以继续问我：这意味着像体育比赛这样的机会会怎样影响当前综合成绩判断。";
    }
  } else if (asksDeadline) {
    if (facts.key_deadlines.length > 0) {
      directAnswer = `当前导入规则中识别到的关键时间包括：${facts.key_deadlines.join("；")}。`;
      extractionStatus = "规则中的时间要求已被提取。";
    }
  } else if (asksEligibility) {
    if (facts.applicable_grades.length > 0) {
      directAnswer = `当前导入规则中识别到的适用范围包括：${facts.applicable_grades.join("、")}。`;
      extractionStatus = "适用范围已被结构化提取。";
      nextStep = "如果你想确认评奖评优或推免资格，还可以继续问我底线要求是什么。";
    }
  } else if (asksSportsDetail) {
    if (facts.sports_personal_competition_rules.length > 0 || facts.sports_team_competition_rules.length > 0) {
      directAnswer = [
        facts.sports_personal_competition_rules[0],
        facts.sports_team_competition_rules[0],
        facts.sports_examples_or_special_cases[0],
      ]
        .filter(Boolean)
        .join(" ");
      extractionStatus = "体育评价章节与计分表已被明确提取。";
      nextStep = "你可以继续问我：这些体育规则为什么会影响这次游泳比赛的优先级判断。";
    }
  } else if (asksRule) {
    if (facts.sports_module_included === true) {
      const bottomLineNotice =
        facts.annual_bottomline_required || facts.recommendation_bottomline_required
          ? "同时，这份规则还设置了德智体美劳底线要求。"
          : "";

      directAnswer = `当前导入规则已识别到：体育评价被纳入综合素质测评结构，且体育章节存在明确计分规则。${bottomLineNotice}`;
      extractionStatus = "规则关系已被明确提取，可作为当前判断依据。";
      nextStep = "你可以继续追问：体育规则具体怎么计分，或 95% / 5% 的结构会怎样影响判断。";
    }
  }

  return {
    question_type: "fact",
    headline:
      directAnswer.includes("未明确") || directAnswer.includes("没有提取")
        ? "当前规则中尚未提取到明确事实"
        : "已找到当前学院规则依据",
    summary_line: directAnswer,
    blocks: buildFactBlocks({ directAnswer, extractionStatus, nextStep, rule }),
    evidence: evidence.length > 0 ? evidence : signal.factContext.evidence.slice(0, 2),
    follow_ups: {
      explain: "继续解释一下这条规则为什么会影响这次比赛判断",
      explore: "类似这种会被学院规则影响的机会还有哪些",
      compare: "和英语竞赛相比，哪个更值得我现在优先做",
    },
    related_opportunities: signal.relatedSignals.map((item) => ({
      title: item.title,
      recommendation_reason: item.recommendationReason,
    })),
    source,
    notice: buildRuleNotice(rule, profile, signal),
  };
}
