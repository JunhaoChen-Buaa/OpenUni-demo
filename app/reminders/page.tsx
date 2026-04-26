"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { PathPreview } from "@/components/path-preview";
import { useProfile } from "@/hooks/use-profile";
import { shareOpenUniContent } from "@/lib/share";
import {
  getReminderEnabled,
  getSignalActionState,
  incrementSignalShare,
  setSignalPlanned,
  setSignalWatchLater,
  type SignalActionState,
} from "@/lib/storage";
import { getMainSignal, getReminderPageData } from "@/lib/mock-data";

type ReminderStatus = "已提醒" | "即将截止" | "待判断";

type ReminderSectionItem = {
  title: string;
  description: string;
  status: ReminderStatus;
  note: string;
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
    return "尚未分享";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function StatusBadge({ status }: { status: ReminderStatus }) {
  const tone =
    status === "已提醒"
      ? "bg-emerald-50 text-emerald-700"
      : status === "即将截止"
        ? "bg-amber-50 text-amber-700"
        : "bg-slate-100 text-slate-600";

  return <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${tone}`}>{status}</span>;
}

function ReminderSection({
  title,
  description,
  items,
}: {
  title: string;
  description: string;
  items: ReminderSectionItem[];
}) {
  return (
    <section className="card-panel rounded-[28px] p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
        </div>
        <div className="rounded-full bg-brand-50 px-3 py-1.5 text-sm font-medium text-brand-700">
          {items.length} 项
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {items.length > 0 ? (
          items.map((item) => (
            <div
              key={`${title}-${item.title}`}
              className="rounded-[22px] border border-slate-100 bg-white p-4 shadow-soft"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-semibold text-ink">{item.title}</h2>
                  <p className="mt-2 line-clamp-2 text-[15px] leading-7 text-slate-600">{item.description}</p>
                  <p className="mt-3 text-sm font-medium text-slate-500">下一步：{item.note}</p>
                </div>
                <StatusBadge status={item.status} />
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-50 p-4">
            <p className="text-[15px] leading-7 text-slate-600">
              目前还没有已开启的提醒项。你可以先在信号详情页设置提醒，之后再回到这里统一查看。
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

export default function RemindersPage() {
  const { profile } = useProfile();
  const [reminderEnabled, setReminderEnabledState] = useState(false);
  const [actionState, setActionState] = useState<SignalActionState>(defaultActionState);
  const [notice, setNotice] = useState<string | null>(null);
  const [showPath, setShowPath] = useState(false);

  useEffect(() => {
    setReminderEnabledState(getReminderEnabled());
    setActionState(getSignalActionState("swim"));
  }, []);

  const reminderData = getReminderPageData(profile, reminderEnabled);
  const mainSignal = useMemo(() => getMainSignal(profile), [profile]);

  const handleTogglePlanned = () => {
    const next = setSignalPlanned("swim", !actionState.planned);
    setActionState(next);
    setNotice(next.planned ? "已标记为“我准备去做”，后续会优先围绕这条信号提醒你。" : "已取消“我准备去做”标记。");
  };

  const handleToggleWatchLater = () => {
    const next = setSignalWatchLater("swim", !actionState.watchLater);
    setActionState(next);
    setNotice(next.watchLater ? "已标记为“稍后再看”，OpenUni 会继续帮你保留这条判断线索。" : "已取消“稍后再看”标记。");
  };

  const handleShare = async () => {
    try {
      const message = await shareOpenUniContent({
        title: `${mainSignal.title}｜OpenUni`,
        summary: "这条信号与综测规则相关，适合先判断是否值得优先做。",
        href: `${window.location.origin}/signal/swim`,
      });

      const next = incrementSignalShare("swim");
      setActionState(next);
      setNotice(message);
    } catch {
      setNotice("分享暂时没有成功，可以稍后再试。");
    }
  };

  return (
    <AppShell withProductChrome showShellLabel contentClassName="space-y-6">
      <PageHeader
        eyebrow="OpenUni 提醒"
        title="把已判断过的高价值事项，\n留在你接下来真正会行动的位置。"
        description="先看你接下来要做什么。"
      />

      <section className="card-panel rounded-[30px] p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-slate-500">当前主线提醒</p>
            <h2 className="mt-2 text-[24px] font-semibold text-ink">{mainSignal.title}</h2>
            <p className="mt-2 text-[15px] leading-7 text-slate-600">
              {reminderEnabled ? "已开启提醒。" : "还未开启提醒。"}
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
            <p className="mt-2 text-xs leading-6 text-current/80">把这条信号从“已判断”推进到“准备行动”。</p>
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
            <p className="mt-2 text-xs leading-6 text-current/80">先保留判断结果，之后再统一回看和安排。</p>
          </button>

          <button
            type="button"
            onClick={() => setShowPath((current) => !current)}
            className="rounded-[22px] border border-slate-200 bg-white px-4 py-4 text-left text-slate-700 transition hover:border-brand-200 hover:text-brand-700"
          >
            <p className="text-sm font-semibold">查看参与路径 / 报名入口</p>
            <p className="mt-2 text-xs leading-6 text-current/80">直接确认报名入口、时间安排和下一步参与方式。</p>
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
        <p className="text-sm font-medium text-slate-500">当前画像</p>
        <p className="mt-2 text-lg font-semibold text-ink">
          {profile.grade} · {profile.college} · {profile.focus}
        </p>
        <p className="mt-3 text-[15px] leading-7 text-slate-600">这里会继续按阶段和时效帮你整理优先级。</p>
        <Link
          href="/stage"
          className="mt-4 inline-flex rounded-full border border-brand-100 bg-white px-4 py-2 text-sm font-medium text-brand-700 transition hover:border-brand-300 hover:bg-brand-50"
        >
          调整我的阶段画像
        </Link>
      </section>

      <ReminderSection
        title="已提醒事项"
        description="先看已经准备推进的事。"
        items={reminderData.reminded as ReminderSectionItem[]}
      />

      <ReminderSection
        title="即将截止"
        description="优先看时间更紧的事项。"
        items={reminderData.deadlines as ReminderSectionItem[]}
      />

      <ReminderSection
        title="本阶段待处理"
        description="还值得继续盯住的事项。"
        items={reminderData.pending as ReminderSectionItem[]}
      />

      {showPath ? <PathPreview /> : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          href="/signal/swim"
          className="inline-flex items-center justify-center rounded-[22px] bg-ink px-5 py-4 text-sm font-medium text-white shadow-panel transition hover:translate-y-[-1px]"
        >
          回到这条信号继续判断
        </Link>
        <Link
          href="/home"
          className="inline-flex items-center justify-center rounded-[22px] border border-slate-200 bg-white px-5 py-4 text-sm font-medium text-slate-700 transition hover:border-brand-200 hover:text-brand-700"
        >
          返回信号页
        </Link>
      </div>
    </AppShell>
  );
}
