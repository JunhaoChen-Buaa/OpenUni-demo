"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { ActiveRuleIndicator } from "@/components/active-rule-indicator";
import { PageHeader } from "@/components/page-header";
import { SectionTabs } from "@/components/section-tabs";
import { SecondaryCard } from "@/components/secondary-card";
import { SignalCard } from "@/components/signal-card";
import { useProductMode } from "@/hooks/use-product-mode";
import { buildRuleQuickFacts } from "@/lib/college-rule-types";
import { useActiveRule } from "@/hooks/use-active-rule";
import { useProfile } from "@/hooks/use-profile";
import {
  getMainSignal,
  getOtherSignals,
  type DiscoveryCandidateItem,
  type DiscoveryPageData,
  type HomeTabKey,
  type MainSignal,
  type SecondarySignal,
} from "@/lib/mock-data";

const HOME_TABS = [
  { key: "related", label: "与我强相关" },
  { key: "reward", label: "高收益机会" },
  { key: "deadline", label: "即将截止" },
  { key: "stage", label: "当前阶段推荐" },
] satisfies Array<{ key: HomeTabKey; label: string }>;

type DiscoveryPayload = {
  data: DiscoveryPageData;
};

function formatPromotedMetricDate(value: string | null | undefined) {
  if (!value) {
    return "最近同步";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
  }).format(new Date(value));
}

function buildPromotedSignalHref(candidateId: string) {
  return `/signal/formal/${encodeURIComponent(candidateId)}`;
}

function buildPromotedLeadSignal(candidate: DiscoveryCandidateItem): MainSignal {
  return {
    title: candidate.title,
    tags: ["来自发现层", candidate.candidate_type, candidate.source_origin_label].filter(Boolean).slice(0, 3),
    detailTags: ["刚进入信号流", candidate.source_name, candidate.screening_label].filter(Boolean),
    description: candidate.structured_summary || candidate.raw_excerpt,
    plainReason: candidate.reason_summary || candidate.screening_description,
    reason: [candidate.screening_description, candidate.source_last_sync_message].filter(Boolean).join(" "),
    sourceSummary: `${candidate.source_name} / ${candidate.source_origin_label}`,
    sources: [
      {
        name: candidate.source_name,
        type: candidate.source_kind,
      },
    ],
    metrics: [
      { label: "状态", value: "已提升" },
      { label: "来源", value: candidate.source_is_user_added ? "用户关注" : "系统来源" },
      { label: "同步", value: formatPromotedMetricDate(candidate.source_last_synced_at) },
    ],
  };
}

function buildPromotedSecondarySignal(candidate: DiscoveryCandidateItem): SecondarySignal {
  return {
    title: candidate.title,
    description: candidate.structured_summary || candidate.raw_excerpt,
    badge: "发现层已提升",
    tab: "related",
  };
}

function normalizeForMatch(value: string | null | undefined) {
  return (value ?? "").toLowerCase();
}

function buildCandidateSearchText(candidate: DiscoveryCandidateItem) {
  return normalizeForMatch(
    [
      candidate.title,
      candidate.structured_summary,
      candidate.raw_excerpt,
      candidate.reason_summary,
      candidate.candidate_type,
      candidate.deadline,
      candidate.target_audience,
      candidate.source_name,
      candidate.source_organization_or_college,
      ...(candidate.preliminary_tags ?? []),
      ...(candidate.extracted_value_signals ?? []),
    ]
      .filter(Boolean)
      .join(" "),
  );
}

function countMatches(text: string, patterns: string[]) {
  return patterns.reduce((score, pattern) => (text.includes(pattern) ? score + 1 : score), 0);
}

function scorePromotedCandidateByTab(input: {
  candidate: DiscoveryCandidateItem;
  tab: HomeTabKey;
  profile: { grade: string; college: string; focus: string; preference: string };
  ruleQuickFacts: string[];
  hasRule: boolean;
}) {
  const { candidate, tab, profile, ruleQuickFacts, hasRule } = input;
  const text = buildCandidateSearchText(candidate);
  const college = normalizeForMatch(profile.college);
  const focus = normalizeForMatch(profile.focus);
  const preference = normalizeForMatch(profile.preference);
  const ruleText = normalizeForMatch(ruleQuickFacts.join(" "));

  const relevanceMatches =
    countMatches(text, [college, focus, preference].filter((item) => item.length >= 2)) * 26;
  const rewardMatches =
    countMatches(text, [
      "奖学金",
      "竞赛",
      "比赛",
      "科研",
      "项目",
      "训练营",
      "成长收益",
      "成果补充",
      "推免",
      "保研",
      "综测",
    ]) * 18;
  const urgencyMatches =
    countMatches(text, ["截止", "报名", "申请", "窗口", "即将", "本周", "征集", "开放"]) * 20;
  const stageMatches =
    countMatches(text, ["推荐", "阶段", "适合", "当前", "本科", "学生", "报名", "活动", "讲座"]) * 10;
  const ruleMatches =
    hasRule && ruleText
      ? countMatches(
          text,
          ruleQuickFacts.map((item) => normalizeForMatch(item)).filter((item) => item.length >= 2),
        ) * 12
      : 0;

  const realContentBonus = candidate.is_real_synced_content ? 24 : 0;
  const promotedBonus = candidate.screening_status === "promoted_to_signal" ? 12 : 0;
  const deadlineBonus = candidate.deadline ? 42 : 0;

  if (tab === "related") {
    return relevanceMatches + ruleMatches + stageMatches + realContentBonus + promotedBonus;
  }

  if (tab === "reward") {
    return rewardMatches + relevanceMatches / 2 + ruleMatches / 2 + realContentBonus + promotedBonus;
  }

  if (tab === "deadline") {
    return urgencyMatches + deadlineBonus + rewardMatches / 3 + realContentBonus + promotedBonus;
  }

  return (
    stageMatches +
    relevanceMatches / 2 +
    rewardMatches / 2 +
    urgencyMatches / 3 +
    ruleMatches +
    realContentBonus +
    promotedBonus
  );
}

function matchesPromotedTab(input: {
  candidate: DiscoveryCandidateItem;
  tab: HomeTabKey;
  profile: { grade: string; college: string; focus: string; preference: string };
  ruleQuickFacts: string[];
  hasRule: boolean;
}) {
  const score = scorePromotedCandidateByTab(input);

  if (input.tab === "deadline") {
    return score >= 36;
  }

  if (input.tab === "reward") {
    return score >= 34;
  }

  if (input.tab === "related") {
    return score >= 32;
  }

  return score >= 26;
}

export default function HomePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<HomeTabKey>("related");
  const [promotedDiscoverySignals, setPromotedDiscoverySignals] = useState<DiscoveryCandidateItem[]>([]);
  const { profile } = useProfile();
  const { setMode, isTutorialMode } = useProductMode();
  const { has_rule, basis_label, rule } = useActiveRule();
  const ruleQuickFacts = useMemo(() => (rule ? buildRuleQuickFacts(rule.facts).slice(0, 4) : []), [rule]);

  useEffect(() => {
    const queryTab = new URLSearchParams(window.location.search).get("tab");
    if (queryTab && HOME_TABS.some((tab) => tab.key === queryTab)) {
      setActiveTab(queryTab as HomeTabKey);
    }
  }, []);

  useEffect(() => {
    if (isTutorialMode) {
      setPromotedDiscoverySignals([]);
      return;
    }

    let cancelled = false;

    const loadPromotedSignals = async () => {
      try {
        const response = await fetch("/api/discovery", { cache: "no-store" });
        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as DiscoveryPayload;
        if (!cancelled) {
          setPromotedDiscoverySignals(payload.data.promoted_candidates ?? []);
        }
      } catch {
        if (!cancelled) {
          setPromotedDiscoverySignals([]);
        }
      }
    };

    void loadPromotedSignals();

    return () => {
      cancelled = true;
    };
  }, [isTutorialMode]);

  const mainSignal = useMemo(() => getMainSignal(profile), [profile]);
  const allSignals = useMemo(() => getOtherSignals(profile), [profile]);
  const highlightedSignals = useMemo(() => allSignals.filter((item) => item.tab === activeTab), [activeTab, allSignals]);

  const promotedFormalSignals = useMemo(() => {
    return promotedDiscoverySignals
      .filter((item) => item.screening_status === "promoted_to_signal")
      .filter((item) =>
        matchesPromotedTab({
          candidate: item,
          tab: activeTab,
          profile,
          ruleQuickFacts,
          hasRule: has_rule,
        }),
      )
      .sort(
        (a, b) =>
          scorePromotedCandidateByTab({
            candidate: b,
            tab: activeTab,
            profile,
            ruleQuickFacts,
            hasRule: has_rule,
          }) -
            scorePromotedCandidateByTab({
              candidate: a,
              tab: activeTab,
              profile,
              ruleQuickFacts,
              hasRule: has_rule,
            }) ||
          new Date(b.published_at).getTime() - new Date(a.published_at).getTime(),
      )
      .slice(0, 4);
  }, [activeTab, has_rule, profile, promotedDiscoverySignals, ruleQuickFacts]);

  const promotedLeadSignal = useMemo(
    () => (promotedFormalSignals[0] ? buildPromotedLeadSignal(promotedFormalSignals[0]) : null),
    [promotedFormalSignals],
  );
  const promotedLeadCandidate = promotedFormalSignals[0] ?? null;

  const promotedSignalList = useMemo(
    () => promotedFormalSignals.slice(1).map((item) => ({ item, card: buildPromotedSecondarySignal(item) })),
    [promotedFormalSignals],
  );

  const formalLeadSignal = highlightedSignals[0] ?? allSignals[0] ?? null;
  const formalSignalList =
    highlightedSignals.length > 1
      ? highlightedSignals.slice(1)
      : allSignals.filter((item) => item.title !== formalLeadSignal?.title).slice(0, 3);

  const handleStartTutorial = () => {
    setMode("tutorial");
    router.push("/discover");
  };

  const handleEnterFormal = () => {
    setMode("formal");
    router.push("/discover");
  };

  return (
    <AppShell withProductChrome showShellLabel contentClassName="space-y-5">
      <PageHeader
        eyebrow={isTutorialMode ? "OpenUni 新手教程" : "OpenUni 信号页"}
        title={
          isTutorialMode
            ? "先用一个稳定案例，\n看懂 OpenUni 怎么从发现走到判断。"
            : "把真正值得继续判断的内容，\n从发现层收进你的正式信号页。"
        }
        description={
          isTutorialMode
            ? "用一个稳定示例快速看懂完整链路。"
            : "先看什么值得继续判断。"
        }
      />

      <section className="rounded-[22px] border border-slate-200/75 bg-white/76 px-4 py-3 shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {isTutorialMode ? (
            <p className="text-sm leading-6 text-slate-600">
              <span className="font-semibold text-slate-700">教学示例模式：</span>
              用 swim 案例快速看懂 OpenUni 的完整判断链路。
            </p>
          ) : (
            <p className="text-sm leading-6 text-slate-600">
              <span className="font-semibold text-slate-700">正式使用模式：</span>
              首页优先展示正式信号与发现层已提升内容。
            </p>
          )}

          {isTutorialMode ? (
            <button
              type="button"
              onClick={handleEnterFormal}
              className="inline-flex rounded-full border border-brand-100 bg-white px-3 py-1.5 text-sm font-medium text-brand-700 transition hover:border-brand-300 hover:bg-brand-50"
            >
              退出教程，进入正式使用
            </button>
          ) : (
            <button
              type="button"
              onClick={handleStartTutorial}
              className="inline-flex rounded-full border border-brand-100 bg-white px-3 py-1.5 text-sm font-medium text-brand-700 transition hover:border-brand-300 hover:bg-brand-50"
            >
              再看教学示例
            </button>
          )}
        </div>
      </section>

      <section className="card-panel rounded-[28px] p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-slate-500">当前画像</p>
            <p className="mt-2 text-lg font-semibold text-ink">
              {profile.grade} · {profile.college} · 关注 {profile.focus}
            </p>
            <p className="mt-3 text-[15px] leading-7 text-slate-600">
              当前偏好：{profile.preference}
            </p>
          </div>
          <Link
            href="/onboarding"
            className="inline-flex shrink-0 rounded-full border border-brand-100 bg-white px-4 py-2 text-sm font-medium text-brand-700 transition hover:border-brand-300 hover:bg-brand-50"
          >
            调整画像
          </Link>
        </div>
      </section>

      <ActiveRuleIndicator
        basisLabel={basis_label}
        summary={
          has_rule && rule
            ? `${rule.summary} 首页会把这份规则作为正式判断依据的一部分，用来解释哪些信号更值得进入你的当前视野。`
            : "当前还没有导入学院规则，首页会先使用系统默认规则样本来解释正式信号与阶段优先级。"
        }
        isCustom={has_rule}
        highlights={ruleQuickFacts.slice(0, 3)}
        highlightsTitle="当前阶段推荐主要参考"
      />

      <SectionTabs tabs={HOME_TABS} value={activeTab} onChange={(value) => setActiveTab(value as HomeTabKey)} />

      {isTutorialMode ? (
        <>
          <section className="rounded-[24px] border border-brand-100 bg-white/80 px-4 py-4 shadow-soft">
            <p className="text-sm font-medium text-slate-500">教程提示</p>
            <p className="mt-2 text-base font-semibold leading-7 text-ink">
              这一页会把“校级女生游泳比赛”放在主位，帮助你理解 OpenUni 如何把一条低可见、高价值的机会变成可判断信号。
            </p>
          </section>

          <Link href="/signal/swim">
            <SignalCard signal={mainSignal} />
          </Link>

          <section className="space-y-4">
            {highlightedSignals.map((signal) => (
              <SecondaryCard key={signal.title} signal={signal} />
            ))}
          </section>
        </>
      ) : (
        <>
          {promotedLeadSignal ? (
            <section className="space-y-4">
              <section className="rounded-[24px] border border-emerald-100 bg-emerald-50/80 px-4 py-4 shadow-soft">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-emerald-700">刚进入信号流</p>
                    <p className="mt-2 text-base font-semibold leading-7 text-ink">
                      这些内容已经从发现层提升上来，适合继续判断。
                    </p>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1.5 text-sm font-medium text-emerald-700">
                    {promotedFormalSignals.length} 条来自发现层
                  </span>
                </div>
              </section>

              <Link href={buildPromotedSignalHref(promotedLeadCandidate!.id)}>
                <SignalCard signal={promotedLeadSignal} />
              </Link>

              {promotedSignalList.length > 0 ? (
                <section className="space-y-4">
                  {promotedSignalList.map(({ item, card }) => (
                    <Link key={item.id} href={buildPromotedSignalHref(item.id)}>
                      <SecondaryCard signal={card} />
                    </Link>
                  ))}
                </section>
              ) : null}
            </section>
          ) : null}

          <section className="card-panel rounded-[32px] p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700">
                    正式使用模式
                  </span>
                  {formalLeadSignal ? (
                    <span className="rounded-full bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-600">
                      {formalLeadSignal.badge}
                    </span>
                  ) : null}
                </div>
                <h2 className="mt-4 text-[28px] font-semibold leading-[1.2] text-ink">
                  {formalLeadSignal?.title ?? "当前先从发现层和正式信号开始"}
                </h2>
                <p className="mt-3 text-[15px] leading-7 text-slate-700">
                  {formalLeadSignal?.description ??
                    "正式模式会优先展示发现层提升内容、正式信号和阶段推荐。"}
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/discover"
                className="inline-flex rounded-full bg-ink px-4 py-2.5 text-sm font-medium text-white transition hover:translate-y-[-1px]"
              >
                先看北航最近发生了什么
              </Link>
              <button
                type="button"
                onClick={handleStartTutorial}
                className="inline-flex rounded-full border border-brand-100 bg-white px-4 py-2.5 text-sm font-medium text-brand-700 transition hover:border-brand-300 hover:bg-brand-50"
              >
                查看教学示例
              </button>
            </div>
          </section>

          <section className="rounded-[24px] border border-slate-200/80 bg-white/80 px-4 py-4 shadow-soft">
            <p className="text-sm font-medium text-slate-500">示例入口</p>
            <p className="mt-2 text-base font-semibold leading-7 text-ink">
              教学示例仍然保留，但不再占用正式模式主位。
            </p>
            <div className="mt-4">
              <button
                type="button"
                onClick={handleStartTutorial}
                className="inline-flex rounded-full border border-brand-100 bg-brand-50 px-4 py-2.5 text-sm font-medium text-brand-700 transition hover:border-brand-200 hover:bg-brand-100"
              >
                进入教学示例
              </button>
            </div>
          </section>

          <section className="space-y-4">
            {formalSignalList.map((signal) => (
              <SecondaryCard key={signal.title} signal={signal} />
            ))}
          </section>
        </>
      )}
    </AppShell>
  );
}
