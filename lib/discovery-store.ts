import "server-only";

import os from "os";
import path from "path";
import { promises as fs } from "fs";
import type {
  DiscoveryCandidate,
  DiscoveryCandidateType,
  DiscoveryScreeningStatus,
  SourceRegistryCategory,
  SourceRegistryGroup,
  SourceRegistryReadiness,
  SourceReadabilityStatus,
  SourceKind,
  SourceOrigin,
  SourceWatchRecord,
  SourceWatchStatus,
} from "@/data/buaa-discovery-kb";

const DISCOVERY_RUNTIME_ROOT =
  process.env.VERCEL === "1" ? path.join(os.tmpdir(), "openuni-runtime") : path.join(process.cwd(), "data", "runtime");
const DISCOVERY_RUNTIME_DIR = path.join(DISCOVERY_RUNTIME_ROOT, "discovery");
const DISCOVERY_STORE_FILE = path.join(DISCOVERY_RUNTIME_DIR, "store.json");
const DEFAULT_SCHOOL = "北京航空航天大学";

export type DiscoveryRuntimeStore = {
  version: 1;
  last_synced_at: string | null;
  last_system_synced_at?: string | null;
  system_sources?: SourceWatchRecord[];
  system_generated_candidates?: DiscoveryCandidate[];
  custom_sources: SourceWatchRecord[];
  generated_candidates: DiscoveryCandidate[];
};

type RawStoredSource = Partial<SourceWatchRecord> & {
  source_kind?: string;
  source_home_url?: string;
  seed_url?: string | null;
  source_type?: string;
  source_url?: string;
  source_origin?: SourceOrigin;
  registry_category?: SourceRegistryCategory;
  registry_group?: SourceRegistryGroup;
  direct_html_readable?: boolean;
  registry_readiness?: SourceRegistryReadiness;
  content_focus?: string[];
};

type RawStoredCandidate = Partial<DiscoveryCandidate> & {
  source_kind?: string;
  source_type?: string;
};

function nowIso() {
  return new Date().toISOString();
}

async function ensureDiscoveryRuntime() {
  await fs.mkdir(DISCOVERY_RUNTIME_DIR, { recursive: true });
}

function normalizeUrl(url: string) {
  return url.trim().replace(/\/+$/, "");
}

function normalizeSourceKind(sourceKind?: string): SourceKind {
  const kinds: SourceKind[] = [
    "微信公众号",
    "部门官网",
    "通知栏目",
    "学院官网",
    "活动发布页",
    "文章详情页",
  ];

  return kinds.includes(sourceKind as SourceKind) ? (sourceKind as SourceKind) : "通知栏目";
}

function normalizeStatus(status?: string): SourceWatchStatus {
  if (status === "active" || status === "low_priority" || status === "candidate_remove") {
    return status;
  }

  return "active";
}

function normalizeCandidateType(candidateType?: string): DiscoveryCandidateType {
  const types: DiscoveryCandidateType[] = [
    "活动",
    "讲座",
    "比赛",
    "招募",
    "规则更新",
    "通知",
    "说明会",
    "机会",
    "节点",
  ];

  return types.includes(candidateType as DiscoveryCandidateType)
    ? (candidateType as DiscoveryCandidateType)
    : "通知";
}

function normalizeScreeningStatus(status?: string): DiscoveryScreeningStatus {
  if (
    status === "new" ||
    status === "useful" ||
    status === "promoted_to_signal" ||
    status === "ignored"
  ) {
    return status;
  }

  return "new";
}

function normalizeCandidateText(value: string | null | undefined) {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[【】\[\]（）()《》“”"':：,，。.、\-—_]/g, "")
    .replace(/\s+/g, "");
}

function normalizeCandidateDate(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) {
    return "";
  }

  return new Date(timestamp).toISOString().slice(0, 10);
}

function buildCandidateDedupKey(candidate: DiscoveryCandidate) {
  const originalUrl = candidate.original_url?.trim() || candidate.read_url?.trim();
  if (originalUrl) {
    return `url:${originalUrl}`;
  }

  const normalizedTitle = normalizeCandidateText(candidate.title);
  const normalizedSummary = normalizeCandidateText(candidate.structured_summary || candidate.raw_excerpt).slice(0, 48);
  const normalizedDate = normalizeCandidateDate(candidate.published_at);

  return `source:${candidate.source_id}|title:${normalizedTitle}|date:${normalizedDate}|summary:${normalizedSummary}`;
}

function candidateQualityScore(candidate: DiscoveryCandidate) {
  let score = 0;

  if (candidate.original_url || candidate.read_url) score += 40;
  if (candidate.sync_run_id) score += 24;
  if (candidate.source_origin === "user_followed") score += 12;
  if (candidate.screening_status === "promoted_to_signal") score += 10;
  else if (candidate.screening_status === "useful") score += 6;
  else if (candidate.screening_status === "new") score += 3;
  if (candidate.confidence) score += Math.round(candidate.confidence * 10);

  return score;
}

function dedupeCandidates(candidates: DiscoveryCandidate[]) {
  const deduped = new Map<string, DiscoveryCandidate>();

  for (const candidate of candidates) {
    const key = buildCandidateDedupKey(candidate);
    const existing = deduped.get(key);

    if (!existing || candidateQualityScore(candidate) > candidateQualityScore(existing)) {
      deduped.set(key, candidate);
    }
  }

  return Array.from(deduped.values());
}

function createSourceRecord(raw: {
  id: string;
  source_name: string;
  source_kind: SourceKind;
  source_home_url: string;
  seed_url?: string | null;
  school: string;
  organization_or_college: string;
  status: SourceWatchStatus;
  last_checked_at: string;
  last_hit_count: number;
  total_hit_count: number;
  invalid_streak: number;
  priority_score: number;
  notes: string;
  source_origin: SourceOrigin;
  is_user_added: boolean;
  readability_status: SourceReadabilityStatus;
  last_read_url: string | null;
  last_sync_message: string;
  last_error_message: string | null;
  last_sync_candidate_count: number;
  last_sync_run_id: string | null;
  registry_category?: SourceRegistryCategory;
  registry_group?: SourceRegistryGroup;
  direct_html_readable?: boolean;
  registry_readiness?: SourceRegistryReadiness;
  content_focus?: string[];
}): SourceWatchRecord {
  const seedUrl = raw.seed_url ? normalizeUrl(raw.seed_url) : null;
  const homeUrl = raw.source_home_url ? normalizeUrl(raw.source_home_url) : "";

  return {
    ...raw,
    source_home_url: homeUrl,
    seed_url: seedUrl,
    last_read_url: raw.last_read_url ? normalizeUrl(raw.last_read_url) : null,
    registry_category: raw.registry_category,
    registry_group: raw.registry_group,
    direct_html_readable: raw.direct_html_readable,
    registry_readiness: raw.registry_readiness,
    content_focus: Array.isArray(raw.content_focus) ? raw.content_focus.filter(Boolean) : [],
    source_type: raw.source_kind,
    source_url: seedUrl ?? homeUrl,
  };
}

function normalizeStoredSource(raw: RawStoredSource, index: number): SourceWatchRecord {
  const sourceKind = normalizeSourceKind(raw.source_kind ?? raw.source_type);
  const homeUrl = raw.source_home_url?.trim()
    ? normalizeUrl(raw.source_home_url)
    : raw.source_url?.trim()
      ? normalizeUrl(raw.source_url)
      : "";
  const seedUrl = raw.seed_url ? normalizeUrl(raw.seed_url) : null;
  const hasReadableEntry = Boolean(homeUrl || seedUrl);
  const defaultReadabilityStatus: SourceReadabilityStatus = hasReadableEntry ? "connected" : "name_only";

  return createSourceRecord({
    id: raw.id ?? `user-source-${index + 1}`,
    source_name: raw.source_name?.trim() || "未命名关注来源",
    source_kind: sourceKind,
    source_home_url: homeUrl,
    seed_url: seedUrl,
    school: raw.school?.trim() || DEFAULT_SCHOOL,
    organization_or_college: raw.organization_or_college?.trim() || "用户关注来源",
    status: normalizeStatus(raw.status),
    last_checked_at: raw.last_checked_at || nowIso(),
    last_hit_count: Number.isFinite(raw.last_hit_count) ? Number(raw.last_hit_count) : 0,
    total_hit_count: Number.isFinite(raw.total_hit_count) ? Number(raw.total_hit_count) : 0,
    invalid_streak: Number.isFinite(raw.invalid_streak) ? Number(raw.invalid_streak) : 0,
    priority_score: Number.isFinite(raw.priority_score) ? Number(raw.priority_score) : 72,
    notes: raw.notes?.trim() || "这个来源由用户添加，OpenUni 会在后续同步中继续关注它的新内容。",
    source_origin: raw.source_origin === "seeded" ? "seeded" : "user_followed",
    is_user_added: raw.is_user_added ?? true,
    readability_status: raw.readability_status ?? defaultReadabilityStatus,
    last_read_url: raw.last_read_url ?? seedUrl ?? homeUrl ?? null,
    last_sync_message:
      raw.last_sync_message?.trim() ||
      (hasReadableEntry ? "已连接来源入口，等待同步最新内容" : "仅保存来源名称，等待补充来源入口"),
    last_error_message: raw.last_error_message?.trim() || null,
    last_sync_candidate_count: Number.isFinite(raw.last_sync_candidate_count)
      ? Number(raw.last_sync_candidate_count)
      : Number.isFinite(raw.last_hit_count)
        ? Number(raw.last_hit_count)
        : 0,
    last_sync_run_id: raw.last_sync_run_id ?? null,
    registry_category: raw.registry_category,
    registry_group: raw.registry_group,
    direct_html_readable: raw.direct_html_readable ?? hasReadableEntry,
    registry_readiness: raw.registry_readiness ?? (hasReadableEntry ? "direct_readable" : "entity_only"),
    content_focus: Array.isArray(raw.content_focus) ? raw.content_focus.filter(Boolean) : [],
  });
}

function normalizeStoredCandidate(raw: RawStoredCandidate, index: number): DiscoveryCandidate | null {
  if (!raw.source_id || !raw.title) {
    return null;
  }

  const sourceKind = normalizeSourceKind(raw.source_kind ?? raw.source_type);

  return {
    id: raw.id ?? `user-candidate-${index + 1}`,
    title: raw.title.trim(),
    source_id: raw.source_id,
    source_name: raw.source_name?.trim() || "未命名关注来源",
    source_kind: sourceKind,
    source_type: sourceKind,
    published_at: raw.published_at || nowIso(),
    raw_excerpt: raw.raw_excerpt?.trim() || "",
    structured_summary: raw.structured_summary?.trim() || raw.raw_excerpt?.trim() || "",
    candidate_type: normalizeCandidateType(raw.candidate_type),
    deadline: raw.deadline ?? null,
    target_audience: raw.target_audience?.trim() || "北航学生",
    preliminary_tags: Array.isArray(raw.preliminary_tags) ? raw.preliminary_tags.filter(Boolean) : [],
    extracted_value_signals: Array.isArray(raw.extracted_value_signals)
      ? raw.extracted_value_signals.filter(Boolean)
      : [],
    confidence: typeof raw.confidence === "number" ? raw.confidence : 0.55,
    screening_status: normalizeScreeningStatus(raw.screening_status),
    reason_summary: raw.reason_summary?.trim() || "OpenUni 已将这条内容保存到发现层，后续会继续判断它是否值得进入信号流。",
    source_origin: raw.source_origin === "seeded" ? "seeded" : "user_followed",
    linked_signal_href: raw.linked_signal_href,
    original_url: raw.original_url ?? raw.read_url ?? null,
    read_url: raw.read_url ?? null,
    source_home_url: raw.source_home_url ?? "",
    synced_at: raw.synced_at ?? raw.published_at ?? nowIso(),
    sync_run_id: raw.sync_run_id ?? null,
  };
}

async function readStore(): Promise<DiscoveryRuntimeStore> {
  await ensureDiscoveryRuntime();

  try {
    const raw = await fs.readFile(DISCOVERY_STORE_FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<DiscoveryRuntimeStore>;

    return {
      version: 1,
      last_synced_at: parsed.last_synced_at ?? null,
      last_system_synced_at: parsed.last_system_synced_at ?? null,
      system_sources: Array.isArray(parsed.system_sources)
        ? parsed.system_sources.map((item, index) => normalizeStoredSource(item as RawStoredSource, index))
        : [],
      system_generated_candidates: Array.isArray(parsed.system_generated_candidates)
        ? parsed.system_generated_candidates
            .map((item, index) => normalizeStoredCandidate(item as RawStoredCandidate, index))
            .filter((item): item is DiscoveryCandidate => Boolean(item))
        : [],
      custom_sources: Array.isArray(parsed.custom_sources)
        ? parsed.custom_sources.map((item, index) => normalizeStoredSource(item as RawStoredSource, index))
        : [],
      generated_candidates: Array.isArray(parsed.generated_candidates)
        ? parsed.generated_candidates
            .map((item, index) => normalizeStoredCandidate(item as RawStoredCandidate, index))
            .filter((item): item is DiscoveryCandidate => Boolean(item))
        : [],
    };
  } catch {
    return {
      version: 1,
      last_synced_at: null,
      last_system_synced_at: null,
      system_sources: [],
      system_generated_candidates: [],
      custom_sources: [],
      generated_candidates: [],
    };
  }
}

async function writeStore(store: DiscoveryRuntimeStore) {
  await ensureDiscoveryRuntime();
  await fs.writeFile(DISCOVERY_STORE_FILE, JSON.stringify(store, null, 2), "utf8");
}

export async function getDiscoveryRuntimeState() {
  return readStore();
}

export async function saveFollowedSource(input: {
  source_name: string;
  source_kind: string;
  organization_or_college: string;
  source_home_url?: string;
  seed_url?: string;
  notes?: string;
}) {
  const store = await readStore();
  const normalizedHomeUrl = input.source_home_url?.trim()
    ? normalizeUrl(input.source_home_url)
    : "";
  const normalizedSeedUrl = input.seed_url?.trim() ? normalizeUrl(input.seed_url) : null;
  const normalizedName = input.source_name.trim();
  const normalizedOrganization = input.organization_or_college.trim();
  const normalizedKind = normalizeSourceKind(input.source_kind);

  const existing = store.custom_sources.find((source) => {
    if (normalizedHomeUrl) {
      return normalizeUrl(source.source_home_url) === normalizedHomeUrl;
    }

    return (
      source.source_name === normalizedName &&
      source.organization_or_college === normalizedOrganization &&
      source.source_kind === normalizedKind
    );
  });

  if (existing) {
    if ((normalizedHomeUrl || normalizedSeedUrl) && !existing.source_home_url && !existing.seed_url) {
      return supplementFollowedSourceEntry({
        source_id: existing.id,
        entry_url: normalizedSeedUrl ?? normalizedHomeUrl,
      }).then((result) => ({
        created: false,
        source: result.source ?? existing,
        store: result.store,
      }));
    }

    return {
      created: false,
      source: existing,
      store,
    };
  }

  const now = nowIso();
  const source = createSourceRecord({
    id: `user-source-${Date.now()}`,
    source_name: normalizedName,
    source_kind: normalizedKind,
    source_home_url: normalizedHomeUrl,
    seed_url: normalizedSeedUrl,
    school: DEFAULT_SCHOOL,
    organization_or_college: normalizedOrganization,
    status: "active",
    last_checked_at: now,
    last_hit_count: 0,
    total_hit_count: 0,
    invalid_streak: 0,
    priority_score: 74,
    notes:
      input.notes?.trim() ||
      (normalizedHomeUrl || normalizedSeedUrl
        ? "这个来源由用户手动关注，OpenUni 会在后续同步中持续检查它的新内容。"
        : "这个来源已加入关注列表；如果之后补一个主页或最近文章链接，OpenUni 会更容易同步它的新内容。"),
    source_origin: "user_followed",
    is_user_added: true,
    readability_status: normalizedHomeUrl || normalizedSeedUrl ? "connected" : "name_only",
    last_read_url: normalizedSeedUrl ?? normalizedHomeUrl ?? null,
    last_sync_message:
      normalizedHomeUrl || normalizedSeedUrl
        ? "已连接来源入口，后续同步会继续检查这个来源"
        : "仅保存来源名称，等待补充来源入口",
    last_error_message: null,
    last_sync_candidate_count: 0,
    last_sync_run_id: null,
  });

  const nextStore: DiscoveryRuntimeStore = {
    ...store,
    custom_sources: [source, ...store.custom_sources],
  };

  await writeStore(nextStore);

  return {
    created: true,
    source,
    store: nextStore,
  };
}

export async function supplementFollowedSourceEntry(input: {
  source_id: string;
  entry_url: string;
  note?: string;
}): Promise<{
  source: SourceWatchRecord | null;
  store: DiscoveryRuntimeStore;
}> {
  const store = await readStore();
  const normalizedEntryUrl = normalizeUrl(input.entry_url);
  let updatedSource: SourceWatchRecord | null = null;

  const nextStore: DiscoveryRuntimeStore = {
    ...store,
    custom_sources: store.custom_sources.map((source) => {
      if (source.id !== input.source_id) {
        return source;
      }

      updatedSource = createSourceRecord({
        ...source,
        source_home_url: source.source_home_url || normalizedEntryUrl,
        seed_url: normalizedEntryUrl,
        notes:
          input.note?.trim() ||
          source.notes ||
          "已补充来源入口，OpenUni 后续会继续读取这个来源",
        readability_status: "connected",
        last_read_url: normalizedEntryUrl,
        last_sync_message: "已补充来源入口，等待下一轮同步读取",
        last_error_message: null,
        last_sync_candidate_count: source.last_sync_candidate_count ?? 0,
        last_sync_run_id: source.last_sync_run_id ?? null,
      });

      return updatedSource;
    }),
  };

  await writeStore(nextStore);

  return {
    source: updatedSource,
    store: nextStore,
  };
}

export async function removeFollowedSource(sourceId: string) {
  const store = await readStore();
  const nextStore: DiscoveryRuntimeStore = {
    ...store,
    custom_sources: store.custom_sources.filter((source) => source.id !== sourceId),
    generated_candidates: store.generated_candidates.filter((candidate) => candidate.source_id !== sourceId),
  };

  await writeStore(nextStore);
  return nextStore;
}

export async function lowerPriorityFollowedSource(sourceId: string) {
  const store = await readStore();
  const nextSources = store.custom_sources.map((source) => {
    if (source.id !== sourceId) {
      return source;
    }

    return createSourceRecord({
      ...source,
      status: "low_priority",
      priority_score: Math.max(30, source.priority_score - 10),
      notes:
        source.notes || "这个来源已被调低优先级，OpenUni 仍会保留，但不会像高效来源那样优先关注。",
    });
  });

  const nextStore: DiscoveryRuntimeStore = {
    ...store,
    custom_sources: nextSources,
  };

  await writeStore(nextStore);
  return nextStore;
}

export async function saveDiscoverySyncResult(input: {
  custom_sources: SourceWatchRecord[];
  generated_candidates: DiscoveryCandidate[];
  last_synced_at: string;
}) {
  const currentStore = await readStore();
  const normalizedCandidates = input.generated_candidates
    .map((candidate, index) => normalizeStoredCandidate(candidate, index))
    .filter((candidate): candidate is DiscoveryCandidate => Boolean(candidate));

  const nextStore: DiscoveryRuntimeStore = {
    version: 1,
    last_synced_at: input.last_synced_at,
    last_system_synced_at: currentStore.last_system_synced_at ?? null,
    system_sources: currentStore.system_sources ?? [],
    system_generated_candidates: currentStore.system_generated_candidates ?? [],
    custom_sources: input.custom_sources.map((source, index) =>
      normalizeStoredSource(source, index),
    ),
    generated_candidates: dedupeCandidates(normalizedCandidates),
  };

  await writeStore(nextStore);
  return nextStore;
}

export async function saveSystemDiscoverySyncResult(input: {
  store: DiscoveryRuntimeStore;
  system_sources: SourceWatchRecord[];
  system_generated_candidates: DiscoveryCandidate[];
  last_system_synced_at: string;
}) {
  const normalizedSystemCandidates = input.system_generated_candidates
    .map((candidate, index) => normalizeStoredCandidate(candidate, index))
    .filter((candidate): candidate is DiscoveryCandidate => Boolean(candidate));

  const nextStore: DiscoveryRuntimeStore = {
    ...input.store,
    last_system_synced_at: input.last_system_synced_at,
    system_sources: input.system_sources.map((source, index) =>
      normalizeStoredSource(source, index),
    ),
    system_generated_candidates: dedupeCandidates(normalizedSystemCandidates),
  };

  await writeStore(nextStore);
  return nextStore;
}


