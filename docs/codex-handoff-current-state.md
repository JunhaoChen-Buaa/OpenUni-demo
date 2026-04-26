# OpenUni Codex Handoff: Current State

## 1. Project overview

OpenUni is currently a **single-school AI campus key-signal assistant MVP** for **BUAA**. It is no longer an early demo; it now behaves like a productized prototype with a usable end-to-end loop, centered on helping students move from **discovery** to **judgment** to **action**.

Current main loop:

`发现 -> 信号 -> 详情 -> Ask -> 提醒 / 行动`

Current product positioning:

- A BUAA-focused AI assistant that watches school/department/college sources, extracts candidate updates, identifies higher-value signals, and helps students judge whether to act.
- The product emphasizes being **small but polished**, not a giant crawler platform.
- It also supports importing a **college rule PDF** so recommendations and explanations can reflect real rule facts instead of only demo assumptions.

Current major pages / tabs:

- `发现` (`/discover`)
- `信号` (`/home`)
- `提醒` (`/reminders`)
- `我的阶段` (`/stage`)
- Plus:
  - `onboarding`
  - `entry`
  - signal detail `/signal/swim`
  - Ask `/signal/swim/ask`
  - action/success `/signal/swim/success`

Tutorial/demo mode vs formal mode:

- The old swim scenario is no longer treated as the default “real current content”.
- The product now has **two modes**:
  - `案例演示 / 新手教程模式`
  - `正式使用模式`
- Mode choice happens through `/entry` after onboarding / first entry.
- Tutorial mode keeps the **swim scenario** as the strongest guided demo loop.
- Formal mode prefers **discovery-layer content, followed sources, built-in BUAA sources, and rule-influenced real usage behavior**.

---

## 2. Current implemented product structure

What currently exists:

- **4-tab structure**
  - `发现 / 信号 / 提醒 / 我的阶段`
- **Discovery layer**
  - BUAA discovery page with A/B/C/D structure
  - source watchlist
  - sync/update flow
  - source diagnostics
  - source trace / source detail concepts
- **Signal page**
  - curated signal feed
  - current-basis indicator
  - formal vs tutorial mode distinction
- **Signal detail page**
  - richer basis explanation
  - merged-source explanation
  - rule-related basis visibility
  - action buttons
- **Ask page**
  - real server-side DeepSeek calls
  - rule + signal + profile aware judgment
  - action continuation
- **Reminders page**
  - reminder-like action follow-up surfaces
  - lightweight “I’m going to do this / later / share” states
- **Stage/profile page**
  - profile/stage explanation
  - imported rule module
  - current imported rule status and fact detail
- **Tutorial/demo mode**
  - swim scenario kept as guided demo case
- **Formal usage mode**
  - BUAA discovery-driven formal experience
- **College-rule PDF import**
  - upload
  - parse
  - structured fact extraction
  - persistence
  - reuse without re-upload
- **Followed source watchlist**
  - built-in system sources
  - user-followed sources
  - saved locally
- **Source resolution flow**
  - natural-language input
  - parser
  - known-source matching
  - server-side LLM-assisted resolution
  - lightweight confirmation / supplement flow
- **Built-in BUAA source registry**
  - expanded first-batch official/public source pool
  - categorized
  - prioritized
  - direct-readable vs entity-only distinction

---

## 3. Strongest completed parts

These areas are currently the strongest / most demo-ready:

- **Main swim scenario as tutorial/demo**
  - stable, legible, useful for showing the strongest product loop
- **Signal -> detail -> Ask loop**
  - this is the most mature product path
- **Rule import + rule basis visibility**
  - rule PDF import, extraction, persistence, and reuse exist
  - rule basis is visible across multiple pages
- **Ask as a real decision-support layer**
  - not just a generic chatbot
  - uses signal/profile/rule context
- **Formal vs tutorial mode separation**
  - the swim scenario is no longer embedded as default real content
- **Discovery structure**
  - A/B/C/D structure is now established
  - recent cleanup rounds made the discovery page calmer and more summary-first
- **Source-following basic flow**
  - user can follow a source in natural language
  - source entity is saved
  - source participates in later sync

---

## 4. Current weak / unfinished / rough areas

These are still the roughest parts:

- **Discovery realism**
  - although structurally improved, discovery can still feel less real/timely than the judgment loop
  - some cards may still feel more like processed candidates than strongly recent campus happenings
- **Recent-content quality**
  - “北航最近发生了什么” still needs stronger recency and action relevance
- **Public-account-like source behavior**
  - sources like `微言航语` are better handled than before, but still not yet fully convincing as “recent article sources”
  - the MVP still depends on a readable entry being provided or inferred
- **Source trace semantics**
  - there were prior rounds fixing `查看原文` vs `查看来源`; this should be treated as an area that still deserves verification when continuing work
- **System sample vs real synced content**
  - distinction has been improved, but the experience can still be strengthened so the user never confuses fallback/sample cards with truly synced content
- **QQ / PCG ecosystem expression**
  - lightweight social/distribution actions exist, but the ecosystem feel is still weaker than the core loop
- **Some text / encoding roughness**
  - there are visible mojibake / garbled Chinese strings in parts of the repo and UI source files
  - build passes, but copy quality still needs cleanup in later polish work
- **Action layer**
  - better than before, but still not a fully convincing “行动层” yet if competition polish is the goal

---

## 5. Recent important implementation history

This is the practical history of how the current state was reached.

### 5.1 Core loop and single-school MVP foundation

- The project was expanded from a signal demo into a **BUAA single-school MVP**
- Main product loop became:
  - `发现 -> 信号 -> 详情 -> Ask -> 提醒`

### 5.2 Rule PDF import and rule knowledge layer

- Added college rule PDF upload on `/stage`
- Added server-side extraction
- Added local persistence for:
  - file metadata
  - structured facts
  - active rule basis
- Rule facts are now reused later without re-upload

### 5.3 Rule extraction quality improvement

- Strengthened Chinese PDF extraction
- Improved section/table/scoring extraction
- Added more useful rule schema
- Added evidence grounding
- Rule title / college name / weight structure / sports scoring logic became significantly stronger

### 5.4 Discovery layer introduction and restructuring

- Added `发现` as the first tab
- Added initial BUAA discovery watchlist / source pool
- Separated:
  - broader discovery
  - worth watching
  - promoted to signal
  - source pool state

### 5.5 Source-following evolution

- Initial source-following was too link-centered
- Refactored toward **source-centered following**
- Replaced heavy structured form with **natural-language source-following input**
- Added lightweight follow-up instead of large admin-like forms

### 5.6 Discovery trust / trace / sync diagnostics

- Added:
  - source trace fields
  - sync diagnostics
  - source readability/sync status
  - lightweight “补充来源入口 / 最近文章链接” flow
- Discovery cards became more source-grounded

### 5.7 Source resolution / active source finding

- Added:
  - parser
  - known-source matching
  - server-side LLM-assisted source resolution
  - candidate confirmation
- Goal became:
  - “OpenUni first tries to resolve the source for the user”

### 5.8 Tutorial/demo mode separation

- Swim scenario moved out of default formal mode
- Added `/entry`
- Added formal mode vs tutorial mode distinction

### 5.9 Rule visibility / action / source merge polish

- Rule basis made more visible on discovery / signal / detail / Ask
- Action layer strengthened with lightweight action states
- Multi-source merge expression became more explicit

### 5.10 DeepSeek integration cleanup

- Confirmed env-driven model use
- Updated integration to cleanly support:
  - `DEEPSEEK_MODEL=deepseek-v4-pro`
- Selective reasoning/thinking behavior was added for:
  - Ask judgment
  - source resolution
  - rule extraction

### 5.11 Built-in BUAA source registry expansion

- Added richer first-batch official/public BUAA system source registry
- Added categorization / priority / readability metadata

### 5.12 Discovery duplication cleanup

- Added practical candidate deduplication
- Dedup now happens at:
  - sync save / store layer
  - discovery aggregation layer
- Also reduced repeated rendering across A/B/C sections

---

## 6. Key files to inspect first

### Product pages

- [D:\OpenUin\app\discover\page.tsx](D:\OpenUin\app\discover\page.tsx)
  - Main discovery UI, source-follow flow, sync feedback, source/detail interactions.
- [D:\OpenUin\app\home\page.tsx](D:\OpenUin\app\home\page.tsx)
  - Signal page and formal-mode signal presentation.
- [D:\OpenUin\app\signal\swim\page.tsx](D:\OpenUin\app\signal\swim\page.tsx)
  - Detail-page logic, merged-source explanation, action layer.
- [D:\OpenUin\app\signal\swim\ask\page.tsx](D:\OpenUin\app\signal\swim\ask\page.tsx)
  - Ask UI and post-judgment action bridge.
- [D:\OpenUin\app\reminders\page.tsx](D:\OpenUin\app\reminders\page.tsx)
  - Reminder/action continuation surfaces.
- [D:\OpenUin\app\stage\page.tsx](D:\OpenUin\app\stage\page.tsx)
  - Profile/stage page and rule import UI.
- [D:\OpenUin\app\entry\page.tsx](D:\OpenUin\app\entry\page.tsx)
  - Tutorial vs formal mode choice.

### Discovery logic

- [D:\OpenUin\lib\buaa-discovery.ts](D:\OpenUin\lib\buaa-discovery.ts)
  - Discovery page data assembly, candidate enrichment, source effectiveness, deduplication.
- [D:\OpenUin\lib\discovery-sync.ts](D:\OpenUin\lib\discovery-sync.ts)
  - Source sync flow, content extraction, candidate generation.
- [D:\OpenUin\lib\discovery-source-parser.ts](D:\OpenUin\lib\discovery-source-parser.ts)
  - Natural-language source parsing, known-source matching, source-resolution helpers.
- [D:\OpenUin\app\api\discovery\route.ts](D:\OpenUin\app\api\discovery\route.ts)
  - Discovery API, follow/sync/remove/lower-priority/supplement flow.

### Source/store/sync persistence

- [D:\OpenUin\lib\discovery-store.ts](D:\OpenUin\lib\discovery-store.ts)
  - Local runtime persistence for sources and generated candidates.
- [D:\OpenUin\data\runtime\discovery\store.json](D:\OpenUin\data\runtime\discovery\store.json)
  - Runtime discovery state, useful for debugging current local source/candidate conditions.

### Model integration

- [D:\OpenUin\lib\deepseek.ts](D:\OpenUin\lib\deepseek.ts)
  - All important DeepSeek calls, env reading, request construction, selective reasoning use.
- [D:\OpenUin\app\api\ask\route.ts](D:\OpenUin\app\api\ask\route.ts)
  - Ask route using model-based decision support.

### Rule extraction

- [D:\OpenUin\lib\college-rule-extractor.ts](D:\OpenUin\lib\college-rule-extractor.ts)
  - PDF extraction pipeline, model-assisted fact extraction.
- [D:\OpenUin\lib\college-rule-store.ts](D:\OpenUin\lib\college-rule-store.ts)
  - Rule persistence.
- [D:\OpenUin\app\api\rule\route.ts](D:\OpenUin\app\api\rule\route.ts)
  - Rule API.
- [D:\OpenUin\lib\college-rule-types.ts](D:\OpenUin\lib\college-rule-types.ts)
  - Rule schema, quick facts, basis labeling.

### Shared components / mode state

- [D:\OpenUin\components\active-rule-indicator.tsx](D:\OpenUin\components\active-rule-indicator.tsx)
  - Rule-basis display across pages.
- [D:\OpenUin\hooks\use-product-mode.ts](D:\OpenUin\hooks\use-product-mode.ts)
  - Tutorial/formal mode state.
- [D:\OpenUin\lib\storage.ts](D:\OpenUin\lib\storage.ts)
  - Local storage helpers for profile/mode/action states.

### Data / registry files

- [D:\OpenUin\data\buaa-discovery-kb.ts](D:\OpenUin\data\buaa-discovery-kb.ts)
  - Built-in BUAA source registry and seeded discovery candidates.
- [D:\OpenUin\lib\mock-data.ts](D:\OpenUin\lib\mock-data.ts)
  - Shared page data composition used by the app, including `getDiscoveryPageData`.

---

## 7. Current known issues / bugs / product problems

These are the most important currently known issues grounded in current repo/product state:

- **Discovery content can still feel too generic / not timely enough**
  - especially in “北航最近发生了什么”
- **Public-account-like source tracking is still only partially convincing**
  - e.g. `微言航语` is better handled than before but still depends on entry supplementation and realistic sync limits
- **Some discovery content may still feel less obviously tied to truly recent article-level content**
  - article/source trace has improved, but realism can still be strengthened
- **System sample vs real synced content distinction likely still needs continued polish**
  - separation exists conceptually, but should be re-verified in UI after future changes
- **`查看原文` vs `查看来源` semantics were historically mixed**
  - several rounds improved this, but any future discovery changes should verify they stay separate
- **Chinese text / encoding quality is inconsistent**
  - some files contain mojibake-like strings in source code/output
  - build is okay, but copy polish is not complete
- **QQ / PCG ecosystem expression is still weaker than the core loop**
  - lightweight sharing exists, but not yet a strong ecosystem feeling
- **Action layer is improved but still not fully “complete product” level**
  - adequate for demo, but still could be polished further

Note on duplicate cards:

- A dedicated deduplication pass has already landed in the discovery layer.
- If duplicate cards are seen again, first inspect:
  - `lib/discovery-store.ts`
  - `lib/buaa-discovery.ts`
  - current contents of `data/runtime/discovery/store.json`

---

## 8. Current model / API integration status

Current env usage:

- `DEEPSEEK_API_KEY`
- `DEEPSEEK_BASE_URL`
- `DEEPSEEK_MODEL`

Important current model:

- `DEEPSEEK_MODEL=deepseek-v4-pro`

Current DeepSeek usage:

- **Ask**
  - signal-aware decision/judgment support
- **Source resolution**
  - LLM-assisted source parsing / matching / confirmation support
- **Rule extraction**
  - model-assisted rule fact extraction from imported college-rule PDF
- **Discovery-related processing**
  - lighter extraction/summarization paths

Current integration note:

- The project was checked and adapted to use `deepseek-v4-pro` cleanly.
- High-value reasoning paths use selective thinking/reasoning support.
- Simpler/lighter paths were not blindly upgraded into heavy reasoning calls.

Remaining caution:

- Future contributors should still verify that new DeepSeek calls do not reintroduce legacy assumptions about old DeepSeek model names or request bodies.

---

## 9. Current BUAA source foundation

Current built-in BUAA source foundation includes categories such as:

- 学校综合
- 新闻动态
- 教学教务
- 研究生培养 / 招生
- 学生事务
- 团学与活动
- 国际交流
- 招生
- 就业
- 学院通知

Current built-in sources include first-batch official/public BUAA sources such as:

- school homepage
- BUAA news
- propaganda/publicity department
- network information center
- academic affairs
- graduate school
- student affairs
- youth league committee
- international cooperation
- student center
- undergraduate admissions
- graduate admissions
- career
- selected college-level sites

Direct-readable official/public HTML sources:

- Official/public site pages and list pages that can be treated as HTML-readable registry entries.

Source-entity-only cases:

- Public-account-like sources / names themselves are **not** treated as fully direct HTML sources by default.
- They remain source entities that may still require:
  - recent article link
  - readable list entry
  - source entry supplementation

How user-followed sources coexist with built-in sources:

- Built-in sources remain the system foundation.
- User-followed sources are saved separately in runtime state.
- Discovery page data merges:
  - seeded built-in sources
  - runtime custom sources
  - seeded discovery candidates
  - runtime generated candidates

---

## 10. Continuation priorities

Suggested next-step priority order for the next Codex session:

1. **Strengthen real recent-content quality in discovery**
   - make “北航最近发生了什么” feel more timely, recent, and action-relevant
2. **Improve public-account-like source recent-article behavior**
   - especially for sources like `微言航语`
3. **Re-verify and refine real synced content vs system sample distinction**
   - ensure the user always understands what is truly synced
4. **Re-check source/original semantics in discovery cards and source detail**
   - keep `查看原文` and `查看来源` clearly separated
5. **Clean up Chinese text / encoding quality**
   - high leverage for demo polish and trust
6. **Only then consider further action-layer polish or QQ/PCG expression polish**

What should **not** be done next:

- Do **not** start a second full scenario yet.
- Do **not** build a giant crawler platform.
- Do **not** redesign the whole discovery page again.
- Do **not** expand into multi-school support.
- Do **not** add large new product modules before the current discovery realism issues are improved.

What should be postponed:

- full collaboration/social module
- heavy workflow/task system
- major architecture rewrites
- broad horizontal feature expansion

---

## 11. Verification checklist

Before continuing work, a new Codex session should verify:

- [ ] `npm.cmd run build` passes
- [ ] onboarding -> `/entry` -> tutorial vs formal mode still works
- [ ] `/discover` loads normally in formal mode
- [ ] discovery A/B/C/D sections still render correctly
- [ ] user-followed source still saves and survives refresh
- [ ] sync/update flow still returns usable diagnostics
- [ ] signal page, detail page, Ask, reminder page still work
- [ ] imported rule still affects current basis / judgment presentation
- [ ] tutorial swim flow still exists and is clearly marked as tutorial/demo
- [ ] discovery dedup still prevents obviously repeated cards

---

## 12. Build / stability note

Current build status:

- The repository is currently expected to **build cleanly**.
- Latest checked command:
  - `npm.cmd run build`
  - passed successfully

Current fragile areas:

- Discovery layer has gone through many iterative rounds; changes in these files should be made carefully:
  - `app/discover/page.tsx`
  - `lib/buaa-discovery.ts`
  - `lib/discovery-store.ts`
  - `lib/discovery-sync.ts`
  - `app/api/discovery/route.ts`
- There are some text/encoding rough edges in parts of the repo; future edits should avoid accidentally worsening string corruption.
- Discovery behavior now depends on both:
  - seeded data in `data/buaa-discovery-kb.ts`
  - runtime persistence in `data/runtime/discovery/store.json`
  so debugging should inspect both.

---

## Short continuation advice

If a new Codex session has limited time, the best first move is:

1. inspect `app/discover/page.tsx`
2. inspect `lib/buaa-discovery.ts`
3. inspect `lib/discovery-sync.ts`
4. inspect `app/api/discovery/route.ts`
5. inspect `data/runtime/discovery/store.json`
6. run the app and verify whether discovery feels:
   - recent enough
   - source-grounded enough
   - sample-vs-real clear enough

That will usually reveal the highest-value next polish step without rediscovering the whole project.
