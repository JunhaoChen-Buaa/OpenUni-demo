"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ActionBar } from "@/components/action-bar";
import { ActiveRuleIndicator } from "@/components/active-rule-indicator";
import { AppShell } from "@/components/app-shell";
import { CredibilityModuleCard } from "@/components/credibility-module";
import { DetailSectionCard } from "@/components/detail-section-card";
import { PathPreview } from "@/components/path-preview";
import { buildRuleQuickFacts } from "@/lib/college-rule-types";
import { shareOpenUniContent } from "@/lib/share";
import { useActiveRule } from "@/hooks/use-active-rule";
import { useProductMode } from "@/hooks/use-product-mode";
import { useProfile } from "@/hooks/use-profile";
import {
  getCredibilityModules,
  getDetailSections,
  getMainSignal,
  getSignalAskContext,
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

function defaultActionState(): SignalActionState {
  return {
    planned: false,
    watchLater: false,
    shareCount: 0,
    lastSharedAt: null,
  };
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "尚未分享";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function uniqueItems(items: string[]) {
  return Array.from(new Set(items.filter(Boolean)));
}

export default function SignalDetailPage() {
  const router = useRouter();
  const { profile } = useProfile();
  const { isTutorialMode, setMode } = useProductMode();
  const { has_rule, basis_label, rule } = useActiveRule();
  const [showPath, setShowPath] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionState, setActionState] = useState<SignalActionState>(defaultActionState);
  const [reminderEnabled, setReminderEnabledState] = useState(false);

  const mainSignal = useMemo(() => getMainSignal(profile), [profile]);
  const detailSections = useMemo(() => getDetailSections("swim", profile), [profile]);
  const credibilityModules = useMemo(() => getCredibilityModules("swim", profile), [profile]);
  const signalContext = useMemo(() => getSignalAskContext("swim", profile), [profile]);

  useEffect(() => {
    setActionState(getSignalActionState("swim"));
    setReminderEnabledState(getReminderEnabled());
  }, []);

  const mergedSourceGroups = useMemo(() => {
    const sources = signalContext?.sources ?? [];
    const ruleSources = sources.filter((source) => source.relationType === "规则依据");
    const noticeSources = sources.filter(
      (source) => source.relationType === "报名信息" || (source.authorityLevel === "官方" && source.relationType !== "规则依据"),
    );
    const referenceSources = sources.filter(
      (source) =>
        source.authorityLevel !== "官方" ||
        source.relationType === "经验补充" ||
        source.relationType === "收益解释",
    );

    return [
      {
        title: "官方规则来源",
        description: "帮助 OpenUni 判断这条机会是否真的与学院评价规则有关。",
        items: uniqueItems(ruleSources.map((source) => source.title)),
      },
      {
        title: "官方通知来源",
        description: "提供报名时间、参与路径和当前窗口期等明确信息。",
        items: uniqueItems(noticeSources.map((source) => source.title)),
      },
      {
        title: "补充参考来源",
        description: "补足经验视角和潜在收益解释，帮助做更稳的判断。",
        items: uniqueItems(referenceSources.map((source) => source.title)),
      },
    ].filter((group) => group.items.length > 0);
  }, [signalContext]);

  const visibleRuleFacts = useMemo(() => {
    const factContext = signalContext?.factContext;
    const items = [
      ...(rule ? buildRuleQuickFacts(rule.facts) : []),
      factContext?.sportsModuleIncluded ? "体育评价纳入综合素质测评" : "",
      factContext?.sportsModuleScore ? `已识别体育相关分值：${factContext.sportsModuleScore}` : "",
      factContext?.sportsModuleScore === null && factContext?.scoreRuleKnown === false
        ? "当前未提取到明确固定分值，但已识别到体育相关规则"
        : "",
      factContext?.deadline ? `当前识别到的报名时间：${factContext.deadline}` : "",
      factContext?.eligibility ? `当前识别到的参与门槛：${factContext.eligibility}` : "",
    ];

    return uniqueItems(items).slice(0, 5);
  }, [rule, signalContext]);

  const handleSetReminder = () => {
    setReminderEnabled(true);
    setReminderEnabledState(true);
    setNotice("已为你设置报名提醒，OpenUni 会在截止前再次提醒。");
    router.push("/signal/swim/success");
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
        title: `${mainSignal.title}｜OpenUni`,
        summary: "这条机会和学院综测规则有关，值得优先判断一下。",
        href: `${window.location.origin}/signal/swim`,
      });

      const next = incrementSignalShare("swim");
      setActionState(next);
      setNotice(message);
    } catch {
      setNotice("这条内容适合转给同学一起看。");
    }
  };

  if (!signalContext) {
    return null;
  }

  const handleEnterTutorialMode = () => {
    setMode("tutorial");
    setNotice("已切换到教学示例模式。");
  };

  const handleExitTutorial = () => {
    setMode("formal");
    router.push("/discover");
  };

  const summaryCards = [
    { label: "优先级", value: signalContext.priority, note: "从当前阶段看，这是一条应优先评估的机会。" },
    {
      label: "回报预期",
      value: signalContext.returnExpectation,
      note: "收益不只是参与本身，更在于是否能影响当前阶段评价。",
    },
    { label: "错过成本", value: signalContext.missCost, note: "如果错过当前窗口，本学期同类补偿机会有限。" },
  ];

  return (
    <AppShell>
      <div className="space-y-5 pb-28">
        <Link href="/home" className="inline-flex text-sm font-medium text-brand-700">
          返回信号页
        </Link>

        <section className="rounded-[22px] border border-amber-100 bg-amber-50/85 px-4 py-3 shadow-soft">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-amber-800">
                  {isTutorialMode ? "新手教程" : "教学示例"}
                </span>
                <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-amber-700">
                  隐藏机会发现示例
                </span>
              </div>
              <p className="mt-2 text-sm leading-6 text-amber-950/85">
                “校级女生游泳比赛”是 OpenUni 的稳定教程案例，用来演示一条隐藏机会如何从发现层进入判断、Ask 和提醒行动。
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

        <section className="card-panel hero-glow overflow-hidden rounded-[32px] border-brand-100 bg-gradient-to-br from-brand-700 via-brand-500 to-aqua p-6 text-white">
          <div className="relative z-10 space-y-4">
            <div className="flex flex-wrap gap-2 text-sm">
              {mainSignal.detailTags.map((tag) => (
                <span key={tag} className="rounded-full bg-white/18 px-3 py-1.5 font-medium text-white">
                  {tag}
                </span>
              ))}
            </div>
            <div>
              <p className="text-sm font-medium text-white/75">当前判断</p>
              <h1 className="mt-2 text-[32px] font-semibold leading-[1.18] text-white text-balance">
                {mainSignal.title}
              </h1>
            </div>
            <div className="rounded-[24px] bg-white/16 p-5 ring-1 ring-white/15">
              <p className="text-sm font-medium text-white/80">为什么值得优先评估</p>
              <p className="mt-3 text-[15px] leading-7 text-white/90">{signalContext.whyRecommended}</p>
            </div>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-3">
          {summaryCards.map((item) => (
            <div key={item.label} className="card-panel rounded-[24px] p-4">
              <p className="text-sm font-medium text-slate-500">{item.label}</p>
              <p className="mt-2 text-[28px] font-semibold text-ink">{item.value}</p>
              <p className="mt-2 text-[15px] leading-7 text-slate-600">{item.note}</p>
            </div>
          ))}
        </section>

        <ActiveRuleIndicator
          basisLabel={basis_label}
          summary={
            has_rule && rule
              ? `${rule.summary} 这条判断会直接参考你导入的学院规则，而不是只做泛化推荐。`
              : "当前尚未导入学院规则，OpenUni 正在使用系统默认规则样本来判断这条机会的价值。"
          }
          isCustom={has_rule}
          highlights={visibleRuleFacts}
          highlightsTitle="本条判断关联的规则事实"
        />

        <section className="card-panel rounded-[28px] p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-slate-500">我接下来可以这样做</p>
              <h2 className="mt-2 text-[22px] font-semibold text-ink">先决定状态，再进入实际动作</h2>
              <p className="mt-2 text-[15px] leading-7 text-slate-600">
                这一步不是再看信息，而是明确下一步：我准备去做、稍后再看、查看参与路径，或者直接分享给同学一起判断。
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
              <p className="mt-2 text-xs leading-6 text-current/80">把这条机会从“判断中”推进到“准备行动”。</p>
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
              <p className="mt-2 text-xs leading-6 text-current/80">先留在观察列表，避免现在匆忙做决定。</p>
            </button>

            <button
              type="button"
              onClick={() => setShowPath((current) => !current)}
              className="rounded-[22px] border border-slate-200 bg-white px-4 py-4 text-left text-slate-700 transition hover:border-brand-200 hover:text-brand-700"
            >
              <p className="text-sm font-semibold">查看参与路径 / 报名入口</p>
              <p className="mt-2 text-xs leading-6 text-current/80">现在就确认原文入口、报名方式和时间安排。</p>
            </button>

            <button
              type="button"
              onClick={() => void handleShare()}
              className="rounded-[22px] border border-slate-200 bg-white px-4 py-4 text-left text-slate-700 transition hover:border-brand-200 hover:text-brand-700"
            >
              <p className="text-sm font-semibold">分享给同学 / 转发到群聊</p>
              <p className="mt-2 text-xs leading-6 text-current/80">
                已分享 {actionState.shareCount} 次，最近一次 {formatDateTime(actionState.lastSharedAt)}
              </p>
            </button>
          </div>
        </section>

        {notice ? (
          <section className="rounded-[20px] border border-brand-100 bg-brand-50/80 px-4 py-3 text-sm leading-6 text-brand-800">
            {notice}
          </section>
        ) : null}

        <section className="card-panel rounded-[28px] p-5">
          <p className="text-sm font-medium text-slate-500">信号归并结果</p>
          <h2 className="mt-2 text-[22px] font-semibold text-ink">这不是一条孤立信息，而是多个来源拼接后的判断信号</h2>
          <p className="mt-2 text-[15px] leading-7 text-slate-600">
            OpenUni 已把规则依据、官方通知和补充参考合并成一条可判断的信号，再结合你的阶段画像给出行动建议。
          </p>

          <div className="mt-4 grid gap-3 lg:grid-cols-3">
            {mergedSourceGroups.map((group) => (
              <div key={group.title} className="rounded-[22px] bg-slate-50 p-4">
                <p className="text-sm font-semibold text-ink">{group.title}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">{group.description}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {group.items.map((item) => (
                    <span
                      key={`${group.title}-${item}`}
                      className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {showPath ? <PathPreview /> : null}

        <div className="space-y-4">
          {credibilityModules.map((module) => (
            <CredibilityModuleCard key={module.title} module={module} />
          ))}
        </div>

        <div className="space-y-4">
          {detailSections.map((section, index) => (
            <DetailSectionCard key={section.title} index={index + 1} section={section} />
          ))}
        </div>
      </div>

      <ActionBar
        primaryLabel="设置报名提醒"
        secondaryLabel="问一问 OpenUni"
        tertiaryLabel="查看参与路径"
        onPrimaryClick={handleSetReminder}
        onSecondaryClick={() => router.push("/signal/swim/ask")}
        onTertiaryClick={() => setShowPath((current) => !current)}
      />
    </AppShell>
  );
}
