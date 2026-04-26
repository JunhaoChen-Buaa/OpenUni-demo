import { SecondarySignal } from "@/lib/mock-data";

export function SecondaryCard({ signal }: { signal: SecondarySignal }) {
  return (
    <section className="rounded-[26px] border border-slate-200/80 bg-white/78 p-5 shadow-soft backdrop-blur-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-[20px] font-semibold leading-7 text-ink">{signal.title}</h3>
          <p className="mt-2 line-clamp-2 text-[15px] leading-7 text-slate-600">{signal.description}</p>
          <p className="mt-3 text-sm font-medium text-brand-700">继续判断</p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-500">
          {signal.badge}
        </span>
      </div>
    </section>
  );
}
