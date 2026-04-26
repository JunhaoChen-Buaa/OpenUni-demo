export type DemoSource = {
  id: string;
  title: string;
  source_type: string;
  authority_level: "官方" | "补充参考";
  school: string;
  college: string;
  publish_date: string;
  content_excerpt: string;
  tags: string[];
  fact_fields?: DemoFactFields;
};

export type DemoFactFields = {
  sports_module_included?: boolean;
  sports_module_score?: string | null;
  score_rule_known?: boolean;
  deadline?: string | null;
  eligibility?: string | null;
  evidence_excerpt?: string | null;
  known_unknown_flags?: string[];
};

export type DemoSignal = {
  id: string;
  title: string;
  signal_type: "成长收益型" | "关键节点型" | "隐性机会型";
  summary: string;
  why_important: string;
  benefit_type: string;
  visibility_level: "低可见" | "中等可见" | "较高可见";
  time_sensitivity: "强时效" | "中时效" | "弱时效";
  action_suggestion: string;
  featured: boolean;
  status: string;
  home_bucket: "related" | "reward" | "deadline" | "stage";
  home_badge: string;
  home_description: string;
  home_reason: string;
  home_plain_reason: string;
  home_tags: string[];
  detail_tags: string[];
  metrics: Array<{ label: string; value: string }>;
  detail_sections: {
    what_is_it: string;
    why_recommended: string;
    worth_doing: string;
    next_action: string;
  };
  priority_level: "高" | "中" | "低";
  return_expectation: "可见" | "中等" | "长期";
  miss_cost: "偏高" | "中等" | "偏低";
};

export type DemoSignalSourceLink = {
  signal_id: string;
  source_id: string;
  relation_type: "规则依据" | "报名信息" | "经验补充" | "收益解释";
  confidence: number;
};

export type DemoMatchRule = {
  signal_id: string;
  profile_key: "grade" | "focus" | "preference";
  expected_value: string;
  match_reason: string;
  match_score: number;
};

export const demoSources: DemoSource[] = [
  {
    id: "source-college-evaluation-rules",
    title: "学院综测细则",
    source_type: "规则文件",
    authority_level: "官方",
    school: "OpenUni Demo University",
    college: "XX学院",
    publish_date: "2025-09-01",
    content_excerpt: "体育模块纳入综合素质评价，相关赛事表现可作为阶段性评价依据。",
    tags: ["综测", "规则", "体育模块"],
    fact_fields: {
      sports_module_included: true,
      sports_module_score: null,
      score_rule_known: false,
      evidence_excerpt: "体育模块纳入综合素质评价，相关赛事表现可作为阶段性评价依据。",
      known_unknown_flags: ["当前知识库中尚未提取到体育模块具体分值。"],
    },
  },
  {
    id: "source-swim-notice",
    title: "校级赛事通知",
    source_type: "通知",
    authority_level: "官方",
    school: "OpenUni Demo University",
    college: "校级",
    publish_date: "2026-04-18",
    content_excerpt: "女生游泳比赛开放报名，截止时间较近，报名入口已开放。",
    tags: ["比赛", "报名", "体育"],
    fact_fields: {
      deadline: "2026-04-25 18:00",
      eligibility: "面向校内女生学生开放报名，具备基础参赛条件即可报名。",
      evidence_excerpt: "女生游泳比赛开放报名，截止时间较近，报名入口已开放。",
      known_unknown_flags: [],
    },
  },
  {
    id: "source-swim-experience-note",
    title: "公开经验整理",
    source_type: "经验整理",
    authority_level: "补充参考",
    school: "OpenUni Demo University",
    college: "校级",
    publish_date: "2026-04-16",
    content_excerpt: "低年级同学常忽略体育项机会，但这类赛事在阶段评价中具有补齐价值。",
    tags: ["经验", "补充参考", "体育项"],
    fact_fields: {
      evidence_excerpt: "低年级同学常忽略体育项机会，但这类赛事在阶段评价中具有补齐价值。",
      known_unknown_flags: ["经验整理属于补充参考，不替代官方规则与通知。"],
    },
  },
  {
    id: "source-innovation-notice",
    title: "新生创新项目申请通知",
    source_type: "通知",
    authority_level: "官方",
    school: "OpenUni Demo University",
    college: "教务处",
    publish_date: "2026-04-15",
    content_excerpt: "面向低年级开放创新项目申报，适合作为项目经历起点。",
    tags: ["创新项目", "低年级", "申报"],
  },
  {
    id: "source-scholarship-briefing",
    title: "学院奖学金说明会通知",
    source_type: "学院公众号",
    authority_level: "官方",
    school: "OpenUni Demo University",
    college: "XX学院",
    publish_date: "2026-04-20",
    content_excerpt: "说明会将解读评优、奖学金和材料准备要点。",
    tags: ["奖学金", "评优", "说明会"],
  },
  {
    id: "source-english-contest",
    title: "英语竞赛报名通知",
    source_type: "通知",
    authority_level: "官方",
    school: "OpenUni Demo University",
    college: "外语中心",
    publish_date: "2026-04-21",
    content_excerpt: "英语竞赛报名窗口接近截止，适合作为阶段成果补充。",
    tags: ["竞赛", "英语", "截止"],
  },
  {
    id: "source-research-camp",
    title: "科研训练营开放报名",
    source_type: "学院公众号",
    authority_level: "官方",
    school: "OpenUni Demo University",
    college: "科研中心",
    publish_date: "2026-04-19",
    content_excerpt: "适合想提前接触科研训练与项目制协作的学生。",
    tags: ["科研", "训练营", "探索"],
  },
  {
    id: "source-volunteer-rules",
    title: "志愿服务认定细则",
    source_type: "规则文件",
    authority_level: "官方",
    school: "OpenUni Demo University",
    college: "学生处",
    publish_date: "2026-03-12",
    content_excerpt: "志愿服务时长与专项活动认定可纳入阶段评价与评优材料。",
    tags: ["志愿服务", "认定", "评优"],
  },
  {
    id: "source-class-committee-notice",
    title: "班委竞选通知",
    source_type: "通知",
    authority_level: "官方",
    school: "OpenUni Demo University",
    college: "XX学院",
    publish_date: "2026-04-08",
    content_excerpt: "低年级班委竞选开放，适合作为组织能力与责任经历积累。",
    tags: ["班委", "组织经历", "竞选"],
  },
  {
    id: "source-library-peer-note",
    title: "图书馆朋辈助理招募",
    source_type: "通知",
    authority_level: "官方",
    school: "OpenUni Demo University",
    college: "图书馆",
    publish_date: "2026-04-17",
    content_excerpt: "适合作为服务经历和长期稳定履历补充。",
    tags: ["助理", "履历", "服务"],
  },
  {
    id: "source-social-practice",
    title: "暑期社会实践预通知",
    source_type: "通知",
    authority_level: "官方",
    school: "OpenUni Demo University",
    college: "团委",
    publish_date: "2026-04-11",
    content_excerpt: "实践项目需要提前组队和选题，错过前置期会影响后续申报。",
    tags: ["社会实践", "前置准备", "组队"],
  },
  {
    id: "source-career-mentor",
    title: "职业导师计划申请说明",
    source_type: "学院公众号",
    authority_level: "官方",
    school: "OpenUni Demo University",
    college: "就业中心",
    publish_date: "2026-04-09",
    content_excerpt: "适合低年级建立行业认知，但优先级通常低于本学期直接收益项。",
    tags: ["导师计划", "职业探索", "低年级"],
  },
];

export const demoSignals: DemoSignal[] = [
  {
    id: "swim",
    title: "校级女生游泳比赛报名开放",
    signal_type: "隐性机会型",
    summary: "这是一条与你当前阶段强相关、值得优先评估的机会型信号。",
    why_important:
      "它与学院综测规则中的体育模块存在直接关联，同时报名窗口短、可见度低、补偿机会少。",
    benefit_type: "综测体育项 / 综合发展维度补齐",
    visibility_level: "低可见",
    time_sensitivity: "强时效",
    action_suggestion: "先确认比赛时间、报名要求与课程安排，再尽快决定是否报名。",
    featured: true,
    status: "报名中",
    home_bucket: "related",
    home_badge: "高收益机会",
    home_description:
      "依据学院综测规则，体育模块计入综合素质评价；当前报名人数较少，对你属于高收益、低可见、强时效机会。",
    home_reason: "如果你本学期关注综测表现，这条信息值得优先评估。",
    home_plain_reason:
      "这不是普通活动通知，它可能直接影响你本学期的综测体育项，而且报名窗口短、知道的人也不多。",
    home_tags: ["高收益", "低可见", "强时效"],
    detail_tags: ["与你强相关", "报名中", "高收益机会"],
    metrics: [
      { label: "规则关联", value: "明确" },
      { label: "可见度", value: "偏低" },
      { label: "时间窗口", value: "较短" },
    ],
    detail_sections: {
      what_is_it:
        "这是一项校级体育赛事，目前处于报名阶段。根据学院综合素质评价规则，体育模块表现会影响阶段性评价结果，所以它更像一条需要判断是否要抓住的机会，而不是随手划过的信息。",
      why_recommended:
        "它和学院综合素质评价强相关，而且当前参与门槛相对较低。对一个信息连接不那么强、又希望尽快抓住高价值机会的大一学生来说，这类低可见但高回报的信号，应该被优先放进视野。",
      worth_doing:
        "若取得较好名次，可在体育模块中获得明显加分；即使未获前列，也有助于补齐综合发展维度。更重要的是，这类机会可替代性低，如果你直到活动结束后才知道，本学期往往很难再找到同等级的补偿机会。",
      next_action:
        "如果你本学期关注综测表现，这项机会应优先评估。建议先查看报名路径和比赛时间，确认是否能兼顾课程安排；如果可行，就尽快设置提醒并推进报名，避免在犹豫中错过窗口。",
    },
    priority_level: "高",
    return_expectation: "可见",
    miss_cost: "偏高",
  },
  {
    id: "innovation-project",
    title: "新生创新项目申请开放",
    signal_type: "成长收益型",
    summary: "适合低年级尽早建立项目经历的成长型机会。",
    why_important: "它能同时带来项目经历、导师接触和履历起点，对大一阶段的长期积累很有帮助。",
    benefit_type: "项目经历 / 履历积累",
    visibility_level: "中等可见",
    time_sensitivity: "中时效",
    action_suggestion: "先确认申报要求和团队形式，再判断是否作为本学期重点项目。",
    featured: false,
    status: "申请中",
    home_bucket: "stage",
    home_badge: "项目路径",
    home_description: "适合低年级参与，可用于项目经历和履历积累。",
    home_reason: "如果你希望尽早有可讲述的项目经历，这类机会值得提前进入视野。",
    home_plain_reason: "它不是立刻见效的机会，但对低年级的履历起点很重要。",
    home_tags: ["低年级", "履历积累", "项目参与"],
    detail_tags: ["当前阶段推荐", "申请中", "成长收益型"],
    metrics: [
      { label: "成长收益", value: "长期" },
      { label: "执行门槛", value: "中等" },
      { label: "窗口节奏", value: "中等" },
    ],
    detail_sections: {
      what_is_it: "面向低年级开放的创新项目申报，适合作为项目经历起点。",
      why_recommended: "如果你还没有稳定项目经历，这类机会能帮助你更早补齐履历中的实践部分。",
      worth_doing: "对低年级价值较高，但回报偏长期，不一定高于本学期直接影响综测的机会。",
      next_action: "看申报要求和团队需求，确认自己是否能持续投入。",
    },
    priority_level: "中",
    return_expectation: "长期",
    miss_cost: "中等",
  },
  {
    id: "scholarship-briefing",
    title: "学院奖学金申请说明会",
    signal_type: "关键节点型",
    summary: "与评优和奖学金规则强相关，适合提前了解。",
    why_important: "它能帮助你提早理解评优材料和申报逻辑，减少后期准备时的被动。",
    benefit_type: "规则理解 / 评优准备",
    visibility_level: "较高可见",
    time_sensitivity: "中时效",
    action_suggestion: "优先了解规则要点，再决定后续需要补哪些材料。",
    featured: false,
    status: "即将开始",
    home_bucket: "reward",
    home_badge: "规则相关",
    home_description: "与评优和奖学金规则强相关，适合提前了解。",
    home_reason: "如果你关注评优方向，这类规则型节点值得提前掌握。",
    home_plain_reason: "它不一定直接加分，但能帮你更早看清后面该准备什么。",
    home_tags: ["规则相关", "评优", "提前准备"],
    detail_tags: ["与你强相关", "即将开始", "关键节点型"],
    metrics: [
      { label: "规则价值", value: "清晰" },
      { label: "直接收益", value: "中等" },
      { label: "准备价值", value: "较高" },
    ],
    detail_sections: {
      what_is_it: "学院面向学生开的规则说明会，主要帮助你理解奖学金与评优逻辑。",
      why_recommended: "它适合想提前建立规则感知的学生，尤其是对评优方向敏感的低年级。",
      worth_doing: "更适合作为规则补课，不一定高于窗口短且直接收益更明显的机会。",
      next_action: "把要点记下来，回头对照自己的当前积累缺什么。",
    },
    priority_level: "中",
    return_expectation: "中等",
    miss_cost: "中等",
  },
  {
    id: "english-contest",
    title: "英语竞赛报名即将截止",
    signal_type: "关键节点型",
    summary: "窗口较短，适合作为本阶段可选项尽快判断。",
    why_important: "它适合用来补阶段成果，但更看你的当前准备基础。",
    benefit_type: "阶段成果 / 竞赛经历",
    visibility_level: "中等可见",
    time_sensitivity: "强时效",
    action_suggestion: "快速判断自己的准备程度，再决定是否报名，不要拖到窗口关闭后。",
    featured: false,
    status: "即将截止",
    home_bucket: "deadline",
    home_badge: "快截止",
    home_description: "窗口较短，适合作为本阶段可选项尽快判断。",
    home_reason: "如果你已经有一定基础，它会是更偏成果型的补充机会。",
    home_plain_reason: "它的关键不是信息本身，而是截止节点会迫使你现在就做判断。",
    home_tags: ["强时效", "成果补充", "快截止"],
    detail_tags: ["即将截止", "可比较机会", "关键节点型"],
    metrics: [
      { label: "成果属性", value: "较强" },
      { label: "准备要求", value: "较高" },
      { label: "时间窗口", value: "很短" },
    ],
    detail_sections: {
      what_is_it: "面向全校或学院学生开放的竞赛报名节点。",
      why_recommended: "适合已经有一定英语基础或阶段性成果需求的学生。",
      worth_doing: "如果你缺准备时间，它不一定优先于规则关联更直接的机会。",
      next_action: "先快速评估准备度，不合适就不要因为截止焦虑而硬报。",
    },
    priority_level: "中",
    return_expectation: "可见",
    miss_cost: "中等",
  },
  {
    id: "research-bootcamp",
    title: "科研训练营开放报名",
    signal_type: "成长收益型",
    summary: "适合想探索科研或项目路径的学生。",
    why_important: "它更偏路径探索和认知建立，适合尚未明确方向的学生。",
    benefit_type: "科研探索 / 项目路径",
    visibility_level: "中等可见",
    time_sensitivity: "中时效",
    action_suggestion: "如果你在探索科研方向，可以把它作为路径试探而非即时回报项目。",
    featured: false,
    status: "报名中",
    home_bucket: "stage",
    home_badge: "探索路径",
    home_description: "适合想探索科研/项目路径的学生。",
    home_reason: "它更像方向试探机会，而不是短期直接收益项。",
    home_plain_reason: "适合想看清科研路径的人，但优先级通常要看你当前目标是不是探索导向。",
    home_tags: ["科研探索", "中时效", "路径试探"],
    detail_tags: ["当前阶段推荐", "报名中", "成长收益型"],
    metrics: [
      { label: "路径探索", value: "较高" },
      { label: "短期收益", value: "中等" },
      { label: "适配度", value: "看目标" },
    ],
    detail_sections: {
      what_is_it: "面向有科研兴趣学生的训练营或导入项目。",
      why_recommended: "适合还在摸索方向、需要低成本试探的人。",
      worth_doing: "长期价值不错，但若你当前目标更偏综测直接收益，它通常不是第一优先。",
      next_action: "明确自己是想要成果补充还是方向探索，再决定是否报名。",
    },
    priority_level: "中",
    return_expectation: "长期",
    miss_cost: "中等",
  },
  {
    id: "volunteer-certification",
    title: "志愿服务认定补录开放",
    signal_type: "关键节点型",
    summary: "适合补齐评优材料中的服务经历认定。",
    why_important: "它不是高光机会，但容易在材料整理阶段被忽略。",
    benefit_type: "服务经历认定 / 评优材料补齐",
    visibility_level: "低可见",
    time_sensitivity: "中时效",
    action_suggestion: "如果你已有志愿服务经历，尽快完成认定，不要拖到评优节点前再找。",
    featured: false,
    status: "补录中",
    home_bucket: "reward",
    home_badge: "材料补齐",
    home_description: "已有志愿经历的同学适合尽快完成认定，避免后期材料分散。",
    home_reason: "这类节点不显眼，但对后续评优材料完整度有帮助。",
    home_plain_reason: "它不是最耀眼的机会，但属于容易被遗漏的材料型节点。",
    home_tags: ["低可见", "材料补齐", "规则相关"],
    detail_tags: ["低可见", "补录中", "关键节点型"],
    metrics: [
      { label: "补齐价值", value: "较高" },
      { label: "显眼程度", value: "偏低" },
      { label: "执行难度", value: "较低" },
    ],
    detail_sections: {
      what_is_it: "面向已有服务经历学生的认定补录机会。",
      why_recommended: "适合已经有经历但还没转成可用材料的学生。",
      worth_doing: "回报偏辅助，但在材料类节点里很值得快速补上。",
      next_action: "先查自己有没有可认定时长，再决定是否马上处理。",
    },
    priority_level: "中",
    return_expectation: "中等",
    miss_cost: "中等",
  },
  {
    id: "class-committee",
    title: "班委竞选报名开放",
    signal_type: "成长收益型",
    summary: "适合作为组织责任与班级参与经历积累。",
    why_important: "对表达、组织与责任感有帮助，但并非所有学生都值得优先投入。",
    benefit_type: "组织经历 / 责任角色",
    visibility_level: "较高可见",
    time_sensitivity: "中时效",
    action_suggestion: "如果你愿意稳定投入班级事务，可以考虑；否则不必为了头衔强报。",
    featured: false,
    status: "报名中",
    home_bucket: "stage",
    home_badge: "组织经历",
    home_description: "适合作为组织能力和班级参与经历积累。",
    home_reason: "它的价值更偏长期和持续投入，不一定适合每个人当前阶段。",
    home_plain_reason: "这类机会看投入意愿，不是所有人都要优先抓。",
    home_tags: ["组织经历", "长期投入", "中时效"],
    detail_tags: ["报名中", "组织经历", "成长收益型"],
    metrics: [
      { label: "持续投入", value: "较高" },
      { label: "外显价值", value: "中等" },
      { label: "适配度", value: "看意愿" },
    ],
    detail_sections: {
      what_is_it: "班级内的责任角色竞选机会。",
      why_recommended: "适合愿意长期投入班级事务的学生。",
      worth_doing: "不是强时效高回报型机会，更看你是否愿意持续承担事务。",
      next_action: "先想清楚自己是否愿意长期做事，再决定要不要报名。",
    },
    priority_level: "低",
    return_expectation: "长期",
    miss_cost: "偏低",
  },
  {
    id: "library-peer-assistant",
    title: "图书馆朋辈助理招募",
    signal_type: "成长收益型",
    summary: "适合补稳定服务经历和长期履历。",
    why_important: "它更偏履历稳定项，而不是高爆发收益机会。",
    benefit_type: "服务经历 / 长期履历",
    visibility_level: "中等可见",
    time_sensitivity: "弱时效",
    action_suggestion: "如果你想要稳定服务型经历，可以纳入次级优先列表。",
    featured: false,
    status: "招募中",
    home_bucket: "related",
    home_badge: "稳定履历",
    home_description: "适合想补长期稳定履历的学生，节奏相对平缓。",
    home_reason: "它适合作为次级机会，不一定高于强时效直接收益项。",
    home_plain_reason: "偏稳，不偏爆发，更适合作为补充而不是抢优先级。",
    home_tags: ["稳定履历", "弱时效", "服务经历"],
    detail_tags: ["招募中", "履历补充", "成长收益型"],
    metrics: [
      { label: "稳定性", value: "较高" },
      { label: "时效压力", value: "较低" },
      { label: "直接收益", value: "一般" },
    ],
    detail_sections: {
      what_is_it: "偏长期、服务型的校内助理角色。",
      why_recommended: "适合希望补稳定履历的人，但通常不是第一优先。",
      worth_doing: "更像长期积累机会，优先级要看你是否缺少稳定经历。",
      next_action: "如果你当前主线机会不多，可以把它作为补充选项。",
    },
    priority_level: "低",
    return_expectation: "长期",
    miss_cost: "偏低",
  },
  {
    id: "social-practice",
    title: "暑期社会实践预报名开放",
    signal_type: "关键节点型",
    summary: "前置准备早的同学更容易抢到好题目和队伍。",
    why_important: "它不是立即报名截止型机会，但如果前期没进场，后面选择会变窄。",
    benefit_type: "实践经历 / 团队项目",
    visibility_level: "中等可见",
    time_sensitivity: "中时效",
    action_suggestion: "如果你有暑期实践计划，尽早进场看题目和组队。",
    featured: false,
    status: "预报名中",
    home_bucket: "deadline",
    home_badge: "前置节点",
    home_description: "虽然不是最终申报，但前置节点会影响后面可选空间。",
    home_reason: "这类机会容易因“还没正式开始”而被忽略。",
    home_plain_reason: "真正关键的不总是截止日，有些机会在前置节点就决定了后面空间。",
    home_tags: ["前置准备", "实践经历", "中时效"],
    detail_tags: ["预报名中", "前置节点", "关键节点型"],
    metrics: [
      { label: "前置价值", value: "较高" },
      { label: "显性程度", value: "一般" },
      { label: "错过影响", value: "中等" },
    ],
    detail_sections: {
      what_is_it: "暑期社会实践的预报名或前置准备节点。",
      why_recommended: "适合有实践计划的学生提早抢占更优选项。",
      worth_doing: "如果你明确会做暑期实践，它值得尽早看；否则不必强行提前投入。",
      next_action: "先判断你是否有暑期实践意愿，再决定要不要现在开始看。",
    },
    priority_level: "中",
    return_expectation: "中等",
    miss_cost: "中等",
  },
  {
    id: "career-mentor",
    title: "职业导师计划申请说明",
    signal_type: "成长收益型",
    summary: "适合作为低年级职业认知补充，但通常不属于当前最高优先级。",
    why_important: "它对长期方向感有帮助，但不一定立刻改变本学期结果。",
    benefit_type: "职业探索 / 长期规划",
    visibility_level: "中等可见",
    time_sensitivity: "弱时效",
    action_suggestion: "如果你目前最缺方向感，可以了解；否则可放在次级列表。",
    featured: false,
    status: "说明中",
    home_bucket: "stage",
    home_badge: "方向探索",
    home_description: "适合补职业认知，但优先级通常低于本学期直接收益项。",
    home_reason: "长期价值存在，但不一定高于当前阶段的关键收益型信号。",
    home_plain_reason: "它更像长期增益，不一定要和当前强时效机会抢优先级。",
    home_tags: ["方向探索", "弱时效", "长期价值"],
    detail_tags: ["说明中", "方向探索", "成长收益型"],
    metrics: [
      { label: "长期价值", value: "较高" },
      { label: "本学期收益", value: "较低" },
      { label: "时效压力", value: "较低" },
    ],
    detail_sections: {
      what_is_it: "帮助学生建立职业认知的导师计划说明。",
      why_recommended: "适合还不清楚长期方向的学生补认知。",
      worth_doing: "如果你当前目标偏综测或成果，它通常排不到最前面。",
      next_action: "把它放进次级列表，等高时效机会判断后再看。",
    },
    priority_level: "低",
    return_expectation: "长期",
    miss_cost: "偏低",
  },
];

export const demoSignalSourceLinks: DemoSignalSourceLink[] = [
  { signal_id: "swim", source_id: "source-college-evaluation-rules", relation_type: "规则依据", confidence: 0.95 },
  { signal_id: "swim", source_id: "source-swim-notice", relation_type: "报名信息", confidence: 0.97 },
  { signal_id: "swim", source_id: "source-swim-experience-note", relation_type: "经验补充", confidence: 0.74 },
  { signal_id: "innovation-project", source_id: "source-innovation-notice", relation_type: "报名信息", confidence: 0.95 },
  { signal_id: "innovation-project", source_id: "source-swim-experience-note", relation_type: "收益解释", confidence: 0.58 },
  { signal_id: "scholarship-briefing", source_id: "source-scholarship-briefing", relation_type: "报名信息", confidence: 0.96 },
  { signal_id: "scholarship-briefing", source_id: "source-college-evaluation-rules", relation_type: "规则依据", confidence: 0.76 },
  { signal_id: "english-contest", source_id: "source-english-contest", relation_type: "报名信息", confidence: 0.95 },
  { signal_id: "research-bootcamp", source_id: "source-research-camp", relation_type: "报名信息", confidence: 0.94 },
  { signal_id: "volunteer-certification", source_id: "source-volunteer-rules", relation_type: "规则依据", confidence: 0.91 },
  { signal_id: "class-committee", source_id: "source-class-committee-notice", relation_type: "报名信息", confidence: 0.9 },
  { signal_id: "library-peer-assistant", source_id: "source-library-peer-note", relation_type: "报名信息", confidence: 0.9 },
  { signal_id: "social-practice", source_id: "source-social-practice", relation_type: "报名信息", confidence: 0.93 },
  { signal_id: "career-mentor", source_id: "source-career-mentor", relation_type: "报名信息", confidence: 0.88 },
];

export const demoMatchRules: DemoMatchRule[] = [
  {
    signal_id: "swim",
    profile_key: "grade",
    expected_value: "大一",
    match_reason: "大一阶段更适合优先抓低门槛但能补阶段评价维度的机会。",
    match_score: 32,
  },
  {
    signal_id: "swim",
    profile_key: "focus",
    expected_value: "综测 / 评优",
    match_reason: "该信号与学院综测规则中的体育模块直接相关，与你当前关注方向一致。",
    match_score: 34,
  },
  {
    signal_id: "swim",
    profile_key: "preference",
    expected_value: "高收益、值得优先抓",
    match_reason: "它属于高收益、低可见、强时效的机会型信号，适合被优先评估。",
    match_score: 23,
  },
  {
    signal_id: "innovation-project",
    profile_key: "grade",
    expected_value: "大一",
    match_reason: "低年级更适合尽早建立项目经历与团队协作经验。",
    match_score: 20,
  },
  {
    signal_id: "innovation-project",
    profile_key: "focus",
    expected_value: "履历积累",
    match_reason: "创新项目能补足可讲述的项目经历和履历起点。",
    match_score: 32,
  },
  {
    signal_id: "innovation-project",
    profile_key: "focus",
    expected_value: "项目参与",
    match_reason: "它天然对应项目参与路径，适合作为当前阶段实践入口。",
    match_score: 30,
  },
  {
    signal_id: "scholarship-briefing",
    profile_key: "focus",
    expected_value: "综测 / 评优",
    match_reason: "说明会能帮助你更早理解奖学金与评优规则，减少后期准备被动。",
    match_score: 28,
  },
  {
    signal_id: "english-contest",
    profile_key: "preference",
    expected_value: "快截止、别错过",
    match_reason: "英语竞赛属于窗口短的成果型机会，适合快节奏决策。",
    match_score: 28,
  },
  {
    signal_id: "research-bootcamp",
    profile_key: "focus",
    expected_value: "竞赛 / 科研",
    match_reason: "科研训练营适合作为科研或项目路径的前置探索。",
    match_score: 30,
  },
  {
    signal_id: "research-bootcamp",
    profile_key: "focus",
    expected_value: "能力提升",
    match_reason: "如果你当前更看重探索和能力提升，这类训练营适合进入次级优先列表。",
    match_score: 22,
  },
  {
    signal_id: "volunteer-certification",
    profile_key: "focus",
    expected_value: "综测 / 评优",
    match_reason: "志愿服务认定更偏材料补齐，对评优方向有辅助价值。",
    match_score: 18,
  },
  {
    signal_id: "class-committee",
    profile_key: "focus",
    expected_value: "能力提升",
    match_reason: "班委经历更适合希望补组织能力和责任角色的学生。",
    match_score: 18,
  },
  {
    signal_id: "library-peer-assistant",
    profile_key: "focus",
    expected_value: "履历积累",
    match_reason: "长期稳定的助理岗位更适合补服务型履历。",
    match_score: 20,
  },
  {
    signal_id: "social-practice",
    profile_key: "focus",
    expected_value: "项目参与",
    match_reason: "社会实践更偏团队项目和前置协作，适合有项目参与意愿的学生。",
    match_score: 24,
  },
  {
    signal_id: "career-mentor",
    profile_key: "focus",
    expected_value: "能力提升",
    match_reason: "职业导师计划更适合作为长期方向和认知提升补充。",
    match_score: 16,
  },
];
