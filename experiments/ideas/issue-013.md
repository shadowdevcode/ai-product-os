---
issue_type: Feature
linear_workflow: New product surface — chat-first research copilot (not a fixed command pipeline); implementation app/repo path TBD after `/explore` + `/create-plan`
source: PM brief (2026-04-12) — conversational research agent with planning, orchestration, and export
prior_cycles: N/A (greenfield product direction in AI Product OS)
linear_root: VIJ-65 — https://linear.app/vijaypmworkspace/issue/VIJ-65/issue-013-pm-research-copilot-chat-first-planning-orchestrated
linear_project: https://linear.app/vijaypmworkspace/project/issue-013-pm-research-copilot-chat-first-planning-orchestrated-a5e43bf29c24
app: TBD (portfolio-level; target codebase after exploration)
---

# Issue Title

**PM Research Copilot — chat-first planning, orchestrated evidence, exportable insights**

**Type:** Feature

---

## Problem (Current State → Desired Outcome)

**Current state:** Many PM workflows are still **pipeline-shaped**: fixed sequences of steps (“run this command, then that”), brittle if the question changes mid-flight. The **agent is not the primary interface** — the process is. PMs doing discovery, competitive research, or feature validation need **structured, evidence-backed** outputs, but today they either **click through rigid flows** or **drown in raw data** without a partner that **plans with them**, **explains coverage and confidence**, and **adapts** when they say “go deeper on Reddit” or “skip Quora.”

**Desired outcome:** A **chat-first research product** where the **agent is the main interface**: the user states intent (e.g. “Research Notion’s iOS pain points for freelancers”), the system **asks clarifying questions**, **proposes a research plan** (sources, depth), **waits for approval or edits**, then **executes** while keeping the user in the loop — **progress updates**, **mid-run steering**, and **evidence-backed insights** that can be **exported into a doc** (PM-ready artifacts, not dumps). Under the hood, **specialized sub-agents** handle app/play store reviews, Reddit/forums, web/deep discovery, and **analysis** (sentiment, clustering, pain points, JTBD) with **logic driven by coverage and confidence**, not a single hard-coded brittle pipeline.

---

## User

**Primary:** Product managers doing **discovery**, **competitive research**, or **feature validation** who want a **research partner**, not a batch script.

**Secondary:** Founders and **UX researchers** who need fast, structured evidence from **public signals** and **internal notes** (when wired in later).

---

## Why This Problem Matters

**Outcome before features:** The north star is experiential — **does this feel like a smart research partner?** If the product still feels like a **rigid automation**, it fails the positioning. Shipping **small, controllable** experiments that prove **planning + transparency + steering** beats **one-shot pipelines** reduces wasted build and aligns with **evidence over opinion** (principles: structured thinking, user-problem-first).

---

## Opportunity

Own the **“agent as interface”** slice for PM research: **one controllable chat** that unifies **planning**, **tool orchestration**, **evidence gathering**, and **synthesis** — differentiated from static research tools and from generic chat that does not **show sources, coverage, or steerability**.

---

## Hypothesis

If we give PMs a **conversational research agent** that **co-plans** (clarify → propose plan → confirm), **executes** via **specialized sub-agents** with **visible progress** and **mid-run steering**, and returns **citation-ready findings** with **export** — then they will complete **higher-quality discovery cycles faster** and **trust the output** more than with a fixed multi-step wizard or raw LLM chat.

---

## Risks / Open Questions

- **Source/API constraints:** App stores, Reddit, forums, and web scraping may have **ToS, rate limits, and reliability** variance; need a clear **legal/ethical** stance and **fallback** behaviors.
- **Hallucination vs evidence:** Synthesis must **ground** in retrieved artifacts; **confidence** and **gaps** must be explicit in the UX.
- **Scope creep:** “Internal notes” and **enterprise** integrations can balloon scope — keep **MVP** to **public web + export** unless exploration proves otherwise.
- **Platform:** Implementation **app path** in this monorepo is **TBD** (`app: TBD`); **`/explore`** should narrow **MVP surface** and **stack**.

---

## Non-goals (initial)

- Replacing the **AI Product OS** command pipeline for repo work (this issue describes a **product** to build, not a rewrite of `/create-issue`…`/learning` here).
- **Fully autonomous** research with no human confirmation before expensive runs.
- **Guaranteed** coverage of every possible source — agent must **negotiate** depth vs time with the user.

---

## Success metrics (draft for `/metric-plan` / exploration)

- **North star (qualitative + proxy):** User-reported **“feels like a research partner”** score or session rating; paired with **task completion** (plan approved → run finished → export used).
- **Supporting:** Time to **first approved plan**, **steering events** per session (healthy adaptation), **export** usage, **repeat sessions** within 7 days.

---

## Theme map (Linear-ready — refine in `/create-plan`)

| ID     | Theme                      | Notes                                                                    |
| ------ | -------------------------- | ------------------------------------------------------------------------ |
| **T0** | Chat UX + plan contract    | Clarifying Qs, plan preview, approve/edit, cancel, progress stream       |
| **T1** | Orchestration + sub-agents | Store/Play, Reddit/forums, web discovery, analysis agents; routing       |
| **T2** | Evidence + export          | Citations, clustering/JTBD outputs, doc export, gap/confidence surfacing |

---

## Next step

Send to **Research Agent** via **`/explore` issue-013** to validate problem, competitors, MVP slice, and risks before **`/create-plan`**.
