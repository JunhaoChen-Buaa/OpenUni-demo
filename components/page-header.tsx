type PageHeaderProps = {
  eyebrow: string;
  title: string;
  description: string;
};

export function PageHeader({ eyebrow, title, description }: PageHeaderProps) {
  return (
    <header className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="inline-flex rounded-full border border-brand-100 bg-brand-50 px-3 py-1 text-[11px] font-semibold tracking-[0.16em] text-brand-700">
          {eyebrow}
        </span>
      </div>
      <div className="space-y-3">
        <h1 className="whitespace-pre-line text-balance text-[30px] font-semibold leading-[1.18] text-ink sm:text-[36px]">
          {title}
        </h1>
        <p className="max-w-3xl text-[15px] leading-7 text-slate-600 sm:text-base sm:leading-8">
          {description}
        </p>
      </div>
    </header>
  );
}
