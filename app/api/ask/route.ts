import { NextRequest, NextResponse } from "next/server";
import type { AskApiRequest, AskApiResponse, AskQuestionType } from "@/lib/ask-contract";
import { buildAskFallbackResponse } from "@/lib/ask-fallback";
import { buildRuleAwareFactResponse } from "@/lib/college-rule-ask";
import type { StoredCollegeRule } from "@/lib/college-rule-types";
import { getStoredCollegeRule } from "@/lib/college-rule-store";
import { requestMiniMaxDecision } from "@/lib/deepseek";
import {
  classifyAskQuestion,
  defaultProfile,
  getSignalAskContext,
  isQuestionOutsideSignalScope,
  type UserProfile,
} from "@/lib/mock-data";

export const runtime = "nodejs";

const MAX_QUESTION_LENGTH = 80;

function normalizeProfile(input: unknown): UserProfile {
  const profile = typeof input === "object" && input !== null ? input : {};
  const safeProfile = profile as Partial<UserProfile>;

  return {
    grade: typeof safeProfile.grade === "string" ? safeProfile.grade : defaultProfile.grade,
    college: typeof safeProfile.college === "string" ? safeProfile.college : defaultProfile.college,
    focus: typeof safeProfile.focus === "string" ? safeProfile.focus : defaultProfile.focus,
    preference:
      typeof safeProfile.preference === "string"
        ? safeProfile.preference
        : defaultProfile.preference,
  };
}

function buildFallback(
  question: string,
  questionType: AskQuestionType,
  signalId: string,
  profile: UserProfile,
  source: AskApiResponse["source"],
  notice?: string,
  guardrail = false,
  activeRule: StoredCollegeRule | null = null,
) {
  const signal = getSignalAskContext(signalId, profile) ?? getSignalAskContext("swim", defaultProfile);

  return buildAskFallbackResponse({
    question,
    questionType,
    signal: signal ?? getSignalAskContext("swim", defaultProfile)!,
    profile,
    source,
    notice,
    activeRule,
    guardrail,
  });
}

export async function POST(request: NextRequest) {
  let body: Partial<AskApiRequest> | null = null;

  try {
    body = (await request.json()) as Partial<AskApiRequest>;
  } catch {
    return NextResponse.json(
      buildFallback("", "decision", "swim", defaultProfile, "fallback"),
      { status: 200 },
    );
  }

  const rawQuestion = typeof body?.question === "string" ? body.question : "";
  const question = rawQuestion.trim().slice(0, MAX_QUESTION_LENGTH);
  const signalId = typeof body?.signalId === "string" ? body.signalId : "swim";
  const profile = normalizeProfile(body?.profile);
  const signal = getSignalAskContext(signalId, profile);
  const questionType = classifyAskQuestion(question);
  const activeRule = await getStoredCollegeRule();

  if (!signal || !question) {
    return NextResponse.json(
      buildFallback(question, questionType, signalId, profile, "fallback", undefined, false, activeRule),
      { status: 200 },
    );
  }

  if (isQuestionOutsideSignalScope(question)) {
    return NextResponse.json(
      buildFallback(
        question,
        questionType,
        signalId,
        profile,
        "guardrail",
        "OpenUni 当前会先聚焦这条信号本身，以及与它最相关的规则、优先级和下一步动作。",
        true,
        activeRule,
      ),
      { status: 200 },
    );
  }

  const directRuleFactResponse = buildRuleAwareFactResponse({
    question,
    questionType,
    signal,
    profile,
    rule: activeRule,
    source: "fallback",
  });

  if (directRuleFactResponse) {
    return NextResponse.json(directRuleFactResponse);
  }

  try {
    const result = await requestMiniMaxDecision({
      profile,
      signal,
      question,
      questionType,
      activeRule,
    });

    return NextResponse.json<AskApiResponse>({
      ...result,
      related_opportunities:
        result.related_opportunities.length > 0
          ? result.related_opportunities
          : signal.relatedSignals.map((item) => ({
              title: item.title,
              recommendation_reason: item.recommendationReason,
            })),
      source: "model",
    });
  } catch (error) {
    console.error("OpenUni ask route fallback:", error);

    const ruleFallback = buildRuleAwareFactResponse({
      question,
      questionType,
      signal,
      profile,
      rule: activeRule,
      source: "fallback",
    });

    if (ruleFallback) {
      return NextResponse.json(
        {
          ...ruleFallback,
          notice: "模型暂时不可用，当前已切换为基于已导入学院规则的本地判断结果。",
        },
        { status: 200 },
      );
    }

    return NextResponse.json(
      buildFallback(
        question,
        questionType,
        signalId,
        profile,
        "fallback",
        "模型暂时不可用，当前已切换为本地知识层结果。",
        false,
        activeRule,
      ),
      { status: 200 },
    );
  }
}
