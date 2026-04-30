# Plan 013 — Conversational Research Agent (v3): agent-first UI + orchestrated evidence

**Issue:** 013
**Project:** PM Research Copilot — working app path **`apps/research-copilot`** (new Next.js app in this monorepo; name finalizable at scaffold).
**Linear:** Root [**VIJ-65**](https://linear.app/vijaypmworkspace/issue/VIJ-65/issue-013-pm-research-copilot-chat-first-planning-orchestrated); project [issue-013 — PM Research Copilot](https://linear.app/vijaypmworkspace/project/issue-013-pm-research-copilot-chat-first-planning-orchestrated-a5e43bf29c24).
**Exploration:** [exploration-013.md](../exploration/exploration-013.md) — **Build**
**Inputs:** Issue [issue-013.md](../ideas/issue-013.md); PM PRD v3 (Lenny-style brief in session); architecture aligned with [architecture-guide](../../knowledge/architecture-guide.md), [ui-standards](../../knowledge/ui-standards.md), [analytics-framework](../../knowledge/analytics-framework.md).
**Stage:** plan
**Status:** approved for execution (order **T0 → T1 → T2**)
**Date:** 2026-04-12
**Revised:** 2026-04-12 — Confirm-first plan (options/chips) before any external research tools; OpenRouter + SERP/Tavily envs; sub-agent `.md` prompts; stop/skip/steer; Co-work/Emergent-style canvas; parallel chat during execution.

---

## Plan summary

Ship **v3** as a **chat-first, fully agentic** research product (no v1/v2-style **pipeline ahead of the user**). The **main research agent** (Vercel **AI SDK**) always **behaves like a conversation**: it **asks clarifying questions**, then proposes a **research plan** with **sources, depth, and scope** shown as **explicit options** (e.g. **toggle chips / buttons**: App Store, Play, Reddit, web search, Quora—**user picks** or types “Reddit only”, “no App Store”, “add Coda as competitor”). The user **edits and confirms** that plan—**only after confirmation** may the runtime **spawn / invoke specialized sub-agents** (separate **tools** with their own **system instructions** and **tool-calling** to data fetchers). **Before confirmation**, external research tools are **disabled or no-op** (server-enforced), so nothing “runs ahead” like an old batch pipeline.

**Orchestration model:** The **lead agent** decides **coverage / confidence** and **which** sub-agent to call **next**—but **only in the execution phase** after `plan_approved`. Sub-agents (app reviews, Reddit, Quora, SERP/web, NLP synthesis, optional **Google Doc writer**) are **specialized jobs**; each may invoke **child tools** (HTTP, APIs) with **transparent** progress. **Not** “progressive depth” as an automatic hidden behavior—**depth expands when the PM steers** (“go deeper on Reddit”, “negative reviews only”).

**While sub-agents run:** The user **stays in control**—**continues chatting** in the same thread, sees **real-time progress** (which agent is running, which source), can **stop** the whole run, **skip** a source (e.g. skip Quora), or **pivot** (“deeper on negative reviews”). **Emergent.sh / Emergent Labs–style** clarity + **Claude Co-work–inspired** layout: when the **artifact** is ready, the **right canvas** (Markdown findings) **emphasizes**; the **chat column can slide** or resize so research feels like **workbench + conversation** (exact animation left to Design; goal is **smooth transition**, not a static three-column-only layout).

**Transparency over magic:** Every insight lists **citation** (title, snippet, URL). **PM-ready** Markdown export; **Google Docs** generation is a **deliberate** post-step (user or agent offers “Export to Google Doc”) that **spawns** a doc agent—**view alongside** in canvas when possible.

**Models & keys:** Route LLM calls through **OpenRouter** (`OPENROUTER_API_KEY`, OpenAI-compatible base URL) via AI SDK **provider** config—**not** optimizing for zero cost; optimize for **usefulness + guardrails**. **Web/SERP:** use **SERP API** (`SERPAPI_API_KEY`) or equivalent (**Tavily** `TAVILY_API_KEY`, etc.)—pick one for MVP and document; **execute-plan** locks the provider. **Reddit / app stores:** respective API keys as needed. **Always surface in `.env.local.example`** which key powers which tool so PMs/devs know **what is being called**.

**Greenfield data:** No legacy user state requirement—**sessions can reset** in dev freely; Neon schema is source of truth.

**Theme execution order:** **T0** (shell + **planning-phase-only** tools + **confirm** + **execution-phase** stub sub-agents + stop/skip UI + Markdown canvas) → **T1** (real sub-agents + SERP + citations + mid-run steer) → **T2** (Google Doc agent, survey/hypothesis helpers, polish).

---

## 1. Product specification (Product Agent)

### Product goal

Make **≥70%** of research sessions **start from chat** (vs fixed pipeline), with users reporting **≥60%** feeling **in control** of depth/tools (post-session prompt), **time-to-first cited finding < 10 minutes** for standard depth, and **≥50%** of completed sessions producing an **export**.

### Target user

- **Primary:** PMs — continuous discovery, competitive analysis, feature validation.
- **Secondary:** Founders, UX researchers — public-signal + later internal notes.

### Product principles (locked)

1. **Agent-first** — Conversation drives the product; no fixed wizard ahead of the user.
2. **Transparency over magic** — Show **which** sub-agent ran, **what** was fetched, and **citations** on every insight.
3. **No automatic “progressive depth”** — Deeper passes happen when the **PM steers** (or confirms a deeper preset), not as hidden pipeline logic.
4. **Usefulness & control over raw LLM cost** — Budgets/guardrails yes; penny-pinching no.

### Top use cases (v3 coverage)

| Use case                  | Example prompt                                            | Sub-agents typically involved            |
| ------------------------- | --------------------------------------------------------- | ---------------------------------------- |
| Market / product analysis | “Slack positioning for SMB in last 6 months”              | web_discovery, app_reviews, nlp_analysis |
| Pain points & JTBD        | “Notion iOS pain points for freelancers”                  | app_reviews, social_reddit, nlp_analysis |
| Competitive scan          | “Notion vs Coda vs Logseq—UX complaints, pricing signals” | web_discovery, app_reviews, nlp_analysis |
| Hypothesis validation     | “Stress-test this hypothesis…” (+ attach doc in T2)       | nlp_analysis, web_discovery              |
| Survey creation           | “Draft a survey to fill gaps after this research”         | nlp_analysis (+ export)                  |

### User journey (v3) — **planning → confirm → execution → steer**

1. **Land** — Centered composer (Perplexity-like); suggestion chips (“research Notion iOS pain points for freelancers”).
2. **Intent** — User: “I want to research Slack” / Notion example → **lead agent asks clarifying questions** (scope, time window, geography, competitors).
3. **Plan proposal (options, not a hidden pipeline)** — Agent proposes **sources** (App Store, Play, Reddit, web, Quora, …) and **depth** (e.g. Shallow / Standard / Deep) as **structured options**—rendered as **buttons / chips** the user can toggle, **plus** free-text edits (“add Evernote”, “exclude App Store”).
4. **Confirm** — User taps **Approve plan** (or equivalent). Server sets **`plan_approved_at`** / `session.phase = executing`. **Until this moment**, **no** external research tools execute (only planning/draft tools).
5. **Execution** — Lead agent **orchestrates** sub-agents via **tool calls**—**each sub-agent is visible** (progress row: “Reddit agent running…”, “SERP: WhatsApp last 3 months…”). **Multiple** sub-agents may run **sequentially or in parallel** per design (MVP: sequential + clear UI; parallel when safe).
6. **Concurrent chat** — User **can keep messaging** while agents run (queue/interrupt policy in code). Progress UI shows **what is active**; user can **Stop run**, **Skip source**, or send **steer** commands.
7. **Mid-run steer** — After confirmation, user: “skip Quora”, “only Reddit”, “deeper on negative reviews” → lead agent **updates plan state** and **re-invokes** the relevant sub-agent(s); **rerun** only affected steps where possible.
8. **Artifact + layout shift** — Findings stream into **right canvas** (Markdown): top pain points, JTBD, sentiment summary—**each insight cited** (source, snippet, link). **Co-work–style**: chat column may **slide** or resize when canvas populates (desktop).
9. **Export** — **Markdown** copy/download always; **Google Doc** via explicit action (T2) that invokes a **doc sub-agent** and opens doc beside chat when possible.

### MVP scope vs later

| Area                | v3 MVP (this plan)                                                                  | Later                        |
| ------------------- | ----------------------------------------------------------------------------------- | ---------------------------- |
| Social              | **Reddit** + optional **Quora** (if API/access available)                           | X, more forums               |
| Stores              | **App Store + Play** for named apps                                                 | Broader catalog              |
| Web                 | **SERP** (SerpAPI or alt) + fetch                                                   | More retrieval vendors       |
| Sub-agent brains    | **Markdown** system prompts per agent under repo `agents/` or `src/lib/agents/*.md` | Versioned prompt registry UI |
| Validation / survey | Hypothesis attach + survey draft (T2)                                               | Full panel workflow          |

### Success metrics → telemetry (single source per event)

| PRD metric                     | Proxy event(s)                                                                                       | Notes                                                               |
| ------------------------------ | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| ≥70% sessions start chat-first | `research_session_started` + `first_message_from_center_composer=true` vs `pipeline_template_chosen` | Template button discouraged in v3; if legacy exists, tag separately |
| ≥60% feel in control           | `post_session_survey_submitted` with `control_score`                                                 | In-app micro-survey end of session                                  |
| TTFI < 10 min                  | `first_cited_finding_rendered` with `seconds_since_session_start`                                    | Must fire when **first** insight has ≥1 citation                    |
| ≥50% export                    | `artifact_exported` / `research_session_completed`                                                   | Denominator: completed sessions                                     |

**Instrumentation rule:** List events in manifest; implement during execute-plan (per product-lessons: telemetry is part of done).

### Acceptance criteria (release-ready v3)

1. **Layout:** Centered composer → left rail after session start; **center** = chat; **right** = **canvas** artifact (Markdown); mobile = sheet/tab; optional **layout shift** when artifact becomes primary (Co-work / Emergent inspiration).
2. **Clarify → options → confirm:** For a prompt like “research Slack”, the agent **asks questions** and returns a **plan with selectable sources/depth** (buttons/chips + text edits); **Approve** required before **any** paid/external research tool runs.
3. **Agentic execution:** After approval, **Vercel AI SDK** `streamText` + **tools** invokes **specialized sub-agents**; each step **visible** (progress, which agent).
4. **Stop / skip:** **Stop run** (global) and **Skip** current source (or per-row cancel) + **steer** via chat (“go deeper on Reddit only”).
5. **Interleaving:** User can **chat while agents run**; ordering policy documented (queue vs interrupt).
6. **Citations:** Every bullet insight in Findings has **source + snippet + URL**.
7. **Export:** Markdown export; **Google Doc** as explicit step (T2).
8. **Transparency:** Brief lists **which** sub-agents/tools ran; **no** silent external fetches before plan approval.

### Resolved / updated decisions

1. **Social sources:** Reddit MVP; Quora when feasible; **paste thread URL** escape hatch.
2. **Hypothesis / survey:** T2 optional attach + draft survey.
3. **Models:** **OpenRouter** (`OPENROUTER_API_KEY`) for OpenAI-compatible routing; different `model` ids for planner vs extractor vs sub-agent if needed.
4. **Web search:** **SerpAPI** (`SERPAPI_API_KEY`) **or** Tavily (`TAVILY_API_KEY`)—**one** chosen at implementation with abstraction interface.
5. **Depth:** User-chosen preset + **steer**—not auto progressive depth.

---

## 2. UX design (Design Agent)

### Layout model (Perplexity-inspired + your spec)

- **Breakpoint desktop (≥1024px):**
  - **Left (240–280px, collapsible):** **Projects** list, **sessions** under project, **New session**. Hidden or **icon-only** until **first message** or user opens manually.
  - **Center (flex-1):** **Single** research agent thread — messages, plan cards, activity lines.
  - **Right (min 320px, resizable):** **Artifact tabs** — “Brief” | “Findings” (Markdown preview); sync scroll optional.
- **Breakpoint mobile:** **Full-screen chat**; artifact opens as **bottom sheet** or **second tab**; left rail becomes **hamburger → drawer**.

### Centered empty state (critical)

- Vertically centered **composer** + short **value prop** + **3 suggestion chips** (e.g. “Notion iOS pain points for freelancers”).
- **No** project list until **session starts** — matches “conversation starts in the center.”

### Left rail appearance

- **Trigger:** `session_created` from first send **or** user picks **Existing project** from slim top bar menu.
- **Animation:** 200–300ms width expand (respect `prefers-reduced-motion` — instant show fallback).

### Core components

- `CenteredComposer` — empty state only.
- **`ResearchPlanOptions`** — Sources + depth as **toggles / buttons** (Emergent-style option UX); maps to structured `plan_json` before approval.
- `ResearchPlanCard` — Summary + **Approve plan** (primary) + **Edit in chat**; until approved, **no execution spinners** for external fetch.
- **Sub-agent progress rows** — Each running agent shows **name**, **status** (queued / running / done / skipped / failed), **optional progress bar**; user can **Skip this source** or **Stop all**.
- `ArtifactCanvas` — Right panel Markdown preview (Findings, Brief); **promotes** when content arrives (slide chat / resize—**Co-work**-like).
- `CitationPopover` / inline cites — source title, snippet, URL for every insight block.
- **Composer** — Stays available during execution for **steer** messages (unless global Stop clears queue—product decision).

### Interleaving & concurrency (Design + runtime contract)

- **Server:** `session.phase`: `planning` \| `executing` \| `stopped` \| `completed`. Research tools check **phase + plan_approved_at** before external I/O.
- **Message log:** User + assistant + tool parts; **stop** inserts a system boundary and cancels in-flight tool promises where possible.
- **Client:** Queue vs interrupt documented; **Stop** must be **one click** visible during execution.

### Accessibility

- **Approve**, **Stop**, and **Skip** are keyboard and screen-reader reachable.
- **`aria-live`** on progress and new canvas content.
- Reduced-motion: skip slide animations; use instant layout swap.

---

## 3. System architecture (Backend Architect Agent)

### High level

- **Monolith** Next.js under `apps/research-copilot`.
- **Vercel AI SDK** (`streamText`, `tools`, `maxSteps`) with **two-layer tool policy**:
  - **Planning tools** — `propose_plan`, `ask_clarification` (no external paid fetch), always allowed.
  - **Execution tools** — `app_reviews`, `social_reddit`, `social_quora`, `web_serp`, `nlp_synthesize`, etc.—**gated**: `execute` checks DB **`plan_approved_at`** (and session not `stopped`). If not approved, tool returns **structured error** or lead model is steered to ask for confirmation (prefer **server reject** for safety).
- **OpenRouter** — Configure `@ai-sdk/openai` or compatible **OpenAI base URL** `https://openrouter.ai/api/v1` with `OPENROUTER_API_KEY` and model ids like `openrouter/anthropic/claude-3.5-sonnet` (exact ids TBD in execute-plan). Allows **one key** to swap models per sub-agent.
- **Sub-agent “brains”** — Each sub-agent module loads **markdown system instructions** from the repo (e.g. `apps/research-copilot/src/lib/agents/prompts/reddit-agent.md`) describing **PM mindset**, output schema, and when to escalate to the lead agent—**versioned in git**, not hidden prompts only in DB.
- **Stop / skip** — `POST /api/research/sessions/[id]/stop` sets `stopped` and aborts AbortControllers tied to the current run; **skip** either as chat intent (lead agent) or `POST .../skip` with `source_id`.
- **Persistence:** Messages, plan versions, run state, evidence rows in Neon.

### Vercel AI SDK — responsibilities

| Concern    | Approach                                                                                                                                                                    |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lead chat  | `streamText` + tools; lead system prompt emphasizes **clarify → propose options → wait for structured confirm**                                                             |
| Execution  | After approval, same or follow-up `streamText` **run** with execution tools enabled, or **single** chat with dynamic tool filter via **runtime context**                    |
| Sub-agents | Each **tool `execute`** loads agent markdown + calls provider-specific code (SERP, Reddit OAuth, etc.); may use **nested** `generateText` with smaller model for extraction |
| Citations  | All execution tools return **evidence[]** with `url`, `snippet`, `source_type`                                                                                              |

### Tool / sub-agent registry (expandable)

| Tool / agent         | Responsibility                                     | Keys / deps                                |
| -------------------- | -------------------------------------------------- | ------------------------------------------ |
| **app_reviews**      | App Store Connect / Play APIs or approved scrapers | Store credentials per execute-plan         |
| **social_reddit**    | Reddit API                                         | `REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET` |
| **social_quora**     | Quora access path (official if any; else defer)    | TBD                                        |
| **web_serp**         | SERP + fetch                                       | `SERPAPI_API_KEY` **or** `TAVILY_API_KEY`  |
| **nlp_synthesize**   | Clustering, JTBD, sentiment, Markdown Findings     | OpenRouter model                           |
| **export_gdoc** (T2) | Create Google Doc                                  | Google OAuth + Docs API                    |

### API surface (conceptual)

| Method | Path                                       | Purpose                                                                        |
| ------ | ------------------------------------------ | ------------------------------------------------------------------------------ |
| `POST` | `/api/research/sessions`                   | Create session.                                                                |
| `GET`  | `/api/research/sessions`                   | List for left rail.                                                            |
| `POST` | `/api/research/sessions/[id]/chat`         | User message → streaming agent (planning or execution per phase).              |
| `POST` | `/api/research/sessions/[id]/plan/confirm` | Body: approved `plan_json` → sets `plan_approved_at`, enables execution tools. |
| `POST` | `/api/research/sessions/[id]/stop`         | Cancel run.                                                                    |
| `POST` | `/api/research/sessions/[id]/skip`         | Skip current source (optional).                                                |
| `GET`  | `/api/research/sessions/[id]/artifact`     | Latest Markdown artifact.                                                      |
| `POST` | `/api/research/sessions/[id]/export`       | Markdown / trigger GDoc agent (T2).                                            |

### Infrastructure — environment variables (document in `.env.local.example`)

| Variable                                              | Purpose                                                 |
| ----------------------------------------------------- | ------------------------------------------------------- |
| `OPENROUTER_API_KEY`                                  | LLM calls via OpenRouter (required for MVP agent stack) |
| `DATABASE_URL`                                        | Neon Postgres                                           |
| `SERPAPI_API_KEY` **or** `TAVILY_API_KEY`             | Web/SERP discovery (pick one + interface)               |
| `REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET`            | Reddit API                                              |
| `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST` | Analytics                                               |
| Optional                                              | App Store / Play, Quora, Google OAuth for Docs, etc.    |

**Secrets:** server-only; never expose to the client.

---

## 4. Database schema (Database Architect Agent)

**Database:** **Neon Postgres** (serverless driver), `schema.sql` + **idempotent** `schema-upgrades.ts` pattern (match money-mirror style).

### Core tables

| Table               | Purpose                                                                                                                                                                                                                                       |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `research_projects` | Workspace: id, user_id, name, created_at                                                                                                                                                                                                      |
| `research_sessions` | id, project_id, user_id, title, **`phase`** (`planning` \| `executing` \| `stopped` \| `completed`), **`plan_approved_at`** (timestamp; **required** before execution tools), **`stopped_at`** nullable, **centered_entry** bool default true |
| `research_messages` | id, session_id, role, content JSON (text + structured parts), created_at                                                                                                                                                                      |
| `research_plans`    | id, session_id, version, plan_json (sources, depth, outputs, selected options), **`created_at`** (each edit versioned); approval time = `research_sessions.plan_approved_at`                                                                  |
| `research_runs`     | id, session_id, status, coverage_json, confidence_json, started_at, completed_at                                                                                                                                                              |
| `evidence_snippets` | id, run_id, source_type, source_url, snippet, metadata JSON                                                                                                                                                                                   |
| `exports`           | id, session_id, format (`markdown` \| `gdoc`), url or payload ref, created_at                                                                                                                                                                 |

### Indexes

- `(user_id, updated_at desc)` on `research_sessions` for left rail.
- `session_id` on messages, plans, runs.

---

## 5. Implementation tasks (phased)

### T0 — Shell + planning/execution tool split + confirm + stub execution + stop + canvas

- Scaffold `apps/research-copilot`; deps: **`ai`**, **`@ai-sdk/openai`** (OpenRouter baseURL), PostHog.
- **Layout:** centered composer → left rail; **right artifact canvas** with **Co-work–style** resize/slide when content appears.
- **`streamText`:** planning tools only first (`propose_plan`, clarifications); **stub execution** tools that **check `plan_approved_at`** and return mock data only when confirmed via **`POST .../plan/confirm`** (or inline Approve maps to this).
- UI: **option chips** bound to `plan_json`; **Approve plan**; **Stop** + **Skip** (stub).
- **`useChat`** + interleaved messages; persist UIMessage parts.
- Markdown export stub + telemetry.

### T1 — Real sub-agents + OpenRouter + SERP + Reddit + citations + steer

- Implement execution tools with **prompt markdown files** per agent.
- Wire **SerpAPI or Tavily** + fetch pipeline; Reddit; app reviews as feasible.
- **nlp_synthesize** builds cited Findings Markdown.
- Mid-run **steer** via chat + **stop/skip** endpoints.

### T2 — Google Doc agent + hypothesis/survey helpers + micro-survey

- **export_gdoc** tool + OAuth; optional hypothesis attach + survey draft.
- **Control** score survey; polish Emergent-style option UX.

---

## 6. Risks

| Risk                                       | Mitigation                                                                                                         |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| Long-running jobs on serverless            | **Tool** implementations chunk work; **streamText** stays within limits; optional **async tool** pattern with poll |
| Concurrent user messages vs one agent loop | Define **interrupt vs queue** policy; document in execute-plan                                                     |
| User bypasses confirm                      | **Server-side** tool gate mandatory—never rely on model politeness alone                                           |
| Source ToS / API limits                    | Official APIs first; rate limits; user-agent transparency in Brief                                                 |
| LLM drift / hallucination                  | Retrieved evidence → then summarize; minimum citation density; show gaps                                           |
| Scope creep                                | T0/T1/T2 gates; ship **one** golden path (e.g. Notion iOS freelancer brief) for demo                               |

---

## 7. Next steps

- **`/execute-plan`** starting **phase-t0**.
- **`/linear-sync plan`** to mirror tasks to Linear under **VIJ-65** when ready.
