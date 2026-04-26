# OpenUni 当前产品分析

## 1. 当前产品定位

OpenUni 当前已经可以被清楚地理解为一个 **面向北航学生的 AI 校园关键信号助手**。

它当前主要解决的问题不是“给用户看更多信息”，而是：

- 帮用户持续感知北航最近发生了什么
- 从更宽的校园动态里筛出值得继续判断的内容
- 把这些内容和用户当前阶段、学院规则、行动窗口结合起来
- 帮用户从“看到信息”走到“知道下一步该怎么做”

从当前仓库状态来看，产品定位已经基本清楚：

- formal mode：真实使用模式，优先展示发现层、正式信号、规则依据、提醒和行动
- tutorial/demo mode：以 swim 场景作为稳定教学示例，用来讲清 OpenUni 的完整工作方式

因此，当前产品更像：

- 一个 **方向清晰、链路基本完整的北航单校 MVP**

而不是：

- 一个只有几个页面拼在一起的松散 demo

不过它还没有完全达到“成熟竞赛成品”的状态。当前更准确的判断是：

- **一个有说服力的单校 MVP**
- **强链路已经很强，但前段内容真实性和部分产品表达仍不均匀**

## 2. 当前产品结构

当前已实现的核心结构包括：

- tutorial/demo mode
- formal mode
- onboarding / entry
- discover
- signal
- formal signal detail
- swim tutorial detail
- Ask
- reminders
- stage / profile
- rule import
- source watchlist / source resolution
- built-in BUAA source foundation

### 2.1 Tutorial / Formal 双模式

产品已经明确分成两种使用模式：

- tutorial/demo mode：围绕 swim 教学示例讲解完整链路
- formal mode：围绕北航发现层、正式信号、规则依据和用户关注来源展开

这两个模式目前是分开的，不再混成“demo 内容直接伪装成正式默认内容”。这是当前产品完成度提升里非常重要的一步。

### 2.2 四个主标签页

当前正式结构依然稳定围绕四个标签页展开：

- 发现
- 信号
- 提醒
- 我的阶段

从结构上看，这四页已经不是互相孤立的原型页，而是在围绕同一个产品逻辑协作：

- 发现负责“最近发生了什么”
- 信号负责“哪些值得继续判断”
- 提醒负责“已经决定要盯住什么”
- 我的阶段负责“我是谁、我现在看重什么、我的规则依据是什么”

### 2.3 Discovery 相关结构

`/discover` 当前已经形成较清楚的四层结构：

- A：北航最近发生了什么
- B：哪些内容值得继续观察
- C：哪些已经进入信号流
- D：来源池状态

同时它还承接了：

- 添加关注来源
- 来源解析 / 候选确认 / 补入口
- 立即单来源同步
- 同步结果反馈
- 来源 trace / 来源状态 / 原文入口

### 2.4 Signal 相关结构

信号相关现在有两条线：

- tutorial swim signal path
- formal signal path

tutorial 路径以 swim 场景为核心，体验最完整；formal 路径则已经能吃到 discovery promoted items，不再只是一页静态 fallback 信号。

### 2.5 Rule import / Stage / Ask / Reminder

当前产品已经把“用户画像、规则依据、判断支持、后续动作”连成一条完整链：

- `/stage`：画像、学院规则导入、规则事实查看
- `/signal/...`：信号解释与继续判断
- `/signal/.../ask`：基于规则与来源的 AI 决策支持
- `/reminders`：后续提醒与行动延续

从产品结构上看，这些模块已经形成相互依赖关系，而不是各做各的。

## 3. 主用户循环质量

当前主循环是：

`发现 -> 信号 -> 详情 -> Ask -> 提醒 / 行动`

整体判断：

- 这条链已经成立
- 后半段明显强于前半段

### 3.1 发现 -> 信号

这一步现在已经比之前自然很多。Discovery C 区“已进入信号流”的内容已经可以在 formal signal page 中实际出现，而不是停留在概念层。

这一点很关键，因为它真正打通了：

- discovery-side promotion
- formal signal consumption

当前仍偏弱的地方在于：

- discovery promoted items 的数量和质量仍然依赖上游 discovery realism
- 因此这条桥虽然已经“逻辑上通了”，但视觉说服力仍取决于发现层内容是否足够真实、足够新鲜

### 3.2 信号 -> 详情

这一步目前比较顺。

formal signal detail 已经存在，不再让 promoted items 变成死卡；tutorial swim detail 则更完整、更成熟。

用户能基本理解：

- discovery 是“先看到”
- signal 是“已经值得继续判断”
- detail 是“为什么值得判断、我要不要动”

### 3.3 详情 -> Ask

这是当前产品最强的转场之一。

Ask 不再只是“可以问问题”的附属页，而更像一个实际的判断支持层：

- 它吃到 signal context
- 吃到 profile / current stage
- 吃到 imported rule facts
- 在表达上也更像“继续判断”，而不是泛问答

### 3.4 详情 / 信号 -> 提醒 / 行动

这一步已经能成立，但仍然是轻量版本。

当前已有：

- 我准备去做
- 稍后再看
- 设置提醒
- 分享/转发类轻动作

这对竞赛 demo 已经足够，但它更像“有后续动作 continuity”，而不是完整行动系统。

### 3.5 总结

主循环当前的真实状态是：

- discovery -> signal：已经打通，但前段内容质量仍拖后腿
- signal -> detail -> Ask：是产品当前最成熟、最有说服力的链路
- reminder / action：足够 demo-ready，但还不是 fully productized action system

## 4. Discovery 页分析

### 4.1 A 区是否够广

当前 A 区已经明显比之前更像“校园动态感知层”。

它不再只偏：

- 规则
- 申请
- 强信号型通知

最近的逻辑已经允许更广的内容进入 A 区，例如：

- 活动
- 讲座
- 比赛
- 团学活动
- 校园文化类动态
- 轻报名/招募类活动

这说明方向是对的。

但从当前产品状态看，A 区虽然“结构上允许更广”，**内容结果上还没有完全达到足够活、足够丰富、足够像真实校园最近动态** 的程度。

问题主要不是页面结构，而是：

- 真实可读来源产出还不够厚
- built-in source breadth 大于 actual execution depth
- fallback/example 仍然需要明显兜底

### 4.2 A/B/C 是否分层清楚

当前 A/B/C 的结构已经清楚很多：

- A：更宽的校园动态感知层
- B：值得继续观察
- C：已进入信号流

而且最近几轮已经做过：

- 去重
- promoted items 进入 signal page
- A 区 broadening

所以从产品结构上看，这三层已经不是混在一起的。

当前更大的问题不在于“结构混淆”，而在于：

- A 区有时还不够“活”
- B/C 的真实 promoted items 还不够厚

### 4.3 real synced vs example/fallback 表达

这块当前比早期清楚很多。

产品已经能区分：

- 用户关注来源同步
- 系统来源同步
- 示例内容 / fallback content

而且“系统样本”这种过于直白、破坏沉浸感的说法，已经被收口为更轻的“示例内容 / 教学示例”。

这一步对 formal mode 的可信度提升很大。

不过当前仍然存在一个现实问题：

- 示例内容虽然表达变轻了，但它的存在本身仍然提醒用户：真实内容供给还不够厚

### 4.4 来源 trace / 来源真实性

Discovery 现在已经不是“生成一堆悬浮卡片”。

它已经能展示：

- 来源名称
- 来源类型
- 原文链接
- 来源入口
- 最近同步
- 系统来源 / 用户关注来源
- 为什么这次没出结果

这让产品从“像摘要卡片流”变成了“像真的在读来源”。

但 current weakness 仍然很清楚：

- trace 和 sync diagnostics 已经有了
- 真正稳定产出 recent content 的来源数量仍不够多

也就是说，**结构可信度已经起来了，结果可信度还需要更多真实内容支撑。**

### 4.5 是否 still noisy / sparse / sample-heavy / internal-state-heavy

当前 discovery 相比早期已经大幅收紧：

- 顶部更轻
- 卡片默认折叠
- 来源池默认更次级
- sample wording 更轻

但它仍然存在一点“internal-state-heavy”的残留感，尤其在这些区域：

- sync result
- source status
- source detail / source card
- add-source immediate sync feedback

这些信息很有价值，但有时仍带着一点“内部状态面板”的味道，而不是完全自然的用户助手表达。

### 4.6 当前 discovery 是否 credible / demo-ready

结论是：

- **结构层面已经 credible**
- **内容真实性层面仍是当前产品最大短板**

如果只看 layout、层次、traceability，它已经能 demo。  
如果从“最近真的发生了什么”的内容说服力看，它还需要继续强化 real recent content yield。

## 5. Signal 页分析

### 5.1 是否像真正的“继续判断层”

当前 formal signal page 已经明显更像“继续判断层”，而不是另一个 discovery 页。

原因在于：

- 它已经吃 discovery promoted items
- 它有四个可切换的判断角度
- 它比 discovery 更聚焦于“值得继续判断的事”

这说明 signal page 的定位已经清楚。

### 5.2 是否与 discovery 拉开了区别

当前差异已经成立：

- discovery：更宽、更早期、更偏感知
- signal：更聚焦、更靠近判断和行动

尤其是在 discovery promoted items 真正进入 signal page 之后，这种差异比之前清楚很多。

### 5.3 promoted discovery content 是否 surfaced correctly

从当前 repo 状态看，这部分已经打通：

- discovery C 区 promoted item
- formal signal page 顶部 `刚进入信号流`
- formal detail continuation

这是一条已经成立的桥。

它现在的主要限制不是“没接上”，而是：

- promoted content pool 还不够厚
- 所以 signal page 仍需要 fallback/sample 辅助撑住页面丰满度

### 5.4 顶部四个 tabs/filters 是否有意义

当前它们已经不是纯 UI 装饰了。

它们已经会实际影响内容排序/筛选：

- 与我强相关
- 高收益机会
- 即将截止
- 当前阶段推荐

这一步已经比之前提升很多。

当前残留问题在于：

- 当真实 promoted content 不够多时，tab 的差异感仍会受到内容池厚度限制

因此这是一个“机制已打通、效果还依赖上游”的状态。

### 5.5 sample/example content 是否 still too visible

formal signal page 当前已经比之前干净很多，尤其在文案上已经不那么像“正式样本页”。

但只要 real promoted items 不够厚，fallback/example content 就还是会以某种形式留在页面里。  
因此目前它的问题不是“表达太粗糙”，而是“真实信号供给还不够强”。

### 5.6 当前 signal page 是否 demo-ready

是的，已经可以 demo。

而且它是当前产品里比较成熟的一段，只是：

- 它的说服力仍然依赖 discovery 上游提供更多真实 promoted items

## 6. Detail / Ask / Reminder 分析

### 6.1 detail page 是否像 judgment page

当前 detail page 尤其是 swim detail，已经更像判断页而不是报告页。

它会解释：

- 为什么值得继续判断
- 这件事跟我有什么关系
- 它基于哪些来源和规则
- 我现在应该采取什么动作

formal detail 页也已经在沿着这个方向靠拢。

### 6.2 Ask 是否 productized

Ask 当前是产品里最强的 AI 原生能力之一。

它不像 demo 聊天，因为它已经能结合：

- 当前 signal
- 用户阶段
- 学院规则
- 来源上下文

来生成继续判断和行动建议。

这使它更像：

- decision-support layer

而不是：

- generic chatbot

### 6.3 reminder/action 是否 concrete enough

当前 reminder/action 是够具体的，但仍是轻量版本。

已有的动作包括：

- 我准备去做
- 稍后再看
- 设置提醒
- 分享给同学 / 转发到群聊

这已经能构成 demo 所需的“行动 continuity”，但还不是完整任务流。

### 6.4 explanation 是否 grounded in source + rule + stage

这一点是当前产品明显做得不错的地方。

detail 和 Ask 不再只是“我觉得这很重要”，而是已经能体现：

- 这是从哪些来源来的
- 为什么和当前规则有关
- 为什么对你的当前阶段有意义

### 6.5 downstream 是否 complete or still prototype-like

判断：

- 后半段整体已经比较 productized
- 但提醒/行动仍是 lightweight continuation

对比赛来说这是够用的。  
如果继续打磨，不应该现在扩成大 workflow，而应该继续加强“现有动作表达更自然、更可信”。

## 7. Rule import 与规则影响分析

这是当前产品最强的差异化能力之一。

### 7.1 imported rules 是否 visibly influence recommendations

是的，已经能明显影响。

当前产品里，用户已经可以清楚感知：

- 我导入了学院规则
- OpenUni 后续判断在引用这个规则

这种感知是通过多个位置形成的：

- stage 页的规则上传与事实展示
- discovery 页的当前判断依据
- signal / detail 页的规则依据条
- Ask 页的回答 basis

### 7.2 用户能否感到“我的规则改变了产品判断”

可以，至少方向上已经成立。

这也是当前产品和普通资讯聚合器最大区别之一。  
它不是只告诉你“最近有什么”，而是开始告诉你：

- “结合你所在学院/阶段，这件事为什么更值得你看”

### 7.3 规则事实是否 across discovery / signal / Ask 一致使用

整体上是一致的。

它们都在围绕同一个概念：

- 当前判断依据
- 用户导入 / 系统默认
- 关联规则事实

虽然个别页面表达还可以继续收口，但核心逻辑已经统一了。

### 7.4 这是否是当前最强 differentiator

是的，毫无疑问是当前最值得强调的产品差异化之一。

如果对外 demo，规则导入 + rule-aware recommendation + Ask judgment，应该始终是重点展示项。

## 8. Source system 与来源真实性分析

### 8.1 built-in BUAA sources

当前 built-in BUAA source registry 已经扩得相当像一个真实的单校 source base：

- 学校综合源
- 新闻动态源
- 教学教务
- 研究生培养/招生
- 学生事务
- 团学活动
- 国际交流
- 招生与就业
- 学院通知

这让产品的 source foundation 已经远强于早期 demo 状态。

### 8.2 user-followed sources

用户关注来源的产品流程也已经很像一个真正的 assistant 产品：

- 自然语言输入
- 来源解析
- 已知来源匹配
- LLM-assisted source resolution
- 候选确认
- 仅在必要时补充入口
- 成功后立即同步

这套流程方向是很强的。

### 8.3 source resolution 是否 convincing

从产品设计上看，它已经比简单 form 更高级、更 AI-native。

但从现实性上看，仍有两个弱点：

- 模型和已知来源能帮用户“理解来源是什么”
- 但真实能不能持续读到 recent content，仍取决于 readable entry 和 source kind

也就是说：

- source resolution 结构先进
- source realism 仍未完全补齐

### 8.4 source detail / trace / sync status

当前 source trace 和 source detail 已经非常完整了，至少结构上如此：

- 来源是谁
- 来自系统还是用户关注
- 最近同步状态
- 入口是什么
- 原文是什么
- 没出内容时原因是什么

这比很多 demo 产品都扎实。

### 8.5 当前 source system 是否 convincing

判断要分两层：

- 结构层：convincing
- 结果层：仍有短板

最大的现实问题仍然是：

- built-in sources 已经很多，但不是每个都稳定产出 real recent content
- 微信公众号类来源仍然是最难完全 convincing 的部分
- “已成功关注来源” 和 “这个来源后续真的持续产出可用校园动态” 之间仍然有体验落差

因此当前 source system 更像：

- 一个很先进的 demo-grade source architecture

而不是：

- 一个已经非常稳定成熟的 source ingestion product

## 9. Product polish 与一致性分析

### 9.1 wording / concept consistency

最近几轮已经明显改进了：

- formal signal home 的中文文案
- rule indicator 的用词
- signal card 的共享文案
- discovery 页和 formal detail 页的产品表达

当前高频概念已经基本形成了统一说法，例如：

- 当前判断依据
- 用户导入 / 系统默认
- 原文 / 来源 / 来源入口
- 刚进入信号流 / 继续判断
- 教学示例 / 正式使用

这使得产品比之前更像“一套产品语言”。

### 9.2 是否 still 有 demo leftovers

仍然有，但比之前少了很多。

当前最明显的 leftovers 包括：

- 示例内容仍需要存在，说明真实内容供给不够厚
- 某些 source/sync/status 区域仍带一点“内部状态 UI”
- 一些页面仍残留可继续润色的文案或编码毛边

### 9.3 visual hierarchy / competing concepts

产品已经比早期稳定得多：

- discovery 已经不再像三种系统页面拼在一起
- formal/tutorial 不再混淆
- signal page 与 discovery 的差异已更明确

但 discovery 仍然承担了很多概念：

- 校园动态
- 来源关注
- 来源解析
- 同步结果
- 来源池
- 来源 trace

这使它仍然是当前最容易显得“信息偏多”的页面。

### 9.4 最明显的 polish issues

当前最明显的 polish issues 是：

1. discovery 真实性仍不够厚
2. source realism 用词虽已改善，但仍有 internal-state 面板感
3. 某些页面仍有少量文案/编码毛边
4. fallback/example 仍能被用户感知为“系统还不够真”

## 10. Competition-readiness 分析

### 10.1 已经可以自信 demo 的部分

当前最适合 demo 的部分包括：

1. tutorial/demo 与 formal mode 分离
2. discovery -> signal -> detail -> Ask 的主链
3. rule import + rule-aware judgment
4. source-following + source sync + source diagnostics 的产品感
5. Ask 作为 decision-support，而不是聊天

### 10.2 会让评委印象好的地方

如果评委看重“产品完成度 + AI-native differentiator”，当前最能打的会是：

- 规则导入以后，产品判断真的变了
- discovery 到 signal 的层次是清楚的
- Ask 不只是聊天，而是继续判断
- source-following 不是一个死板表单，而是助手式解析与补充

### 10.3 当前最削弱可信度的地方

仍然会削弱 credibility 的地方包括：

- discovery 内容真实性和近期感不稳定
- built-in source breadth 已有，但产出能力还不够均匀
- public-account-like source realism 仍偏弱
- fallback/example 内容仍不可完全隐身
- 个别产品表达仍残留 prototype 感

### 10.4 当前更像什么

结论是：

- 当前已经更像 **一个 convincing 的北航单校 MVP**

而不是：

- 早期 partial prototype

但它仍未完全达到：

- “稳得像成品”

### 10.5 如果继续 polish，最高 ROI 的方向

如果坚持“不扩新模块、继续打磨当前产品”，最高 ROI 的方向会是：

1. 让更多现有 BUAA 官方源稳定产出真实 recent discovery items
2. 继续清理 copy / encoding roughness
3. 强化公众号类来源的 recent-article realism
4. 继续压低 fallback/example 的可见存在感
5. 让 newly-followed source 更容易立刻给出可见结果

## 11. 优先级改进方向

### A. 已经足够好、现在不该大动的部分

- swim tutorial chain
- signal -> detail -> Ask 的后半段主链
- 规则导入基础架构
- tutorial vs formal mode separation
- discovery 的 A/B/C/D 基本结构
- source-following “自然语言 -> 解析 -> 补充入口”的方向
- DeepSeek integration 的总体方式

这些都更适合继续小修文案、小补细节，不适合重做。

### B. 仍然明显粗糙 / 薄弱的部分

- discovery real synced content 的密度和近期感
- built-in BUAA sources 的真实产出厚度
- public-account-like source 的连续 recent article 感
- source detail / source realism 的最终说服力
- formal signal 的真实内容池厚度
- fallback/example 内容仍然过于必要
- 个别页面仍有 copy / encoding 毛边

### C. 下一步最值得做的方向

#### P0 = 重要阻塞型 polish / coherence 问题

1. 继续提升 discovery 的真实近期内容供给  
   核心不是再加来源，而是让现有 built-in official sources 更稳定地产出 real recent candidates。

2. 继续清理中文文案与编码问题  
   这是当前最影响产品完成感和可信度的横向问题，ROI 很高。

3. 再做一轮 source realism 收口  
   尤其围绕：
   - 查看原文 vs 查看来源
   - 来源详情是否真回答“这是谁、最近看到了什么、为什么没出结果”

#### P1 = 很值得做的下一步

1. 增强公众号类来源的 recent-article 行为  
   不需要做 crawler 平台，但要让“补了入口后后续确实更像最近文章源”更可信。

2. 强化 newly-followed source 的即时收获感  
   当前已有 immediate sync，下一步要提高“加完来源后真的立刻看到新增校园动态”的成功率。

3. 继续提高 A 区的校园活力感  
   重点不是加样本，而是让团学、文化、志愿、讲座、活动类真实内容更稳定进入 A 区。

4. 在真实内容更厚后，再轻调 formal signal tabs 差异感  
   当前逻辑已经接通，先不必大改。

#### P2 = 以后再做

1. QQ / PCG ecosystem 表达加强
2. action layer 更完整的 workflow continuity
3. 第二个强场景
4. 更复杂的 source management 能力
5. 更复杂的 ranking / recommendation engine

## 12. 总结

当前 OpenUni 已经具备：

- 清楚的产品定位
- 清晰的 formal/tutorial 分离
- 可以走通的主用户循环
- 强差异化的规则导入能力
- 比较成熟的 signal/detail/Ask 后半段体验

它已经不是“零散原型”，而是一个 **有说服力的北航单校 MVP**。

但当前仍然最影响它从“强原型”走向“更像成品”的问题是：

- discovery realism
- source realism
- real recent content thickness
- 剩余文案/编码 roughness

因此，下一阶段最合理的方向仍然不是扩新功能，而是继续围绕：

- 真实来源产出
- 来源可信度
- 发现层质量
- 文案与产品表达一致性

做收口和增信。
