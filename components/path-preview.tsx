export function PathPreview() {
  return (
    <section className="card-panel rounded-[28px] p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">查看报名路径</p>
          <h2 className="mt-1 text-xl font-semibold text-ink">你可以先按这 3 步确认参与方式</h2>
        </div>
        <span className="rounded-full bg-brand-50 px-3 py-1.5 text-sm font-medium text-brand-700">
          Demo 路径
        </span>
      </div>
      <div className="mt-4 space-y-3">
        {[
          "先打开学院通知入口，确认这条赛事通知是否仍在报名期。",
          "再核对报名条件、截止时间和是否需要学院内部推荐。",
          "最后按页面提示提交报名信息，并留意后续时间安排。",
        ].map((item, index) => (
          <div key={item} className="rounded-[22px] bg-slate-50 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-sm font-semibold text-brand-700 shadow-soft">
                {index + 1}
              </div>
              <p className="text-sm leading-6 text-slate-700">{item}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
