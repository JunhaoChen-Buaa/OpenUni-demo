import { NextRequest, NextResponse } from "next/server";
import { buildDiscoveryPageData, getBuiltInSourcesForSync } from "@/lib/buaa-discovery";
import {
  buildFollowSourcePrompt,
  resolveFollowSourceIntent,
  type ParsedFollowSourceIntent,
  type ResolvedSourceCandidate,
} from "@/lib/discovery-source-parser";
import {
  getDiscoveryRuntimeState,
  lowerPriorityFollowedSource,
  removeFollowedSource,
  saveDiscoverySyncResult,
  saveSystemDiscoverySyncResult,
  saveFollowedSource,
  supplementFollowedSourceEntry,
} from "@/lib/discovery-store";
import {
  syncSingleSource,
  syncFollowedSources,
  type DiscoverySyncResult,
  type DiscoverySyncSourceReport,
} from "@/lib/discovery-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 100;

const SYSTEM_SOURCE_SYNC_MAX_AGE_MS = 1000 * 60 * 90;
const IS_VERCEL = process.env.VERCEL === "1";
const SYSTEM_SOURCE_SYNC_LIMIT = IS_VERCEL ? 2 : 8;
const CUSTOM_SOURCE_SYNC_LIMIT = IS_VERCEL ? 2 : 50;

type RuntimeSource = Awaited<ReturnType<typeof getDiscoveryRuntimeState>>["custom_sources"][number];
type RuntimeCandidate = Awaited<ReturnType<typeof getDiscoveryRuntimeState>>["generated_candidates"][number];

type DiscoveryResultSummary = {
  title: string;
  items: string[];
  standout?: {
    label: string;
    title: string;
    href?: string;
  } | null;
};

type DiscoveryFollowUpPayload = {
  mode: "confirm" | "supplement";
  prompt: string | null;
  draft_text: string;
  source_id?: string;
  explanation?: string;
  confirmation_label?: string;
  resolution?: {
    confidence: number;
    matched_existing: boolean;
    matched_source_name: string | null;
    found_readable_entry: boolean;
    recognized_as_public_account: boolean;
    should_confirm: boolean;
    candidate_label: string;
    clarification_question: string | null;
    steps: string[];
  };
  preview?: {
    source_name: string;
    source_kind: string | null;
    organization_or_college: string;
    source_home_url: string;
  };
};

type DiscoverySyncReportPayload = {
  synced_at: string;
  synced_source_count: number;
  successful_source_count: number;
  failed_source_count: number;
  candidate_count: number;
  promoted_count: number;
  standout_title: string | null;
  sources: Array<{
    source_id: string;
    source_name: string;
    source_kind: string;
    source_origin_label: string;
    source_home_url: string;
    read_url: string | null;
    read_count: number;
    sync_status: string;
    sync_status_label: string;
    sync_message: string;
    error_message: string | null;
    candidate_count: number;
    useful_count: number;
    promoted_count: number;
    ignored_count: number;
    standout_title: string | null;
  }>;
};

type ImmediateSourceSyncPayload = {
  source_id: string;
  source_name: string;
  source_kind: string;
  sync_status_label: string;
  sync_message: string;
  read_url: string | null;
  source_home_url: string;
  generated_candidate_count: number;
  visible_candidate_count: number;
  promoted_count: number;
  deduped_count: number;
  explanation: string;
  candidates: Array<{
    id: string;
    title: string;
    screening_status: string;
    linked_signal_href?: string;
    original_url?: string | null;
  }>;
};

function buildRuntime(store: Awaited<ReturnType<typeof getDiscoveryRuntimeState>>) {
  return {
    has_custom_sources: store.custom_sources.length > 0,
    custom_source_count: store.custom_sources.length,
    last_synced_at: store.last_synced_at ?? store.last_system_synced_at ?? null,
    last_system_synced_at: store.last_system_synced_at ?? null,
  };
}

function compactSourceUrl(value: string) {
  if (!value) {
    return "未识别到来源入口";
  }

  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return value;
  }
}

function sourceOriginLabel(origin: "seeded" | "user_followed") {
  return origin === "user_followed" ? "用户关注来源" : "系统来源";
}

function syncStatusLabel(status: DiscoverySyncSourceReport["sync_status"]) {
  switch (status) {
    case "connected":
      return "已连接";
    case "synced_success":
      return "最近同步成功";
    case "synced_failed":
      return "最近同步失败";
    case "missing_entry":
      return "缺少可读取入口";
    case "name_only":
      return "仅保存来源名称";
    case "waiting_entry":
      return "等待补充入口";
    case "no_new_content":
      return "无新内容";
    case "candidate_extracted":
      return "已提取到候选";
    default:
      return "最近同步成功";
  }
}

function buildPayload(
  store: Awaited<ReturnType<typeof getDiscoveryRuntimeState>>,
  options?: {
    notice?: string;
    error?: string;
    follow_up?: DiscoveryFollowUpPayload | null;
    result_summary?: DiscoveryResultSummary | null;
    sync_report?: DiscoverySyncReportPayload | null;
    immediate_source_sync?: ImmediateSourceSyncPayload | null;
  },
) {
  const data = buildDiscoveryPageData({
    lastSyncedAtOverride: store.last_synced_at ?? store.last_system_synced_at ?? undefined,
    runtimeSources: [...(store.system_sources ?? []), ...store.custom_sources],
    runtimeCandidates: [...(store.system_generated_candidates ?? []), ...store.generated_candidates],
  });

  return {
    data,
    runtime: buildRuntime(store),
    ...(options?.notice ? { notice: options.notice } : {}),
    ...(options?.error ? { error: options.error } : {}),
    ...(options?.follow_up ? { follow_up: options.follow_up } : {}),
    ...(options?.result_summary ? { result_summary: options.result_summary } : {}),
    ...(options?.sync_report ? { sync_report: options.sync_report } : {}),
    ...(options?.immediate_source_sync ? { immediate_source_sync: options.immediate_source_sync } : {}),
  };
}

function buildFollowUpPayload(
  parsed: ParsedFollowSourceIntent,
  resolution: ResolvedSourceCandidate,
  options: {
    mode: "confirm" | "supplement";
    sourceId?: string;
  },
): DiscoveryFollowUpPayload {
  return {
    mode: options.mode,
    prompt:
      options.mode === "confirm"
        ? resolution.clarification_question
        : buildFollowSourcePrompt(parsed),
    draft_text: parsed.raw_input,
    ...(options.sourceId ? { source_id: options.sourceId } : {}),
    explanation: resolution.user_facing_explanation,
    confirmation_label: options.mode === "confirm" ? "是的，加入关注列表" : undefined,
    resolution: {
      confidence: resolution.resolution_confidence,
      matched_existing: resolution.matched_existing,
      matched_source_name: resolution.matched_source_name,
      found_readable_entry: resolution.found_readable_entry,
      recognized_as_public_account: resolution.recognized_as_public_account,
      should_confirm: resolution.should_confirm,
      candidate_label: resolution.candidate_label,
      clarification_question: resolution.clarification_question,
      steps: resolution.resolution_steps,
    },
    preview: {
      source_name: parsed.source_name || resolution.source_name || "未识别到明确来源名",
      source_kind: parsed.source_kind ?? resolution.source_kind,
      organization_or_college:
        parsed.organization_or_college || resolution.organization_or_college,
      source_home_url: parsed.source_home_url || resolution.source_home_url,
    },
  };
}

function buildFollowResultSummary(input: {
  source_name: string;
  source_kind: string;
  organization_or_college: string;
  source_home_url: string;
  created: boolean;
  resolution: ResolvedSourceCandidate;
}): DiscoveryResultSummary {
  return {
    title: input.created ? "已加入关注来源" : "来源已在关注列表中",
    items: [
      `来源解析置信度：${Math.round(input.resolution.resolution_confidence * 100)}%`,
      input.resolution.matched_existing
        ? `已匹配到现有来源：${input.resolution.matched_source_name ?? input.source_name}`
        : "已按新的关注来源保存",
      `来源名称：${input.source_name}`,
      `来源类型：${input.source_kind}`,
      `组织归属：${input.organization_or_college}`,
      input.source_home_url
        ? `来源入口：${compactSourceUrl(input.source_home_url)}`
        : "还缺少稳定入口，建议补充最近文章链接或栏目入口",
    ],
    standout: input.source_home_url
      ? {
          label: "打开来源入口",
          title: compactSourceUrl(input.source_home_url),
          href: input.source_home_url,
        }
      : null,
  };
}

function buildSupplementResultSummary(input: {
  source_name: string;
  entry_url: string;
}): DiscoveryResultSummary {
  return {
    title: "已补充来源入口",
    items: [
      `来源名称：${input.source_name}`,
      `入口地址：${compactSourceUrl(input.entry_url)}`,
      "OpenUni 后续会优先从这个入口继续同步最近内容",
    ],
    standout: {
      label: "打开来源入口",
      title: compactSourceUrl(input.entry_url),
      href: input.entry_url,
    },
  };
}

function buildSyncReport(syncResult: DiscoverySyncResult): DiscoverySyncReportPayload {
  const candidateCount = syncResult.generated_candidates.length;
  const promotedCount = syncResult.generated_candidates.filter(
    (item) => item.screening_status === "promoted_to_signal",
  ).length;
  const successfulSourceCount = syncResult.source_reports.filter(
    (item) => item.sync_status !== "synced_failed" && item.sync_status !== "missing_entry",
  ).length;

  return {
    synced_at: syncResult.synced_at,
    synced_source_count: syncResult.synced_source_count,
    successful_source_count: successfulSourceCount,
    failed_source_count: syncResult.failed_sources.length,
    candidate_count: candidateCount,
    promoted_count: promotedCount,
    standout_title:
      syncResult.generated_candidates.find((item) => item.screening_status === "promoted_to_signal")
        ?.title ??
      syncResult.generated_candidates[0]?.title ??
      null,
    sources: syncResult.source_reports.map((item) => ({
      source_id: item.source_id,
      source_name: item.source_name,
      source_kind: item.source_kind,
      source_origin_label: sourceOriginLabel(item.source_origin),
      source_home_url: item.source_home_url,
      read_url: item.read_url,
      read_count: item.read_count,
      sync_status: item.sync_status,
      sync_status_label: syncStatusLabel(item.sync_status),
      sync_message: item.sync_message,
      error_message: item.error_message,
      candidate_count: item.candidate_count,
      useful_count: item.useful_count,
      promoted_count: item.promoted_count,
      ignored_count: item.ignored_count,
      standout_title: item.standout_title,
    })),
  };
}

function buildSyncResultSummary(
  payload: ReturnType<typeof buildDiscoveryPageData>,
  syncReport: DiscoverySyncReportPayload,
): DiscoveryResultSummary {
  const standoutPromoted = payload.promoted_candidates[0];
  const standoutWatch = payload.watch_candidates[0];
  const failedNames = syncReport.sources
    .filter((item) => item.sync_status === "synced_failed")
    .map((item) => item.source_name);

  return {
    title:
      syncReport.synced_source_count > 0
        ? `本轮同步了 ${syncReport.synced_source_count} 个来源`
        : "当前还没有可同步的关注来源",
    items: [
      `新发现候选：${syncReport.candidate_count} 条`,
      `进入信号流：${syncReport.promoted_count} 条`,
      failedNames.length > 0
        ? `同步失败来源：${failedNames.slice(0, 2).join("、")}`
        : syncReport.standout_title
          ? `本轮最值得继续看：${syncReport.standout_title}`
          : "本轮没有新增高价值候选",
    ],
    standout: standoutPromoted
      ? {
          label: "查看进入信号流后的去向",
          title: standoutPromoted.title,
          href: standoutPromoted.linked_signal_href ?? "/home",
        }
      : standoutWatch
        ? {
            label: "查看继续观察内容",
            title: standoutWatch.title,
            href: "#watch-candidates",
          }
        : null,
  };
}

async function saveSingleSourceSyncResult(input: {
  store: Awaited<ReturnType<typeof getDiscoveryRuntimeState>>;
  syncResult: DiscoverySyncResult;
  sourceId: string;
}) {
  const updatedSource = input.syncResult.updated_sources.find((source) => source.id === input.sourceId);
  const mergedSources = input.store.custom_sources.map((source) =>
    source.id === input.sourceId && updatedSource ? updatedSource : source,
  );

  const mergedCandidates = [
    ...input.store.generated_candidates.filter((candidate) => candidate.source_id !== input.sourceId),
    ...input.syncResult.generated_candidates,
  ];

  const nextStore = await saveDiscoverySyncResult({
    custom_sources: mergedSources,
    generated_candidates: mergedCandidates,
    last_synced_at: input.syncResult.synced_at,
  });

  const retainedCandidates = nextStore.generated_candidates.filter(
    (candidate) => candidate.source_id === input.sourceId,
  );

  return {
    nextStore,
    updatedSource,
    retainedCandidates,
  };
}

function buildImmediateSourceSyncPayload(input: {
  syncResult: DiscoverySyncResult;
  retainedCandidates: Awaited<ReturnType<typeof getDiscoveryRuntimeState>>["generated_candidates"];
}) : ImmediateSourceSyncPayload | null {
  const sourceReport = input.syncResult.source_reports[0];
  if (!sourceReport) {
    return null;
  }

  const generatedCount = input.syncResult.generated_candidates.length;
  const visibleCount = input.retainedCandidates.length;
  const dedupedCount = Math.max(generatedCount - visibleCount, 0);

  let explanation = sourceReport.sync_message;
  if (sourceReport.sync_status === "synced_failed") {
    explanation = sourceReport.error_message || "这次读取失败了，当前还没能把这个来源的新内容带进发现层。";
  } else if (sourceReport.sync_status === "missing_entry" || sourceReport.sync_status === "name_only") {
    explanation = "来源已经保存，但还缺稳定入口，所以这轮还不能可靠地读出它的最近内容。";
  } else if (generatedCount === 0) {
    explanation = "这轮已读取来源，但没有提取到新的候选内容。";
  } else if (visibleCount === 0 && dedupedCount > 0) {
    explanation = "这轮提取到了内容，但它们和现有发现重复，已经被自动归并。";
  } else if (sourceReport.useful_count === 0) {
    explanation = "这轮读到了内容，但暂时没有形成更值得继续看的高价值候选。";
  }

  return {
    source_id: sourceReport.source_id,
    source_name: sourceReport.source_name,
    source_kind: sourceReport.source_kind,
    sync_status_label: syncStatusLabel(sourceReport.sync_status),
    sync_message: sourceReport.sync_message,
    read_url: sourceReport.read_url,
    source_home_url: sourceReport.source_home_url,
    generated_candidate_count: generatedCount,
    visible_candidate_count: visibleCount,
    promoted_count: sourceReport.promoted_count,
    deduped_count: dedupedCount,
    explanation,
    candidates: input.retainedCandidates.slice(0, 3).map((candidate) => ({
      id: candidate.id,
      title: candidate.title,
      screening_status: candidate.screening_status,
      linked_signal_href: candidate.linked_signal_href,
      original_url: candidate.original_url,
    })),
  };
}

async function syncImmediatelyAfterFollow(input: {
  store: Awaited<ReturnType<typeof getDiscoveryRuntimeState>>;
  source: Awaited<ReturnType<typeof saveFollowedSource>>["source"];
}) {
  const fetchTarget = input.source.seed_url ?? input.source.source_home_url;

  if (!fetchTarget) {
    return {
      nextStore: input.store,
      syncReport: null,
      immediateSourceSync: {
        source_id: input.source.id,
        source_name: input.source.source_name,
        source_kind: input.source.source_kind,
        sync_status_label: "等待补充入口",
        sync_message: "当前只保存了来源名称，还没有稳定的可读取入口。",
        read_url: null,
        source_home_url: input.source.source_home_url,
        generated_candidate_count: 0,
        visible_candidate_count: 0,
        promoted_count: 0,
        deduped_count: 0,
        explanation: "来源已经加入关注列表，但这轮还不能可靠地读取它的最近内容。补充最近文章链接、栏目入口或主页入口后，OpenUni 才能立刻把它带进发现层。",
        candidates: [],
      },
    };
  }

  const syncResult = await syncSingleSource(input.source);
  const merged = await saveSingleSourceSyncResult({
    store: input.store,
    syncResult,
    sourceId: input.source.id,
  });

  return {
    nextStore: merged.nextStore,
    syncReport: buildSyncReport(syncResult),
    immediateSourceSync: buildImmediateSourceSyncPayload({
      syncResult,
      retainedCandidates: merged.retainedCandidates,
    }),
  };
}

function shouldRefreshSystemSources(lastSystemSyncedAt: string | null | undefined) {
  if (!lastSystemSyncedAt) {
    return true;
  }

  const timestamp = new Date(lastSystemSyncedAt).getTime();
  if (Number.isNaN(timestamp)) {
    return true;
  }

  return Date.now() - timestamp > SYSTEM_SOURCE_SYNC_MAX_AGE_MS;
}

function getCustomSourcesForSync(sources: RuntimeSource[]) {
  const activeSources = sources.filter((source) => source.status === "active");
  const prioritizedSources = activeSources.length > 0 ? activeSources : sources;

  return IS_VERCEL ? prioritizedSources.slice(0, CUSTOM_SOURCE_SYNC_LIMIT) : prioritizedSources;
}

function mergeUpdatedSources(existingSources: RuntimeSource[], updatedSources: RuntimeSource[]) {
  const updatesById = new Map(updatedSources.map((source) => [source.id, source]));

  return existingSources.map((source) => updatesById.get(source.id) ?? source);
}

function mergeUpdatedCandidates(
  existingCandidates: RuntimeCandidate[],
  updatedCandidates: RuntimeCandidate[],
  syncedSourceIds: Set<string>,
) {
  return [
    ...existingCandidates.filter((candidate) => !syncedSourceIds.has(candidate.source_id)),
    ...updatedCandidates,
  ];
}

async function ensureSystemSourcesSynced(
  store: Awaited<ReturnType<typeof getDiscoveryRuntimeState>>,
  force = false,
) {
  const needsRefresh =
    force ||
    !store.system_sources?.length ||
    !store.system_generated_candidates?.length ||
    shouldRefreshSystemSources(store.last_system_synced_at);

  if (!needsRefresh) {
    return {
      store,
      syncResult: null as DiscoverySyncResult | null,
    };
  }

  const builtInSources = getBuiltInSourcesForSync(SYSTEM_SOURCE_SYNC_LIMIT, {
    preferSignalSources: IS_VERCEL,
  });
  if (!builtInSources.length) {
    return {
      store,
      syncResult: null as DiscoverySyncResult | null,
    };
  }

  const syncResult = await syncFollowedSources(builtInSources);
  const nextStore = await saveSystemDiscoverySyncResult({
    store,
    system_sources: syncResult.updated_sources,
    system_generated_candidates: syncResult.generated_candidates,
    last_system_synced_at: syncResult.synced_at,
  });

  return {
    store: nextStore,
    syncResult,
  };
}

function mergeSyncReports(reports: Array<DiscoverySyncResult | null | undefined>): DiscoverySyncReportPayload {
  const validReports = reports.filter((report): report is DiscoverySyncResult => Boolean(report));
  const syncedAt =
    validReports
      .map((report) => report.synced_at)
      .sort()
      .slice(-1)[0] ?? new Date().toISOString();

  const sourceReports = validReports.flatMap((report) => report.source_reports);
  const generatedCandidates = validReports.flatMap((report) => report.generated_candidates);
  const failedSources = validReports.flatMap((report) => report.failed_sources);

  return {
    synced_at: syncedAt,
    synced_source_count: validReports.reduce((sum, report) => sum + report.synced_source_count, 0),
    successful_source_count: sourceReports.filter(
      (item) => item.sync_status !== "synced_failed" && item.sync_status !== "missing_entry",
    ).length,
    failed_source_count: failedSources.length,
    candidate_count: generatedCandidates.length,
    promoted_count: generatedCandidates.filter((item) => item.screening_status === "promoted_to_signal").length,
    standout_title:
      generatedCandidates.find((item) => item.screening_status === "promoted_to_signal")?.title ??
      generatedCandidates[0]?.title ??
      null,
    sources: sourceReports.map((item) => ({
      source_id: item.source_id,
      source_name: item.source_name,
      source_kind: item.source_kind,
      source_origin_label: sourceOriginLabel(item.source_origin),
      source_home_url: item.source_home_url,
      read_url: item.read_url,
      read_count: item.read_count,
      sync_status: item.sync_status,
      sync_status_label: syncStatusLabel(item.sync_status),
      sync_message: item.sync_message,
      error_message: item.error_message,
      candidate_count: item.candidate_count,
      useful_count: item.useful_count,
      promoted_count: item.promoted_count,
      ignored_count: item.ignored_count,
      standout_title: item.standout_title,
    })),
  };
}

function createEmptyResolution(rawInput: string): Awaited<ReturnType<typeof resolveFollowSourceIntent>> {
  return {
    parsed: {
      raw_input: rawInput,
      source_name: "",
      source_kind: null,
      organization_or_college: "",
      school: "北航",
      source_home_url: "",
      seed_url: null,
      notes: "",
      confidence: 0,
      missing_fields: ["source_name", "source_kind", "source_home_url"],
      follow_summary: "",
    },
    resolution: {
      source_name: "",
      source_kind: null,
      organization_or_college: "",
      school: "北航",
      source_home_url: "",
      seed_url: null,
      aliases: [],
      normalized_name: "",
      resolution_confidence: 0,
      matched_existing: false,
      matched_source_id: null,
      matched_source_name: null,
      matched_source_origin: null,
      found_readable_entry: false,
      needs_user_entry: true,
      recognized_as_public_account: false,
      resolution_steps: [],
      notes: "",
      should_confirm: false,
      candidate_label: "",
      user_facing_explanation: "",
      clarification_question: null,
    },
  };
}

function shouldRequestConfirmation(
  resolved: ResolvedSourceCandidate,
  confirmed: boolean,
  blockingMissing: string[],
) {
  if (confirmed || blockingMissing.length > 0) {
    return false;
  }

  return resolved.should_confirm;
}

export async function GET() {
  const store = await getDiscoveryRuntimeState();
  const ensured = await ensureSystemSourcesSynced(store);
  return NextResponse.json(buildPayload(ensured.store));
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as Record<string, unknown>;
  const action = typeof body.action === "string" ? body.action : "";

  if (action === "follow_source") {
    const input = typeof body.input === "string" ? body.input.trim() : "";
    const confirmed = body.confirmed === true;
    const store = await getDiscoveryRuntimeState();
    let resolved = createEmptyResolution(input);

    if (!input) {
      return NextResponse.json(
        buildPayload(store, {
          error: "请先告诉 OpenUni 你想持续关注哪个来源。",
        }),
        { status: 400 },
      );
    }

    resolved = await resolveFollowSourceIntent(input, store.custom_sources);
    const parsed = resolved.parsed;
    const blockingMissing = parsed.missing_fields.filter((field) => field !== "source_home_url");

    if (blockingMissing.length > 0) {
      return NextResponse.json(
        buildPayload(store, {
          notice: "OpenUni 已先帮你做了来源解析，但还缺少一个关键信息。",
          follow_up: buildFollowUpPayload(parsed, resolved.resolution, { mode: "supplement" }),
        }),
      );
    }

    if (shouldRequestConfirmation(resolved.resolution, confirmed, blockingMissing)) {
      return NextResponse.json(
        buildPayload(store, {
          notice: "OpenUni 已先完成来源解析，请确认这是不是你要关注的来源。",
          follow_up: buildFollowUpPayload(parsed, resolved.resolution, { mode: "confirm" }),
        }),
      );
    }

    const saved = await saveFollowedSource({
      source_name: parsed.source_name,
      source_kind: parsed.source_kind ?? "通知栏目",
      organization_or_college: parsed.organization_or_college,
      source_home_url: parsed.source_home_url,
      seed_url: parsed.seed_url ?? undefined,
      notes: parsed.notes,
    });

    const needsEntry = !saved.source.source_home_url && !saved.source.seed_url;
    const immediateSync = needsEntry
      ? { nextStore: saved.store, syncReport: null, immediateSourceSync: null }
      : await syncImmediatelyAfterFollow({
          store: saved.store,
          source: saved.source,
        });

    return NextResponse.json(
      buildPayload(immediateSync.nextStore, {
        notice: needsEntry
          ? "来源已加入关注列表。为了更稳定地持续关注它，建议补充最近文章链接。"
          : saved.created
            ? "OpenUni 已把这个来源加入关注列表，并立刻尝试读取了它最近的内容。"
            : "这个来源已经在关注列表里了，我刚刚又帮你检查了一次。",
        follow_up: needsEntry
          ? buildFollowUpPayload(parsed, resolved.resolution, {
              mode: "supplement",
              sourceId: saved.source.id,
            })
          : null,
        sync_report: immediateSync.syncReport,
        immediate_source_sync: immediateSync.immediateSourceSync,
        result_summary: buildFollowResultSummary({
          source_name: saved.source.source_name,
          source_kind: saved.source.source_kind,
          organization_or_college: saved.source.organization_or_college,
          source_home_url: saved.source.source_home_url,
          created: saved.created,
          resolution: resolved.resolution,
        }),
      }),
    );
  }

  if (action === "supplement_source_entry") {
    const sourceId = typeof body.source_id === "string" ? body.source_id.trim() : "";
    const entryUrl = typeof body.entry_url === "string" ? body.entry_url.trim() : "";
    const store = await getDiscoveryRuntimeState();

    if (!sourceId || !entryUrl) {
      return NextResponse.json(
        buildPayload(store, {
          error: "请补充最近文章链接或来源入口，再继续同步。",
        }),
        { status: 400 },
      );
    }

    const updated = await supplementFollowedSourceEntry({
      source_id: sourceId,
      entry_url: entryUrl,
    });

    const source = updated.source;
    const immediateSync =
      source && (source.seed_url || source.source_home_url)
        ? await syncImmediatelyAfterFollow({
            store: updated.store,
            source,
          })
        : { nextStore: updated.store, syncReport: null, immediateSourceSync: null };

    return NextResponse.json(
      buildPayload(immediateSync.nextStore, {
        notice: source
          ? "来源入口已补充完成，OpenUni 已经立刻用这个入口尝试同步了一次。"
          : "没有找到对应来源，补充入口失败。",
        sync_report: immediateSync.syncReport,
        immediate_source_sync: immediateSync.immediateSourceSync,
        result_summary: source
          ? buildSupplementResultSummary({
              source_name: source.source_name,
              entry_url: entryUrl,
            })
          : null,
      }),
    );
  }

  if (action === "add_source") {
    const source_name = typeof body.source_name === "string" ? body.source_name.trim() : "";
    const source_kind = typeof body.source_kind === "string" ? body.source_kind.trim() : "";
    const organization_or_college =
      typeof body.organization_or_college === "string" ? body.organization_or_college.trim() : "";
    const source_home_url =
      typeof body.source_home_url === "string" ? body.source_home_url.trim() : "";
    const seed_url = typeof body.seed_url === "string" ? body.seed_url.trim() : "";
    const notes = typeof body.notes === "string" ? body.notes.trim() : "";
    const store = await getDiscoveryRuntimeState();

    if (!source_name || !source_kind || !organization_or_college) {
      return NextResponse.json(
        buildPayload(store, {
          error: "请至少补充来源名称、来源类型和所属组织。",
        }),
        { status: 400 },
      );
    }

    const saved = await saveFollowedSource({
      source_name,
      source_kind,
      organization_or_college,
      source_home_url,
      seed_url: seed_url || undefined,
      notes,
    });
    const immediateSync =
      saved.source.seed_url || saved.source.source_home_url
        ? await syncImmediatelyAfterFollow({
            store: saved.store,
            source: saved.source,
          })
        : { nextStore: saved.store, syncReport: null, immediateSourceSync: null };

    return NextResponse.json(
      buildPayload(immediateSync.nextStore, {
        notice: saved.created
          ? "来源已加入关注列表，OpenUni 已经立刻尝试同步这个来源。"
          : "这个来源已经在关注列表中，我刚刚又帮你检查了一次。",
        sync_report: immediateSync.syncReport,
        immediate_source_sync: immediateSync.immediateSourceSync,
        result_summary: buildFollowResultSummary({
          source_name: saved.source.source_name,
          source_kind: saved.source.source_kind,
          organization_or_college: saved.source.organization_or_college,
          source_home_url: saved.source.source_home_url,
          created: saved.created,
          resolution: {
            source_name: saved.source.source_name,
            source_kind: saved.source.source_kind,
            organization_or_college: saved.source.organization_or_college,
            school: saved.source.school,
            source_home_url: saved.source.source_home_url,
            seed_url: saved.source.seed_url,
            aliases: [],
            normalized_name: "",
            resolution_confidence: 0.8,
            matched_existing: !saved.created,
            matched_source_id: saved.created ? null : saved.source.id,
            matched_source_name: saved.created ? null : saved.source.source_name,
            matched_source_origin: saved.created ? null : saved.source.source_origin,
            found_readable_entry: Boolean(saved.source.source_home_url || saved.source.seed_url),
            needs_user_entry: !saved.source.source_home_url && !saved.source.seed_url,
            recognized_as_public_account: saved.source.source_kind === "微信公众号",
            resolution_steps: [],
            notes: saved.source.notes,
            should_confirm: false,
            candidate_label: saved.source.source_name,
            user_facing_explanation: "来源已按当前信息保存。",
            clarification_question: null,
          },
        }),
      }),
    );
  }

  if (action === "sync") {
    try {
      const store = await getDiscoveryRuntimeState();
      const systemSync = await ensureSystemSourcesSynced(store, true);
      const customSourcesForSync = getCustomSourcesForSync(systemSync.store.custom_sources);
      const customSync = customSourcesForSync.length
        ? await syncFollowedSources(customSourcesForSync)
        : null;
      const syncedCustomSourceIds = new Set(
        customSync?.updated_sources.map((source) => source.id) ?? [],
      );
      const nextStore = customSync
        ? await saveDiscoverySyncResult({
            custom_sources: mergeUpdatedSources(
              systemSync.store.custom_sources,
              customSync.updated_sources,
            ),
            generated_candidates: mergeUpdatedCandidates(
              systemSync.store.generated_candidates,
              customSync.generated_candidates,
              syncedCustomSourceIds,
            ),
            last_synced_at: customSync.synced_at,
          })
        : systemSync.store;

      const syncReport = mergeSyncReports([systemSync.syncResult, customSync]);
      const payload = buildPayload(nextStore, {
        notice:
          syncReport.failed_source_count > 0
            ? "本轮发现同步已完成。部分来源读取失败，但其余官方源和关注来源结果已经更新。"
            : "本轮发现同步完成，系统来源和关注来源都已刷新。",
      });

      return NextResponse.json({
        ...payload,
        result_summary: buildSyncResultSummary(payload.data, syncReport),
        sync_report: syncReport,
      });
    } catch (error) {
      console.error("[discovery] sync failed", error);
      const store = await getDiscoveryRuntimeState();

      return NextResponse.json(
        buildPayload(store, {
          error: "线上同步这次被运行环境中断了，当前先保留上一轮发现结果。",
          notice: "OpenUni 已保留当前发现层；完整多来源同步后续应拆成后台任务。",
        }),
        { status: 200 },
      );
    }
  }

  if (action === "remove_source") {
    const sourceId = typeof body.source_id === "string" ? body.source_id : "";
    const store = await getDiscoveryRuntimeState();
    const target = store.custom_sources.find((source) => source.id === sourceId);
    const nextStore = await removeFollowedSource(sourceId);

    return NextResponse.json(
      buildPayload(nextStore, {
        notice: target ? `已停止关注 ${target.source_name}` : "没有找到对应的关注来源。",
        result_summary: {
          title: "来源已移出关注列表",
          items: [
            target ? `来源名称：${target.source_name}` : "没有找到对应来源。",
            "OpenUni 后续不会再继续同步这个来源。",
          ],
        },
      }),
    );
  }

  if (action === "lower_priority") {
    const sourceId = typeof body.source_id === "string" ? body.source_id : "";
    const store = await getDiscoveryRuntimeState();
    const target = store.custom_sources.find((source) => source.id === sourceId);
    const nextStore = await lowerPriorityFollowedSource(sourceId);

    return NextResponse.json(
      buildPayload(nextStore, {
        notice: target ? `${target.source_name} 已调整为低优先关注` : "没有找到对应来源。",
        result_summary: {
          title: "来源优先级已调整",
          items: [
            target ? `来源名称：${target.source_name}` : "没有找到对应来源。",
            "OpenUni 仍会保留它，但会降低后续同步优先级。",
          ],
        },
      }),
    );
  }

  const store = await getDiscoveryRuntimeState();
  return NextResponse.json(
    buildPayload(store, {
      error: "不支持的 discovery action。",
    }),
    { status: 400 },
  );
}
