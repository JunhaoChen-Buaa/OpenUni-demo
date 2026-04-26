"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { ActiveRuleIndicator } from "@/components/active-rule-indicator";
import { AppShell } from "@/components/app-shell";
import { buildRuleQuickFacts } from "@/lib/college-rule-types";
import { useActiveRule } from "@/hooks/use-active-rule";
import {
  getReminderEnabled,
  getSignalActionState,
  setReminderEnabled,
  setSignalPlanned,
  setSignalWatchLater,
  type SignalActionState,
} from "@/lib/storage";
import type { DiscoveryCandidateItem, DiscoveryPageData } from "@/lib/mock-data";

type DiscoveryPayload = {
  data: DiscoveryPageData;
};

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
    return "暂无";
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

function truncateText(value: string | null | undefined, length = 96) {
  if (!value) {
    return "";
  }

  return value.length > length ? `${value.slice(0, length).trim()}...` : value;
}

export default function FormalSignalDetailPage() {
  const params = useParams<{ candidateId: string }>();
  const { has_rule, basis_label, rule } = useActiveRule();
  const [candidate, setCandidate] = useState<DiscoveryCandidateItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionState, setActionState] = useState<SignalActionState>(defaultActionState);
  const [reminderEnabled, setReminderEnabledState] = useState(false);

  const candidateId = typeof params?.candidateId === "string" ? decodeURIComponent(params.candidateId) : "";

  useEffect(() => {
    if (!candidateId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const loadCandidate = async () => {
      try {
        const response = await fetch("/api/discovery", { cache: "no-store" });
        if (!response.ok) {
          throw new Error("Failed to load discovery payload.");
        }

        const payload = (await response.json()) as DiscoveryPayload;
        if (cancelled) {
          return;
        }

        const nextCandidate =
          payload.data.promoted_candidates.find((item) => item.id === candidateId) ??
          payload.data.candidates.find((item) => item.id === candidateId) ??
          null;

        setCandidate(nextCandidate);
      } catch {
        if (!cancelled) {
          setCandidate(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadCandidate();

    return () => {
      cancelled = true;
    };
  }, [candidateId]);

  useEffect(() => {
    if (!candidateId) {
      return;
    }

    setActionState(getSignalActionState(candidateId));
    setReminderEnabledState(getReminderEnabled());
  }, [candidateId]);

  const quickFacts = useMemo(() => {
    const candidateFacts = candidate
      ? [
          candidate.source_origin_label,
          candidate.source_readability_status === "candidate_extracted" ? "已从这个来源读到相关内容" : "",
          candidate.source_last_sync_message,
        ]
      : [];

    return uniqueItems([...(rule ? buildRuleQuickFacts(rule.facts) : []), ...candidateFacts]).slice(0, 4);
  }, [candidate, rule]);

  if (loading) {
    return (
      <AppShell>
        <section className="rounded-[24px] border border-slate-200/80 bg-white/85 px-4 py-5 shadow-soft">
          <p className="text-sm text-slate-500">正在整理这条正式信号…</p>
        </section>
      </AppShell>
    );
  }

  if (!candidate) {
    return (
      <AppShell>
        <div className="space-y-4">
          <Link href="/home" className="inline-flex text-sm font-medium text-brand-700">
            返回信号页
          </Link>
          <section className="rounded-[24px] border border-slate-200/80 bg-white/85 px-4 py-5 shadow-soft">
            <p className="text-base font-semibold text-ink">这条正式信号暂时不可见。</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              它可能已经从当前发现结果里移除，或者需要重新同步后再查看。
            </p>
          </section>
        </div>
      </AppShell>
    );
  }

  const handleSetReminder = () => {
    setReminderEnabled(true);
    setReminderEnabledState(true);
    setNotice("已把这条来自发现层的信号加入提醒列表。");
  };

  const handleTogglePlanned = () => {
    const next = setSignalPlanned(candidate.id, !actionState.planned);
    setActionState(next);
    setNotice(next.planned ? "已标记为“我准备去做”" : "已取消“我准备去做”标记");
  };

  const handleToggleWatchLater = () => {
    const next = setSignalWatchLater(candidate.id, !actionState.watchLater);
    setActionState(next);
    setNotice(next.watchLater ? "已标记为“稍后再看”" : "已取消“稍后再看”标记");
  };

  return (
    <AppShell>
      <div className="space-y-5 pb-24">
        <Link href="/home" className="inline-flex text-sm font-medium text-brand-700">
          返回信号页
        </Link>

        <section className="rounded-[22px] border border-emerald-100 bg-emerald-50/85 px-4 py-3 shadow-soft">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-emerald-700">
                来自发现层
              </span>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-emerald-700">
                已进入信号流
              </span>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-emerald-700">
                {candidate.source_is_user_added ? "用户关注来源" : "系统来源"}
              </span>
            </div>
            <span className="text-xs font-medium text-emerald-700">
              最近同步 {formatDateTime(candidate.source_last_synced_at)}
            </span>
          </div>
        </section>

        <section className="card-panel hero-glow overflow-hidden rounded-[32px] border-brand-100 bg-gradient-to-br from-[#F7FBFF] via-white to-[#EEF7FF] p-6">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {[candidate.candidate_type, candidate.screening_label, candidate.source_name]
                .filter(Boolean)
                .map((item) => (
                  <span
                    key={item}
                    className="rounded-full bg-brand-50 px-3 py-1.5 text-sm font-medium text-brand-700"
                  >
                    {item}
                  </span>
                ))}
            </div>

            <div>
              <p className="text-sm font-medium text-brand-700/80">从发现层提升上来的正式信号</p>
              <h1 className="mt-2 text-[30px] font-semibold leading-[1.2] text-ink">{candidate.title}</h1>
              <p className="mt-3 text-[15px] leading-7 text-slate-700">
                {truncateText(candidate.structured_summary || candidate.raw_excerpt, 110)}
              </p>
            </div>

            <div className="rounded-[24px] border border-brand-100 bg-white/88 p-4 shadow-soft">
              <p className="text-xs font-semibold tracking-[0.12em] text-brand-600">为什么值得继续判断</p>
              <p className="mt-2 text-base font-semibold leading-7 text-ink">
                {candidate.reason_summary || candidate.screening_description}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              {candidate.original_url ? (
                <a
                  href={candidate.original_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex rounded-full bg-ink px-4 py-2.5 text-sm font-medium text-white transition hover:translate-y-[-1px]"
                >
                  查看原文
                </a>
              ) : null}

              <Link
                href="/discover"
                className="inline-flex rounded-full border border-brand-100 bg-white px-4 py-2.5 text-sm font-medium text-brand-700 transition hover:border-brand-300 hover:bg-brand-50"
              >
                回发现层看来源上下文
              </Link>
            </div>
          </div>
        </section>

        <ActiveRuleIndicator
          basisLabel={basis_label}
          summary={
            has_rule && rule
              ? `${rule.summary} 这条正式信号会继续沿用你导入的学院规则作为判断依据，帮助你判断要不要行动。`
              : "当前还在使用系统默认规则样本，这条内容已经从发现层进入正式判断阶段。"
          }
          isCustom={has_rule}
          highlights={quickFacts}
          highlightsTitle="这条信号的判断依据"
        />

        <section className="card-panel rounded-[28px] p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-slate-500">为什么和你有关</p>
              <h2 className="mt-2 text-[22px] font-semibold text-ink">它来自哪里，现在为什么值得你继续看</h2>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-600">
              {candidate.content_origin_label}
            </span>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-[22px] bg-slate-50 p-4">
              <p className="text-sm font-semibold text-ink">来源单位</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {candidate.source_name} · {candidate.source_kind}
              </p>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                {candidate.source_organization_or_college || "北航来源池"}
              </p>
            </div>

            <div className="rounded-[22px] bg-slate-50 p-4">
              <p className="text-sm font-semibold text-ink">最近同步</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">{candidate.source_last_sync_message}</p>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                {formatDateTime(candidate.source_last_synced_at)}
              </p>
            </div>
          </div>

          <details className="mt-4 rounded-[20px] border border-slate-200/80 bg-white px-4 py-3">
            <summary className="cursor-pointer list-none text-sm font-medium text-slate-700">
              查看来源与原文详情
            </summary>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div className="rounded-[18px] bg-slate-50 p-4">
                <p className="text-sm font-semibold text-ink">来源入口</p>
                <p className="mt-2 break-all text-sm leading-6 text-slate-600">
                  {candidate.source_home_url || "当前没有记录来源入口"}
                </p>
              </div>

              <div className="rounded-[18px] bg-slate-50 p-4">
                <p className="text-sm font-semibold text-ink">原文页面</p>
                <p className="mt-2 break-all text-sm leading-6 text-slate-600">
                  {candidate.source_original_url || candidate.source_read_url || "当前没有记录原始页面"}
                </p>
              </div>
            </div>
          </details>
        </section>

        <section className="card-panel rounded-[28px] p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-slate-500">接下来可以怎么做</p>
              <h2 className="mt-2 text-[22px] font-semibold text-ink">先判断清楚，再决定怎么行动</h2>
            </div>
            {reminderEnabled ? (
              <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700">
                已加入提醒
              </span>
            ) : null}
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
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
              <p className="text-sm font-semibold">我准备去做</p>
              <p className="mt-2 text-xs leading-6 text-current/80">如果你已经准备行动，可以先把它标记下来。</p>
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
              <p className="mt-2 text-xs leading-6 text-current/80">先放回信号页，之后再回来判断要不要行动。</p>
            </button>

            <button
              type="button"
              onClick={handleSetReminder}
              className="rounded-[22px] border border-slate-200 bg-white px-4 py-4 text-left text-slate-700 transition hover:border-brand-200 hover:text-brand-700"
            >
              <p className="text-sm font-semibold">设置提醒</p>
              <p className="mt-2 text-xs leading-6 text-current/80">把它带入提醒页，避免后续错过时间窗口。</p>
            </button>
          </div>
        </section>

        {notice ? (
          <section className="rounded-[20px] border border-brand-100 bg-brand-50/80 px-4 py-3 text-sm leading-6 text-brand-800">
            {notice}
          </section>
        ) : null}
      </div>
    </AppShell>
  );
}
