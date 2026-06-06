"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getStoredProductMode, getStoredProfile } from "@/lib/storage";

export default function IndexPage() {
  const router = useRouter();

  useEffect(() => {
    const profile = getStoredProfile();
    const mode = getStoredProductMode();
    router.replace(profile ? (mode ? "/discover" : "/entry") : "/onboarding");
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-8">
      <section className="app-surface w-full max-w-[420px] rounded-[32px] px-6 py-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[22px] bg-white shadow-soft">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-brand-100 border-t-brand-500" />
        </div>
        <p className="mt-5 text-sm font-semibold uppercase tracking-[0.18em] text-brand-700">
          OpenUni
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-ink">正在进入你的校园信号流</h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          正在读取本地画像和产品模式，马上带你回到上次停留的判断入口。
        </p>
      </section>
    </main>
  );
}
