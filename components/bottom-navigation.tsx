"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/discover", label: "发现" },
  { href: "/home", label: "信号" },
  { href: "/reminders", label: "提醒" },
  { href: "/stage", label: "我的阶段" },
];

function isActive(pathname: string, href: string) {
  return pathname === href || (href === "/home" && pathname === "/");
}

export function BottomNavigation() {
  const pathname = usePathname();

  return (
    <div className="absolute inset-x-0 bottom-0 z-20 px-3 pb-[calc(0.8rem+env(safe-area-inset-bottom))] pt-3">
      <nav className="pointer-events-auto rounded-[28px] border border-white/85 bg-white/88 p-1.5 shadow-[0_18px_38px_rgba(35,77,163,0.14)] backdrop-blur-[22px] ring-1 ring-brand-100/50">
        <div className="grid grid-cols-4 gap-1.5">
          {tabs.map((tab) => {
            const active = isActive(pathname, tab.href);

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={[
                  "inline-flex min-h-[52px] items-center justify-center rounded-[22px] px-2 py-3 text-[12px] font-medium transition sm:px-3 sm:text-[13px]",
                  active
                    ? "bg-gradient-to-b from-brand-50 via-white to-white text-brand-700 shadow-[0_8px_18px_rgba(59,130,246,0.14)]"
                    : "text-slate-500 hover:bg-slate-50/90 hover:text-slate-700",
                ].join(" ")}
                aria-current={active ? "page" : undefined}
              >
                <span className="truncate">{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
