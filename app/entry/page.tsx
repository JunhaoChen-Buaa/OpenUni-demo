"use client";

import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { useProductMode } from "@/hooks/use-product-mode";

export default function EntryModePage() {
  const router = useRouter();
  const { setMode } = useProductMode();

  const handleEnterTutorial = () => {
    setMode("tutorial");
    router.push("/discover");
  };

  const handleEnterFormal = () => {
    setMode("formal");
    router.push("/discover");
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          eyebrow="OpenUni 模式选择"
          title={"先看看 OpenUni 怎么工作，\n或者直接进入正式使用。"}
          description="校级女生游泳比赛会保留为稳定的案例演示，用来说明 OpenUni 如何从发现走到判断与行动。正式使用模式则优先展示北航当前来源池、发现候选和正式信号流。"
        />

        <section className="grid gap-4 lg:grid-cols-2">
          <button
            type="button"
            onClick={handleEnterTutorial}
            className="card-panel rounded-[32px] p-6 text-left transition hover:-translate-y-0.5 hover:shadow-panel"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-brand-50 px-3 py-1.5 text-sm font-medium text-brand-700">
                新手教程
              </span>
              <span className="rounded-full bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-700">
                案例演示
              </span>
            </div>
            <h2 className="mt-4 text-[24px] font-semibold text-ink">先看案例演示</h2>
            <p className="mt-3 text-[15px] leading-7 text-slate-600">
              用“校级女生游泳比赛”这条隐藏机会案例，快速理解 OpenUni 如何把校园动态归并成信号，再继续进入详情、Ask 和提醒动作。
            </p>
            <div className="mt-5 space-y-2 text-sm text-slate-600">
              <p>适合第一次体验产品的人。</p>
              <p>会明确标注为案例演示，不和正式内容混在一起。</p>
            </div>
            <div className="mt-6 inline-flex rounded-full bg-ink px-4 py-2.5 text-sm font-medium text-white">
              开始案例演示
            </div>
          </button>

          <button
            type="button"
            onClick={handleEnterFormal}
            className="card-panel rounded-[32px] p-6 text-left transition hover:-translate-y-0.5 hover:shadow-panel"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700">
                正式使用
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-600">
                北航单校 MVP
              </span>
            </div>
            <h2 className="mt-4 text-[24px] font-semibold text-ink">进入正式使用</h2>
            <p className="mt-3 text-[15px] leading-7 text-slate-600">
              直接进入“发现 / 信号 / 提醒 / 我的阶段”，优先查看北航最近发生了什么、哪些候选值得继续观察，以及当前正式信号流。
            </p>
            <div className="mt-5 space-y-2 text-sm text-slate-600">
              <p>不默认把案例演示当作真实当前内容。</p>
              <p>更适合后续继续接真实来源和规则影响。</p>
            </div>
            <div className="mt-6 inline-flex rounded-full border border-brand-100 bg-white px-4 py-2.5 text-sm font-medium text-brand-700">
              进入正式使用
            </div>
          </button>
        </section>
      </div>
    </AppShell>
  );
}
