"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { useProductMode } from "@/hooks/use-product-mode";
import { useActiveRule } from "@/hooks/use-active-rule";
import { buildRuleQuickFacts } from "@/lib/college-rule-types";
import {
  getDiscoveryPageData,
  type DiscoveryCandidateItem,
  type DiscoveryPageData,
  type DiscoverySourceItem,
} from "@/lib/mock-data";

type FollowUpPayload = {
  mode: "confirm" | "supplement";
  prompt: string | null;
  draft_text: string;
  source_id?: string;
  explanation?: string;
  confirmation_label?: string;
  resolution?: {
    confidence: number;
    matched_existing: boolean;
    matched_source_name: string | null;
    found_readable_entry: boolean;
    recognized_as_public_account: boolean;
    should_confirm: boolean;
    candidate_label: string;
    clarification_question: string | null;
    steps: string[];
  };
  preview?: {
    source_name: string;
    source_kind: string | null;
    organization_or_college: string;
    source_home_url: string;
  };
} | null;

type ResultSummary = {
  title: string;
  items: string[];
  standout?: {
    label: string;
    title: string;
    href?: string;
  } | null;
} | null;

type SyncReport = {
  synced_at: string;
  synced_source_count: number;
  successful_source_count: number;
  failed_source_count: number;
  candidate_count: number;
  promoted_count: number;
  standout_title: string | null;
  sources: Array<{
    source_id: string;
    source_name: string;
    source_kind: string;
    source_origin_label: string;
    source_home_url: string;
    read_url: string | null;
    read_count: number;
    sync_status: string;
    sync_status_label: string;
    sync_message: string;
    error_message: string | null;
    candidate_count: number;
    useful_count: number;
    promoted_count: number;
    ignored_count: number;
    standout_title: string | null;
  }>;
} | null;

type ImmediateSourceSync = {
  source_id: string;
  source_name: string;
  source_kind: string;
  sync_status_label: string;
  sync_message: string;
  read_url: string | null;
  source_home_url: string;
  generated_candidate_count: number;
  visible_candidate_count: number;
  promoted_count: number;
  deduped_count: number;
  explanation: string;
  candidates: Array<{
    id: string;
    title: string;
    screening_status: string;
    linked_signal_href?: string;
    original_url?: string | null;
  }>;
} | null;

type DiscoveryApiPayload = {
  data?: DiscoveryPageData;
  notice?: string;
  error?: string;
  follow_up?: FollowUpPayload;
  result_summary?: ResultSummary;
  sync_report?: SyncReport;
  immediate_source_sync?: ImmediateSourceSync;
  runtime?: {
    has_custom_sources: boolean;
    custom_source_count: number;
    last_synced_at: string | null;
  };
};

type SectionKey = "recent" | "watch" | "promoted";

const FOLLOW_EXAMPLES = [
  "添加北航公众号“微言航语”到关注列表",
  "关注北航本科生院通知",
  "持续关注可靠性学院官网通知",
  "帮我持续关注北航体育部群体竞赛通知",
];

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "尚未同步";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function compactUrlLabel(value: string) {
  if (!value) {
    return "待补充来源链接";
  }

  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return value;
  }
}

function truncateText(value: string, length = 66) {
  if (!value) {
    return "";
  }

  return value.length > length ? `${value.slice(0, length).trim()}...` : value;
}

function isTutorialDiscoveryItem(item: DiscoveryCandidateItem) {
  return item.title.includes("游泳比赛") || item.title.includes("女生游泳");
}

function candidateStatusMeta(status: DiscoveryCandidateItem["screening_status"]) {
  if (status === "promoted_to_signal") {
    return {
      label: "已进入信号流",
      tone: "bg-brand-50 text-brand-700",
    };
  }

  if (status === "useful") {
    return {
      label: "值得继续观察",
      tone: "bg-emerald-50 text-emerald-700",
    };
  }

  if (status === "new") {
    return {
      label: "新发现",
      tone: "bg-amber-50 text-amber-700",
    };
  }

  return {
    label: "暂不优先",
    tone: "bg-slate-100 text-slate-600",
  };
}

function sourceStatusMeta(status: DiscoverySourceItem["status"]) {
  if (status === "active") {
    return {
      label: "持续关注中",
      tone: "bg-emerald-50 text-emerald-700",
    };
  }

  if (status === "low_priority") {
    return {
      label: "低优先级",
      tone: "bg-amber-50 text-amber-700",
    };
  }

  return {
    label: "待移出观察",
    tone: "bg-slate-100 text-slate-600",
  };
}

function sourceReadabilityTone(status: string) {
  if (status === "candidate_extracted") {
    return "bg-emerald-50 text-emerald-700";
  }

  if (status === "synced_failed" || status === "missing_entry") {
    return "bg-rose-50 text-rose-700";
  }

  if (status === "name_only" || status === "waiting_entry" || status === "no_new_content") {
    return "bg-amber-50 text-amber-700";
  }

  return "bg-slate-100 text-slate-600";
}

function sourceGroupLabel(group?: string) {
  switch (group) {
    case "school_level":
      return "学校级来源";
    case "department_level":
      return "部处级来源";
    case "admissions_career":
      return "招生/就业来源";
    case "college_level":
      return "学院级来源";
    default:
      return null;
  }
}

function sourceReadinessLabel(source: Pick<DiscoverySourceItem, "direct_html_readable" | "registry_readiness">) {
  if (source.registry_readiness === "entity_only") {
    return "仅来源实体";
  }

  if (source.registry_readiness === "needs_sync_optimization") {
    return "待进一步同步优化";
  }

  return source.direct_html_readable ? "可直接读取" : "待补入口";
}

function screeningStatusLabel(status: string) {
  if (status === "promoted_to_signal") {
    return "已进入信号流";
  }

  if (status === "useful") {
    return "值得继续观察";
  }

  if (status === "new") {
    return "新近发现";
  }

  return "保留在发现层";
}

function contentOriginMeta(item: DiscoveryCandidateItem) {
  if (item.is_sample_content) {
    return {
      label: "示例内容",
      tone: "bg-amber-50/80 text-amber-700",
    };
  }

  if (item.source_is_user_added) {
    return {
      label: "用户关注来源同步",
      tone: "bg-emerald-50 text-emerald-700",
    };
  }

  return {
    label: "系统来源同步",
    tone: "bg-sky-50 text-sky-700",
  };
}

function SummaryStat({
  label,
  value,
  note,
}: {
  label: string;
  value: string | number;
  note?: string;
}) {
  return (
    <div className="rounded-[18px] bg-slate-50/90 px-4 py-3">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <div className="mt-1 flex items-end gap-2">
        <p className="text-lg font-semibold text-ink">{value}</p>
        {note ? <p className="pb-0.5 text-xs text-slate-400">{note}</p> : null}
      </div>
    </div>
  );
}

function CompactRuleBasisStrip({
  basisLabel,
  summary,
  quickFacts,
  isCustom,
}: {
  basisLabel: string;
  summary: string;
  quickFacts: string[];
  isCustom: boolean;
}) {
  return (
    <section className="rounded-[22px] border border-slate-200/80 bg-white/82 px-4 py-3 shadow-soft">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
          当前判断依据
        </span>
        <span
          className={[
            "rounded-full px-3 py-1 text-xs font-semibold",
            isCustom ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600",
          ].join(" ")}
        >
          {isCustom ? "用户导入" : "系统默认"}
        </span>
        <span className="text-sm font-medium text-ink">{basisLabel}</span>
      </div>
      <p className="mt-2 text-sm leading-6 text-slate-600">{summary}</p>
      {quickFacts.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {quickFacts.slice(0, 3).map((fact) => (
            <span
              key={fact}
              className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600"
            >
              {fact}
            </span>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function CompactNotice({
  notice,
  error,
}: {
  notice: string | null;
  error: string | null;
}) {
  if (!notice && !error) {
    return null;
  }

  const tone = error
    ? "border-rose-100 bg-rose-50/80 text-rose-700"
    : "border-brand-100 bg-brand-50/80 text-brand-800";

  return (
    <section className={`rounded-[18px] border px-4 py-3 text-sm leading-6 ${tone}`}>
      {error ?? notice}
    </section>
  );
}

function SyncResultStrip({
  resultSummary,
  candidateCount,
  promotedCount,
  syncedAt,
}: {
  resultSummary: ResultSummary;
  candidateCount: number;
  promotedCount: number;
  syncedAt: string | null | undefined;
}) {
  if (!resultSummary) {
    return null;
  }

  const standout = resultSummary.standout;
  const isExternal = Boolean(standout?.href?.startsWith("http"));
  const topItems = resultSummary.items.slice(0, 2);

  return (
    <section className="rounded-[22px] border border-emerald-100 bg-emerald-50/85 px-4 py-3 shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-[0.12em] text-emerald-700">这轮来源更新</p>
          <h2 className="mt-1 text-base font-semibold text-emerald-950">{resultSummary.title}</h2>
        </div>
        <span className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-emerald-800">
          最近同步：{formatDateTime(syncedAt)}
        </span>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <SummaryStat label="发现候选" value={candidateCount} />
        <SummaryStat label="进入信号流" value={promotedCount} />
        <SummaryStat
          label="重点内容"
          value={standout?.title ? truncateText(standout.title, 10) : "已更新"}
        />
      </div>

      {topItems.length > 0 ? (
        <p className="mt-3 text-sm leading-6 text-emerald-950/80">{topItems.join(" · ")}</p>
      ) : null}

      <details className="mt-3 rounded-[16px] bg-white/70 px-3 py-2">
        <summary className="cursor-pointer list-none text-sm font-medium text-emerald-900">
          查看本轮同步详情
        </summary>
        <div className="mt-3 space-y-2">
          {resultSummary.items.map((item) => (
            <div key={item} className="flex gap-2 text-sm leading-6 text-emerald-950/85">
              <span className="mt-2 h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span>{item}</span>
            </div>
          ))}
        </div>

        {standout?.href ? (
          <div className="mt-3">
            {isExternal ? (
              <a
                href={standout.href}
                target="_blank"
                rel="noreferrer"
                className="inline-flex rounded-full border border-emerald-200 bg-white px-4 py-2 text-sm font-medium text-emerald-800 transition hover:border-emerald-300 hover:bg-emerald-100"
              >
                {standout.label}
              </a>
            ) : (
              <Link
                href={standout.href}
                className="inline-flex rounded-full border border-emerald-200 bg-white px-4 py-2 text-sm font-medium text-emerald-800 transition hover:border-emerald-300 hover:bg-emerald-100"
              >
                {standout.label}
              </Link>
            )}
          </div>
        ) : null}
      </details>
    </section>
  );
}

function FollowSourceComposer({
  followInput,
  setFollowInput,
  submitFollowIntent,
  isFollowingSource,
  followUp,
  followUpInput,
  setFollowUpInput,
  onConfirmFollowUp,
  onContinueFollowUp,
}: {
  followInput: string;
  setFollowInput: (value: string) => void;
  submitFollowIntent: (text: string) => Promise<void>;
  isFollowingSource: boolean;
  followUp: FollowUpPayload;
  followUpInput: string;
  setFollowUpInput: (value: string) => void;
  onConfirmFollowUp: () => Promise<void>;
  onContinueFollowUp: (event: FormEvent<HTMLFormElement>) => Promise<void>;
}) {
  return (
    <section className="rounded-[22px] border border-slate-200/80 bg-white/84 px-4 py-4 shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">添加关注来源</p>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            告诉 OpenUni 你想持续关注谁。
          </p>
        </div>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-500">
          持续关注一个来源，而不是一条链接
        </span>
      </div>

      <form
        className="mt-4 flex flex-col gap-3 sm:flex-row"
        onSubmit={(event) => {
          event.preventDefault();
          void submitFollowIntent(followInput);
        }}
      >
        <textarea
          value={followInput}
          onChange={(event) => setFollowInput(event.target.value)}
          placeholder="例如：关注北航本科生院通知，或添加北航公众号“微言航语”到关注列表"
          rows={2}
          className="min-w-0 flex-1 rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm leading-7 text-slate-700 outline-none transition focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
        />
        <button
          type="submit"
          disabled={isFollowingSource || !followInput.trim()}
          className="inline-flex min-h-[48px] items-center justify-center rounded-full bg-ink px-4 py-3 text-sm font-medium text-white transition hover:translate-y-[-1px] disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {isFollowingSource ? "正在添加..." : "添加关注来源"}
        </button>
      </form>

      <div className="mt-3 flex flex-wrap gap-2">
        {FOLLOW_EXAMPLES.map((example) => (
          <button
            key={example}
            type="button"
            onClick={() => {
              setFollowInput(example);
              void submitFollowIntent(example);
            }}
            className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs font-medium text-slate-600 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
          >
            {example}
          </button>
        ))}
      </div>

      {followUp ? (
        <div className="mt-4 rounded-[18px] border border-amber-100 bg-amber-50/85 p-4">
          <p className="text-sm font-medium text-amber-950">{followUp.prompt}</p>
          {followUp.explanation ? (
            <p className="mt-2 text-xs leading-6 text-amber-900/80">{followUp.explanation}</p>
          ) : null}
          {followUp.preview ? (
            <p className="mt-2 text-xs leading-6 text-amber-900/80">
              当前已识别为：{followUp.preview.organization_or_college} · {followUp.preview.source_name}
              {followUp.preview.source_kind ? ` · ${followUp.preview.source_kind}` : ""}
            </p>
          ) : null}
          {followUp.resolution?.steps?.length ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {followUp.resolution.steps.slice(0, 3).map((step) => (
                <span
                  key={step}
                  className="rounded-full border border-amber-200 bg-white px-3 py-1.5 text-[11px] font-medium text-amber-900/80"
                >
                  {step}
                </span>
              ))}
            </div>
          ) : null}
          {followUp.mode === "confirm" ? (
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => void onConfirmFollowUp()}
                disabled={isFollowingSource}
                className="inline-flex items-center justify-center rounded-full bg-white px-4 py-3 text-sm font-medium text-amber-900 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {followUp.confirmation_label ?? "是的，加入关注列表"}
              </button>
              <span className="text-xs leading-6 text-amber-900/75">
                如果不是这个来源，也可以继续补充一条更准确的线索。
              </span>
            </div>
          ) : null}
          <form className="mt-3 flex flex-col gap-3 sm:flex-row" onSubmit={onContinueFollowUp}>
            <input
              value={followUpInput}
              onChange={(event) => setFollowUpInput(event.target.value)}
              placeholder="补充一个最关键的信息即可，例如来源类型或主页链接"
              className="min-w-0 flex-1 rounded-[16px] border border-amber-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
            />
            <button
              type="submit"
              disabled={isFollowingSource || !followUpInput.trim()}
              className="inline-flex items-center justify-center rounded-full bg-white px-4 py-3 text-sm font-medium text-amber-900 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              补充后继续
            </button>
          </form>
        </div>
      ) : null}
    </section>
  );
}

function DiscoverySummaryCard({
  item,
  expanded,
  onToggle,
  section,
  ruleBasisLabel,
  ruleFacts,
}: {
  item: DiscoveryCandidateItem;
  expanded: boolean;
  onToggle: () => void;
  section: SectionKey;
  ruleBasisLabel: string;
  ruleFacts: string[];
}) {
  const status = candidateStatusMeta(item.screening_status);
  const contentOrigin = contentOriginMeta(item);
  const detailTitle =
    section === "recent"
      ? "为什么会出现在这里"
      : section === "watch"
        ? "继续观察原因"
        : "进入信号流的原因";

  const summaryText =
    item.structured_summary || item.raw_excerpt || item.reason_summary || "OpenUni 已识别到这条校园动态。";
  const actionHref =
    section === "promoted" ? item.linked_signal_href ?? "/home" : item.linked_signal_href;
  const primaryLink = item.source_original_url ?? item.source_read_url;
  const sourceLink =
    item.source_home_url && item.source_home_url !== primaryLink ? item.source_home_url : item.source_home_url || null;
  const [showSourceDetail] = useState(false);

  return (
    <article className="rounded-[22px] border border-slate-200/75 bg-white/86 p-4 shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-slate-100 px-3 py-1.5 font-medium text-slate-700">
            {item.candidate_type}
          </span>
          <span>{item.source_name}</span>
          <span>{formatDateTime(item.published_at)}</span>
        </div>
        <span className={`rounded-full px-3 py-1.5 font-semibold ${status.tone}`}>{status.label}</span>
      </div>

      <h3 className="mt-3 text-[18px] font-semibold leading-7 text-ink">{item.title}</h3>
      <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">{truncateText(summaryText, 72)}</p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {section === "promoted" && actionHref ? (
          <Link
            href={actionHref}
            className="inline-flex rounded-full bg-ink px-4 py-2 text-sm font-medium text-white transition hover:translate-y-[-1px]"
          >
            去信号页继续判断
          </Link>
        ) : actionHref ? (
          <Link
            href={actionHref}
            className="inline-flex rounded-full border border-brand-100 bg-brand-50 px-4 py-2 text-sm font-medium text-brand-700 transition hover:border-brand-200 hover:bg-brand-100"
          >
            查看后续判断
          </Link>
        ) : null}

        <button
          type="button"
          onClick={onToggle}
          className="inline-flex rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
        >
          {expanded ? "收起" : "展开详情"}
        </button>
      </div>

      {showSourceDetail ? (
        <div className="mt-4 rounded-[18px] border border-slate-200 bg-slate-50/75 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
              {item.source_origin_label}
            </span>
            <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${sourceReadabilityTone(item.source_readability_status)}`}>
              {item.source_last_sync_message}
            </span>
          </div>
          <div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
            <div>来源名称：{item.source_name}</div>
            <div>来源类型：{item.source_kind}</div>
            <div>所属组织：{item.source_organization_or_college || "当前来源未标注组织信息"}</div>
            <div>来源归属：{item.source_origin_label}</div>
            <div>最近同步：{formatDateTime(item.source_last_synced_at)}</div>
            <div className="sm:col-span-2">来源说明：{item.source_last_sync_message}</div>
            {sourceLink ? <div className="sm:col-span-2">来源入口：{compactUrlLabel(sourceLink)}</div> : null}
            {item.source_read_url ? (
              <div className="sm:col-span-2">最近读取：{compactUrlLabel(item.source_read_url)}</div>
            ) : null}
          </div>
        </div>
      ) : null}

      {expanded ? (
        <div className="mt-4 space-y-4 rounded-[18px] border border-slate-100 bg-slate-50/80 p-4">
          <div>
            <p className="text-xs font-semibold tracking-[0.08em] text-slate-500">{detailTitle}</p>
            <p className="mt-2 text-sm leading-7 text-slate-700">{item.reason_summary}</p>
          </div>

          <details className="rounded-[16px] bg-white/80 px-3.5 py-3">
            <summary className="cursor-pointer list-none text-sm font-medium text-slate-700">
              查看更完整的内容说明
            </summary>
            <p className="mt-2 text-sm leading-7 text-slate-700">{item.structured_summary || item.raw_excerpt}</p>
          </details>

          {showSourceDetail && item.is_sample_content ? (
            <div className="rounded-[14px] bg-amber-50 px-3 py-2 text-xs leading-6 text-amber-800">
              当前这条作为示例内容保留，用来补足发现层的默认可见度；它不是本轮真实同步出来的候选。
            </div>
          ) : null}

          {showSourceDetail ? (
            <div className="grid gap-2 rounded-[14px] bg-white/80 px-3 py-3 text-xs text-slate-600 sm:grid-cols-2">
              <div>内容归属：{item.content_origin_label}</div>
              <div>来源类型：{item.source_kind}</div>
              <div>所属组织：{item.source_organization_or_college || "未识别到明确组织"}</div>
              <div>来源状态：{item.source_origin_label}</div>
            </div>
          ) : null}

          <div className="mt-3 flex flex-wrap gap-2">
            {showSourceDetail && sourceLink ? (
              <a
                href={sourceLink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
              >
                打开来源入口
              </a>
            ) : null}
            {showSourceDetail && primaryLink ? (
              <a
                href={primaryLink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex rounded-full border border-brand-100 bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-700 transition hover:border-brand-200 hover:bg-brand-100"
              >
                打开原文页面
              </a>
            ) : null}
          </div>

          {item.extracted_value_signals.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {item.extracted_value_signals.slice(0, 3).map((signal) => (
                <span
                  key={`${item.id}-${signal}`}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600"
                >
                  {signal}
                </span>
              ))}
            </div>
          ) : null}

          {ruleFacts.length > 0 ? (
            <details className="rounded-[16px] bg-white/80 px-3.5 py-3">
              <summary className="cursor-pointer list-none text-sm font-medium text-slate-700">
                查看当前判断依据
              </summary>
              <p className="mt-2 text-xs font-semibold tracking-[0.08em] text-slate-500">
                当前判断依据：{ruleBasisLabel}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {ruleFacts.slice(0, 2).map((fact) => (
                  <span
                    key={`${item.id}-${fact}`}
                    className="rounded-full border border-brand-100 bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-700"
                  >
                    {fact}
                  </span>
                ))}
              </div>
            </details>
          ) : null}

          {section === "promoted" ? (
            <div className="flex flex-wrap gap-3">
              <Link
                href={actionHref ?? "/home"}
                className="inline-flex rounded-full bg-ink px-4 py-2 text-sm font-medium text-white transition hover:translate-y-[-1px]"
              >
                去信号页继续判断
              </Link>
              <Link
                href="/signal/swim/ask"
                className="inline-flex rounded-full border border-brand-100 bg-white px-4 py-2 text-sm font-medium text-brand-700 transition hover:border-brand-200 hover:bg-brand-50"
              >
                问一问 OpenUni
              </Link>
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

function SourceCard({
  source,
  busySourceId,
  onLowerPriority,
  onRemove,
}: {
  source: DiscoverySourceItem;
  busySourceId: string | null;
  onLowerPriority: (sourceId: string) => Promise<void>;
  onRemove: (sourceId: string) => Promise<void>;
}) {
  const status = sourceStatusMeta(source.status);
  const isBusy = busySourceId === source.id;

  return (
    <article className="rounded-[20px] border border-slate-200/75 bg-white/90 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-ink">{source.source_name}</h3>
            <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${status.tone}`}>
              {status.label}
            </span>
            {source.registry_category ? (
              <span className="rounded-full bg-sky-50 px-3 py-1.5 text-xs font-medium text-sky-700">
                {source.registry_category}
              </span>
            ) : null}
            {sourceGroupLabel(source.registry_group) ? (
              <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600">
                {sourceGroupLabel(source.registry_group)}
              </span>
            ) : null}
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600">
              {source.source_origin_label}
            </span>
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {source.organization_or_college} · {source.source_kind}
          </p>
        </div>

        {source.is_user_added ? (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={isBusy}
              onClick={() => void onLowerPriority(source.id)}
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-amber-200 hover:bg-amber-50 hover:text-amber-700 disabled:opacity-50"
            >
              降低优先级
            </button>
            <button
              type="button"
              disabled={isBusy}
              onClick={() => void onRemove(source.id)}
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50"
            >
              移出关注
            </button>
          </div>
        ) : null}
      </div>

      <p className="mt-3 text-sm leading-6 text-slate-600">{source.recent_update_summary}</p>
      {source.content_focus?.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {source.content_focus.slice(0, 3).map((focus) => (
            <span
              key={`${source.id}-${focus}`}
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600"
            >
              {focus}
            </span>
          ))}
        </div>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2">
        <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs text-slate-600">
          最近同步：{formatDateTime(source.last_checked_at)}
        </span>
        <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs text-slate-600">
          本轮命中：{source.last_hit_count}
        </span>
        <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs text-slate-600">
          累计有效：{source.total_hit_count}
        </span>
        <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs text-slate-600">
          优先级：{source.priority_score}
        </span>
      </div>
      <p className="mt-3 text-xs leading-6 text-slate-500">
        来源入口：{compactUrlLabel(source.seed_url ?? source.source_home_url)}
      </p>
    </article>
  );
}

function DiscoverySyncTraceStrip({
  resultSummary,
  syncReport,
  syncedAt,
}: {
  resultSummary: ResultSummary;
  syncReport: SyncReport;
  syncedAt: string | null | undefined;
}) {
  if (!resultSummary && !syncReport) {
    return null;
  }

  const standoutTitle =
    syncReport?.standout_title ?? resultSummary?.standout?.title ?? "本轮没有新增高价值候选";

  return (
    <section className="rounded-[22px] border border-emerald-100 bg-emerald-50/85 px-4 py-3 shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-[0.12em] text-emerald-700">本轮同步结果</p>
          <h2 className="mt-1 text-base font-semibold text-emerald-950">
            {resultSummary?.title ?? "OpenUni 已完成这轮来源更新"}
          </h2>
        </div>
        <span className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-emerald-800">
          最近同步 {formatDateTime(syncReport?.synced_at ?? syncedAt)}
        </span>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-4">
        <SummaryStat
          label="查看来源"
          value={syncReport?.synced_source_count ?? 0}
          note={
            syncReport
              ? `${syncReport.successful_source_count} 成功 / ${syncReport.failed_source_count} 失败`
              : undefined
          }
        />
        <SummaryStat label="发现内容" value={syncReport?.candidate_count ?? 0} />
        <SummaryStat label="进入信号流" value={syncReport?.promoted_count ?? 0} />
        <SummaryStat label="最值得继续看" value={truncateText(standoutTitle, 14)} />
      </div>

      {resultSummary?.items?.length ? (
        <p className="mt-3 text-sm leading-6 text-emerald-950/80">
          {resultSummary.items.slice(0, 2).join(" · ")}
        </p>
      ) : null}

      {syncReport?.sources?.length ? (
        <details className="mt-3 rounded-[16px] bg-white/70 px-3 py-2">
          <summary className="cursor-pointer list-none text-sm font-medium text-emerald-900">
            查看这轮更新详情
          </summary>
          <div className="mt-3 space-y-3">
            {syncReport.sources.map((source) => (
              <article
                key={`${source.source_id}-${source.read_url ?? source.source_name}`}
                className="rounded-[16px] border border-emerald-100 bg-white px-3 py-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-emerald-950">{source.source_name}</p>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                      {source.source_kind}
                    </span>
                    <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 ring-1 ring-slate-200">
                      {source.source_origin_label}
                    </span>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${sourceReadabilityTone(source.sync_status)}`}
                  >
                    {source.sync_status_label}
                  </span>
                </div>

                <p className="mt-2 text-sm leading-6 text-slate-600">{source.sync_message}</p>
                <p className="mt-2 text-xs text-slate-500">这次查看页面：{source.read_count}</p>

                <div className="mt-3 grid gap-2 text-xs text-slate-500 sm:grid-cols-2">
                  <div>这次查看入口：{compactUrlLabel(source.read_url ?? source.source_home_url)}</div>
                  <div>发现内容：{source.candidate_count} 条</div>
                  <div>继续观察：{source.useful_count} 条</div>
                  <div>进入信号流：{source.promoted_count} 条</div>
                </div>

                {source.error_message ? (
                  <p className="mt-2 rounded-[12px] bg-rose-50 px-3 py-2 text-xs leading-6 text-rose-700">
                    这次没有顺利读到结果：{source.error_message}
                  </p>
                ) : null}

                <div className="mt-3 flex flex-wrap gap-2">
                  {source.read_url ? (
                    <a
                      href={source.read_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-xs font-medium text-emerald-800 transition hover:border-emerald-300 hover:bg-emerald-100"
                    >
                      查看这次读取页面
                    </a>
                  ) : null}
                  {source.source_home_url ? (
                    <a
                      href={source.source_home_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                    >
                      打开来源入口
                    </a>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </details>
      ) : null}
    </section>
  );
}

function ImmediateSourceSyncCard({
  result,
}: {
  result: ImmediateSourceSync;
}) {
  if (!result) {
    return null;
  }

  return (
    <section className="rounded-[22px] border border-sky-100 bg-sky-50/80 px-4 py-4 shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-[0.12em] text-sky-700">你刚关注来源的最新结果</p>
          <h2 className="mt-1 text-base font-semibold text-sky-950">
            {result.source_name} 这次带来了什么
          </h2>
        </div>
        <span className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-sky-800">
          {result.source_kind} · {result.sync_status_label}
        </span>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-4">
        <SummaryStat label="读到内容" value={result.generated_candidate_count} />
        <SummaryStat label="进入发现层" value={result.visible_candidate_count} />
        <SummaryStat label="进入信号流" value={result.promoted_count} />
        <SummaryStat label="已归并" value={result.deduped_count} />
      </div>

      <p className="mt-3 text-sm leading-6 text-sky-950/80">{truncateText(result.explanation, 72)}</p>

      <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
        <span className="rounded-full bg-white px-3 py-1.5 ring-1 ring-sky-100">
          这次查看入口：{compactUrlLabel(result.read_url ?? result.source_home_url)}
        </span>
      </div>

      {result.candidates.length > 0 ? (
        <details className="mt-4 rounded-[18px] bg-white/75 px-3 py-3">
          <summary className="cursor-pointer list-none text-sm font-medium text-sky-900">
            查看这次带来的内容
          </summary>
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            {result.candidates.map((candidate) => (
              <article
                key={candidate.id}
                className="rounded-[18px] border border-sky-100 bg-white px-4 py-3"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-medium text-sky-700">
                    {screeningStatusLabel(candidate.screening_status)}
                  </span>
                </div>
                <h3 className="mt-2 text-sm font-semibold leading-6 text-ink">{candidate.title}</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {candidate.linked_signal_href ? (
                    <Link
                      href={candidate.linked_signal_href}
                      className="inline-flex rounded-full bg-ink px-3 py-1.5 text-xs font-medium text-white"
                    >
                      去继续判断
                    </Link>
                  ) : null}
                  {candidate.original_url ? (
                    <a
                      href={candidate.original_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600"
                    >
                      查看原文
                    </a>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </details>
      ) : null}
    </section>
  );
}

function DiscoveryTraceCard({
  item,
  expanded,
  onToggle,
  section,
  ruleBasisLabel,
  ruleFacts,
}: {
  item: DiscoveryCandidateItem;
  expanded: boolean;
  onToggle: () => void;
  section: SectionKey;
  ruleBasisLabel: string;
  ruleFacts: string[];
}) {
  const status = candidateStatusMeta(item.screening_status);
  const contentOrigin = contentOriginMeta(item);
  const detailTitle =
    section === "recent"
      ? "为什么会出现在发现层"
      : section === "watch"
        ? "为什么值得继续观察"
        : "为什么已经进入信号流";
  const summaryText =
    item.structured_summary || item.raw_excerpt || item.reason_summary || "OpenUni 已识别到这条内容值得继续查看。";
  const primaryLink = item.source_original_url ?? item.source_read_url;
  const sourceLink =
    item.source_home_url && item.source_home_url !== primaryLink ? item.source_home_url : item.source_home_url || null;
  const actionHref = section === "promoted" ? item.linked_signal_href ?? "/home" : item.linked_signal_href;
  const [showSourceDetail, setShowSourceDetail] = useState(false);

  return (
    <article className="rounded-[22px] border border-slate-200/75 bg-white/86 p-4 shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-slate-100 px-3 py-1.5 font-medium text-slate-700">
            {item.candidate_type}
          </span>
          <span className="rounded-full bg-white px-3 py-1.5 font-medium text-slate-600 ring-1 ring-slate-200">
            {item.source_origin_label}
          </span>
          <span className={`rounded-full px-3 py-1.5 font-semibold ${contentOrigin.tone}`}>
            {contentOrigin.label}
          </span>
          <span>{item.source_name}</span>
          <span>{formatDateTime(item.published_at)}</span>
        </div>
        <span className={`rounded-full px-3 py-1.5 font-semibold ${status.tone}`}>{status.label}</span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <span className="rounded-full bg-slate-50 px-2.5 py-1 font-medium text-slate-600">
          {item.source_kind}
        </span>
        <span className={`rounded-full px-2.5 py-1 font-medium ${sourceReadabilityTone(item.source_readability_status)}`}>
          {item.source_last_sync_message}
        </span>
        <span>最近同步 {formatDateTime(item.source_last_synced_at)}</span>
      </div>

      <h3 className="mt-3 text-[18px] font-semibold leading-7 text-ink">{item.title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{truncateText(summaryText, 96)}</p>

      <div className="mt-3 flex flex-wrap gap-2">
        {ruleFacts.slice(0, 1).map((fact) => (
          <span
            key={`${item.id}-${fact}`}
            className="rounded-full border border-brand-100 bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-700"
          >
            {fact}
          </span>
        ))}
        {primaryLink ? (
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600">
            原文：{compactUrlLabel(primaryLink)}
          </span>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {primaryLink ? (
          <a
            href={primaryLink}
            target="_blank"
            rel="noreferrer"
            className="inline-flex rounded-full border border-brand-100 bg-brand-50 px-4 py-2 text-sm font-medium text-brand-700 transition hover:border-brand-200 hover:bg-brand-100"
          >
            查看原文
          </a>
        ) : null}

        <button
          type="button"
          onClick={() => setShowSourceDetail((current) => !current)}
          className="inline-flex rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
        >
          {showSourceDetail ? "收起来源" : "查看来源"}
        </button>

        {sourceLink ? (
          <a
            href={sourceLink}
            target="_blank"
            rel="noreferrer"
            className="hidden rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
          >
            查看来源
          </a>
        ) : null}

        {section === "promoted" && actionHref ? (
          <Link
            href={actionHref}
            className="inline-flex rounded-full bg-ink px-4 py-2 text-sm font-medium text-white transition hover:translate-y-[-1px]"
          >
            去信号页继续判断
          </Link>
        ) : null}

        <button
          type="button"
          onClick={onToggle}
          className="inline-flex rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
        >
          {expanded ? "收起" : "展开详情"}
        </button>
      </div>

      {expanded ? (
        <div className="mt-4 space-y-4 rounded-[18px] border border-slate-100 bg-slate-50/80 p-4">
          <div>
            <p className="text-xs font-semibold tracking-[0.08em] text-slate-500">{detailTitle}</p>
            <p className="mt-2 text-sm leading-7 text-slate-700">{item.reason_summary}</p>
          </div>

          <div>
            <p className="text-xs font-semibold tracking-[0.08em] text-slate-500">更完整的内容摘要</p>
            <p className="mt-2 text-sm leading-7 text-slate-700">{item.structured_summary || item.raw_excerpt}</p>
          </div>

          <div className="rounded-[16px] bg-white/80 px-3.5 py-3">
            <p className="text-xs font-semibold tracking-[0.08em] text-slate-500">来源与同步信息</p>
            <div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
              <div>来源名称：{item.source_name}</div>
              <div>来源类型：{item.source_kind}</div>
              <div>来源归属：{item.source_origin_label}</div>
              <div>最近同步：{formatDateTime(item.source_last_synced_at)}</div>
              <div className="sm:col-span-2">最近同步说明：{item.source_last_sync_message}</div>
              {primaryLink ? <div className="sm:col-span-2">原文链接：{compactUrlLabel(primaryLink)}</div> : null}
              {item.source_read_url ? (
                <div className="sm:col-span-2">这次读取页面：{compactUrlLabel(item.source_read_url)}</div>
              ) : null}
              {item.source_home_url ? (
                <div className="sm:col-span-2">来源入口：{compactUrlLabel(item.source_home_url)}</div>
              ) : null}
              {item.source_last_sync_run_id ? (
                <div className="sm:col-span-2">同步批次：{item.source_last_sync_run_id}</div>
              ) : null}
            </div>
          </div>

          {item.extracted_value_signals.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {item.extracted_value_signals.slice(0, 4).map((signal) => (
                <span
                  key={`${item.id}-${signal}`}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600"
                >
                  {signal}
                </span>
              ))}
            </div>
          ) : null}

          {ruleFacts.length > 0 ? (
            <div className="rounded-[16px] bg-white/80 px-3.5 py-3">
              <p className="text-xs font-semibold tracking-[0.08em] text-slate-500">
                当前判断依据：{ruleBasisLabel}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {ruleFacts.slice(0, 3).map((fact) => (
                  <span
                    key={`${item.id}-${fact}`}
                    className="rounded-full border border-brand-100 bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-700"
                  >
                    {fact}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3">
            {actionHref ? (
              <Link
                href={actionHref}
                className="inline-flex rounded-full bg-ink px-4 py-2 text-sm font-medium text-white transition hover:translate-y-[-1px]"
              >
                {section === "promoted" ? "去信号页继续判断" : "去继续判断"}
              </Link>
            ) : null}
            <Link
              href="/signal/swim/ask"
              className="inline-flex rounded-full border border-brand-100 bg-white px-4 py-2 text-sm font-medium text-brand-700 transition hover:border-brand-200 hover:bg-brand-50"
            >
              问一问 OpenUni
            </Link>
          </div>
        </div>
      ) : null}
    </article>
  );
}

function TraceableSourceCard({
  source,
  busySourceId,
  supplementingSourceId,
  entryDraft,
  onEntryDraftChange,
  onLowerPriority,
  onRemove,
  onSupplementEntry,
}: {
  source: DiscoverySourceItem;
  busySourceId: string | null;
  supplementingSourceId: string | null;
  entryDraft: string;
  onEntryDraftChange: (value: string) => void;
  onLowerPriority: (sourceId: string) => Promise<void>;
  onRemove: (sourceId: string) => Promise<void>;
  onSupplementEntry: (sourceId: string, entryUrl: string) => Promise<void>;
}) {
  const status = sourceStatusMeta(source.status);
  const isBusy = busySourceId === source.id;
  const isSupplementing = supplementingSourceId === source.id;

  return (
    <article className="rounded-[20px] border border-slate-200/75 bg-white/90 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-ink">{source.source_name}</h3>
            <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${status.tone}`}>
              {status.label}
            </span>
            <span
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${sourceReadabilityTone(source.readability_status)}`}
            >
              {source.sync_status_label}
            </span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600">
              {source.source_origin_label}
            </span>
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {source.organization_or_college} · {source.source_kind}
          </p>
        </div>

        {source.is_user_added ? (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={isBusy || isSupplementing}
              onClick={() => void onLowerPriority(source.id)}
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-amber-200 hover:bg-amber-50 hover:text-amber-700 disabled:opacity-50"
            >
              降低优先级
            </button>
            <button
              type="button"
              disabled={isBusy || isSupplementing}
              onClick={() => void onRemove(source.id)}
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50"
            >
              移出关注
            </button>
          </div>
        ) : null}
      </div>

      <p className="mt-3 text-sm leading-6 text-slate-600">{source.sync_status_summary}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {source.registry_category ? (
          <span className="rounded-full bg-sky-50 px-3 py-1.5 text-xs font-medium text-sky-700">
            {source.registry_category}
          </span>
        ) : null}
        {sourceGroupLabel(source.registry_group) ? (
          <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600">
            {sourceGroupLabel(source.registry_group)}
          </span>
        ) : null}
        <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs text-slate-600">
          {sourceReadinessLabel(source)}
        </span>
      </div>
      {source.content_focus?.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {source.content_focus.slice(0, 3).map((focus) => (
            <span
              key={`${source.id}-${focus}`}
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600"
            >
              {focus}
            </span>
          ))}
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs text-slate-600">
          最近同步 {formatDateTime(source.last_checked_at)}
        </span>
        <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs text-slate-600">
          最近命中 {source.last_hit_count}
        </span>
        <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs text-slate-600">
          累计产出 {source.total_hit_count}
        </span>
        <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs text-slate-600">
          关注优先级 {source.priority_score}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
        <span>来源入口：{compactUrlLabel(source.source_home_url)}</span>
        {source.last_read_url ? <span>最近读取：{compactUrlLabel(source.last_read_url)}</span> : null}
      </div>

      {source.last_error_message ? (
        <p className="mt-3 rounded-[14px] bg-rose-50 px-3 py-2 text-xs leading-6 text-rose-700">
          这次没有形成明显结果：{source.last_error_message}
        </p>
      ) : null}

      {source.needs_entry_link && source.is_user_added ? (
        <div className="mt-3 rounded-[16px] border border-amber-100 bg-amber-50/80 p-3">
          <p className="text-sm font-medium text-amber-950">这个来源还缺少稳定入口</p>
          <p className="mt-1 text-xs leading-6 text-amber-900/80">
            OpenUni 目前只保存了来源名称。补一条最近文章链接或来源入口后，后续同步会更稳定。
          </p>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row">
            <input
              value={entryDraft}
              onChange={(event) => onEntryDraftChange(event.target.value)}
              placeholder="补充最近文章链接或来源入口"
              className="min-w-0 flex-1 rounded-[14px] border border-amber-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
            />
            <button
              type="button"
              disabled={isSupplementing || !entryDraft.trim()}
              onClick={() => void onSupplementEntry(source.id, entryDraft)}
              className="inline-flex items-center justify-center rounded-full bg-white px-4 py-2 text-sm font-medium text-amber-900 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSupplementing ? "补充中..." : "补充来源入口"}
            </button>
          </div>
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        {source.source_home_url ? (
          <a
            href={source.source_home_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
          >
            查看来源
          </a>
        ) : null}
        {source.last_read_url && source.last_read_url !== source.source_home_url ? (
          <a
            href={source.last_read_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex rounded-full border border-brand-100 bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-700 transition hover:border-brand-200 hover:bg-brand-100"
          >
            查看最近读取页面
          </a>
        ) : null}
      </div>
    </article>
  );
}

function EmptyStateCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <section className="rounded-[20px] border border-dashed border-slate-200 bg-white/72 px-4 py-5">
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
    </section>
  );
}

export default function DiscoverPage() {
  const router = useRouter();
  const { setMode, isTutorialMode } = useProductMode();
  const { has_rule, basis_label, rule } = useActiveRule();
  const [discoveryData, setDiscoveryData] = useState<DiscoveryPageData>(() => getDiscoveryPageData());
  const [runtime, setRuntime] = useState<DiscoveryApiPayload["runtime"]>({
    has_custom_sources: false,
    custom_source_count: 0,
    last_synced_at: null,
  });
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resultSummary, setResultSummary] = useState<ResultSummary>(null);
  const [syncReport, setSyncReport] = useState<SyncReport>(null);
  const [immediateSourceSync, setImmediateSourceSync] = useState<ImmediateSourceSync>(null);
  const [followInput, setFollowInput] = useState("");
  const [followUp, setFollowUp] = useState<FollowUpPayload>(null);
  const [followUpInput, setFollowUpInput] = useState("");
  const [isFollowingSource, setIsFollowingSource] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [busySourceId, setBusySourceId] = useState<string | null>(null);
  const [entryDrafts, setEntryDrafts] = useState<Record<string, string>>({});
  const [supplementingSourceId, setSupplementingSourceId] = useState<string | null>(null);
  const [expandedCards, setExpandedCards] = useState<Record<SectionKey, string | null>>({
    recent: null,
    watch: null,
    promoted: null,
  });

  const quickRuleFacts = useMemo(
    () => (rule ? buildRuleQuickFacts(rule.facts).slice(0, 3) : []),
    [rule],
  );

  const recentItems = useMemo(() => {
    const filtered = isTutorialMode
      ? discoveryData.recent_happenings
      : discoveryData.recent_happenings.filter((item) => !isTutorialDiscoveryItem(item));

    return filtered.length > 0 ? filtered : discoveryData.recent_happenings;
  }, [discoveryData.recent_happenings, isTutorialMode]);

  const watchItems = useMemo(() => {
    const filtered = isTutorialMode
      ? discoveryData.watch_candidates
      : discoveryData.watch_candidates.filter((item) => !isTutorialDiscoveryItem(item));

    return filtered.length > 0 ? filtered : discoveryData.watch_candidates;
  }, [discoveryData.watch_candidates, isTutorialMode]);

  const promotedItems = useMemo(() => {
    const filtered = isTutorialMode
      ? discoveryData.promoted_candidates
      : discoveryData.promoted_candidates.filter((item) => !isTutorialDiscoveryItem(item));

    return filtered.length > 0 ? filtered : discoveryData.promoted_candidates;
  }, [discoveryData.promoted_candidates, isTutorialMode]);

  const activeSources = useMemo(
    () => discoveryData.sources.filter((source) => source.status === "active"),
    [discoveryData.sources],
  );
  const secondarySources = useMemo(
    () => discoveryData.sources.filter((source) => source.status !== "active"),
    [discoveryData.sources],
  );

  const handleStartTutorial = () => {
    setMode("tutorial");
    router.push("/home");
  };

  const handleExitTutorial = () => {
    setMode("formal");
    router.push("/discover");
  };

  const toggleCard = (section: SectionKey, id: string) => {
    setExpandedCards((current) => ({
      ...current,
      [section]: current[section] === id ? null : id,
    }));
  };

  const applyPayload = (payload: DiscoveryApiPayload) => {
    if (payload.data) {
      setDiscoveryData(payload.data);
    }
    if (payload.runtime) {
      setRuntime(payload.runtime);
    }

    setNotice(payload.notice ?? null);
    setError(payload.error ?? null);
    setResultSummary(payload.result_summary ?? null);
    setFollowUp(payload.follow_up ?? null);
    setSyncReport(payload.sync_report ?? null);
    setImmediateSourceSync(payload.immediate_source_sync ?? null);
  };

  const loadDiscovery = async () => {
    try {
      const response = await fetch("/api/discovery", {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`Discovery request failed with status ${response.status}`);
      }

      const payload = (await response.json()) as DiscoveryApiPayload;
      applyPayload(payload);
    } catch {
      setError("发现层暂时没有拿到最新结果，当前先展示本地演示数据。");
    }
  };

  const submitFollowIntent = async (text: string) => {
    const input = text.trim();
    if (!input) {
      return;
    }

    setIsFollowingSource(true);
    setError(null);

    try {
      const response = await fetch("/api/discovery", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "follow_source",
          input,
        }),
      });

      const payload = (await response.json()) as DiscoveryApiPayload;
      applyPayload(payload);

      if (response.ok && !payload.follow_up) {
        setFollowInput("");
        setFollowUpInput("");
      }
    } catch {
      setError("暂时没能把这个来源加入关注列表，请稍后再试。");
    } finally {
      setIsFollowingSource(false);
    }
  };

  const handleContinueFollowUp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!followUp || !followUpInput.trim()) {
      return;
    }

    if (!followUp.source_id) {
      await submitFollowIntent(`${followUp.draft_text} ${followUpInput.trim()}`);
      return;
    }

    setIsFollowingSource(true);
    setError(null);

    try {
      const response = await fetch("/api/discovery", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "supplement_source_entry",
          source_id: followUp.source_id,
          entry_url: followUpInput.trim(),
        }),
      });

      const payload = (await response.json()) as DiscoveryApiPayload;
      applyPayload(payload);
      if (response.ok) {
        setFollowUpInput("");
      }
    } catch {
      setError("来源入口补充失败，请稍后再试。");
    } finally {
      setIsFollowingSource(false);
    }
  };

  const handleConfirmFollowUp = async () => {
    if (!followUp) {
      return;
    }

    setIsFollowingSource(true);
    setError(null);

    try {
      const response = await fetch("/api/discovery", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "follow_source",
          input: followUp.draft_text,
          confirmed: true,
        }),
      });

      const payload = (await response.json()) as DiscoveryApiPayload;
      applyPayload(payload);
      if (response.ok && !payload.follow_up) {
        setFollowInput("");
        setFollowUpInput("");
      }
    } catch {
      setError("来源确认失败了，请再试一次。");
    } finally {
      setIsFollowingSource(false);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    setError(null);

    try {
      const response = await fetch("/api/discovery", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "sync",
        }),
      });

      const payload = (await response.json()) as DiscoveryApiPayload;
      applyPayload(payload);
    } catch {
      setError("这次没有成功同步关注来源，当前先保留上一轮发现结果。");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSourceAction = async (action: "remove_source" | "lower_priority", sourceId: string) => {
    setBusySourceId(sourceId);
    setError(null);

    try {
      const response = await fetch("/api/discovery", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action,
          source_id: sourceId,
        }),
      });

      const payload = (await response.json()) as DiscoveryApiPayload;
      applyPayload(payload);
    } catch {
      setError("这次没有成功更新来源状态，请稍后再试。");
    } finally {
      setBusySourceId(null);
    }
  };

  const handleSupplementEntry = async (sourceId: string, entryUrl: string) => {
    if (!entryUrl.trim()) {
      return;
    }

    setSupplementingSourceId(sourceId);
    setError(null);

    try {
      const response = await fetch("/api/discovery", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "supplement_source_entry",
          source_id: sourceId,
          entry_url: entryUrl.trim(),
        }),
      });

      const payload = (await response.json()) as DiscoveryApiPayload;
      applyPayload(payload);
      if (response.ok) {
        setEntryDrafts((current) => ({
          ...current,
          [sourceId]: "",
        }));
      }
    } catch {
      setError("来源入口补充失败，请稍后再试。");
    } finally {
      setSupplementingSourceId(null);
    }
  };

  useEffect(() => {
    void loadDiscovery();
  }, []);

  return (
    <AppShell withProductChrome showShellLabel contentClassName="space-y-6">
      <PageHeader
        eyebrow="DISCOVERY"
        title="北航最近发生了什么"
        description="先快速扫一眼最近校园动态。"
      />

      <section className="rounded-[22px] border border-slate-200/80 bg-white/84 px-4 py-3 shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {isTutorialMode ? (
            <p className="text-sm leading-6 text-slate-600">
              <span className="font-semibold text-slate-700">教学示例模式：</span>
              用 swim 案例看懂发现层怎样把内容推进到信号流。
            </p>
          ) : (
            <p className="text-sm leading-6 text-slate-600">
              <span className="font-semibold text-slate-700">正式使用模式：</span>
              这里优先展示北航最近发生了什么。
            </p>
          )}

          {isTutorialMode ? (
            <button
              type="button"
              onClick={handleExitTutorial}
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
              查看教学示例
            </button>
          )}
        </div>
      </section>

      <section className="rounded-[22px] border border-amber-200/80 bg-amber-50/70 px-4 py-3 shadow-soft">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-amber-700">
            Vercel 演示版
          </span>
          <p className="text-sm leading-6 text-amber-900">
            当前线上版本用于演示 OpenUni 的核心体验；还没有部署完整后端服务器、后台队列和持久数据库，所以发现同步采用轻量读取策略。
          </p>
        </div>
      </section>

      <section className="rounded-[24px] border border-slate-200/80 bg-white/84 p-4 shadow-soft">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="grid flex-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryStat
              label="当前关注来源"
              value={discoveryData.source_pool_summary.tracked_count}
              note={`${discoveryData.source_pool_summary.user_followed_sources} 个为我添加`}
            />
            <SummaryStat label="本轮发现候选" value={discoveryData.source_pool_summary.candidate_count} />
            <SummaryStat label="已进入信号流" value={discoveryData.source_pool_summary.promoted_count} />
            <SummaryStat
              label="最近同步"
              value={formatDateTime(runtime?.last_synced_at ?? discoveryData.last_synced_at)}
            />
          </div>

          <button
            type="button"
            onClick={() => void handleSync()}
            disabled={isSyncing}
            className="inline-flex min-h-[46px] shrink-0 items-center justify-center rounded-full bg-ink px-5 py-3 text-sm font-medium text-white transition hover:translate-y-[-1px] disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isSyncing ? "正在更新发现..." : "更新发现"}
          </button>
        </div>
      </section>

      <CompactRuleBasisStrip
        basisLabel={basis_label}
        isCustom={has_rule}
        summary={
          has_rule && rule
            ? `${rule.summary} OpenUni 会优先把更相关的内容推进到后面两层。`
            : "当前还没有导入学院规则，发现层会先用系统默认规则样本做初步判断。"
        }
        quickFacts={quickRuleFacts}
      />

      <FollowSourceComposer
        followInput={followInput}
        setFollowInput={setFollowInput}
        submitFollowIntent={submitFollowIntent}
        isFollowingSource={isFollowingSource}
        followUp={followUp}
        followUpInput={followUpInput}
        setFollowUpInput={setFollowUpInput}
        onConfirmFollowUp={handleConfirmFollowUp}
        onContinueFollowUp={handleContinueFollowUp}
      />

      <CompactNotice notice={notice} error={error} />

      <DiscoverySyncTraceStrip
        resultSummary={resultSummary}
        syncReport={syncReport}
        syncedAt={runtime?.last_synced_at ?? discoveryData.last_synced_at}
      />

      <ImmediateSourceSyncCard result={immediateSourceSync} />

      <details className="rounded-[20px] border border-slate-200/75 bg-white/78 px-4 py-3 shadow-soft">
        <summary className="cursor-pointer list-none text-sm font-medium text-slate-700">
          查看 OpenUni 怎样持续关注这些来源
        </summary>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          OpenUni 关注的是一个会持续发布内容的来源，而不是只记住一条链接。
        </p>
      </details>

      <section className="space-y-4">
        <div className="space-y-1">
          <p className="text-sm font-medium text-slate-500">A. 北航最近发生了什么</p>
          <h2 className="text-[24px] font-semibold text-ink">先快速扫一眼当前校园动态</h2>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {recentItems.length > 0 ? (
            recentItems.map((item) => (
              <DiscoveryTraceCard
                key={item.id}
                item={item}
                section="recent"
                expanded={expandedCards.recent === item.id}
                onToggle={() => toggleCard("recent", item.id)}
                ruleBasisLabel={basis_label}
                ruleFacts={quickRuleFacts}
              />
            ))
          ) : (
            <EmptyStateCard
              title="当前还没有新的校园动态"
              description="你可以先刷新一次发现层，或先添加一个想持续关注的北航来源。"
            />
          )}
        </div>
      </section>

      <section id="watch-candidates" className="space-y-4">
        <div className="space-y-1">
          <p className="text-sm font-medium text-slate-500">B. 哪些内容值得继续观察</p>
          <h2 className="text-[24px] font-semibold text-ink">这些内容更接近“值得继续判断”</h2>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {watchItems.length > 0 ? (
            watchItems.map((item) => (
              <DiscoveryTraceCard
                key={item.id}
                item={item}
                section="watch"
                expanded={expandedCards.watch === item.id}
                onToggle={() => toggleCard("watch", item.id)}
                ruleBasisLabel={basis_label}
                ruleFacts={quickRuleFacts}
              />
            ))
          ) : (
            <EmptyStateCard
              title="当前还没有需要继续观察的候选"
              description="本轮还没有明显值得继续往下判断的候选内容，OpenUni 会继续保留来源池观察。"
            />
          )}
        </div>
      </section>

      <section className="space-y-4">
        <div className="space-y-1">
          <p className="text-sm font-medium text-slate-500">C. 哪些已经进入信号流</p>
          <h2 className="text-[24px] font-semibold text-ink">这些内容已经足够重要，可以直接去继续判断</h2>
        </div>

        <div className="space-y-4">
          {promotedItems.length > 0 ? (
            promotedItems.map((item) => (
              <DiscoveryTraceCard
                key={item.id}
                item={item}
                section="promoted"
                expanded={expandedCards.promoted === item.id}
                onToggle={() => toggleCard("promoted", item.id)}
                ruleBasisLabel={basis_label}
                ruleFacts={quickRuleFacts}
              />
            ))
          ) : (
            <EmptyStateCard
              title="当前还没有直接进入信号流的内容"
              description="你可以先从上面的“继续观察”层看看哪些内容更值得往下判断。"
            />
          )}
        </div>
      </section>

      <details className="rounded-[24px] border border-slate-200/75 bg-white/82 p-4 shadow-soft">
        <summary className="cursor-pointer list-none">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-slate-500">D. 来源池状态</p>
              <h2 className="mt-1 text-[22px] font-semibold text-ink">OpenUni 当前正在持续关注哪些来源</h2>
            </div>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600">
              {discoveryData.source_pool_summary.tracked_count} 个来源 ·{" "}
              {runtime?.custom_source_count ?? 0} 个为我添加
            </span>
          </div>
          <p className="mt-2 pr-10 text-sm leading-7 text-slate-600">
            这里会告诉你哪些来源最近有更新、哪些命中了高价值候选、哪些正在降权。默认收起，避免干扰首屏浏览。
          </p>
        </summary>

        <div className="mt-4 space-y-4 border-t border-slate-100 pt-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <SummaryStat
              label="重点来源"
              value={discoveryData.source_pool_status.highlighted_sources.length}
              note={
                discoveryData.source_pool_status.highlighted_sources.length > 0
                  ? truncateText(discoveryData.source_pool_status.highlighted_sources.join("、"), 14)
                  : "当前无"
              }
            />
            <SummaryStat
              label="低优先来源"
              value={discoveryData.source_pool_status.low_priority_sources.length}
              note={
                discoveryData.source_pool_status.low_priority_sources.length > 0
                  ? truncateText(discoveryData.source_pool_status.low_priority_sources.join("、"), 14)
                  : "当前无"
              }
            />
            <SummaryStat
              label="待移出观察"
              value={discoveryData.source_pool_status.candidate_remove_sources.length}
              note={
                discoveryData.source_pool_status.candidate_remove_sources.length > 0
                  ? truncateText(discoveryData.source_pool_status.candidate_remove_sources.join("、"), 14)
                  : "当前无"
              }
            />
          </div>

          <div className="space-y-3">
            {activeSources.map((source) => (
              <TraceableSourceCard
                key={source.id}
                source={source}
                busySourceId={busySourceId}
                supplementingSourceId={supplementingSourceId}
                entryDraft={entryDrafts[source.id] ?? ""}
                onEntryDraftChange={(value) =>
                  setEntryDrafts((current) => ({
                    ...current,
                    [source.id]: value,
                  }))
                }
                onLowerPriority={(sourceId) => handleSourceAction("lower_priority", sourceId)}
                onRemove={(sourceId) => handleSourceAction("remove_source", sourceId)}
                onSupplementEntry={handleSupplementEntry}
              />
            ))}
          </div>

          {secondarySources.length > 0 ? (
            <details className="rounded-[18px] border border-slate-200/75 bg-slate-50/80 px-4 py-3">
              <summary className="cursor-pointer list-none text-sm font-medium text-slate-700">
                查看低优先来源与待移出观察来源
              </summary>
              <div className="mt-3 space-y-3">
                {secondarySources.map((source) => (
                  <TraceableSourceCard
                    key={source.id}
                    source={source}
                    busySourceId={busySourceId}
                    supplementingSourceId={supplementingSourceId}
                    entryDraft={entryDrafts[source.id] ?? ""}
                    onEntryDraftChange={(value) =>
                      setEntryDrafts((current) => ({
                        ...current,
                        [source.id]: value,
                      }))
                    }
                    onLowerPriority={(sourceId) => handleSourceAction("lower_priority", sourceId)}
                    onRemove={(sourceId) => handleSourceAction("remove_source", sourceId)}
                    onSupplementEntry={handleSupplementEntry}
                  />
                ))}
              </div>
            </details>
          ) : null}
        </div>
      </details>
    </AppShell>
  );
}
