type ActiveRuleIndicatorProps = {
  basisLabel: string;
  summary?: string | null;
  isCustom: boolean;
  className?: string;
  highlights?: string[];
  highlightsTitle?: string;
};

export function ActiveRuleIndicator({
  basisLabel,
  summary,
  isCustom,
  className = "",
  highlights = [],
  highlightsTitle = "关联规则事实",
}: ActiveRuleIndicatorProps) {
  return (
    <section
      className={[
        "rounded-[22px] border px-4 py-3 shadow-soft backdrop-blur-sm",
        isCustom ? "border-brand-100 bg-white/82" : "border-slate-200 bg-slate-50/88",
        className,
      ].join(" ")}
    >
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
        <p className="text-sm font-medium text-ink">{basisLabel}</p>
      </div>

      {summary ? (
        <p className="mt-2 text-sm leading-6 text-slate-600">{summary}</p>
      ) : (
        <p className="mt-2 text-sm leading-6 text-slate-600">
          当前规则/样本会持续作为 OpenUni 首页、详情页和 Ask 的判断依据。
        </p>
      )}

      {highlights.length > 0 ? (
        <div className="mt-3 rounded-[18px] bg-slate-50/85 px-3.5 py-3">
          <p className="text-xs font-semibold tracking-[0.08em] text-slate-500">{highlightsTitle}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {highlights.slice(0, 4).map((item) => (
              <span
                key={item}
                className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
