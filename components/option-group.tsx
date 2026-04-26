type OptionGroupProps = {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
};

export function OptionGroup({ label, value, options, onChange }: OptionGroupProps) {
  return (
    <section className="card-panel rounded-[28px] p-5">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <div className="mt-4 flex flex-wrap gap-3">
        {options.map((option) => {
          const active = option === value;
          return (
            <button
              key={option}
              type="button"
              onClick={() => onChange(option)}
              className={[
                "rounded-[18px] border px-4 py-3 text-left text-sm font-medium transition",
                active
                  ? "border-brand-300 bg-brand-50 text-brand-700 shadow-soft"
                  : "border-slate-200 bg-white text-slate-600 hover:border-brand-200 hover:text-brand-700",
              ].join(" ")}
            >
              {option}
            </button>
          );
        })}
      </div>
    </section>
  );
}
