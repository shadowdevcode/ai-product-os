# Peer Review: MoneyMirror (issue-009)

**Date:** 2026-04-02  
**Agent:** Peer Review Agent  
**Status:** BLOCKED — 4 MUST-FIX items, 1 MEDIUM item  
**Input:** Code review results, full implementation (`apps/money-mirror/`), `schema.sql`, `plan-009.md`

---

## Challenge Mode — Assumption Audit

### Assumption 1: "The dashboard can live entirely in client memory after upload"

**Why it's risky:** The product plan defines a persisted dashboard flow (`GET /api/dashboard`) and the weekly recap email deep-links users back to `/dashboard`. The implementation never hydrates saved statement data on page load. `dashboard/page.tsx` always starts in `"upload"` state and only shows results after a successful parse response in the same tab session.

**Failure mode:** A user uploads a statement, sees the mirror once, then refreshes, comes back later, or clicks the weekly recap email CTA. `/dashboard` shows the upload prompt instead of their saved mirror. The retention loop promised in the plan does not exist in production behavior.

**Counterargument strength:** Weak. This is not an MVP simplification. It breaks a core promised journey and invalidates the email CTA.

### Assumption 2: "Saving the statement row without its transactions is an acceptable non-fatal path"

**Why it's risky:** `statement/parse` writes the parent `statements` row first, treats transaction insertion failure as non-fatal, still emits `statement_parse_success`, and returns a success payload.

**Failure mode:** The user sees a successful parse, but the persisted system state is corrupted: dashboard advisories, future reloads, and weekly recap all depend on `transactions`. They will now read an incomplete statement that was marked `processed` even though the core child rows never landed.

**Counterargument strength:** Weak. This is a classic partial-write integrity bug on the main value path.

### Assumption 3: "Cron success can be inferred from HTTP 2xx alone"

**Why it's risky:** The master cron counts failures by rejected fetches, but the worker returns HTTP 200 even when Resend fails. The master therefore reports success for failed emails.

**Failure mode:** PM sees `weekly_recap_completed` with inflated `succeeded` counts while users received nothing. The product loop appears healthy in telemetry while the actual retention channel is broken.

**Counterargument strength:** Weak. The current implementation still lies about delivery outcomes after the prior review fix.

---

## Multi-Perspective Challenge

### 1. Reliability Engineer — "What breaks at 3am?"

**Finding:** `apps/money-mirror/src/app/api/statement/parse/route.ts:260-323` marks a statement as `processed`, logs success telemetry, and returns 200 even if `transactions` insert fails at lines 296-303. This leaves an internally inconsistent state that every downstream feature reads as valid.

### 2. Adversarial User / Confused User — "How does a real person break this?"

**Finding:** `apps/money-mirror/src/app/dashboard/page.tsx:45-107` never reloads saved mirror data. A user who refreshes, opens `/dashboard` from the weekly email, or returns the next day is pushed back into the upload flow and is likely to re-upload the same statement, burn through the 3/day limit, and create duplicate rows instead of seeing their existing report.

### 3. Future Maintainer — "What will confuse the next engineer?"

**Finding:** The plan explicitly calls for `GET /api/dashboard`, but the codebase only has `GET /api/dashboard/advisories` and a transient client state flow. The route surface and the product narrative say "dashboard is persisted," while the implementation behaves like a one-time post-upload view. That mismatch will cause maintainers to assume a rehydration path exists when it does not.

---

## Lens 1: Architecture & Scalability

### A1 (MUST FIX) — Dashboard architecture does not match the plan and does not support persisted rehydration

**Location:** `apps/money-mirror/src/app/dashboard/page.tsx:45-107`, `apps/money-mirror/src/app/api/dashboard/advisories/route.ts:1-121`, `experiments/plans/plan-009.md:69-80`

The architecture in `plan-009.md` specifies `GET /api/dashboard` to fetch mirror stats plus advisory feed. That route does not exist. The dashboard is purely transient client state derived from the immediate parse response.

**Why this is blocking:** The product's retention flow depends on a durable dashboard. The weekly recap email links to `/dashboard`, but that page cannot reconstruct the user's saved mirror state from the database.

**Required fix:** Implement a persisted dashboard read path (`GET /api/dashboard` or equivalent) that loads the latest processed statement and advisories for the authenticated user on first load. `/dashboard` must render from persisted data after refresh or deep link, not only after a fresh upload mutation.

### A2 (MEDIUM) — Weekly recap fan-out silently caps coverage at the first 1000 statement rows

**Location:** `apps/money-mirror/src/app/api/cron/weekly-recap/route.ts:38-43`

The master cron fetches `statements` with `.limit(1000)` and then deduplicates `user_id`s in memory. This caps the worker fan-out by statement rows, not by eligible users, and excludes later users once the dataset grows.

**Why this matters:** The architecture is acceptable for the current MVP, but it has a clear ceiling and will degrade silently as usage grows.

**Required fix:** Query distinct eligible users or paginate through statement rows until coverage is complete.

---

## Lens 2: Edge Cases, Security & Reliability

### R1 (MUST FIX) — Parse success is reported even when the core data write is incomplete

**Location:** `apps/money-mirror/src/app/api/statement/parse/route.ts:260-323`

If the `transactions` insert fails at lines 296-303, the route only logs to `console.error`, keeps the statement in `processed` state, emits `statement_parse_success`, and returns a success payload.

**Impact:** Corrupt persisted state, false-positive telemetry, broken advisories, broken weekly recap content, and an impossible-to-debug mismatch between what the user saw and what the DB contains.

**Required fix:** Make the statement + transaction persistence atomic. Use a transaction or keep the parent row in a non-success state unless child rows are saved. Do not emit `statement_parse_success` until the full write succeeds.

### R2 (MUST FIX) — Weekly recap metrics still undercount failures

**Location:** `apps/money-mirror/src/app/api/cron/weekly-recap/worker/route.ts:128-136`, `apps/money-mirror/src/app/api/cron/weekly-recap/route.ts:60-84`

The worker returns HTTP 200 with `{ ok: false }` when Resend fails. The master only treats non-2xx as failed, so failed emails are counted as successes in `weekly_recap_completed`.

**Impact:** Retention telemetry is materially wrong. A failed email run looks healthy in both the cron response and PostHog event.

**Required fix:** Return a non-2xx status on actual email-send failure, or make the master inspect the JSON body and reject `{ ok: false }`.

---

## Lens 3: Product Coherence & PM Alignment

### P1 (MUST FIX) — Advisory feed is never shown after upload because the authenticated route is called without auth

**Location:** `apps/money-mirror/src/app/dashboard/page.tsx:93-101`, `apps/money-mirror/src/app/api/dashboard/advisories/route.ts:26-45`

The advisories endpoint correctly requires a bearer token, but the dashboard fetch at lines 95-97 sends no `Authorization` header. The call returns 401, `advisories` stays empty, and the "Truth Bombs" section never renders.

**Impact:** One of the core MVP outputs, proactive coaching, is absent from the primary user flow even when parsing succeeds.

**Required fix:** Send the Supabase access token on the advisories request or move advisories into the persisted dashboard endpoint.

---

## Recommendations

### MUST FIX

| ID     | Finding                                                          | Location                                                | Fix                                                                      |
| ------ | ---------------------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------ |
| **A1** | Dashboard is transient client state, not a persisted read flow   | `dashboard/page.tsx`, missing `GET /api/dashboard`      | Add authenticated dashboard rehydration from DB on first load            |
| **R1** | Partial write still returns parse success                        | `statement/parse/route.ts`                              | Make parent + child writes atomic; only mark success after both persist  |
| **R2** | Weekly recap success counts still lie on email failure           | `weekly-recap/worker/route.ts`, `weekly-recap/route.ts` | Propagate worker failure as non-2xx or reject `{ ok: false }` in master  |
| **P1** | Advisory feed fetch omits auth header, so coaching never appears | `dashboard/page.tsx`, `dashboard/advisories/route.ts`   | Pass bearer token or consolidate into authenticated dashboard read route |

### MEDIUM

| ID     | Finding                                          | Location                | Fix                                                             |
| ------ | ------------------------------------------------ | ----------------------- | --------------------------------------------------------------- |
| **A2** | Weekly recap fan-out caps at 1000 statement rows | `weekly-recap/route.ts` | Page through eligible users or query distinct user IDs directly |

---

## Prompt Autopsy Check

File: `agents/backend-architect-agent.md`  
Section: `Mandatory Pre-Approval Checklist`  
Add: "For every dashboard, report, or results page linked from navigation or email, specify the exact persisted read path that rehydrates the page on first load. Client-memory-only result screens are not acceptable."

File: `agents/backend-architect-agent.md`  
Section: `Mandatory Pre-Approval Checklist`  
Add: "Any workflow that writes a parent record plus child records in the same user action must define an atomicity strategy. If the child write fails, the parent must not remain in a success state."

File: `agents/peer-review-agent.md`  
Section: `5 Product Alignment`  
Add: "For any dashboard or report promised in the plan or linked from email, verify that a fresh page load reconstructs the exact persisted state from the database. If the experience only works immediately after a prior mutation in the same tab, block approval."

---

## Verdict

**BLOCKED.**

Blocking issues:

- **Lens 1 / HIGH** — Missing persisted dashboard read path; `/dashboard` cannot rehydrate saved user data after refresh or email deep link.
- **Lens 2 / HIGH** — `statement/parse` reports success even when `transactions` persistence fails, leaving corrupt saved state.
- **Lens 2 / HIGH** — Weekly recap master still overstates success because worker email failures return HTTP 200.
- **Lens 3 / HIGH** — Dashboard calls the authenticated advisories route without auth, so the coaching feed never appears in the core flow.
