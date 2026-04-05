# Postmortem — MoneyMirror Phase 3 (issue-010)

**Date:** 2026-04-05  
**Agent:** Learning Agent (per `commands/postmortem.md`)  
**Pipeline cycle:** issue-010 — T1–T4 shipped; deploy-check **APPROVE**; T5–T6 deferred  
**Inputs:** `experiments/results/review-010.md`, `peer-review-010.md`, `qa-test-010.md`, `metric-plan-010.md`, `deploy-check-010.md`, `project-state.md`

---

## Executive summary

Phase 3 closed successfully: quality gates passed, production readiness approved. The main systemic pattern is **late discovery of correctness and scope-semantics bugs during `/review`** (two passes), after execute-plan shipped. Architecture and planning did not state **non-negotiable invariants** for financial aggregates (full-scope SQL) and **scope-aware UX copy** (multi-month vs “this month”). Residual hardening (per-user rate limits on heavy reads, true Gemini abort) was correctly deferred as non-blocking. Deploy-check initially failed on optional Sentry env + process noise; **PM exception** resolved the gate without code changes.

---

## Issue PM-1 — Dashboard totals derived from row-capped transaction data

**Issue Observed:**  
Overview totals, advisory inputs, and coaching facts could diverge from truth for accounts or scopes with more than **1000** transactions in scope because math used a row-limited transaction set.

**Root Cause:**  
The plan did not explicitly require that **headline dashboard numbers** be computed via **full-scope SQL aggregates**. Implementation used a path that capped rows, which is adequate for UI lists but wrong for totals.

**Preventative Rule:**  
For any finance dashboard, **totals and category sums used for insights, advisories, and AI facts must be computed with database aggregates over the full active scope**, never from a `LIMIT`-bounded transaction scan.

**System Improvements:**

- `backend-architect-agent.md`: Mandatory checklist — financial headline metrics must name the aggregate strategy (SQL `SUM`/`COUNT` over scope).
- `backend-engineer-agent.md`: Hard rule — no `LIMIT` on the query path used for monetary totals.

**Knowledge Updates:** `engineering-lessons.md`

---

## Issue PM-2 — Merchant backfill could not terminate on unresolvable keys

**Issue Observed:**  
Backfill could loop until timeout when `normalizeMerchantKey()` returned `null` for rows still selected as “needing” keys.

**Root Cause:**  
Batch processing assumed every selected row could eventually be updated; there was no explicit **forward cursor + skip** rule for permanently unresolvable rows in the architecture or implementation notes.

**Preventative Rule:**  
Any cursor-based batch repair over rows with nullable derived fields must **advance the cursor past rows that cannot be normalized** in one pass, or mark them skipped, so the loop always terminates.

**System Improvements:**

- `backend-architect-agent.md`: Checklist item for maintenance/repair routes — termination proof (cursor monotonicity + poison-row handling).
- `code-review-agent.md`: Flag `while`/`for` repair loops without explicit exit on unprocessable rows.

**Knowledge Updates:** `engineering-lessons.md`

---

## Issue PM-3 — Scope editor UI drifted from URL canonical scope

**Issue Observed:**  
Opening “Edit scope” on a unified view showed defaults and could **overwrite** the active range on re-apply.

**Root Cause:**  
Local form state was not **re-hydrated from the URL** when the canonical scope changed; two sources of truth diverged.

**Preventative Rule:**  
When **URL/search params** define canonical scope or filters, **all edit dialogs must reset local state from parsed URL** whenever the active scope changes.

**System Improvements:**

- `frontend-engineer-agent.md`: Explicit pattern — sync local form state from parsed route state on scope change.

**Knowledge Updates:** `engineering-lessons.md`, `product-lessons.md` (if framing “single source of truth” for filters)

---

## Issue PM-4 — Advisory copy and math assumed a monthly mental model

**Issues Observed:**

- Food delivery text used **×12 annualization** on multi-month scopes (wrong magnitude).
- Subscription line used **“/mo”** and NO_INVESTMENT used **“this month”** when scope was not a single month.

**Root Cause:**  
Advisory strings were authored for a **single-month** frame without a spec rule tying copy to **actual scope duration**. Review pass two caught this; execute-plan did not encode scope-aware copy rules.

**Preventative Rule:**  
All **money and time phrases** in user-facing analytics (`/mo`, `per year`, `this month`) must be **validated against the active scope** (single month vs multi-month vs arbitrary range). **Do not multiply by 12** unless the scope is exactly one month or the copy explicitly annualizes from a monthly estimate.

**System Improvements:**

- `product-agent.md` / `design-agent.md`: Plan templates include **scope-neutral phrasing** (“this period”) where range varies.
- `code-review-agent.md`: Financial copy review dimension — scope consistency for time and rate phrases.

**Knowledge Updates:** `product-lessons.md`, `engineering-lessons.md`

---

## Issue PM-5 — Stale dashboard fetch race without abort

**Issue Observed:**  
Rapid scope changes could leave **stale** dashboard data on screen when an older `loadDashboard` resolved after a newer scope.

**Root Cause:**  
`fetch` had no **AbortController**; async races were not in the initial implementation checklist for dashboard reload.

**Preventative Rule:**  
Any **user-triggered reload** that can be superseded by a newer action must use **AbortController** (or equivalent) and ignore `AbortError`.

**System Improvements:**

- `frontend-engineer-agent.md`: Reinforce abort pattern for competing fetches (already partially in codebase; make explicit for dashboard loads).

**Knowledge Updates:** `engineering-lessons.md`

---

## Issue PM-6 — Operational / gate friction on deploy-check (non-code)

**Issue Observed:**  
First deploy-check run **blocked** on empty Sentry client/org/project and non-ideal git/PR state; second run **APPROVE** after PM excluded optional Sentry from the gate and verified Neon tables + smoke.

**Root Cause:**  
Default `deploy-check` protocol treats Sentry env as blocking; **product** had already decided optional Sentry for this app. Exception was not encoded in the gate until the revision.

**Preventative Rule:**  
When the PM records an **env exception** in project-state or deploy artifact, **deploy-check must not fail** on those vars; exceptions should be one-line checkable before blocking.

**System Improvements:**

- `commands/deploy-check.md`: Document handling **documented PM exceptions** for optional monitoring keys.
- `deploy-agent.md` (if present): Align gate with `project-state.md` exceptions.

**Knowledge Updates:** `prompt-library.md` (process meta)

---

## Issue PM-7 — Heavy authenticated read APIs without per-user throttle (backlog)

**Issue Observed:**  
`GET /api/transactions` and merchant insights can be expensive; **no per-user rate limit** (peer + QA non-blocking).

**Root Cause:**  
Architecture called out auth and ownership but did not require an explicit **cost/abuse posture** for self-DoS (rapid UI actions).

**Preventative Rule:**  
For **authenticated heavy read** endpoints (large scans, `GROUP BY`), the architecture should either document **pagination/cursor guarantees**, **per-user rate limits**, or an explicit **“trusted client / MVP”** assumption.

**System Improvements:**

- `backend-architect-agent.md`: Peer-review suggestion formalized — heavy read APIs need a stated strategy.

**Knowledge Updates:** `engineering-lessons.md`

---

# Knowledge Updates (summary)

| File                     | Topics                                                                                         |
| ------------------------ | ---------------------------------------------------------------------------------------------- |
| `engineering-lessons.md` | Full-scope SQL totals; backfill termination; abort on dashboard fetch; heavy-read API strategy |
| `product-lessons.md`     | Scope-aware copy for variable date ranges                                                      |
| `prompt-library.md`      | Deploy-check PM env exceptions; issue-010 cycle summary                                        |

---

# Prompt Autopsy (required)

**Agent:** `backend-architect-agent`  
**Missed:** Did not require that dashboard headline metrics and advisory inputs use **full-scope SQL aggregates** (no truncation via row limits).  
**Root cause in prompt:** Checklist emphasizes auth, fan-out, rehydration — not **financial correctness invariants** for aggregations.  
**Proposed fix:** Add to Mandatory Pre-Approval Checklist: _“For any finance dashboard or advisory pipeline, the plan must state that totals, category sums, and inputs to rules/AI are computed from database aggregates over the full user scope (SUM/COUNT), not from LIMIT-capped row scans.”_

---

**Agent:** `backend-engineer-agent`  
**Missed:** Implemented dashboard math via a path that could cap transactions, breaking parity with unlimited scope.  
**Root cause in prompt:** No hard rule that **monetary totals** may never use the same query shape as **paged lists**.  
**Proposed fix:** Add under implementation constraints: _“Never use LIMIT on a query whose results are summed into headline totals or advisory inputs; use a separate aggregate query for totals.”_

---

**Agent:** `code-review-agent`  
**Missed (first pass):** Scope-dependent advisory copy errors and food annualization; dashboard `loadDashboard` abort race; batched UPDATE optimization — caught in a **second** pass.  
**Root cause in prompt:** Review checklist lacks a **financial copy vs scope** dimension and explicit **async race** checklist for competing fetches on scope change.  
**Proposed fix:** Add Step: _“For money-related UI copy and advisories, verify time phrases and annualization match the active date scope (single month vs multi-month). For any fetch driven by scope/filter changes, verify AbortController or equivalent stale-response guard.”_

---

**Agent:** `frontend-engineer-agent`  
**Missed:** `ScopeBar` local state not reset from URL on scope change; initial `loadDashboard` without abort.  
**Root cause in prompt:** URL-as-source-of-truth sync for **edit** flows not emphasized enough.  
**Proposed fix:** _“When filters or scope are encoded in the URL, re-initialize modal/local editor state from parsed search params whenever the canonical scope changes.”_

---

**Agent:** `product-agent` / `design-agent`  
**Missed:** Copy templates defaulted to monthly language while Phase 3 shipped **unified multi-month** scopes.  
**Root cause in prompt:** Plans do not require **neutral period language** when date range is user-configurable.  
**Proposed fix:** _“If the product supports arbitrary or multi-month ranges, default copy must use period-neutral labels (‘this period’) unless the UI is explicitly month-scoped.”_

---

**Agent:** `deploy-check` command / `deploy-agent`  
**Missed:** First gate failure on optional Sentry vars despite PM intent.  
**Root cause in prompt:** Sentry verification is default-blocking without a **documented exception** hook.  
**Proposed fix:** In `commands/deploy-check.md`: _“If `project-state.md` Decisions Log or the deploy artifact records a PM exception for optional Sentry (or similar) env vars, skip failing the gate on those keys.”_

---

**Agent:** `peer-review-agent`  
**Missed:** N/A for blocking issues — approved with non-blocking hardening notes.  
**Root cause in prompt:** Optional prompt autopsy already suggested heavy-read documentation; good alignment.  
**Proposed fix:** Promote the suggested **heavy read API** checklist item from optional to **Mandatory Pre-Approval** cross-reference in `backend-architect-agent.md` (avoid duplication in peer-review file).

---

# Next pipeline command

Per `system-orchestrator.md`: **`/learning`** — convert this postmortem into durable knowledge + agent updates + `CODEBASE-CONTEXT.md` refresh.
