import { RelatedSignal } from "@/lib/mock-data";

export function RelatedSignalCard({ signal }: { signal: RelatedSignal }) {
  return (
    <div className="rounded-[22px] border border-slate-100 bg-white p-4 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-ink">{signal.title}</h3>
            <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-500">
              {signal.badge}
            </span>
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-600">{signal.description}</p>
          <div className="mt-3 rounded-[18px] bg-slate-50 p-3">
            <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">推荐理由</p>
            <p className="mt-2 text-sm leading-6 text-slate-700">{signal.recommendationReason}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
