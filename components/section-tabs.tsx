type Tab = {
  key: string;
  label: string;
};

type SectionTabsProps = {
  tabs: Tab[];
  value: string;
  onChange: (value: string) => void;
};

export function SectionTabs({ tabs, value, onChange }: SectionTabsProps) {
  return (
    <div className="scrollbar-none flex gap-2 overflow-x-auto rounded-[24px] bg-[#EEF4FF] p-2">
      {tabs.map((tab) => {
        const active = tab.key === value;
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onChange(tab.key)}
            className={[
              "whitespace-nowrap rounded-[18px] px-4 py-2.5 text-sm font-medium transition",
              active
                ? "bg-white text-brand-700 shadow-soft"
                : "text-slate-500 hover:text-brand-700",
            ].join(" ")}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
