"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ActionBar } from "@/components/action-bar";
import { ActiveRuleIndicator } from "@/components/active-rule-indicator";
import { AppShell } from "@/components/app-shell";
import { PathPreview } from "@/components/path-preview";
import { QAExchangeCard } from "@/components/qa-exchange-card";
import { RelatedSignalCard } from "@/components/related-signal-card";
import { buildRuleQuickFacts } from "@/lib/college-rule-types";
import { shareOpenUniContent } from "@/lib/share";
import { useActiveRule } from "@/hooks/use-active-rule";
import { useProductMode } from "@/hooks/use-product-mode";
import { useProfile } from "@/hooks/use-profile";
import type { AskApiResponse } from "@/lib/ask-contract";
import { buildAskFallbackResponse } from "@/lib/ask-fallback";
import {
  classifyAskQuestion,
  defaultProfile,
  getRelatedAskSignals,
  getSignalAskContext,
  type AskResult,
  type RelatedSignal,
} from "@/lib/mock-data";
import {
  getReminderEnabled,
  getSignalActionState,
  incrementSignalShare,
  setReminderEnabled,
  setSignalPlanned,
  setSignalWatchLater,
  type SignalActionState,
} from "@/lib/storage";

const MAX_CUSTOM_QUESTION_LENGTH = 60;
const COLLAPSED_SENTINEL = "__NONE__";
const SUGGESTED_QUESTIONS = [
  "我游泳水平一般，也值得参加吗？",
  "如果我这学期时间有限，这件事优先级高吗？",
  "类似这种隐藏机会还有哪些？",
];

function defaultActionState(): SignalActionState {
  return {
    planned: false,
    watchLater: false,
    shareCount: 0,
    lastSharedAt: null,
  };
}

function toAskResult(question: string, data: AskApiResponse): AskResult {
  return {
    question,
    questionType: data.question_type,
    headline: data.headline,
    summaryLine: data.summary_line,
    blocks: data.blocks,
    evidence: data.evidence,
    followUps: data.follow_ups,
    source: data.source,
  };
}

export default function AskPage() {
  const router = useRouter();
  const { profile } = useProfile();
  const { isTutorialMode, setMode } = useProductMode();
  const { has_rule, basis_label, rule } = useActiveRule();
  const signalContext = useMemo(
    () => getSignalAskContext("swim", profile) ?? getSignalAskContext("swim", defaultProfile)!,
    [profile],
  );
  const [showPath, setShowPath] = useState(false);
  const [relatedFocused, setRelatedFocused] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [loadingQuestion, setLoadingQuestion] = useState<string | null>(null);
  const [questionOrder, setQuestionOrder] = useState<string[]>([]);
  const [resultsByQuestion, setResultsByQuestion] = useState<Record<string, AskResult>>({});
  const [relatedSignals, setRelatedSignals] = useState<RelatedSignal[]>(
    getRelatedAskSignals("swim", profile),
  );
  const [customQuestion, setCustomQuestion] = useState("");
  const [expandedQuestion, setExpandedQuestion] = useState<string>(COLLAPSED_SENTINEL);
  const [latestSettledQuestion, setLatestSettledQuestion] = useState<string | null>(null);
  const [actionState, setActionState] = useState<SignalActionState>(defaultActionState);
  const [reminderEnabled, setReminderEnabledState] = useState(false);

  const remainingCount = MAX_CUSTOM_QUESTION_LENGTH - customQuestion.length;
  const latestQuestion = questionOrder[0] ?? null;
  const latestResult = latestQuestion ? resultsByQuestion[latestQuestion] : null;
  const quickRuleFacts = rule ? buildRuleQuickFacts(rule.facts).slice(0, 4) : [];
  const sourceTitles = signalContext.sources.map((item) => item.title);

  useEffect(() => {
    setActionState(getSignalActionState("swim"));
    setReminderEnabledState(getReminderEnabled());
  }, []);

  const handleReminder = () => {
    setReminderEnabled(true);
    setReminderEnabledState(true);
    router.push("/signal/swim/success");
  };

  const scrollToRelatedSignals = () => {
    setRelatedFocused(true);
    document.getElementById("related-signals")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const focusQuestionCard = (question: string) => {
    const element = document.getElementById(`qa-card-${encodeURIComponent(question)}`);
    if (!element) {
      return;
    }

    element.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });

    window.setTimeout(() => {
      element.focus();
    }, 250);
  };

  const applyRelatedOpportunityUpdate = (items: AskApiResponse["related_opportunities"]) => {
    if (!items?.length) {
      return;
    }

    setRelatedSignals((current) =>
      current.map((signal) => {
        const matched = items.find((item) => item.title === signal.title);
        return matched
          ? {
              ...signal,
              recommendationReason: matched.recommendation_reason,
            }
          : signal;
      }),
    );
  };

  const pushQuestionToTop = (question: string) => {
    setQuestionOrder((current) => [question, ...current.filter((item) => item !== question)]);
    setExpandedQuestion(question);
  };

  const handleQuestionClick = async (rawQuestion: string) => {
    const question = rawQuestion.trim().slice(0, MAX_CUSTOM_QUESTION_LENGTH);
    if (!question || loadingQuestion) {
      return;
    }

    if (question.includes("类似") || question.includes("隐藏机会")) {
      scrollToRelatedSignals();
    }

    pushQuestionToTop(question);

    if (resultsByQuestion[question]) {
      focusQuestionCard(question);
      return;
    }

    setLoadingQuestion(question);
    setNotice(null);

    try {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 95_000);

      const response = await fetch("/api/ask", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          signalId: signalContext.id,
          question,
          profile,
        }),
        signal: controller.signal,
      });

      window.clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Ask request failed with status ${response.status}`);
      }

      const data = (await response.json()) as AskApiResponse;

      setResultsByQuestion((current) => ({
        ...current,
        [question]: toAskResult(question, data),
      }));
      setLatestSettledQuestion(question);
      applyRelatedOpportunityUpdate(data.related_opportunities);

      if (data.notice) {
        setNotice(data.notice);
      }
    } catch (error) {
      console.error("OpenUni ask page fallback:", error);

      const fallback = buildAskFallbackResponse({
        question,
        questionType: classifyAskQuestion(question),
        signal: signalContext,
        profile,
        source: "fallback",
        notice: "模型暂时不可用，已切换为结构化演示回答。",
        activeRule: rule,
      });

      setResultsByQuestion((current) => ({
        ...current,
        [question]: toAskResult(question, fallback),
      }));
      setLatestSettledQuestion(question);
      setNotice(fallback.notice ?? "模型暂时不可用，已切换为结构化演示回答。");
    } finally {
      setLoadingQuestion(null);
    }
  };

  const handleCustomSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = customQuestion.trim();
    if (!trimmed) {
      return;
    }

    void handleQuestionClick(trimmed);
    setCustomQuestion("");
  };

  const handleTogglePlanned = () => {
    const next = setSignalPlanned("swim", !actionState.planned);
    setActionState(next);
    setNotice(next.planned ? "已标记为“我准备去做”。" : "已取消“我准备去做”标记。");
  };

  const handleToggleWatchLater = () => {
    const next = setSignalWatchLater("swim", !actionState.watchLater);
    setActionState(next);
    setNotice(next.watchLater ? "已标记为“稍后再看”。" : "已取消“稍后再看”标记。");
  };

  const handleShare = async () => {
    try {
      const message = await shareOpenUniContent({
        title: `${signalContext.title}｜OpenUni`,
        summary: latestResult?.summaryLine ?? "这条机会和学院规则、阶段收益有关，值得一起判断。",
        href: `${window.location.origin}/signal/swim`,
      });

      const next = incrementSignalShare("swim");
      setActionState(next);
      setNotice(message);
    } catch {
      setNotice("这条内容适合转给同学一起看。");
    }
  };

  const handleEnterTutorialMode = () => {
    setMode("tutorial");
    setNotice("已切换到教学示例模式。");
  };

  const handleExitTutorial = () => {
    setMode("formal");
    router.push("/discover");
  };

  useEffect(() => {
    if (!latestSettledQuestion) {
      return;
    }

    focusQuestionCard(latestSettledQuestion);
  }, [latestSettledQuestion]);

  useEffect(() => {
    const controller = new AbortController();

    const hydrateRelatedSignals = async () => {
      try {
        const response = await fetch("/api/ask", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            signalId: signalContext.id,
            question: "类似这种隐藏机会还有哪些？",
            profile,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as AskApiResponse;
        applyRelatedOpportunityUpdate(data.related_opportunities);
      } catch {
        // Keep local fallback reasons.
      }
    };

    void hydrateRelatedSignals();

    return () => controller.abort();
  }, [profile, signalContext.id]);

  useEffect(() => {
    setRelatedSignals(getRelatedAskSignals("swim", profile));
  }, [profile]);

  return (
    <AppShell>
      <div className="space-y-5 pb-28">
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/signal/swim"
            className="inline-flex items-center gap-2 rounded-full border border-brand-100 bg-white/88 px-4 py-2.5 text-sm font-medium text-brand-700 shadow-soft backdrop-blur transition hover:border-brand-200 hover:bg-brand-50/80"
          >
            返回这条信号
          </Link>
          <Link
            href="/home"
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/82 px-4 py-2.5 text-sm font-medium text-slate-600 shadow-soft backdrop-blur transition hover:border-brand-100 hover:bg-white hover:text-brand-700"
          >
            返回信号页
          </Link>
        </div>

        <section className="rounded-[22px] border border-amber-100 bg-amber-50/85 px-4 py-3 shadow-soft">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-amber-800">
                  {isTutorialMode ? "新手教程" : "教学示例"}
                </span>
                <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-amber-700">
                  Ask 教学案例
                </span>
              </div>
              <p className="mt-2 text-sm leading-6 text-amber-950/85">
                这一页继续用 swim 案例演示 OpenUni 怎样把判断变成可继续追问的结论。
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {!isTutorialMode ? (
                <button
                  type="button"
                  onClick={handleEnterTutorialMode}
                  className="inline-flex rounded-full border border-amber-200 bg-white px-3 py-1.5 text-sm font-medium text-amber-800 transition hover:bg-amber-100"
                >
                  切换到教程模式
                </button>
              ) : null}
              <button
                type="button"
                onClick={handleExitTutorial}
                className="inline-flex rounded-full border border-amber-200 bg-white px-3 py-1.5 text-sm font-medium text-amber-800 transition hover:bg-amber-100"
              >
                返回正式使用
              </button>
            </div>
          </div>
        </section>

        <header className="card-panel rounded-[30px] p-6">
          <p className="text-sm font-medium tracking-[0.16em] text-brand-700">ASK 决策支持</p>
          <h1 className="mt-3 text-[32px] font-semibold leading-[1.18] text-ink">问一问 OpenUni</h1>
          <div className="mt-5 rounded-[24px] bg-slate-50 p-4">
            <p className="text-sm text-slate-500">当前讨论：{signalContext.title}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {signalContext.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-brand-50 px-3 py-1.5 text-sm font-medium text-brand-700"
                >
                  {tag}
                </span>
              ))}
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600">
                已归并 {signalContext.sources.length} 条来源
              </span>
            </div>
            <p className="mt-4 text-[15px] leading-7 text-slate-600">
              OpenUni 会结合当前信号、你的阶段画像和学院规则来回答。
            </p>
          </div>
        </header>

        <ActiveRuleIndicator
          basisLabel={basis_label}
          summary={
            has_rule && rule
              ? `${rule.summary} Ask 会优先用这份导入规则解释收益、优先级和事实问题。`
              : "当前尚未导入学院规则，Ask 会先参考系统默认规则样本，再结合信号来源给出判断。"
          }
          isCustom={has_rule}
          highlights={quickRuleFacts}
          highlightsTitle="当前问答正在参考的规则事实"
        />

        <section className="card-panel rounded-[28px] p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-slate-500">判断之后可以直接做什么</p>
              <h2 className="mt-2 text-[22px] font-semibold text-ink">把结论变成下一步动作</h2>
              <p className="mt-2 text-[15px] leading-7 text-slate-600">
                {latestResult?.summaryLine ??
                  "如果你已经形成初步判断，就可以直接决定下一步。"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {reminderEnabled ? (
                <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700">
                  提醒已开启
                </span>
              ) : null}
              {actionState.planned ? (
                <span className="rounded-full bg-brand-50 px-3 py-1.5 text-sm font-medium text-brand-700">
                  我准备去做
                </span>
              ) : null}
              {actionState.watchLater ? (
                <span className="rounded-full bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-700">
                  稍后再看
                </span>
              ) : null}
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <button
              type="button"
              onClick={handleTogglePlanned}
              className={[
                "rounded-[22px] border px-4 py-4 text-left transition",
                actionState.planned
                  ? "border-brand-200 bg-brand-50 text-brand-700"
                  : "border-slate-200 bg-white text-slate-700 hover:border-brand-200 hover:text-brand-700",
              ].join(" ")}
            >
              <p className="text-sm font-semibold">标记“我准备去做”</p>
              <p className="mt-2 text-xs leading-6 text-current/80">把这条机会从判断阶段推进到行动阶段。</p>
            </button>

            <button
              type="button"
              onClick={handleToggleWatchLater}
              className={[
                "rounded-[22px] border px-4 py-4 text-left transition",
                actionState.watchLater
                  ? "border-amber-200 bg-amber-50 text-amber-700"
                  : "border-slate-200 bg-white text-slate-700 hover:border-amber-200 hover:text-amber-700",
              ].join(" ")}
            >
              <p className="text-sm font-semibold">稍后再看</p>
              <p className="mt-2 text-xs leading-6 text-current/80">先留在观察列表，避免现在匆忙决策。</p>
            </button>

            <button
              type="button"
              onClick={handleReminder}
              className="rounded-[22px] border border-slate-200 bg-white px-4 py-4 text-left text-slate-700 transition hover:border-brand-200 hover:text-brand-700"
            >
              <p className="text-sm font-semibold">设置提醒</p>
              <p className="mt-2 text-xs leading-6 text-current/80">在报名截止前再提醒一次，避免错过时间窗口。</p>
            </button>

            <button
              type="button"
              onClick={() => void handleShare()}
              className="rounded-[22px] border border-slate-200 bg-white px-4 py-4 text-left text-slate-700 transition hover:border-brand-200 hover:text-brand-700"
            >
              <p className="text-sm font-semibold">分享给同学 / 转发到群聊</p>
              <p className="mt-2 text-xs leading-6 text-current/80">已分享 {actionState.shareCount} 次，可快速拉同学一起判断。</p>
            </button>
          </div>
        </section>

        {notice ? (
          <section className="rounded-[20px] border border-brand-100 bg-brand-50/80 px-4 py-3 text-sm leading-6 text-brand-800">
            {notice}
          </section>
        ) : null}

        <section className="card-panel rounded-[28px] p-5">
          <p className="text-sm font-medium text-slate-500">你可以这样继续问</p>
          <p className="mt-2 text-[15px] leading-7 text-slate-600">
            Ask 不只是解释信息，它会围绕“值不值得、优先级、事实依据、下一步动作”来回答。
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            {SUGGESTED_QUESTIONS.map((question) => {
              const hasResult = Boolean(resultsByQuestion[question]);
              const isLoading = loadingQuestion === question;
              const isRelatedQuestion = question === SUGGESTED_QUESTIONS[2];

              return (
                <button
                  key={question}
                  type="button"
                  onClick={() => void handleQuestionClick(question)}
                  className={[
                    "rounded-full border px-4 py-2 text-left text-sm font-medium transition",
                    isLoading || hasResult
                      ? "border-brand-200 bg-brand-50 text-brand-700"
                      : "border-brand-300 bg-white text-slate-700 hover:border-brand-400 hover:text-brand-700",
                    isRelatedQuestion && relatedFocused ? "ring-2 ring-brand-100" : "",
                    loadingQuestion && !isLoading ? "opacity-60" : "",
                  ].join(" ")}
                >
                  {question}
                </button>
              );
            })}
          </div>

          <form className="mt-4 space-y-3" onSubmit={handleCustomSubmit}>
            <div className="rounded-[22px] border border-slate-200 bg-white px-4 py-4 shadow-soft">
              <label className="block text-sm font-medium text-slate-500">继续问我</label>
              <textarea
                value={customQuestion}
                onChange={(event) =>
                  setCustomQuestion(event.target.value.slice(0, MAX_CUSTOM_QUESTION_LENGTH))
                }
                rows={3}
                placeholder="继续问我：值不值得做、为什么、和什么相比更优先"
                className="mt-3 w-full resize-none border-0 bg-transparent p-0 text-[15px] leading-7 text-ink outline-none placeholder:text-slate-400"
              />
              <div className="mt-3 flex items-center justify-between">
                <p className="text-xs text-slate-400">还可输入 {remainingCount} 字</p>
                <button
                  type="submit"
                  disabled={!customQuestion.trim() || Boolean(loadingQuestion)}
                  className="inline-flex rounded-full bg-ink px-4 py-2 text-sm font-medium text-white transition hover:translate-y-[-1px] disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  继续判断
                </button>
              </div>
            </div>
          </form>
        </section>

        {latestResult ? (
          <section className="rounded-[22px] border border-brand-100 bg-white/84 px-4 py-4 shadow-soft">
            <p className="text-sm font-medium text-slate-500">当前最新建议</p>
            <p className="mt-2 text-base font-semibold leading-7 text-ink">{latestResult.summaryLine}</p>
          </section>
        ) : null}

        <section className="space-y-4">
          {questionOrder.length > 0 ? (
            questionOrder.map((question, index) => (
              <QAExchangeCard
                key={question}
                id={`qa-card-${encodeURIComponent(question)}`}
                index={index + 1}
                question={question}
                result={resultsByQuestion[question]}
                loading={loadingQuestion === question}
                expanded={expandedQuestion === question}
                isNewest={question === latestQuestion}
                onToggleExpand={() =>
                  setExpandedQuestion((current) =>
                    current === question ? COLLAPSED_SENTINEL : question,
                  )
                }
                onFollowUpClick={(nextQuestion) => void handleQuestionClick(nextQuestion)}
                basisLabel={basis_label}
                basisFacts={quickRuleFacts}
                sourceTitles={sourceTitles}
                isCustomBasis={has_rule}
              />
            ))
          ) : (
            <section className="rounded-[22px] border border-dashed border-slate-200 bg-white/76 px-4 py-5">
              <p className="text-[15px] leading-7 text-slate-600">
                先点一个推荐问题，或直接输入你最关心的判断问题。OpenUni 会用信号来源、阶段画像和规则事实来回答。
              </p>
            </section>
          )}
        </section>

        <section id="related-signals" className="space-y-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-slate-500">类似机会</p>
              <h2 className="mt-2 text-[24px] font-semibold text-ink">如果你还想继续探索，可以从这些开始</h2>
            </div>
            <Link href="/home" className="text-sm font-medium text-brand-700">
              返回信号页
            </Link>
          </div>

          <div className="space-y-3">
            {relatedSignals.map((signal) => (
              <RelatedSignalCard key={signal.title} signal={signal} />
            ))}
          </div>
        </section>

        {showPath ? <PathPreview /> : null}
      </div>

      <ActionBar
        primaryLabel="设置报名提醒"
        secondaryLabel="返回详情页"
        tertiaryLabel="查看参与路径"
        onPrimaryClick={handleReminder}
        onSecondaryClick={() => router.push("/signal/swim")}
        onTertiaryClick={() => setShowPath((current) => !current)}
      />
    </AppShell>
  );
}
