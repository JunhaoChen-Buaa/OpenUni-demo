"use client";

import Link from "next/link";
import { ChangeEvent, useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { ActiveRuleIndicator } from "@/components/active-rule-indicator";
import { PageHeader } from "@/components/page-header";
import { useActiveRule } from "@/hooks/use-active-rule";
import { useProfile } from "@/hooks/use-profile";
import { defaultProfile, getSignalAskContext } from "@/lib/mock-data";

function formatDateTime(value?: string | null) {
  if (!value) {
    return "暂未解析";
  }

  try {
    return new Intl.DateTimeFormat("zh-CN", {
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function formatBoolean(value: boolean | null) {
  if (value === null) {
    return "未知";
  }

  return value ? "是" : "否";
}

function formatList(items: string[], fallback = "未识别") {
  return items.length > 0 ? items.join("；") : fallback;
}

export default function StagePage() {
  const { profile } = useProfile();
  const { has_rule, basis_label, rule, isLoading, error, refresh } = useActiveRule();
  const signalContext = useMemo(
    () => getSignalAskContext("swim", profile) ?? getSignalAskContext("swim", defaultProfile)!,
    [profile],
  );
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showFacts, setShowFacts] = useState(false);

  const handleOpenPicker = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setIsUploading(true);
    setUploadNotice(null);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/rule", {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json()) as {
        error?: string;
        notice?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error || "规则导入失败，请稍后再试。");
      }

      await refresh();
      setShowFacts(true);
      setUploadNotice(payload.notice ?? "学院规则已更新，当前判断依据已同步切换。");
    } catch (caughtError) {
      setUploadError(
        caughtError instanceof Error ? caughtError.message : "规则上传失败，请稍后再试。",
      );
    } finally {
      setIsUploading(false);
      if (event.target) {
        event.target.value = "";
      }
    }
  };

  return (
    <AppShell withProductChrome showShellLabel contentClassName="space-y-6">
      <PageHeader
        eyebrow="OpenUni 我的阶段"
        title="让 OpenUni 真的理解你的学院规则"
        description="先看系统现在是基于什么判断你的。"
      />

      <section className="card-panel rounded-[28px] p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-slate-500">当前画像</p>
            <p className="mt-2 text-lg font-semibold text-ink">
              {profile.grade} · {profile.college}
            </p>
            <p className="mt-2 text-[15px] leading-7 text-slate-600">
              当前目标：{profile.focus}；当前偏好：{profile.preference}。
            </p>
          </div>
          <Link
            href="/onboarding"
            className="inline-flex shrink-0 rounded-full border border-brand-100 bg-white px-4 py-2 text-sm font-medium text-brand-700 transition hover:border-brand-300 hover:bg-brand-50"
          >
            调整画像
          </Link>
        </div>
      </section>

      <ActiveRuleIndicator
        basisLabel={basis_label}
        summary={
          has_rule && rule
            ? `${rule.summary}。这份规则会持续作为首页、详情页和 Ask 的判断依据。`
            : "当前还没有导入你的学院规则，系统会先使用默认规则样本。"
        }
        isCustom={has_rule}
      />

      <section className="card-panel rounded-[28px] p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-slate-500">我的学院规则</p>
            <h2 className="mt-2 text-[24px] font-semibold text-ink">
              {has_rule && rule ? "当前已接入学院规则" : "导入学院规则"}
            </h2>
            <p className="mt-3 text-[15px] leading-7 text-slate-600">导入后，系统会持续沿用这份规则进行判断。</p>
          </div>
          <span
            className={[
              "rounded-full px-3 py-1.5 text-sm font-medium",
              has_rule ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600",
            ].join(" ")}
          >
            {has_rule ? "已导入" : "未导入"}
          </span>
        </div>

        {has_rule && rule ? (
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-[22px] bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-500">当前导入规则</p>
              <p className="mt-2 text-base font-semibold text-ink">
                {rule.facts.rule_title ?? rule.file_name}
              </p>
            </div>
            <div className="rounded-[22px] bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-500">最近解析时间</p>
              <p className="mt-2 text-base font-semibold text-ink">
                {formatDateTime(rule.last_parsed_at)}
              </p>
            </div>
            <div className="rounded-[22px] bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-500">已提取规则事实数量</p>
              <p className="mt-2 text-base font-semibold text-ink">{rule.fact_count}</p>
            </div>
          </div>
        ) : null}

        {has_rule && rule ? (
          <div className="mt-4 rounded-[22px] border border-brand-100 bg-brand-50/55 p-4">
            <p className="text-sm font-medium text-brand-700">规则摘要</p>
            <p className="mt-2 text-[15px] leading-7 text-slate-700">{rule.summary}</p>
          </div>
        ) : (
          <div className="mt-4 rounded-[22px] border border-dashed border-slate-200 bg-slate-50 p-4">
            <p className="text-[15px] leading-7 text-slate-600">
              建议先导入你所在学院的综测细则或综合素质评价规则。导入后，OpenUni 会优先使用这份规则来判断像“女生游泳比赛”这样的信号是否真的和你有关。
            </p>
          </div>
        )}

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setShowFacts((current) => !current)}
            disabled={!has_rule}
            className="inline-flex rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-brand-200 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {showFacts ? "收起提取结果" : "查看提取结果"}
          </button>
          <button
            type="button"
            onClick={handleOpenPicker}
            disabled={isUploading}
            className="inline-flex rounded-full bg-ink px-4 py-2 text-sm font-medium text-white transition hover:translate-y-[-1px] disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {has_rule
              ? isUploading
                ? "正在更新规则..."
                : "重新上传 / 更新规则"
              : isUploading
                ? "正在解析规则..."
                : "上传学院规则 PDF"}
          </button>
          <button
            type="button"
            disabled
            className="inline-flex rounded-full border border-brand-100 bg-brand-50 px-4 py-2 text-sm font-medium text-brand-700 opacity-90"
          >
            当前判断依据已启用
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={(event) => void handleFileChange(event)}
        />

        {uploadNotice ? (
          <div className="mt-4 rounded-[20px] border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {uploadNotice}
          </div>
        ) : null}

        {uploadError || error ? (
          <div className="mt-4 rounded-[20px] border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {uploadError ?? error}
          </div>
        ) : null}

        {isLoading ? (
          <div className="mt-4 rounded-[20px] bg-slate-50 px-4 py-3 text-sm text-slate-500">
            正在读取当前规则状态...
          </div>
        ) : null}

        {showFacts && rule ? (
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-[22px] border border-slate-100 bg-white p-4 shadow-soft">
              <p className="text-sm font-medium text-slate-500">规则基础信息</p>
              <div className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
                <p>标题：{rule.facts.rule_title ?? "未识别"}</p>
                <p>学院：{rule.facts.college_name ?? "未识别"}</p>
                <p>版本 / 时间：{rule.facts.rule_version_or_date ?? "未识别"}</p>
                <p>规则类型：{rule.facts.rule_type ?? "未识别"}</p>
                <p>适用年级：{formatList(rule.facts.applicable_grades)}</p>
              </div>
            </div>

            <div className="rounded-[22px] border border-slate-100 bg-white p-4 shadow-soft">
              <p className="text-sm font-medium text-slate-500">核心结构</p>
              <div className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
                <p>评价维度：{rule.facts.evaluation_dimensions.join(" / ") || "未识别"}</p>
                <p>总分结构：{rule.facts.total_score_formula_summary ?? "未提取到明确公式"}</p>
                <p>
                  学业成绩占比：
                  {rule.facts.academic_weight_percent !== null
                    ? `${rule.facts.academic_weight_percent}%`
                    : "未识别"}
                </p>
                <p>
                  综合素质测评占比：
                  {rule.facts.comprehensive_quality_weight_percent !== null
                    ? `${rule.facts.comprehensive_quality_weight_percent}%`
                    : "未识别"}
                </p>
              </div>
            </div>

            <div className="rounded-[22px] border border-slate-100 bg-white p-4 shadow-soft">
              <p className="text-sm font-medium text-slate-500">底线与资格</p>
              <div className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
                <p>学年评优底线：{rule.facts.annual_bottomline_required ?? "未识别"}</p>
                <p>推免底线：{rule.facts.recommendation_bottomline_required ?? "未识别"}</p>
                <p>奖学金 / 评优相关：{formatBoolean(rule.facts.scholarship_related)}</p>
                <p>推免 / 科研相关：{formatBoolean(rule.facts.research_related)}</p>
              </div>
            </div>

            <div className="rounded-[22px] border border-slate-100 bg-white p-4 shadow-soft">
              <p className="text-sm font-medium text-slate-500">体育评价规则</p>
              <div className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
                <p>体育纳入综测：{formatBoolean(rule.facts.sports_module_included)}</p>
                <p>存在明确计分规则：{formatBoolean(rule.facts.sports_scoring_rules_present)}</p>
                <p>存在明确数字计分：{formatBoolean(rule.facts.sports_score_is_explicitly_quantified)}</p>
                <p>个人竞赛：{formatList(rule.facts.sports_personal_competition_rules)}</p>
                <p>团体竞赛：{formatList(rule.facts.sports_team_competition_rules)}</p>
                <p>校运会 / 特例：{formatList(rule.facts.sports_examples_or_special_cases)}</p>
              </div>
            </div>

            <div className="rounded-[22px] border border-slate-100 bg-white p-4 shadow-soft sm:col-span-2">
              <p className="text-sm font-medium text-slate-500">证据摘要与未知项</p>
              <div className="mt-3 space-y-3">
                <div className="rounded-[18px] bg-slate-50 p-3 text-sm leading-6 text-slate-700">
                  <p>关键时间：{formatList(rule.facts.key_deadlines)}</p>
                  <p>
                    提取置信度：
                    {rule.facts.extraction_confidence
                      ? `${Math.round(rule.facts.extraction_confidence * 100)}%`
                      : "未评估"}
                  </p>
                  <p>未知字段：{formatList(rule.facts.unknown_fields, "暂无")}</p>
                  <p>未知说明：{formatList(rule.facts.known_unknown_flags, "暂无")}</p>
                  <p>比赛相关加分：{formatBoolean(rule.facts.competition_related_bonus)}</p>
                  <p>志愿相关：{formatBoolean(rule.facts.volunteer_related)}</p>
                  <p>学生工作相关：{formatBoolean(rule.facts.student_work_related)}</p>
                </div>

                {rule.facts.evidence_excerpts.length > 0 ? (
                  rule.facts.evidence_excerpts.map((item) => (
                    <div key={item} className="rounded-[18px] bg-slate-50 p-3 text-sm leading-6 text-slate-700">
                      {item}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">当前还没有提取到清晰的规则证据片段。</p>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </section>

      <section className="card-panel rounded-[28px] p-5">
        <p className="text-sm font-medium text-slate-500">当前推荐依据</p>
        <div className="mt-4 space-y-3">
          {signalContext.judgementBasis.slice(0, 3).map((item) => (
            <div
              key={item}
              className="rounded-[20px] border border-slate-100 bg-white p-4 shadow-soft"
            >
              <p className="text-[15px] leading-7 text-slate-700">{item}</p>
            </div>
          ))}
        </div>
        <details className="mt-4 rounded-[20px] border border-slate-200/80 bg-white px-4 py-3">
          <summary className="cursor-pointer list-none text-sm font-medium text-slate-700">
            查看更多当前阶段特征
          </summary>
          <div className="mt-3 flex flex-wrap gap-2">
            {signalContext.signalFeatures.map((item) => (
              <span
                key={item}
                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
              >
                {item}
              </span>
            ))}
          </div>
        </details>
      </section>
    </AppShell>
  );
}
