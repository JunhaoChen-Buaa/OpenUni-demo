import type { CredibilityModule } from "@/lib/mock-data";

export function CredibilityModuleCard({ module }: { module: CredibilityModule }) {
  return (
    <section className="card-panel rounded-[28px] p-5">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700">
            识别依据
          </span>
          <h2 className="text-[22px] font-semibold tracking-[-0.01em] text-ink">{module.title}</h2>
        </div>
        <p className="text-[15px] leading-7 text-slate-600">{module.description}</p>
        <div className="flex flex-wrap gap-2">
          {module.bullets.map((item) => (
            <div
              key={item}
              className="rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700"
            >
              {item}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
