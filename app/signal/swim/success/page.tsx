"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { PathPreview } from "@/components/path-preview";
import { PrimaryButton, SecondaryButton } from "@/components/ui";
import { useProductMode } from "@/hooks/use-product-mode";
import { successSteps } from "@/lib/mock-data";
import { shareOpenUniContent } from "@/lib/share";
import {
  getSignalActionState,
  incrementSignalShare,
  setSignalPlanned,
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

export default function SuccessPage() {
  const router = useRouter();
  const { isTutorialMode, setMode } = useProductMode();
  const [showPath, setShowPath] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionState, setActionState] = useState<SignalActionState>(defaultActionState);

  useEffect(() => {
    setActionState(getSignalActionState("swim"));
  }, []);

  const handleTogglePlanned = () => {
    const next = setSignalPlanned("swim", !actionState.planned);
    setActionState(next);
    setNotice(next.planned ? "已标记为“我准备去做”。" : "已取消“我准备去做”标记。");
  };

  const handleShare = async () => {
    try {
      const message = await shareOpenUniContent({
        title: "校级女生游泳比赛报名开放｜OpenUni",
        summary: "这条机会和学院综测规则有关，适合转给同学一起判断。",
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

  return (
    <AppShell withProductChrome showShellLabel contentClassName="space-y-5">
      <section className="rounded-[22px] border border-amber-100 bg-amber-50/85 px-4 py-3 shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-amber-800">
                {isTutorialMode ? "新手教程" : "教学示例"}
              </span>
              <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-amber-700">
                行动确认示例
              </span>
            </div>
            <p className="mt-2 text-sm leading-6 text-amber-950/85">
              这里展示的是教学示例中的提醒与行动确认页，用来说明 OpenUni 如何把“已经判断过的信号”继续推进到后续行动。
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

      <section className="card-panel overflow-hidden rounded-[32px] bg-gradient-to-br from-[#EDFFF8] via-white to-[#EEF6FF] p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="inline-flex rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700">
              提醒已开启
            </p>
            <h1 className="mt-4 text-[32px] font-semibold leading-[1.18] text-ink">
              已为你设置报名提醒
            </h1>
            <p className="mt-4 text-[15px] leading-7 text-slate-600">
              OpenUni 会在报名截止前再次提醒你，并继续关注类似高价值、低可见、强时效的校园机会。
            </p>
            <p className="mt-3 text-[15px] leading-7 text-slate-600">
              现在你不需要再依赖别人转发消息，系统会帮你继续盯住当前阶段值得关注的事项。
            </p>
          </div>
          <div className="hidden h-20 w-20 rounded-[28px] bg-gradient-to-br from-emerald-400 to-aqua sm:flex sm:items-center sm:justify-center">
            <svg viewBox="0 0 48 48" className="h-10 w-10 text-white" fill="none">
              <path
                d="M13 24.5L21 32L35 16"
                stroke="currentColor"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      </section>

      <section className="card-panel rounded-[28px] p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-slate-500">提醒之后的下一步</p>
            <h2 className="mt-2 text-[22px] font-semibold text-ink">把提醒变成更明确的行动状态</h2>
            <p className="mt-2 text-[15px] leading-7 text-slate-600">
              提醒只是防止错过，接下来你还可以直接标记“我准备去做”，或把这条机会分享给同学一起判断。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700">
              提醒已开启
            </span>
            {actionState.planned ? (
              <span className="rounded-full bg-brand-50 px-3 py-1.5 text-sm font-medium text-brand-700">
                我准备去做
              </span>
            ) : null}
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
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
            <p className="mt-2 text-xs leading-6 text-current/80">
              {actionState.planned ? "你已经把这条机会推进到行动阶段。" : "把这条提醒从“知道了”推进到“准备行动”。"}
            </p>
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
        <p className="text-sm font-medium text-slate-500">你接下来可以这样做</p>
        <div className="mt-4 space-y-3">
          {successSteps.map((item, index) => (
            <div
              key={item.title}
              className="rounded-[22px] border border-slate-100 bg-white p-4 shadow-soft"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-semibold text-brand-700">
                  {index + 1}
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-ink">{item.title}</h2>
                  <p className="mt-1 text-[15px] leading-7 text-slate-600">{item.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {showPath ? <PathPreview /> : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <PrimaryButton onClick={() => setShowPath((current) => !current)}>查看参与路径</PrimaryButton>
        <SecondaryButton onClick={() => router.push("/home?tab=stage")}>继续看看类似机会</SecondaryButton>
      </div>
    </AppShell>
  );
}
