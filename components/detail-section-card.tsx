import { DetailSection } from "@/lib/mock-data";

export function DetailSectionCard({
  section,
  index,
}: {
  section: DetailSection;
  index: number;
}) {
  return (
    <section className="card-panel rounded-[28px] p-5">
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700">
            判断模块 {index}
          </span>
          <h2 className="text-[22px] font-semibold tracking-[-0.01em] text-ink">{section.title}</h2>
        </div>
        {section.highlight ? (
          <p className="rounded-[20px] bg-slate-50 px-4 py-3 text-[15px] font-medium leading-7 text-ink">
            {section.highlight}
          </p>
        ) : null}
        <p className="text-[15px] leading-8 text-slate-700">{section.content}</p>
      </div>
    </section>
  );
}
