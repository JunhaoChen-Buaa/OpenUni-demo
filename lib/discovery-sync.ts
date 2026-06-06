import "server-only";

import type {
  DiscoveryCandidate,
  SourceReadabilityStatus,
  SourceWatchRecord,
} from "@/data/buaa-discovery-kb";
import { applySourceSyncOutcome, buildSourceSyncMetrics } from "@/lib/buaa-discovery";
import {
  requestMiniMaxDiscoveryExtraction,
  type DiscoveryExtractionCandidate,
} from "@/lib/deepseek";

const FETCH_TIMEOUT_MS = 9000;
const IS_VERCEL = process.env.VERCEL === "1";
const MAX_READ_TARGETS_PER_SOURCE = IS_VERCEL ? 1 : 3;
const USE_MODEL_DISCOVERY_SYNC = !IS_VERCEL || process.env.OPENUNI_DISCOVERY_MODEL_SYNC === "true";

export type DiscoverySyncResult = {
  synced_at: string;
  updated_sources: SourceWatchRecord[];
  generated_candidates: DiscoveryCandidate[];
  synced_source_count: number;
  useful_source_count: number;
  failed_sources: string[];
  source_reports: DiscoverySyncSourceReport[];
};

export type DiscoverySyncSourceReport = {
  source_id: string;
  source_name: string;
  source_kind: SourceWatchRecord["source_kind"];
  source_origin: SourceWatchRecord["source_origin"];
  source_home_url: string;
  read_url: string | null;
  read_count: number;
  synced_at: string;
  sync_status: SourceReadabilityStatus;
  sync_message: string;
  error_message: string | null;
  candidate_count: number;
  useful_count: number;
  promoted_count: number;
  ignored_count: number;
  standout_title: string | null;
};

type PageSnapshot = {
  title: string | null;
  text: string;
  html: string;
  publishedAt: string | null;
  linkedUrls: string[];
};

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

function dedupeSyncCandidates(candidates: DiscoveryCandidate[]) {
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

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function extractPageTitle(html: string) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match?.[1] ? decodeHtmlEntities(match[1]).replace(/\s+/g, " ").trim() : null;
}

function extractPublishedAt(html: string, text: string) {
  const metaMatch =
    html.match(/property=["']article:published_time["'][^>]*content=["']([^"']+)["']/i) ||
    html.match(/name=["']publishdate["'][^>]*content=["']([^"']+)["']/i) ||
    html.match(/name=["']pubdate["'][^>]*content=["']([^"']+)["']/i) ||
    html.match(/name=["']date["'][^>]*content=["']([^"']+)["']/i);

  const raw = metaMatch?.[1] ?? text.match(/20\d{2}[-/.年]\s?\d{1,2}[-/.月]\s?\d{1,2}/)?.[0] ?? null;
  if (!raw) {
    return null;
  }

  const normalized = raw
    .replace(/年|[/.]/g, "-")
    .replace(/月/g, "-")
    .replace(/日/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const value = new Date(normalized);
  return Number.isNaN(value.getTime()) ? null : value.toISOString();
}

function normalizeHref(baseUrl: string, href: string) {
  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return null;
  }
}

function isArticleLikeUrl(url: string) {
  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname.toLowerCase();

    if (/mp\.weixin\.qq\.com|article|detail|content|notice|news|info|show/i.test(url)) {
      return true;
    }

    if (/\/index(\.\w+)?$|\/?$/.test(pathname)) {
      return false;
    }

    if (/\/(tzgg|xwdt|xwtz|syxw|zsjz|bslc\d*)\.htm$/.test(pathname)) {
      return false;
    }

    if (/\/\d+\/\d+\.htm(l)?$/.test(pathname)) {
      return true;
    }

    if (/\/c\d+a\d+\/page\.htm(l)?$/.test(pathname)) {
      return true;
    }

    if (/\/[^/]+\/\d+\.htm(l)?$/.test(pathname)) {
      return true;
    }

    return /\.htm(l)?$/.test(pathname) && pathname.split("/").length >= 3;
  } catch {
    return /mp\.weixin\.qq\.com|article|detail|content|notice|news|info|show/i.test(url);
  }
}

function extractLinkedUrls(html: string, baseUrl: string) {
  const matches = Array.from(html.matchAll(/href=["']([^"'#]+)["']/gi));
  const urls = matches
    .map((match) => match[1]?.trim())
    .filter(Boolean)
    .filter((href) => !/^(javascript:|mailto:|tel:)/i.test(href as string))
    .map((href) => normalizeHref(baseUrl, href as string))
    .filter((href): href is string => Boolean(href));

  return Array.from(new Set(urls));
}

function extractVisibleText(html: string) {
  return decodeHtmlEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|li|section|article|tr|td|th|h1|h2|h3|h4|h5|h6)>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/[ \t]{2,}/g, " ")
      .trim(),
  );
}

async function fetchPageSnapshot(url: string): Promise<PageSnapshot> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "text/html,application/xhtml+xml",
      },
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch source page: ${response.status}`);
    }

    const html = await response.text();
    const title = extractPageTitle(html);
    const text = extractVisibleText(html);

    if (!text) {
      throw new Error("No visible text extracted from source page.");
    }

    return {
      title,
      text,
      html,
      publishedAt: extractPublishedAt(html, text),
      linkedUrls: extractLinkedUrls(html, url),
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

function isWeChatLikeSource(source: SourceWatchRecord) {
  const merged = `${source.source_name} ${source.source_home_url} ${source.seed_url ?? ""}`;
  return /å¾®ä¿¡å…¬ä¼—å·|微言航语|公众号|mp\.weixin|weixin/i.test(merged);
}

function scoreCandidateFreshness(candidate: DiscoveryCandidate) {
  const merged = `${candidate.title} ${candidate.structured_summary} ${candidate.raw_excerpt}`;
  const now = Date.now();
  const publishedAt = new Date(candidate.published_at).getTime();
  const ageDays = Number.isNaN(publishedAt) ? 365 : Math.max(0, (now - publishedAt) / 86400000);

  let score = 0;
  if (ageDays <= 7) score += 90;
  else if (ageDays <= 30) score += 70;
  else if (ageDays <= 90) score += 40;
  else if (ageDays <= 180) score += 15;
  else score -= 25;

  if (
    /报名|截止|开放|招募|申请|讲座|活动|比赛|说明会|通知|更新|窗口|征集|观影|电影|娱乐|文化|文艺|展演|演出|音乐|晚会|志愿|社团|学生会|团委|团学|青年|沙龙|分享会|工作坊|嘉年华|节|招新/i.test(
      merged,
    )
  ) {
    score += 40;
  }

  if (/总结|回顾|风采|喜报|表彰|纪实|学习体会/i.test(merged)) {
    score -= 30;
  }

  if (candidate.screening_status === "promoted_to_signal") score += 30;
  else if (candidate.screening_status === "useful") score += 15;

  return score;
}

function rankRecentCandidates(candidates: DiscoveryCandidate[]) {
  return [...candidates]
    .sort((a, b) => scoreCandidateFreshness(b) - scoreCandidateFreshness(a))
    .slice(0, 6);
}

function resolveReadTargets(source: SourceWatchRecord, fetchTarget: string, snapshot: PageSnapshot) {
  const articleUrls = snapshot.linkedUrls.filter((url) => isArticleLikeUrl(url) && url !== fetchTarget);
  const uniqueArticleUrls = Array.from(new Set(articleUrls));

  if (isWeChatLikeSource(source)) {
    return uniqueArticleUrls.length > 0 ? uniqueArticleUrls.slice(0, 3) : [fetchTarget];
  }

  if (!isArticleLikeUrl(fetchTarget) && uniqueArticleUrls.length > 0) {
    return uniqueArticleUrls.slice(0, 3);
  }

  return [fetchTarget];
}

function buildSyncMessage(input: {
  candidateCount: number;
  usefulCount: number;
  promotedCount: number;
}) {
  if (input.candidateCount === 0) {
    return "已读取来源入口，但本轮没有识别到新的候选内容";
  }

  if (input.usefulCount > 0) {
    return `已提取 ${input.candidateCount} 条候选，其中 ${input.promotedCount} 条已进入信号流`;
  }

  return `已提取 ${input.candidateCount} 条候选，但暂未形成高价值候选`;
}

function buildReportStatus(metrics: ReturnType<typeof buildSourceSyncMetrics>): SourceReadabilityStatus {
  if (metrics.candidate_count === 0) {
    return "no_new_content";
  }

  if (metrics.useful_hit_count > 0) {
    return "candidate_extracted";
  }

  return "synced_success";
}

function inferCandidateType(title: string, text: string): DiscoveryCandidate["candidate_type"] {
  const merged = `${title} ${text}`;

  if (/规则|细则|办法|更新/i.test(merged)) {
    return "规则更新";
  }
  if (/比赛|竞赛|赛事/i.test(merged)) {
    return "比赛";
  }
  if (/说明会/i.test(merged)) {
    return "说明会";
  }
  if (/讲座|论坛|分享会|沙龙|工作坊/i.test(merged)) {
    return "讲座";
  }
  if (/招募|招聘|报名|招新/i.test(merged)) {
    return "招募";
  }
  if (
    /活动|观影|电影|娱乐|文化|文艺|展演|演出|音乐|晚会|志愿|社团|学生会|团委|团学|青年|嘉年华|文化节|节|游园|联谊|体验|分享/i.test(
      merged,
    )
  ) {
    return "活动";
  }
  if (/机会|项目|训练营/i.test(merged)) {
    return "机会";
  }
  if (/通知|公告/i.test(merged)) {
    return "通知";
  }

  return "节点";
}

function inferScreeningStatus(title: string, text: string): DiscoveryCandidate["screening_status"] {
  const merged = `${title} ${text}`;

  if (/综测|评优|截止|报名开放|低可见|体育评价/.test(merged)) {
    return "promoted_to_signal";
  }

  if (/说明会|训练营|项目|科研|奖学金|竞赛|比赛|保研|推免|申请窗口|报名截止/.test(merged)) {
    return "useful";
  }

  if (
    /活动|讲座|通知|观影|电影|娱乐|文化|文艺|展演|演出|音乐|晚会|志愿|社团|学生会|团委|团学|青年|嘉年华|文化节|节|分享会|沙龙|工作坊|招新/.test(
      merged,
    )
  ) {
    return "new";
  }

  return "ignored";
}

function inferSignals(title: string, text: string) {
  const signals: string[] = [];
  const merged = `${title} ${text}`;

  if (/截止|报名/.test(merged)) {
    signals.push("强时效");
  }
  if (/综测|评优|奖学金/.test(merged)) {
    signals.push("规则关联");
  }
  if (/科研|项目|训练营/.test(merged)) {
    signals.push("成长收益");
  }
  if (/比赛|竞赛/.test(merged)) {
    signals.push("成果补充");
  }
  if (/观影|电影|娱乐|文化|文艺|展演|演出|音乐|晚会|志愿|社团|学生会|团委|团学|青年|嘉年华|文化节|节/.test(merged)) {
    signals.push("校园活力");
  }
  if (/讲座|分享会|沙龙|工作坊/.test(merged)) {
    signals.push("轻参与");
  }

  return signals.slice(0, 4);
}

function resolveLinkedSignalHref(title: string, text: string) {
  const merged = `${title} ${text}`;

  if (/游泳/.test(merged)) {
    return "/signal/swim";
  }

  if (/英语竞赛/.test(merged)) {
    return "/home";
  }

  if (/创新项目|科研训练营|奖学金说明会/.test(merged)) {
    return "/home";
  }

  return undefined;
}

function normalizeCandidateFromModel(
  candidate: DiscoveryExtractionCandidate,
  source: SourceWatchRecord,
  syncedAt: string,
  readUrl: string,
  syncRunId: string,
  index: number,
  snapshot?: PageSnapshot,
): DiscoveryCandidate {
  const mergedText = `${candidate.title} ${candidate.structured_summary} ${candidate.raw_excerpt}`;

  return {
    id: `${source.id}-sync-${syncedAt.replace(/[^0-9]/g, "").slice(0, 12)}-${index + 1}`,
    title: candidate.title,
    source_id: source.id,
    source_name: source.source_name,
    source_kind: source.source_kind,
    source_type: source.source_kind,
    published_at: candidate.published_at ?? snapshot?.publishedAt ?? syncedAt,
    raw_excerpt: candidate.raw_excerpt,
    structured_summary: candidate.structured_summary,
    candidate_type: candidate.candidate_type,
    deadline: candidate.deadline,
    target_audience: candidate.target_audience,
    preliminary_tags: [
      candidate.candidate_type,
      source.organization_or_college,
      source.is_user_added ? "用户关注来源" : "系统默认来源",
    ].filter(Boolean),
    extracted_value_signals:
      candidate.extracted_value_signals.length > 0
        ? candidate.extracted_value_signals
        : inferSignals(candidate.title, mergedText),
    confidence: candidate.confidence,
    screening_status: candidate.screening_status,
    reason_summary: candidate.reason_summary,
    source_origin: "user_followed",
    linked_signal_href: resolveLinkedSignalHref(candidate.title, mergedText),
    original_url: readUrl,
    read_url: readUrl,
    source_home_url: source.source_home_url,
    synced_at: syncedAt,
    sync_run_id: syncRunId,
  };
}

function buildFallbackCandidates(
  source: SourceWatchRecord,
  snapshot: PageSnapshot,
  syncedAt: string,
  readUrl: string,
  syncRunId: string,
): DiscoveryCandidate[] {
  const excerpt = snapshot.text.slice(0, 180);
  const title = snapshot.title || source.source_name;
  const candidateType = inferCandidateType(title, excerpt);
  const screeningStatus = inferScreeningStatus(title, excerpt);

  return [
    {
      id: `${source.id}-fallback-${syncedAt.replace(/[^0-9]/g, "").slice(0, 12)}`,
      title,
      source_id: source.id,
      source_name: source.source_name,
      source_kind: source.source_kind,
      source_type: source.source_kind,
      published_at: snapshot.publishedAt ?? syncedAt,
      raw_excerpt: excerpt,
      structured_summary:
        "OpenUni 已读取这个来源最近的可见内容，并先将其中最像“近期动态”的一条信息放入发现层，后续会继续判断是否值得进入信号流。",
      candidate_type: candidateType,
      deadline: null,
      target_audience: "北航学生",
      preliminary_tags: [candidateType, "用户关注来源"],
      extracted_value_signals: inferSignals(title, excerpt),
      confidence: 0.48,
      screening_status: screeningStatus,
      reason_summary:
        "这是一次保守提取结果，OpenUni 已先记录这个来源最近的公开内容，后续会继续观察它是否能稳定产出高价值候选。",
      source_origin: "user_followed",
      linked_signal_href: resolveLinkedSignalHref(title, excerpt),
      original_url: readUrl,
      read_url: readUrl,
      source_home_url: source.source_home_url,
      synced_at: syncedAt,
      sync_run_id: syncRunId,
    },
  ];
}

async function syncSources(sources: SourceWatchRecord[]): Promise<DiscoverySyncResult> {
  const syncedAt = new Date().toISOString();
  const syncRunId = `sync-${syncedAt.replace(/[^0-9]/g, "").slice(0, 14)}`;
  const updatedSources: SourceWatchRecord[] = [];
  const generatedCandidates: DiscoveryCandidate[] = [];
  const failedSources: string[] = [];
  const sourceReports: DiscoverySyncSourceReport[] = [];

  for (const source of sources) {
    const fetchTarget = source.seed_url ?? source.source_home_url;
    const emptyMetrics = {
      candidate_count: 0,
      useful_hit_count: 0,
      promoted_hit_count: 0,
      ignored_hit_count: 0,
    };

    if (!fetchTarget) {
      const updatedSource = applySourceSyncOutcome(source, emptyMetrics, syncedAt, {
        readability_status: source.readability_status === "name_only" ? "name_only" : "missing_entry",
        read_url: null,
        message: "只保存了来源名称，缺少可读取入口；补充最近文章链接后会更稳定",
        error_message: null,
        sync_run_id: syncRunId,
      });

      updatedSources.push(updatedSource);
      sourceReports.push({
        source_id: source.id,
        source_name: source.source_name,
        source_kind: source.source_kind,
        source_origin: source.source_origin,
        source_home_url: source.source_home_url,
        read_url: null,
        read_count: 0,
        synced_at: syncedAt,
        sync_status: updatedSource.readability_status,
        sync_message: updatedSource.last_sync_message,
        error_message: null,
        candidate_count: 0,
        useful_count: 0,
        promoted_count: 0,
        ignored_count: 0,
        standout_title: null,
      });
      continue;
    }

    try {
      const entrySnapshot = await fetchPageSnapshot(fetchTarget);
      const readTargets = resolveReadTargets(source, fetchTarget, entrySnapshot).slice(
        0,
        MAX_READ_TARGETS_PER_SOURCE,
      );
      const snapshots: Array<{ url: string; snapshot: PageSnapshot }> = [];
      for (const target of readTargets) {
        try {
          snapshots.push({
            url: target,
            snapshot: target === fetchTarget ? entrySnapshot : await fetchPageSnapshot(target),
          });
        } catch {
          continue;
        }
      }

      if (!snapshots.length) {
        throw new Error("No readable article pages resolved from source entry.");
      }

      let candidates: DiscoveryCandidate[] = [];

      for (const [index, current] of snapshots.entries()) {
        if (!USE_MODEL_DISCOVERY_SYNC) {
          candidates.push(
            ...buildFallbackCandidates(source, current.snapshot, syncedAt, current.url, syncRunId),
          );
          continue;
        }

        try {
          const extraction = await requestMiniMaxDiscoveryExtraction({
            source,
            pageTitle: current.snapshot.title,
            pageText: current.snapshot.text,
          });

          candidates.push(
            ...extraction.candidates.map((candidate, candidateIndex) =>
              normalizeCandidateFromModel(
                candidate,
                source,
                syncedAt,
                current.url,
                syncRunId,
                index * 10 + candidateIndex,
                current.snapshot,
              ),
            ),
          );
        } catch {
          candidates.push(
            ...buildFallbackCandidates(source, current.snapshot, syncedAt, current.url, syncRunId),
          );
        }
      }

      candidates = rankRecentCandidates(dedupeSyncCandidates(candidates));

      const metrics = buildSourceSyncMetrics(candidates);
      const reportStatus = buildReportStatus(metrics);
      const wechatNeedsBetterEntry =
        isWeChatLikeSource(source) && readTargets.length === 1 && readTargets[0] === fetchTarget;
      const multiArticleMessage =
        snapshots.length > 1
          ? `本轮已读取 ${snapshots.length} 个最近页面，并生成 ${metrics.candidate_count} 条候选`
          : null;
      const updatedSource = applySourceSyncOutcome(source, metrics, syncedAt, {
        readability_status: reportStatus,
        read_url: readTargets[0] ?? fetchTarget,
        message: wechatNeedsBetterEntry
          ? "已从最近文章线索读取内容；如果希望持续追踪这个公众号，建议补充文章列表入口或更多最近文章链接"
          : multiArticleMessage
            ? multiArticleMessage
          : buildSyncMessage({
              candidateCount: metrics.candidate_count,
              usefulCount: metrics.useful_hit_count,
              promotedCount: metrics.promoted_hit_count,
            }),
        error_message: null,
        sync_run_id: syncRunId,
      });

      updatedSources.push(updatedSource);
      generatedCandidates.push(...candidates);
      sourceReports.push({
        source_id: source.id,
        source_name: source.source_name,
        source_kind: source.source_kind,
        source_origin: source.source_origin,
        source_home_url: source.source_home_url,
        read_url: readTargets[0] ?? fetchTarget,
        read_count: snapshots.length,
        synced_at: syncedAt,
        sync_status: updatedSource.readability_status,
        sync_message: updatedSource.last_sync_message,
        error_message: null,
        candidate_count: metrics.candidate_count,
        useful_count: metrics.useful_hit_count,
        promoted_count: metrics.promoted_hit_count,
        ignored_count: metrics.ignored_hit_count,
        standout_title: candidates[0]?.title ?? null,
      });
    } catch {
      failedSources.push(source.source_name);
      const updatedSource = applySourceSyncOutcome(source, emptyMetrics, syncedAt, {
        readability_status: "synced_failed",
        read_url: fetchTarget,
        message: "本轮读取失败，请检查来源链接是否仍然可访问",
        error_message: "读取失败或页面暂不可访问",
        sync_run_id: syncRunId,
      });

      updatedSources.push(updatedSource);
      sourceReports.push({
        source_id: source.id,
        source_name: source.source_name,
        source_kind: source.source_kind,
        source_origin: source.source_origin,
        source_home_url: source.source_home_url,
        read_url: fetchTarget,
        read_count: 1,
        synced_at: syncedAt,
        sync_status: updatedSource.readability_status,
        sync_message: updatedSource.last_sync_message,
        error_message: updatedSource.last_error_message,
        candidate_count: 0,
        useful_count: 0,
        promoted_count: 0,
        ignored_count: 0,
        standout_title: null,
      });
    }
  }

  return {
    synced_at: syncedAt,
    updated_sources: updatedSources,
    generated_candidates: generatedCandidates,
    synced_source_count: sources.length,
    useful_source_count: updatedSources.filter((source) => source.last_hit_count > 0).length,
    failed_sources: failedSources,
    source_reports: sourceReports,
  };
}

export async function syncFollowedSources(
  sources: SourceWatchRecord[],
): Promise<DiscoverySyncResult> {
  return syncSources(sources);
}

export async function syncSingleSource(
  source: SourceWatchRecord,
): Promise<DiscoverySyncResult> {
  return syncSources([source]);
}

