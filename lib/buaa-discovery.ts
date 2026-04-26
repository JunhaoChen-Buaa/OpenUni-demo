import {
  buaaDiscoveryCandidates,
  buaaSourceWatchlist,
  type DiscoveryCandidate,
  type DiscoveryCandidateType,
  type DiscoveryScreeningStatus,
  type SourceReadabilityStatus,
  type SourceOrigin,
  type SourceWatchRecord,
  type SourceWatchStatus,
} from "@/data/buaa-discovery-kb";

export type DiscoveryCandidateItem = DiscoveryCandidate & {
  screening_label: string;
  screening_description: string;
  should_surface_to_signal: boolean;
  source_origin_label: string;
  content_origin_label: string;
  is_sample_content: boolean;
  is_real_synced_content: boolean;
  source_organization_or_college: string;
  source_is_user_added: boolean;
  source_home_url: string;
  source_read_url: string | null;
  source_original_url: string | null;
  source_last_synced_at: string | null;
  source_readability_status: SourceReadabilityStatus;
  source_last_sync_message: string;
  source_last_sync_run_id: string | null;
};

export type DiscoverySourceItem = SourceWatchRecord & {
  effectiveness_label: string;
  effectiveness_summary: string;
  useful_hit_count: number;
  promoted_hit_count: number;
  ignored_hit_count: number;
  candidate_count: number;
  source_origin_label: string;
  recent_update_summary: string;
  sync_status_label: string;
  sync_status_summary: string;
  has_readable_entry: boolean;
  needs_entry_link: boolean;
};

export type DiscoverySyncOutcomeOptions = {
  readability_status?: SourceReadabilityStatus;
  read_url?: string | null;
  message?: string;
  error_message?: string | null;
  sync_run_id?: string | null;
};

export type DiscoveryPageData = {
  last_synced_at: string;
  round_summary_line: string;
  watchlist_summary_line: string;
  source_pool_summary: {
    tracked_count: number;
    candidate_count: number;
    promoted_count: number;
    high_value_hit_sources: number;
    low_efficiency_sources: number;
    user_followed_sources: number;
  };
  source_pool_status: {
    highlighted_sources: string[];
    low_priority_sources: string[];
    candidate_remove_sources: string[];
  };
  recent_happenings: DiscoveryCandidateItem[];
  watch_candidates: DiscoveryCandidateItem[];
  promoted_candidates: DiscoveryCandidateItem[];
  candidates: DiscoveryCandidateItem[];
  sources: DiscoverySourceItem[];
};

export type DiscoveryBuildOptions = {
  lastSyncedAtOverride?: string;
  runtimeSources?: SourceWatchRecord[];
  runtimeCandidates?: DiscoveryCandidate[];
};

export type SourceSyncMetrics = {
  candidate_count: number;
  useful_hit_count: number;
  promoted_hit_count: number;
  ignored_hit_count: number;
};

export function getBuiltInSourcesForSync(limit = 8) {
  return [...buaaSourceWatchlist]
    .filter(
      (source) =>
        source.source_origin === "seeded" &&
        source.status === "active" &&
        source.direct_html_readable &&
        Boolean(source.seed_url || source.source_home_url),
    )
    .sort((a, b) => b.priority_score - a.priority_score)
    .slice(0, limit);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function screeningRank(status: DiscoveryScreeningStatus) {
  if (status === "promoted_to_signal") {
    return 0;
  }

  if (status === "useful") {
    return 1;
  }

  if (status === "new") {
    return 2;
  }

  return 3;
}

function statusRank(status: SourceWatchStatus) {
  if (status === "active") {
    return 0;
  }

  if (status === "low_priority") {
    return 1;
  }

  return 2;
}

function sourceOriginLabel(origin: SourceOrigin) {
  return origin === "user_followed" ? "用户关注来源" : "系统默认来源";
}

function buildReadabilityMeta(status: SourceReadabilityStatus) {
  switch (status) {
    case "connected":
      return {
        label: "已连接",
        summary: "已拿到可读取入口，后续同步会继续检查这个来源",
      };
    case "synced_success":
      return {
        label: "最近同步成功",
        summary: "本轮读取成功，但暂未形成高价值候选",
      };
    case "candidate_extracted":
      return {
        label: "已提取到候选",
        summary: "本轮读取成功，并提取到了发现候选",
      };
    case "no_new_content":
      return {
        label: "无新内容",
        summary: "本轮已读取来源，但没有看到新的候选内容",
      };
    case "synced_failed":
      return {
        label: "最近同步失败",
        summary: "本轮读取失败，请检查来源链接是否仍可访问",
      };
    case "missing_entry":
      return {
        label: "缺少可读取入口",
        summary: "系统知道这个来源，但还缺少稳定的可读取入口",
      };
    case "waiting_entry":
      return {
        label: "等待补充链接",
        summary: "补充最近文章链接后，OpenUni 会更稳定地持续关注它",
      };
    case "name_only":
      return {
        label: "仅保存来源名称",
        summary: "目前只记住了来源名称，还没有稳定可读入口",
      };
    default:
      return {
        label: "最近同步成功",
        summary: "OpenUni 正在持续跟进这个来源",
      };
  }
}

function candidateTypeRank(candidateType: DiscoveryCandidateType) {
  if (candidateType === "规则更新") {
    return 0;
  }

  if (candidateType === "比赛" || candidateType === "机会") {
    return 1;
  }

  if (candidateType === "通知" || candidateType === "说明会" || candidateType === "活动") {
    return 2;
  }

  return 3;
}

function buildCandidateSearchText(candidate: DiscoveryCandidateItem) {
  return [
    candidate.title,
    candidate.structured_summary,
    candidate.raw_excerpt,
    candidate.reason_summary,
    candidate.candidate_type,
    ...(candidate.preliminary_tags ?? []),
    ...(candidate.extracted_value_signals ?? []),
  ]
    .filter(Boolean)
    .join(" ");
}

function isCampusLifeCandidate(candidate: DiscoveryCandidateItem) {
  const merged = buildCandidateSearchText(candidate);
  return /活动|观影|电影|娱乐|文化|文艺|展演|演出|音乐|晚会|志愿|社团|学生会|团委|团学|青年|嘉年华|文化节|节庆|节日|讲座|分享会|沙龙|工作坊|游园|联谊|体验|招新/.test(
    merged,
  );
}

function isStrongDecisionCandidate(candidate: DiscoveryCandidateItem) {
  const merged = buildCandidateSearchText(candidate);
  return /综测|评优|奖学金|推免|保研|科研|项目|训练营|报名截止|申请|规则|细则|办法|窗口|就业|招生/.test(
    merged,
  );
}

function recentHappeningScore(candidate: DiscoveryCandidateItem) {
  let score = 0;

  if (candidate.is_real_synced_content) score += 90;
  if (candidate.source_origin === "user_followed") score += 8;
  if (isCampusLifeCandidate(candidate)) score += 36;
  if (candidate.candidate_type === "活动" || candidate.candidate_type === "讲座") score += 14;
  if (candidate.screening_status === "new") score += 8;
  else if (candidate.screening_status === "useful" && isCampusLifeCandidate(candidate)) score += 6;
  if (candidate.is_sample_content) score -= 30;
  if (isStrongDecisionCandidate(candidate)) score -= 10;

  const publishedAt = new Date(candidate.published_at).getTime();
  if (!Number.isNaN(publishedAt)) {
    const ageDays = Math.max(0, (Date.now() - publishedAt) / 86400000);
    if (ageDays <= 7) score += 28;
    else if (ageDays <= 30) score += 18;
    else if (ageDays <= 90) score += 8;
    else score -= 12;
  }

  return score;
}

function sortRecentHappenings(a: DiscoveryCandidateItem, b: DiscoveryCandidateItem) {
  return recentHappeningScore(b) - recentHappeningScore(a) || sortCandidates(a, b);
}

function buildCandidateStatusMeta(status: DiscoveryScreeningStatus) {
  if (status === "promoted_to_signal") {
    return {
      screening_label: "已进入信号流",
      screening_description: "这条发现已经通过初步筛选，被送入更个性化的信号页继续判断。",
      should_surface_to_signal: true,
    };
  }

  if (status === "useful") {
    return {
      screening_label: "值得继续观察",
      screening_description: "这条发现还不一定直接成为主信号，但已经具备一定价值，值得继续跟踪。",
      should_surface_to_signal: false,
    };
  }

  if (status === "new") {
    return {
      screening_label: "新近发现",
      screening_description: "这是刚进入发现层的新内容，OpenUni 还会继续判断它是否值得升级。",
      should_surface_to_signal: false,
    };
  }

  return {
    screening_label: "保留在发现层",
    screening_description: "这条内容更适合作为校园动态背景信息，不进入个性化强推荐。",
    should_surface_to_signal: false,
  };
}

export function buildSourceSyncMetrics(items: DiscoveryCandidate[]): SourceSyncMetrics {
  const promoted = items.filter((item) => item.screening_status === "promoted_to_signal").length;
  const useful = items.filter(
    (item) => item.screening_status === "promoted_to_signal" || item.screening_status === "useful",
  ).length;
  const ignored = items.filter((item) => item.screening_status === "ignored").length;

  return {
    candidate_count: items.length,
    useful_hit_count: useful,
    promoted_hit_count: promoted,
    ignored_hit_count: ignored,
  };
}

export function applySourceSyncOutcome(
  source: SourceWatchRecord,
  metrics: SourceSyncMetrics,
  syncedAt: string,
  options: DiscoverySyncOutcomeOptions = {},
): SourceWatchRecord {
  const noUsefulItems =
    metrics.useful_hit_count === 0 &&
    (metrics.candidate_count === 0 || metrics.ignored_hit_count === metrics.candidate_count);

  const nextInvalidStreak =
    metrics.useful_hit_count > 0
      ? Math.max(source.invalid_streak - Math.min(metrics.useful_hit_count, 2), 0)
      : source.invalid_streak + (noUsefulItems ? 1 : 0);

  const nextPriorityScore = clamp(
    source.priority_score +
      metrics.promoted_hit_count * 10 +
      Math.max(metrics.useful_hit_count - metrics.promoted_hit_count, 0) * 6 -
      metrics.ignored_hit_count * 6 -
      nextInvalidStreak * 2,
    25,
    99,
  );

  const nextStatus: SourceWatchStatus =
    nextInvalidStreak >= 4 ? "candidate_remove" : nextInvalidStreak >= 2 ? "low_priority" : "active";

  return {
    ...source,
    last_checked_at: syncedAt,
    last_hit_count: metrics.candidate_count,
    total_hit_count: source.total_hit_count + metrics.useful_hit_count,
    invalid_streak: nextInvalidStreak,
    priority_score: nextPriorityScore,
    status: nextStatus,
    readability_status:
      options.readability_status ??
      (metrics.candidate_count > 0
        ? metrics.useful_hit_count > 0
          ? "candidate_extracted"
          : "synced_success"
        : "no_new_content"),
    last_read_url: options.read_url ?? source.last_read_url ?? source.seed_url ?? source.source_home_url,
    last_sync_message:
      options.message ??
      (metrics.candidate_count > 0
        ? `本轮提取 ${metrics.candidate_count} 条候选`
        : "本轮已读取来源，但没有看到新的候选内容"),
    last_error_message: options.error_message ?? null,
    last_sync_candidate_count: metrics.candidate_count,
    last_sync_run_id: options.sync_run_id ?? source.last_sync_run_id ?? null,
  };
}

function buildSourceEffectiveness(source: SourceWatchRecord, items: DiscoveryCandidate[]): DiscoverySourceItem {
  const metrics = buildSourceSyncMetrics(items);
  const readability = buildReadabilityMeta(source.readability_status);

  const effectivenessLabel =
    source.status === "active"
      ? metrics.useful_hit_count > 0
        ? "最近命中有效发现"
        : "持续关注中"
      : source.status === "low_priority"
        ? "近期有效命中偏少"
        : "待移出重点关注";

  const effectivenessSummary =
    metrics.candidate_count > 0
      ? `本轮从这个来源读到 ${metrics.candidate_count} 条候选，其中 ${metrics.promoted_hit_count} 条已进入信号流，${Math.max(metrics.useful_hit_count - metrics.promoted_hit_count, 0)} 条保留在继续观察层。`
      : "本轮没有从这个来源识别到新的有效候选，OpenUni 会根据后续表现决定是否继续保持高优先级。";

  const recentUpdateSummary =
    metrics.candidate_count > 0
      ? `最近同步命中 ${metrics.candidate_count} 条候选`
      : "最近同步暂无有效新内容";

  return {
    ...source,
    effectiveness_label: effectivenessLabel,
    effectiveness_summary: effectivenessSummary,
    useful_hit_count: metrics.useful_hit_count,
    promoted_hit_count: metrics.promoted_hit_count,
    ignored_hit_count: metrics.ignored_hit_count,
    candidate_count: metrics.candidate_count,
    source_origin_label: sourceOriginLabel(source.source_origin),
    recent_update_summary: recentUpdateSummary,
    sync_status_label: readability.label,
    sync_status_summary: source.last_sync_message || readability.summary,
    has_readable_entry: Boolean(source.seed_url || source.source_home_url),
    needs_entry_link: !source.seed_url && !source.source_home_url,
  };
}

function sortCandidates(a: DiscoveryCandidateItem, b: DiscoveryCandidateItem) {
  return (
    Number(a.is_sample_content) - Number(b.is_sample_content) ||
    new Date(b.published_at).getTime() - new Date(a.published_at).getTime() ||
    screeningRank(a.screening_status) - screeningRank(b.screening_status) ||
    candidateTypeRank(a.candidate_type) - candidateTypeRank(b.candidate_type)
  );
}

function sortSources(a: DiscoverySourceItem, b: DiscoverySourceItem) {
  return statusRank(a.status) - statusRank(b.status) || b.priority_score - a.priority_score;
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

function uniqueById(items: DiscoveryCandidateItem[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) {
      return false;
    }

    seen.add(item.id);
    return true;
  });
}

function enrichCandidate(
  candidate: DiscoveryCandidate,
  source?: SourceWatchRecord,
): DiscoveryCandidateItem {
  const meta = buildCandidateStatusMeta(candidate.screening_status);
  const isRealSyncedContent = Boolean(candidate.sync_run_id || candidate.original_url || candidate.read_url);
  const isSampleContent = !isRealSyncedContent;
  const contentOriginLabel =
    candidate.source_origin === "user_followed" && isRealSyncedContent
      ? "用户关注来源同步内容"
      : candidate.source_origin === "seeded" && isRealSyncedContent
        ? "系统来源同步内容"
        : "示例内容";

  return {
    ...candidate,
    ...meta,
    source_origin_label: sourceOriginLabel(candidate.source_origin),
    content_origin_label: contentOriginLabel,
    is_sample_content: isSampleContent,
    is_real_synced_content: isRealSyncedContent,
    source_organization_or_college: source?.organization_or_college ?? "",
    source_is_user_added: source?.is_user_added ?? candidate.source_origin === "user_followed",
    source_home_url: candidate.source_home_url ?? source?.source_home_url ?? "",
    source_read_url: candidate.read_url ?? source?.last_read_url ?? source?.seed_url ?? source?.source_home_url ?? null,
    source_original_url:
      candidate.original_url ?? candidate.read_url ?? source?.last_read_url ?? source?.seed_url ?? source?.source_home_url ?? null,
    source_last_synced_at: candidate.synced_at ?? source?.last_checked_at ?? null,
    source_readability_status: source?.readability_status ?? "connected",
    source_last_sync_message:
      source?.last_sync_message ?? "OpenUni 已读取这个来源，并将内容归并到发现层",
    source_last_sync_run_id: candidate.sync_run_id ?? source?.last_sync_run_id ?? null,
  };
}

function getMergedSources(runtimeSources: SourceWatchRecord[] = []) {
  const merged = [...buaaSourceWatchlist];
  const existingIds = new Set(merged.map((item) => item.id));

  runtimeSources.forEach((source) => {
    if (existingIds.has(source.id)) {
      const index = merged.findIndex((item) => item.id === source.id);
      merged[index] = source;
      return;
    }

    merged.push(source);
  });

  return merged;
}

function getMergedCandidates(runtimeCandidates: DiscoveryCandidate[] = []) {
  return dedupeCandidates([...buaaDiscoveryCandidates, ...runtimeCandidates]);
}

export function buildDiscoveryPageData(options: DiscoveryBuildOptions = {}): DiscoveryPageData {
  const sources = getMergedSources(options.runtimeSources);
  const candidates = getMergedCandidates(options.runtimeCandidates);
  const sourceMap = new Map(sources.map((source) => [source.id, source] as const));

  const lastSyncedAt =
    options.lastSyncedAtOverride ??
    sources.reduce((latest, source) => {
      return new Date(source.last_checked_at).getTime() > new Date(latest).getTime()
        ? source.last_checked_at
        : latest;
    }, sources[0]?.last_checked_at ?? new Date().toISOString());

  const candidateItems = dedupeCandidates(candidates)
    .map((candidate) => enrichCandidate(candidate, sourceMap.get(candidate.source_id)))
    .sort(sortCandidates);
  const sourceItems = sources
    .map((source) =>
      buildSourceEffectiveness(
        source,
        candidates.filter((candidate) => candidate.source_id === source.id),
      ),
    )
    .sort(sortSources);

  const promotedCandidates = uniqueById(
    candidateItems.filter((candidate) => candidate.should_surface_to_signal),
  );
  const promotedIds = new Set(promotedCandidates.map((candidate) => candidate.id));

  const watchCandidates = uniqueById(
    candidateItems.filter(
      (candidate) =>
        candidate.screening_status === "useful" &&
        !promotedIds.has(candidate.id) &&
        (!isCampusLifeCandidate(candidate) || isStrongDecisionCandidate(candidate)),
    ),
  );
  const watchIds = new Set(watchCandidates.map((candidate) => candidate.id));

  const recentHappenings = uniqueById(
    candidateItems
      .filter(
        (candidate) =>
          !promotedIds.has(candidate.id) &&
          !watchIds.has(candidate.id) &&
          candidate.screening_status !== "promoted_to_signal",
      )
      .sort(sortRecentHappenings)
      .slice(0, 8),
  );
  const highValueHitSources = sourceItems.filter((source) => source.useful_hit_count > 0);
  const lowPrioritySources = sourceItems.filter((source) => source.status === "low_priority");
  const candidateRemoveSources = sourceItems.filter((source) => source.status === "candidate_remove");
  const userFollowedSources = sourceItems.filter((source) => source.source_origin === "user_followed");

  return {
    last_synced_at: lastSyncedAt,
    round_summary_line: `本轮汇总 ${candidateItems.length} 条北航发现候选，其中 ${promotedCandidates.length} 条已进入信号流。`,
    watchlist_summary_line: `OpenUni 当前正在关注 ${sourceItems.length} 个北航来源，其中 ${userFollowedSources.length} 个为用户添加。`,
    source_pool_summary: {
      tracked_count: sourceItems.length,
      candidate_count: candidateItems.length,
      promoted_count: promotedCandidates.length,
      high_value_hit_sources: highValueHitSources.length,
      low_efficiency_sources: lowPrioritySources.length + candidateRemoveSources.length,
      user_followed_sources: userFollowedSources.length,
    },
    source_pool_status: {
      highlighted_sources: highValueHitSources.slice(0, 3).map((source) => source.source_name),
      low_priority_sources: lowPrioritySources.map((source) => source.source_name),
      candidate_remove_sources: candidateRemoveSources.map((source) => source.source_name),
    },
    recent_happenings: recentHappenings,
    watch_candidates: watchCandidates,
    promoted_candidates: promotedCandidates,
    candidates: candidateItems,
    sources: sourceItems,
  };
}

