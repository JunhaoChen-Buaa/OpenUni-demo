import { MainSignal } from "@/lib/mock-data";

function cleanSourceSummary(sourceSummary: string) {
  return sourceSummary.replace(/^来源[:：]\s*/, "");
}

export function SignalCard({ signal }: { signal: MainSignal }) {
  return (
    <section className="card-panel hero-glow overflow-hidden rounded-[32px] border-brand-100 bg-gradient-to-br from-[#F7FBFF] via-white to-[#EEF7FF] p-5 transition hover:-translate-y-0.5 hover:shadow-panel sm:p-6">
      <div className="relative z-10 space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {signal.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-brand-50 px-3 py-1.5 text-sm font-medium text-brand-700"
                >
                  {tag}
                </span>
              ))}
            </div>
            <div>
              <p className="text-sm font-medium text-brand-700/80">当前最值得先判断的一条信号</p>
              <h2 className="mt-2 text-[28px] font-semibold leading-[1.2] text-ink">{signal.title}</h2>
              <p className="mt-3 text-[15px] leading-7 text-slate-700">{signal.description}</p>
            </div>
          </div>

          <div className="hidden rounded-[22px] bg-gradient-to-br from-brand-500 to-aqua px-4 py-3 text-white shadow-soft sm:block">
            <p className="text-xs font-medium text-white/80">当前判断</p>
            <p className="mt-1 text-lg font-semibold">建议优先评估</p>
          </div>
        </div>

        <div className="rounded-[24px] border border-brand-100 bg-white/88 p-4 shadow-soft">
          <p className="text-xs font-semibold tracking-[0.12em] text-brand-600">为什么这条值得先看</p>
          <p className="mt-2 text-base font-semibold leading-7 text-ink">{signal.plainReason}</p>
          <p className="mt-3 text-sm leading-6 text-slate-600">{signal.reason}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-[22px] border border-slate-200/80 bg-slate-50/85 px-4 py-3 text-sm text-slate-600">
          <span className="font-semibold text-slate-500">来源</span>
          <span>{cleanSourceSummary(signal.sourceSummary)}</span>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          {signal.metrics.map((metric) => (
            <div key={metric.label} className="rounded-[20px] bg-white/92 p-3 shadow-soft">
              <p className="text-[12px] text-slate-500">{metric.label}</p>
              <p className="mt-1 text-[17px] font-semibold text-ink">{metric.value}</p>
            </div>
          ))}
        </div>

        <div className="inline-flex rounded-full bg-ink px-4 py-2.5 text-sm font-medium text-white">
          查看为什么推荐给我
        </div>
      </div>
    </section>
  );
}
