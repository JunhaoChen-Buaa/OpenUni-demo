export function ShellLabel() {
  return (
    <div className="flex items-center justify-between gap-3 rounded-full border border-white/80 bg-white/80 px-4 py-2.5 shadow-soft backdrop-blur-xl">
      <div className="flex min-w-0 items-center gap-3">
        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-aqua text-[11px] font-semibold text-white shadow-soft">
          QQ
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold tracking-[0.18em] text-brand-600">
            QQ 校园助手
          </p>
          <p className="truncate text-sm font-semibold text-ink">OpenUni</p>
        </div>
      </div>
      <span className="hidden rounded-full bg-brand-50 px-3 py-1 text-[11px] font-medium text-brand-700 sm:inline-flex">
        AI 信号识别 · 提醒服务
      </span>
    </div>
  );
}
