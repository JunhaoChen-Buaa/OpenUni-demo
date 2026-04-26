export type SourceWatchStatus = "active" | "low_priority" | "candidate_remove";

export type SourceOrigin = "seeded" | "user_followed";

export type SourceRegistryCategory =
  | "学校综合"
  | "新闻动态"
  | "教学教务"
  | "研究生培养/招生"
  | "学生事务"
  | "团学与活动"
  | "国际交流"
  | "招生"
  | "就业"
  | "学院通知";

export type SourceRegistryGroup =
  | "school_level"
  | "department_level"
  | "admissions_career"
  | "college_level";

export type SourceRegistryReadiness =
  | "direct_readable"
  | "needs_sync_optimization"
  | "entity_only";

export type SourceReadabilityStatus =
  | "connected"
  | "synced_success"
  | "synced_failed"
  | "missing_entry"
  | "name_only"
  | "waiting_entry"
  | "no_new_content"
  | "candidate_extracted";

export type SourceKind =
  | "微信公众号"
  | "部门官网"
  | "通知栏目"
  | "学院官网"
  | "活动发布页"
  | "文章详情页";

export type SourcePageKind = SourceKind;

export type SourceWatchRecord = {
  id: string;
  source_name: string;
  source_kind: SourceKind;
  source_home_url: string;
  seed_url: string | null;
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
  source_type: SourceKind;
  source_url: string;
};

export type DiscoveryCandidateType =
  | "活动"
  | "讲座"
  | "比赛"
  | "招募"
  | "规则更新"
  | "通知"
  | "说明会"
  | "机会"
  | "节点";

export type DiscoveryScreeningStatus =
  | "new"
  | "useful"
  | "promoted_to_signal"
  | "ignored";

export type DiscoveryCandidate = {
  id: string;
  title: string;
  source_id: string;
  source_name: string;
  source_kind: SourceKind;
  published_at: string;
  raw_excerpt: string;
  structured_summary: string;
  candidate_type: DiscoveryCandidateType;
  deadline: string | null;
  target_audience: string;
  preliminary_tags: string[];
  extracted_value_signals: string[];
  confidence: number;
  screening_status: DiscoveryScreeningStatus;
  reason_summary: string;
  source_origin: SourceOrigin;
  linked_signal_href?: string;
  original_url?: string | null;
  read_url?: string | null;
  source_home_url?: string;
  synced_at?: string | null;
  sync_run_id?: string | null;
  source_type: SourceKind;
};

function makeSource(
  input: Omit<
    SourceWatchRecord,
    | "source_type"
    | "source_url"
    | "readability_status"
    | "last_read_url"
    | "last_sync_message"
    | "last_error_message"
    | "last_sync_candidate_count"
    | "last_sync_run_id"
  > &
    Partial<
      Pick<
        SourceWatchRecord,
        | "readability_status"
        | "last_read_url"
        | "last_sync_message"
        | "last_error_message"
        | "last_sync_candidate_count"
        | "last_sync_run_id"
      >
    >,
): SourceWatchRecord {
  const readableUrl = input.seed_url ?? input.source_home_url ?? null;
  const readabilityStatus =
    input.readability_status ?? (readableUrl ? "connected" : "name_only");

  return {
    ...input,
    readability_status: readabilityStatus,
    last_read_url: input.last_read_url ?? readableUrl,
    direct_html_readable: input.direct_html_readable ?? Boolean(readableUrl),
    registry_readiness:
      input.registry_readiness ??
      (readableUrl ? "direct_readable" : "entity_only"),
    content_focus: input.content_focus ?? [],
    last_sync_message:
      input.last_sync_message ??
      (readabilityStatus === "connected"
        ? "已纳入系统来源池，可作为后续同步入口。"
        : "已保存来源实体，仍需补充稳定入口。"),
    last_error_message: input.last_error_message ?? null,
    last_sync_candidate_count: input.last_sync_candidate_count ?? input.last_hit_count ?? 0,
    last_sync_run_id: input.last_sync_run_id ?? null,
    source_type: input.source_kind,
    source_url: input.seed_url ?? input.source_home_url,
  };
}

function makeCandidate(input: Omit<DiscoveryCandidate, "source_type">): DiscoveryCandidate {
  return {
    ...input,
    source_type: input.source_kind,
  };
}

export const buaaSourceWatchlist: SourceWatchRecord[] = [
  makeSource({
    id: "buaa-home",
    source_name: "北京航空航天大学官网",
    source_kind: "通知栏目",
    source_home_url: "https://www.buaa.edu.cn/",
    seed_url: "https://www.buaa.edu.cn/",
    school: "北京航空航天大学",
    organization_or_college: "学校主页",
    status: "active",
    last_checked_at: "2026-04-25T09:00:00+08:00",
    last_hit_count: 0,
    total_hit_count: 0,
    invalid_streak: 0,
    priority_score: 70,
    notes: "学校级综合入口。",
    source_origin: "seeded",
    is_user_added: false,
    registry_category: "学校综合",
    registry_group: "school_level",
    direct_html_readable: true,
    registry_readiness: "direct_readable",
    content_focus: ["学校公告", "综合资讯", "近期动态"],
  }),
  makeSource({
    id: "buaa-news-center",
    source_name: "北航新闻网",
    source_kind: "通知栏目",
    source_home_url: "https://news.buaa.edu.cn/",
    seed_url: "https://news.buaa.edu.cn/",
    school: "北京航空航天大学",
    organization_or_college: "新闻网",
    status: "active",
    last_checked_at: "2026-04-25T09:00:00+08:00",
    last_hit_count: 0,
    total_hit_count: 0,
    invalid_streak: 0,
    priority_score: 95,
    notes: "高优先级校园新闻源。",
    source_origin: "seeded",
    is_user_added: false,
    registry_category: "新闻动态",
    registry_group: "school_level",
    direct_html_readable: true,
    registry_readiness: "direct_readable",
    content_focus: ["校园新闻", "重要动态", "活动发布"],
  }),
  makeSource({
    id: "buaa-xcb",
    source_name: "党委宣传部",
    source_kind: "部门官网",
    source_home_url: "https://xcb.buaa.edu.cn/",
    seed_url: "https://xcb.buaa.edu.cn/gzdt.htm",
    school: "北京航空航天大学",
    organization_or_college: "党委宣传部",
    status: "active",
    last_checked_at: "2026-04-25T09:00:00+08:00",
    last_hit_count: 0,
    total_hit_count: 0,
    invalid_streak: 0,
    priority_score: 62,
    notes: "宣传工作动态补充源。",
    source_origin: "seeded",
    is_user_added: false,
    registry_category: "新闻动态",
    registry_group: "department_level",
    direct_html_readable: true,
    registry_readiness: "needs_sync_optimization",
    content_focus: ["宣传动态", "部门工作", "专题活动"],
  }),
  makeSource({
    id: "buaa-nic",
    source_name: "网络信息中心",
    source_kind: "部门官网",
    source_home_url: "https://nic.buaa.edu.cn/",
    seed_url: "https://nic.buaa.edu.cn/xwtz/tzgg.htm",
    school: "北京航空航天大学",
    organization_or_college: "网络信息中心",
    status: "active",
    last_checked_at: "2026-04-25T09:00:00+08:00",
    last_hit_count: 0,
    total_hit_count: 0,
    invalid_streak: 0,
    priority_score: 60,
    notes: "IT 和系统通知来源。",
    source_origin: "seeded",
    is_user_added: false,
    registry_category: "学校综合",
    registry_group: "department_level",
    direct_html_readable: true,
    registry_readiness: "direct_readable",
    content_focus: ["通知公告", "信息服务", "网络维护"],
  }),
  makeSource({
    id: "buaa-academic-affairs",
    source_name: "教务部学生专区通知",
    source_kind: "通知栏目",
    source_home_url: "https://jiaowu.buaa.edu.cn/",
    seed_url: "https://jiaowu.buaa.edu.cn/tzgg/xszq.htm",
    school: "北京航空航天大学",
    organization_or_college: "教务部",
    status: "active",
    last_checked_at: "2026-04-25T09:00:00+08:00",
    last_hit_count: 0,
    total_hit_count: 0,
    invalid_streak: 0,
    priority_score: 93,
    notes: "高优先级教务通知源。",
    source_origin: "seeded",
    is_user_added: false,
    registry_category: "教学教务",
    registry_group: "department_level",
    direct_html_readable: true,
    registry_readiness: "direct_readable",
    content_focus: ["选课考试", "教学安排", "学生通知"],
  }),
  makeSource({
    id: "buaa-graduate-school",
    source_name: "研究生院新闻动态",
    source_kind: "部门官网",
    source_home_url: "https://graduate.buaa.edu.cn/",
    seed_url: "https://graduate.buaa.edu.cn/syxw/xwdt.htm",
    school: "北京航空航天大学",
    organization_or_college: "研究生院",
    status: "active",
    last_checked_at: "2026-04-25T09:00:00+08:00",
    last_hit_count: 0,
    total_hit_count: 0,
    invalid_streak: 0,
    priority_score: 91,
    notes: "研究生培养和通知源。",
    source_origin: "seeded",
    is_user_added: false,
    registry_category: "研究生培养/招生",
    registry_group: "department_level",
    direct_html_readable: true,
    registry_readiness: "direct_readable",
    content_focus: ["研究生培养", "研究生通知", "研究生动态"],
  }),
  makeSource({
    id: "buaa-student-office",
    source_name: "学生工作部（学生处）",
    source_kind: "部门官网",
    source_home_url: "https://xsc.buaa.edu.cn/",
    seed_url: "https://xsc.buaa.edu.cn/",
    school: "北京航空航天大学",
    organization_or_college: "学生工作部（学生处）",
    status: "active",
    last_checked_at: "2026-04-25T09:00:00+08:00",
    last_hit_count: 0,
    total_hit_count: 0,
    invalid_streak: 0,
    priority_score: 94,
    notes: "高优先级学生事务来源。",
    source_origin: "seeded",
    is_user_added: false,
    registry_category: "学生事务",
    registry_group: "department_level",
    direct_html_readable: true,
    registry_readiness: "needs_sync_optimization",
    content_focus: ["学生事务", "奖助评优", "通知公告"],
  }),
  makeSource({
    id: "buaa-youth-committee",
    source_name: "共青团北航委员会",
    source_kind: "活动发布页",
    source_home_url: "https://youth.buaa.edu.cn/",
    seed_url: "https://youth.buaa.edu.cn/",
    school: "北京航空航天大学",
    organization_or_college: "校团委",
    status: "active",
    last_checked_at: "2026-04-25T09:00:00+08:00",
    last_hit_count: 0,
    total_hit_count: 0,
    invalid_streak: 0,
    priority_score: 95,
    notes: "高优先级团学活动来源。",
    source_origin: "seeded",
    is_user_added: false,
    registry_category: "团学与活动",
    registry_group: "department_level",
    direct_html_readable: true,
    registry_readiness: "direct_readable",
    content_focus: ["团学活动", "志愿招募", "讲座比赛"],
  }),
  makeSource({
    id: "buaa-global",
    source_name: "国际合作部新闻通知",
    source_kind: "通知栏目",
    source_home_url: "https://global.buaa.edu.cn/",
    seed_url: "https://global.buaa.edu.cn/xwtz.htm",
    school: "北京航空航天大学",
    organization_or_college: "国际合作部",
    status: "active",
    last_checked_at: "2026-04-25T09:00:00+08:00",
    last_hit_count: 0,
    total_hit_count: 0,
    invalid_streak: 0,
    priority_score: 72,
    notes: "国际交流来源。",
    source_origin: "seeded",
    is_user_added: false,
    registry_category: "国际交流",
    registry_group: "department_level",
    direct_html_readable: true,
    registry_readiness: "direct_readable",
    content_focus: ["国际交流", "交换项目", "国际通知"],
  }),
  makeSource({
    id: "buaa-student-center",
    source_name: "学生中心办事流程",
    source_kind: "通知栏目",
    source_home_url: "https://xszx.buaa.edu.cn/",
    seed_url: "https://xszx.buaa.edu.cn/bslc1.htm",
    school: "北京航空航天大学",
    organization_or_college: "学生中心",
    status: "active",
    last_checked_at: "2026-04-25T09:00:00+08:00",
    last_hit_count: 0,
    total_hit_count: 0,
    invalid_streak: 0,
    priority_score: 70,
    notes: "学生服务来源。",
    source_origin: "seeded",
    is_user_added: false,
    registry_category: "学生事务",
    registry_group: "department_level",
    direct_html_readable: true,
    registry_readiness: "needs_sync_optimization",
    content_focus: ["学生服务", "办事流程", "窗口信息"],
  }),
  makeSource({
    id: "buaa-undergrad-admission",
    source_name: "本科招生网通知公告",
    source_kind: "通知栏目",
    source_home_url: "https://zs.buaa.edu.cn/",
    seed_url: "https://zs.buaa.edu.cn/tzgg.htm",
    school: "北京航空航天大学",
    organization_or_college: "本科招生网",
    status: "active",
    last_checked_at: "2026-04-25T09:00:00+08:00",
    last_hit_count: 0,
    total_hit_count: 0,
    invalid_streak: 0,
    priority_score: 74,
    notes: "本科招生来源。",
    source_origin: "seeded",
    is_user_added: false,
    registry_category: "招生",
    registry_group: "admissions_career",
    direct_html_readable: true,
    registry_readiness: "direct_readable",
    content_focus: ["本科招生", "招生通知", "开放日"],
  }),
  makeSource({
    id: "buaa-grad-admission",
    source_name: "研究生招生网",
    source_kind: "通知栏目",
    source_home_url: "https://yzb.buaa.edu.cn/",
    seed_url: "https://yzb.buaa.edu.cn/xlss/zsjz.htm",
    school: "北京航空航天大学",
    organization_or_college: "研究生招生网",
    status: "active",
    last_checked_at: "2026-04-25T09:00:00+08:00",
    last_hit_count: 0,
    total_hit_count: 0,
    invalid_streak: 0,
    priority_score: 92,
    notes: "研究生招生来源。",
    source_origin: "seeded",
    is_user_added: false,
    registry_category: "研究生培养/招生",
    registry_group: "admissions_career",
    direct_html_readable: true,
    registry_readiness: "direct_readable",
    content_focus: ["研究生招生", "招生简章", "招生通知"],
  }),
  makeSource({
    id: "buaa-career",
    source_name: "就业信息网",
    source_kind: "通知栏目",
    source_home_url: "https://career.buaa.edu.cn/",
    seed_url: "https://career.buaa.edu.cn/",
    school: "北京航空航天大学",
    organization_or_college: "就业信息网",
    status: "active",
    last_checked_at: "2026-04-25T09:00:00+08:00",
    last_hit_count: 0,
    total_hit_count: 0,
    invalid_streak: 0,
    priority_score: 90,
    notes: "就业来源，后续可继续优化同步策略。",
    source_origin: "seeded",
    is_user_added: false,
    registry_category: "就业",
    registry_group: "admissions_career",
    direct_html_readable: true,
    registry_readiness: "needs_sync_optimization",
    content_focus: ["实习招聘", "宣讲会", "就业通知"],
  }),
  makeSource({
    id: "buaa-scse",
    source_name: "计算机学院官网",
    source_kind: "学院官网",
    source_home_url: "https://scse.buaa.edu.cn/",
    seed_url: "https://scse.buaa.edu.cn/",
    school: "北京航空航天大学",
    organization_or_college: "计算机学院",
    status: "active",
    last_checked_at: "2026-04-25T09:00:00+08:00",
    last_hit_count: 0,
    total_hit_count: 0,
    invalid_streak: 0,
    priority_score: 66,
    notes: "学院级选择性来源。",
    source_origin: "seeded",
    is_user_added: false,
    registry_category: "学院通知",
    registry_group: "college_level",
    direct_html_readable: true,
    registry_readiness: "needs_sync_optimization",
    content_focus: ["学院通知", "讲座活动", "竞赛项目"],
  }),
  makeSource({
    id: "buaa-iai",
    source_name: "人工智能学院官网",
    source_kind: "学院官网",
    source_home_url: "https://iai.buaa.edu.cn/",
    seed_url: "https://iai.buaa.edu.cn/",
    school: "北京航空航天大学",
    organization_or_college: "人工智能学院",
    status: "active",
    last_checked_at: "2026-04-25T09:00:00+08:00",
    last_hit_count: 0,
    total_hit_count: 0,
    invalid_streak: 0,
    priority_score: 66,
    notes: "学院级选择性来源。",
    source_origin: "seeded",
    is_user_added: false,
    registry_category: "学院通知",
    registry_group: "college_level",
    direct_html_readable: true,
    registry_readiness: "needs_sync_optimization",
    content_focus: ["学院通知", "科研讲座", "活动招募"],
  }),
  makeSource({
    id: "buaa-rse-notice",
    source_name: "可靠性与系统工程学院通知",
    source_kind: "学院官网",
    source_home_url: "https://rse.buaa.edu.cn/",
    seed_url: "https://rse.buaa.edu.cn/",
    school: "北京航空航天大学",
    organization_or_college: "可靠性与系统工程学院",
    status: "active",
    last_checked_at: "2026-04-25T09:00:00+08:00",
    last_hit_count: 0,
    total_hit_count: 0,
    invalid_streak: 0,
    priority_score: 76,
    notes: "当前主场景关联学院来源。",
    source_origin: "seeded",
    is_user_added: false,
    registry_category: "学院通知",
    registry_group: "college_level",
    direct_html_readable: true,
    registry_readiness: "direct_readable",
    content_focus: ["学院通知", "讲座活动", "赛事机会"],
  }),
  makeSource({
    id: "buaa-sports-center",
    source_name: "北航体育部赛事发布",
    source_kind: "部门官网",
    source_home_url: "https://sports.buaa.edu.cn/",
    seed_url: "https://sports.buaa.edu.cn/",
    school: "北京航空航天大学",
    organization_or_college: "体育部",
    status: "active",
    last_checked_at: "2026-04-25T09:00:00+08:00",
    last_hit_count: 0,
    total_hit_count: 0,
    invalid_streak: 0,
    priority_score: 88,
    notes: "当前主场景赛事来源。",
    source_origin: "seeded",
    is_user_added: false,
    registry_category: "团学与活动",
    registry_group: "department_level",
    direct_html_readable: true,
    registry_readiness: "direct_readable",
    content_focus: ["比赛", "报名", "体育活动"],
  }),
  makeSource({
    id: "buaa-innovation-academy",
    source_name: "北航创新创业学院项目栏",
    source_kind: "通知栏目",
    source_home_url: "https://cy.buaa.edu.cn/",
    seed_url: "https://cy.buaa.edu.cn/",
    school: "北京航空航天大学",
    organization_or_college: "创新创业学院",
    status: "active",
    last_checked_at: "2026-04-25T09:00:00+08:00",
    last_hit_count: 0,
    total_hit_count: 0,
    invalid_streak: 0,
    priority_score: 82,
    notes: "项目和创新活动来源。",
    source_origin: "seeded",
    is_user_added: false,
    registry_category: "团学与活动",
    registry_group: "department_level",
    direct_html_readable: true,
    registry_readiness: "needs_sync_optimization",
    content_focus: ["项目", "创新创业", "训练营"],
  }),
  makeSource({
    id: "buaa-fld-notice",
    source_name: "外国语学院竞赛通知",
    source_kind: "学院官网",
    source_home_url: "https://fld.buaa.edu.cn/",
    seed_url: "https://fld.buaa.edu.cn/",
    school: "北京航空航天大学",
    organization_or_college: "外国语学院",
    status: "low_priority",
    last_checked_at: "2026-04-25T09:00:00+08:00",
    last_hit_count: 0,
    total_hit_count: 0,
    invalid_streak: 1,
    priority_score: 58,
    notes: "选择性学院竞赛来源。",
    source_origin: "seeded",
    is_user_added: false,
    registry_category: "学院通知",
    registry_group: "college_level",
    direct_html_readable: true,
    registry_readiness: "needs_sync_optimization",
    content_focus: ["竞赛通知", "讲座活动", "学院通知"],
  }),
];

export const buaaDiscoveryCandidates: DiscoveryCandidate[] = [
  makeCandidate({
    id: "discover-swim-20260423",
    title: "校级女生游泳比赛开始报名",
    source_id: "buaa-sports-center",
    source_name: "北航体育部赛事发布",
    source_kind: "部门官网",
    published_at: "2026-04-23T16:20:00+08:00",
    raw_excerpt: "体育部发布校级女生游泳比赛通知，报名窗口已开启。",
    structured_summary: "体育部已发布近期校级女生游泳比赛通知，报名时间明确，具备阶段评价和参与价值。",
    candidate_type: "比赛",
    deadline: "2026-04-28 18:00",
    target_audience: "本科生女生",
    preliminary_tags: ["比赛", "体育评价", "报名"],
    extracted_value_signals: ["规则相关", "近期报名", "可进入信号页"],
    confidence: 0.94,
    screening_status: "promoted_to_signal",
    reason_summary: "它同时满足近期、可行动和规则影响明显三个条件。",
    source_origin: "seeded",
    linked_signal_href: "/signal/swim",
  }),
  makeCandidate({
    id: "discover-innovation-20260422",
    title: "创新创业学院项目训练营开放报名",
    source_id: "buaa-innovation-academy",
    source_name: "北航创新创业学院项目栏",
    source_kind: "通知栏目",
    published_at: "2026-04-22T11:10:00+08:00",
    raw_excerpt: "创新创业学院发布本学期项目训练营报名通知。",
    structured_summary: "训练营更适合作为继续观察的机会池内容，适合后续进入更强判断。",
    candidate_type: "机会",
    deadline: "2026-05-05 23:59",
    target_audience: "有项目兴趣的本科生",
    preliminary_tags: ["项目", "训练营", "机会"],
    extracted_value_signals: ["成长机会", "项目经历", "可继续观察"],
    confidence: 0.88,
    screening_status: "useful",
    reason_summary: "时间窗口明确，但个体适配仍需进一步判断。",
    source_origin: "seeded",
  }),
  makeCandidate({
    id: "discover-student-affair-20260421",
    title: "学生工作部发布本学期评优评奖安排",
    source_id: "buaa-student-office",
    source_name: "学生工作部（学生处）",
    source_kind: "部门官网",
    published_at: "2026-04-21T15:00:00+08:00",
    raw_excerpt: "学生工作部更新了评优评奖安排与申报时间窗口。",
    structured_summary: "这类内容规则相关度高，适合被纳入持续观察与提醒层。",
    candidate_type: "通知",
    deadline: "2026-04-25 19:00",
    target_audience: "本科生",
    preliminary_tags: ["评优评奖", "学生事务", "时间窗口"],
    extracted_value_signals: ["规则影响", "时间窗口", "提醒价值"],
    confidence: 0.86,
    screening_status: "useful",
    reason_summary: "规则影响清晰，但是否进入个人信号还要看用户阶段。",
    source_origin: "seeded",
  }),
  makeCandidate({
    id: "discover-grad-20260420",
    title: "研究生院更新近期培养与学籍通知",
    source_id: "buaa-graduate-school",
    source_name: "研究生院新闻动态",
    source_kind: "部门官网",
    published_at: "2026-04-20T10:00:00+08:00",
    raw_excerpt: "研究生院近期更新培养安排与重要节点说明。",
    structured_summary: "这是研究生相关的重要学校动态，更偏宏观发现层，不直接进入当前本科主信号。",
    candidate_type: "节点",
    deadline: null,
    target_audience: "研究生及有推免规划的学生",
    preliminary_tags: ["研究生", "培养安排", "节点"],
    extracted_value_signals: ["阶段规划", "制度相关"],
    confidence: 0.78,
    screening_status: "new",
    reason_summary: "有信息价值，但当前个性化强度还不够高。",
    source_origin: "seeded",
  }),
  makeCandidate({
    id: "discover-fld-20260419",
    title: "外国语学院发布英语竞赛报名说明",
    source_id: "buaa-fld-notice",
    source_name: "外国语学院竞赛通知",
    source_kind: "学院官网",
    published_at: "2026-04-19T09:30:00+08:00",
    raw_excerpt: "外国语学院更新了英语竞赛报名说明与时间安排。",
    structured_summary: "竞赛类内容与综测和阶段评价存在潜在关联，适合继续观察。",
    candidate_type: "比赛",
    deadline: "2026-04-27 17:00",
    target_audience: "对竞赛感兴趣的本科生",
    preliminary_tags: ["竞赛", "报名", "学院通知"],
    extracted_value_signals: ["继续观察", "规则相关"],
    confidence: 0.8,
    screening_status: "useful",
    reason_summary: "具有行动窗口，但不一定对所有用户都优先。",
    source_origin: "seeded",
  }),
  makeCandidate({
    id: "discover-news-20260418",
    title: "北航新闻网发布近期校园重点动态汇总",
    source_id: "buaa-news-center",
    source_name: "北航新闻网",
    source_kind: "通知栏目",
    published_at: "2026-04-18T18:00:00+08:00",
    raw_excerpt: "新闻网汇总近期学校重点新闻、活动与开放信息。",
    structured_summary: "适合作为“北航最近发生了什么”的学校级发现内容。",
    candidate_type: "通知",
    deadline: null,
    target_audience: "全体学生",
    preliminary_tags: ["校园新闻", "学校动态", "总览"],
    extracted_value_signals: ["学校层动态", "宏观发现"],
    confidence: 0.76,
    screening_status: "new",
    reason_summary: "更适合放在宏观发现层，而不是直接进入个性化信号层。",
    source_origin: "seeded",
  }),
  makeCandidate({
    id: "discover-rse-20260417",
    title: "可靠性学院发布学术讲座报名入口",
    source_id: "buaa-rse-notice",
    source_name: "可靠性与系统工程学院通知",
    source_kind: "学院官网",
    published_at: "2026-04-17T14:00:00+08:00",
    raw_excerpt: "学院近期开放一场面向本科生的学术讲座报名。",
    structured_summary: "学院级讲座是可行动但不一定高优先的发现项，适合保留在继续观察层。",
    candidate_type: "讲座",
    deadline: "2026-04-24 12:00",
    target_audience: "可靠性学院本科生",
    preliminary_tags: ["讲座", "学院活动", "报名"],
    extracted_value_signals: ["讲座活动", "可继续观察"],
    confidence: 0.74,
    screening_status: "useful",
    reason_summary: "和学院相关度高，但还不足以压过主信号。",
    source_origin: "seeded",
  }),
  makeCandidate({
    id: "discover-sample-home-20260416",
    title: "官网近期综合资讯样本卡片",
    source_id: "buaa-home",
    source_name: "北京航空航天大学官网",
    source_kind: "通知栏目",
    published_at: "2026-04-16T10:00:00+08:00",
    raw_excerpt: "这是一条系统默认发现样本，用于在无更多同步结果时保持页面稳定。",
    structured_summary: "作为系统样本保留，用于展示学校综合来源在发现层中的位置。",
    candidate_type: "通知",
    deadline: null,
    target_audience: "全体学生",
    preliminary_tags: ["系统样本", "学校综合"],
    extracted_value_signals: ["发现样本"],
    confidence: 0.45,
    screening_status: "ignored",
    reason_summary: "它主要用于系统默认展示，不作为高优先同步发现内容。",
    source_origin: "seeded",
  }),
];
