import type { AskResult } from "@/lib/mock-data";

type QAExchangeCardProps = {
  id: string;
  index: number;
  question: string;
  result?: AskResult;
  loading?: boolean;
  expanded?: boolean;
  isNewest?: boolean;
  onToggleExpand?: () => void;
  onFollowUpClick?: (question: string) => void;
  basisLabel?: string;
  basisFacts?: string[];
  sourceTitles?: string[];
  isCustomBasis?: boolean;
};

function getHeadlineTone(result?: AskResult, loading?: boolean) {
  if (loading || !result) {
    return "bg-slate-100 text-slate-500";
  }

  if (result.questionType === "fact") {
    return result.headline.includes("尚未提取到明确数值")
      ? "bg-amber-50 text-amber-700"
      : "bg-slate-100 text-slate-700";
  }

  if (result.questionType === "explore_compare") {
    return "bg-brand-50 text-brand-700";
  }

  if (result.headline.includes("暂不建议优先做")) {
    return "bg-amber-50 text-amber-700";
  }

  if (result.headline.includes("建议优先做") || result.headline.includes("建议优先评估")) {
    return "bg-emerald-50 text-emerald-700";
  }

  return "bg-brand-50 text-brand-700";
}

function getQuestionTypeLabel(result?: AskResult) {
  if (!result) {
    return null;
  }

  if (result.questionType === "fact") {
    return "事实型问题";
  }

  if (result.questionType === "explore_compare") {
    return "探索 / 比较";
  }

  return "决策型问题";
}

export function QAExchangeCard({
  id,
  index,
  question,
  result,
  loading = false,
  expanded = false,
  isNewest = false,
  onToggleExpand,
  onFollowUpClick,
  basisLabel,
  basisFacts = [],
  sourceTitles = [],
  isCustomBasis = false,
}: QAExchangeCardProps) {
  const canCollapse = !loading && Boolean(result);
  const visibleBlocks = result?.blocks.slice(0, 2) ?? [];
  const hiddenBlocks = result?.blocks.slice(2) ?? [];

  return (
    <section
      id={id}
      tabIndex={-1}
      className={[
        "card-panel rounded-[28px] transition",
        isNewest ? "border border-brand-200 shadow-panel" : "border border-transparent",
        expanded ? "p-5" : "p-4",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium text-slate-500">问题 {index}</p>
            {isNewest ? (
              <span className="rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-700">
                最新判断
              </span>
            ) : null}
            {result ? (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
                {getQuestionTypeLabel(result)}
              </span>
            ) : null}
            <span
              className={[
                "rounded-full px-3 py-1.5 text-sm font-medium",
                getHeadlineTone(result, loading),
              ].join(" ")}
            >
              {loading ? "OpenUni 正在判断..." : result?.headline ?? "等待生成回答"}
            </span>
          </div>

          <div className={expanded ? "rounded-[22px] bg-slate-50 p-4" : ""}>
            {expanded ? (
              <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">当前问题</p>
            ) : null}
            <p className="text-[15px] leading-7 text-ink">{question}</p>
          </div>

          {!expanded && !loading ? (
            <p className="line-clamp-2 text-sm leading-6 text-slate-600">
              {result?.summaryLine ?? "等待 OpenUni 返回当前判断结果。"}
            </p>
          ) : null}
        </div>

        {canCollapse ? (
          <button
            type="button"
            onClick={onToggleExpand}
            className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-brand-300 hover:text-brand-700"
          >
            {expanded ? "收起" : "展开详情"}
          </button>
        ) : null}
      </div>

      {expanded ? (
        <div className="mt-4 rounded-[22px] bg-gradient-to-br from-brand-50 via-white to-[#F1FCFF] p-4">
          <p className="text-xs font-semibold tracking-[0.12em] text-brand-500">OpenUni 判断结果</p>

          {loading ? (
            <div className="mt-3 animate-pulse space-y-3">
              <div className="h-4 rounded-full bg-brand-100/80" />
              <div className="h-4 w-11/12 rounded-full bg-brand-100/70" />
              <div className="h-4 w-8/12 rounded-full bg-brand-100/60" />
              <div className="mt-4 h-20 rounded-[18px] bg-white/70" />
            </div>
          ) : (
            <>
              <div className="mt-4 grid gap-3">
                {visibleBlocks.map((block) => (
                  <div key={`${block.label}-${block.content}`} className="rounded-[18px] bg-white/85 p-4">
                    <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">
                      {block.label}
                    </p>
                    <p className="mt-2 whitespace-pre-line text-[15px] leading-7 text-slate-700">
                      {block.content}
                    </p>
                  </div>
                ))}
              </div>

              {hiddenBlocks.length > 0 ? (
                <details className="mt-4 rounded-[18px] bg-white/85 p-4">
                  <summary className="cursor-pointer list-none text-sm font-medium text-slate-700">
                    查看更完整的判断拆解
                  </summary>
                  <div className="mt-3 grid gap-3">
                    {hiddenBlocks.map((block) => (
                      <div key={`${block.label}-${block.content}`} className="rounded-[16px] bg-slate-50 p-3">
                        <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">
                          {block.label}
                        </p>
                        <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-700">
                          {block.content}
                        </p>
                      </div>
                    ))}
                  </div>
                </details>
              ) : null}

              <div className="mt-4 rounded-[18px] bg-white/85 p-4">
                <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">本次回答主要参考</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span
                    className={[
                      "rounded-full px-3 py-1.5 text-xs font-medium",
                      isCustomBasis ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600",
                    ].join(" ")}
                  >
                    {isCustomBasis ? "用户导入规则" : "系统默认规则样本"}
                  </span>
                  {sourceTitles.length > 0 ? (
                    <span className="rounded-full bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-700">
                      信号来源归并
                    </span>
                  ) : null}
                  {result?.evidence.length ? (
                    <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600">
                      原始证据片段
                    </span>
                  ) : null}
                </div>

                <p className="mt-3 text-sm leading-6 text-slate-700">
                  当前依据：{basisLabel ?? "系统默认规则样本"}
                </p>

                {basisFacts.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {basisFacts.slice(0, 3).map((fact) => (
                      <span
                        key={`${question}-${fact}`}
                        className="rounded-full border border-brand-100 bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-700"
                      >
                        {fact}
                      </span>
                    ))}
                  </div>
                ) : null}

                {sourceTitles.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {sourceTitles.slice(0, 3).map((title) => (
                      <span
                        key={`${question}-${title}`}
                        className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600"
                      >
                        {title}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>

              {result?.evidence.length ? (
                <details className="mt-4 rounded-[18px] bg-white/85 p-4">
                  <summary className="cursor-pointer list-none text-sm font-medium text-slate-700">
                    查看相关证据
                  </summary>
                  <div className="mt-3 space-y-3">
                    {result.evidence.map((item) => (
                      <div key={`${item.source}-${item.excerpt}`} className="rounded-[16px] bg-slate-50 p-3">
                        <p className="text-sm font-medium text-ink">
                          来源：{item.source}（{item.authority_level}）
                        </p>
                        <p className="mt-1 text-xs text-slate-500">关联方式：{item.relation_type}</p>
                        <p className="mt-2 text-sm leading-6 text-slate-700">证据片段：{item.excerpt}</p>
                      </div>
                    ))}
                  </div>
                </details>
              ) : null}

              {result?.followUps ? (
                <details className="mt-4 rounded-[18px] bg-white/85 p-4">
                  <summary className="cursor-pointer list-none text-sm font-medium text-slate-700">
                    查看继续追问
                  </summary>
                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    {[
                      { label: "继续解释", question: result.followUps.explain },
                      { label: "继续探索", question: result.followUps.explore },
                      { label: "对比选择", question: result.followUps.compare },
                    ].map((item) => (
                      <button
                        key={`${item.label}-${item.question}`}
                        type="button"
                        onClick={() => onFollowUpClick?.(item.question)}
                        className="rounded-[16px] border border-brand-100 bg-brand-50/60 p-3 text-left transition hover:border-brand-300 hover:bg-white"
                      >
                        <p className="text-xs font-semibold text-brand-600">{item.label}</p>
                        <p className="mt-2 text-sm leading-6 text-slate-700">{item.question}</p>
                      </button>
                    ))}
                  </div>
                </details>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </section>
  );
}
