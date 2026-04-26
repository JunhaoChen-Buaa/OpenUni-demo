import "server-only";

import path from "path";
import { promises as fs } from "fs";
import {
  buildRuleBasisLabel,
  buildRuleSummary,
  countExtractedRuleFacts,
  type CollegeRuleFacts,
  type CollegeRuleState,
  type CollegeRuleStore,
  type StoredCollegeRule,
} from "@/lib/college-rule-types";

const RULE_RUNTIME_DIR = path.join(process.cwd(), "data", "runtime", "college-rule");
const RULE_STORE_FILE = path.join(RULE_RUNTIME_DIR, "store.json");

async function ensureRuleRuntime() {
  await fs.mkdir(RULE_RUNTIME_DIR, { recursive: true });
}

function normalizeCollegeRuleFacts(raw: Partial<CollegeRuleFacts> | null | undefined, fileName: string): CollegeRuleFacts {
  return {
    rule_title: raw?.rule_title ?? fileName.replace(/\.pdf$/i, ""),
    college_name: raw?.college_name ?? null,
    rule_version_or_date: raw?.rule_version_or_date ?? null,
    rule_type: raw?.rule_type ?? null,
    evaluation_dimensions: raw?.evaluation_dimensions ?? [],
    total_score_formula_summary: raw?.total_score_formula_summary ?? null,
    academic_weight_percent: raw?.academic_weight_percent ?? null,
    comprehensive_quality_weight_percent: raw?.comprehensive_quality_weight_percent ?? null,
    annual_bottomline_required: raw?.annual_bottomline_required ?? null,
    recommendation_bottomline_required: raw?.recommendation_bottomline_required ?? null,
    sports_module_included: raw?.sports_module_included ?? null,
    sports_scoring_rules_present: raw?.sports_scoring_rules_present ?? null,
    sports_score_is_explicitly_quantified: raw?.sports_score_is_explicitly_quantified ?? null,
    sports_personal_competition_rules: raw?.sports_personal_competition_rules ?? [],
    sports_team_competition_rules: raw?.sports_team_competition_rules ?? [],
    sports_examples_or_special_cases: raw?.sports_examples_or_special_cases ?? [],
    competition_related_bonus: raw?.competition_related_bonus ?? null,
    scholarship_related: raw?.scholarship_related ?? null,
    research_related: raw?.research_related ?? null,
    volunteer_related: raw?.volunteer_related ?? null,
    student_work_related: raw?.student_work_related ?? null,
    applicable_grades: raw?.applicable_grades ?? [],
    key_deadlines: raw?.key_deadlines ?? [],
    evidence_excerpts: raw?.evidence_excerpts ?? [],
    evidence_by_field: raw?.evidence_by_field ?? {},
    extraction_confidence: raw?.extraction_confidence ?? null,
    unknown_fields: raw?.unknown_fields ?? [],
    extracted_at: raw?.extracted_at ?? new Date().toISOString(),
    sports_module_score: raw?.sports_module_score ?? null,
    sports_module_score_known: raw?.sports_module_score_known ?? false,
    known_unknown_flags: raw?.known_unknown_flags ?? [],
  };
}

function normalizeStoredRule(rule: StoredCollegeRule | null): StoredCollegeRule | null {
  if (!rule) {
    return null;
  }

  const facts = normalizeCollegeRuleFacts(rule.facts, rule.file_name);
  const normalizedRule: StoredCollegeRule = {
    ...rule,
    facts,
    extracted_at: facts.extracted_at,
    summary: buildRuleSummary(facts),
    fact_count: countExtractedRuleFacts(facts),
    basis_label: "",
  };

  normalizedRule.basis_label = buildRuleBasisLabel(normalizedRule);
  return normalizedRule;
}

async function readRuleStore(): Promise<CollegeRuleStore> {
  await ensureRuleRuntime();

  try {
    const raw = await fs.readFile(RULE_STORE_FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<CollegeRuleStore>;

    return {
      version: 1,
      current: normalizeStoredRule(parsed.current as StoredCollegeRule | null),
    };
  } catch {
    return {
      version: 1,
      current: null,
    };
  }
}

async function writeRuleStore(store: CollegeRuleStore) {
  await ensureRuleRuntime();
  await fs.writeFile(RULE_STORE_FILE, JSON.stringify(store, null, 2), "utf8");
}

function sanitizeFileName(fileName: string) {
  const ext = path.extname(fileName) || ".pdf";
  return `active-rule${ext.toLowerCase()}`;
}

export async function getStoredCollegeRule(): Promise<StoredCollegeRule | null> {
  const store = await readRuleStore();
  return store.current ?? null;
}

export async function getCollegeRuleState(): Promise<CollegeRuleState> {
  const rule = await getStoredCollegeRule();

  return {
    has_rule: Boolean(rule),
    basis_label: buildRuleBasisLabel(rule),
    rule,
  };
}

export async function saveCollegeRule({
  fileName,
  mimeType,
  fileSize,
  pdfBuffer,
  facts,
}: {
  fileName: string;
  mimeType: string;
  fileSize: number;
  pdfBuffer: Buffer;
  facts: CollegeRuleFacts;
}): Promise<StoredCollegeRule> {
  await ensureRuleRuntime();

  const savedFileName = sanitizeFileName(fileName);
  const absoluteFilePath = path.join(RULE_RUNTIME_DIR, savedFileName);
  await fs.writeFile(absoluteFilePath, pdfBuffer);

  const now = new Date().toISOString();
  const rule: StoredCollegeRule = {
    id: `college-rule-${Date.now()}`,
    file_name: fileName,
    file_size: fileSize,
    mime_type: mimeType,
    file_path: path.relative(process.cwd(), absoluteFilePath).replace(/\\/g, "/"),
    uploaded_at: now,
    extracted_at: facts.extracted_at,
    last_parsed_at: now,
    active: true,
    source_kind: "user_imported",
    summary: buildRuleSummary(facts),
    fact_count: countExtractedRuleFacts(facts),
    basis_label: "",
    facts,
  };

  rule.basis_label = buildRuleBasisLabel(rule);

  await writeRuleStore({
    version: 1,
    current: rule,
  });

  return rule;
}
