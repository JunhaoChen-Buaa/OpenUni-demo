export type RuleEvidenceValue = string | number | boolean | string[] | null;

export type RuleEvidenceFieldKey =
  | "rule_title"
  | "college_name"
  | "rule_version_or_date"
  | "rule_type"
  | "evaluation_dimensions"
  | "total_score_formula_summary"
  | "academic_weight_percent"
  | "comprehensive_quality_weight_percent"
  | "annual_bottomline_required"
  | "recommendation_bottomline_required"
  | "sports_module_included"
  | "sports_scoring_rules_present"
  | "sports_score_is_explicitly_quantified"
  | "sports_personal_competition_rules"
  | "sports_team_competition_rules"
  | "sports_examples_or_special_cases"
  | "competition_related_bonus"
  | "scholarship_related"
  | "research_related"
  | "volunteer_related"
  | "student_work_related"
  | "applicable_grades"
  | "key_deadlines";

export type RuleFieldEvidence = {
  value: RuleEvidenceValue;
  source_pages: number[];
  evidence_excerpt: string;
  confidence: number;
};

export type RuleEvidenceByField = Partial<Record<RuleEvidenceFieldKey, RuleFieldEvidence[]>>;

export type CollegeRuleFacts = {
  rule_title: string | null;
  college_name: string | null;
  rule_version_or_date: string | null;
  rule_type: string | null;
  evaluation_dimensions: string[];
  total_score_formula_summary: string | null;
  academic_weight_percent: number | null;
  comprehensive_quality_weight_percent: number | null;
  annual_bottomline_required: string | null;
  recommendation_bottomline_required: string | null;
  sports_module_included: boolean | null;
  sports_scoring_rules_present: boolean | null;
  sports_score_is_explicitly_quantified: boolean | null;
  sports_personal_competition_rules: string[];
  sports_team_competition_rules: string[];
  sports_examples_or_special_cases: string[];
  competition_related_bonus: boolean | null;
  scholarship_related: boolean | null;
  research_related: boolean | null;
  volunteer_related: boolean | null;
  student_work_related: boolean | null;
  applicable_grades: string[];
  key_deadlines: string[];
  evidence_excerpts: string[];
  evidence_by_field: RuleEvidenceByField;
  extraction_confidence: number | null;
  unknown_fields: string[];
  extracted_at: string;
  sports_module_score: string | null;
  sports_module_score_known: boolean;
  known_unknown_flags: string[];
};

export type StoredCollegeRule = {
  id: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  file_path: string;
  uploaded_at: string;
  extracted_at: string;
  last_parsed_at: string;
  active: boolean;
  source_kind: "user_imported";
  summary: string;
  fact_count: number;
  basis_label: string;
  facts: CollegeRuleFacts;
};

export type CollegeRuleState = {
  has_rule: boolean;
  basis_label: string;
  rule: StoredCollegeRule | null;
};

export type CollegeRuleStore = {
  version: 1;
  current: StoredCollegeRule | null;
};

function hasAllCoreDimensions(dimensions: string[]) {
  return ["德育", "智育", "体育", "美育", "劳育"].every((item) => dimensions.includes(item));
}

function hasValue(value: unknown) {
  if (typeof value === "boolean") {
    return true;
  }

  if (typeof value === "number") {
    return Number.isFinite(value);
  }

  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  if (value && typeof value === "object") {
    return Object.keys(value).length > 0;
  }

  return false;
}

function countEvidenceFields(evidenceByField: RuleEvidenceByField) {
  return Object.values(evidenceByField).filter((items) => Array.isArray(items) && items.length > 0).length;
}

export function buildRuleBasisLabel(rule: StoredCollegeRule | null) {
  if (!rule) {
    return "系统默认规则样本";
  }

  const title = rule.facts.rule_title || rule.file_name.replace(/\.pdf$/i, "");
  return `${title}（用户导入）`;
}

export function countExtractedRuleFacts(facts: CollegeRuleFacts) {
  const values = [
    facts.rule_title,
    facts.college_name,
    facts.rule_version_or_date,
    facts.rule_type,
    facts.evaluation_dimensions,
    facts.total_score_formula_summary,
    facts.academic_weight_percent,
    facts.comprehensive_quality_weight_percent,
    facts.annual_bottomline_required,
    facts.recommendation_bottomline_required,
    facts.sports_module_included,
    facts.sports_scoring_rules_present,
    facts.sports_score_is_explicitly_quantified,
    facts.sports_personal_competition_rules,
    facts.sports_team_competition_rules,
    facts.sports_examples_or_special_cases,
    facts.competition_related_bonus,
    facts.scholarship_related,
    facts.research_related,
    facts.volunteer_related,
    facts.student_work_related,
    facts.applicable_grades,
    facts.key_deadlines,
    facts.evidence_excerpts,
  ];

  const extractedCount = values.reduce<number>(
    (count, value) => (hasValue(value) ? count + 1 : count),
    0,
  );
  const evidenceCount = countEvidenceFields(facts.evidence_by_field) > 0 ? 1 : 0;

  return extractedCount + evidenceCount;
}

export function buildRuleSummary(facts: CollegeRuleFacts) {
  const parts: string[] = [];

  if (hasAllCoreDimensions(facts.evaluation_dimensions)) {
    parts.push("已识别该规则包含德智体美劳五个维度");
  } else if (facts.evaluation_dimensions.length > 0) {
    parts.push(`已识别该规则包含 ${facts.evaluation_dimensions.join(" / ")} 等维度`);
  }

  if (
    typeof facts.academic_weight_percent === "number" &&
    typeof facts.comprehensive_quality_weight_percent === "number"
  ) {
    parts.push(
      `学业成绩占${facts.academic_weight_percent}%，综合素质测评占${facts.comprehensive_quality_weight_percent}%`,
    );
  } else if (facts.total_score_formula_summary) {
    parts.push(facts.total_score_formula_summary);
  }

  if (facts.sports_scoring_rules_present === true) {
    const sportsCoverage: string[] = [];
    if (facts.sports_personal_competition_rules.length > 0) {
      sportsCoverage.push("个人竞赛");
    }
    if (facts.sports_team_competition_rules.length > 0) {
      sportsCoverage.push("团体竞赛");
    }
    if (facts.sports_examples_or_special_cases.length > 0) {
      sportsCoverage.push("校运会/特殊项目");
    }

    parts.push(
      sportsCoverage.length > 0
        ? `体育评价存在明确加分规则，覆盖${sportsCoverage.join("、")}`
        : "体育评价存在明确加分规则",
    );
  } else if (facts.sports_module_included === true) {
    parts.push("体育评价纳入综合素质测评");
  }

  if (facts.annual_bottomline_required && facts.recommendation_bottomline_required) {
    parts.push("若德智体美劳任一部分无得分，将影响评奖评优和推免资格");
  } else if (facts.annual_bottomline_required) {
    parts.push("学年评优存在德智体美劳底线要求");
  } else if (facts.recommendation_bottomline_required) {
    parts.push("推免资格存在德智体美劳底线要求");
  }

  if (parts.length === 0) {
    return "已保存当前导入规则，OpenUni 会继续把它作为首页、详情页和 Ask 的判断依据。";
  }

  return parts.join("；");
}

export function buildRuleQuickFacts(facts: CollegeRuleFacts) {
  const items: string[] = [];

  if (
    typeof facts.academic_weight_percent === "number" &&
    typeof facts.comprehensive_quality_weight_percent === "number"
  ) {
    items.push(
      `学业成绩占${facts.academic_weight_percent}%，综合素质测评占${facts.comprehensive_quality_weight_percent}%`,
    );
  }

  if (facts.sports_module_included === true) {
    items.push("体育评价纳入综合素质测评");
  }

  if (facts.sports_scoring_rules_present === true) {
    items.push("体育评价存在明确计分规则");
  }

  if (facts.competition_related_bonus === true) {
    items.push("相关赛事表现可影响阶段评价");
  }

  if (facts.annual_bottomline_required || facts.recommendation_bottomline_required) {
    items.push("德智体美劳底线会影响评优或推免资格");
  }

  return [...new Set(items)];
}
