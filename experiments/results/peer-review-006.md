# Peer Review — Issue-006: Ozi Reorder Experiment
**Date**: 2026-03-21
**Stage**: peer_review (Pass 2 — validation pass)
**Reviewer**: Peer Review Agent (Principal Engineer perspective)
**Input**: All prior MUST FIX items claimed fixed. Full implementation re-review.

---

## Prior Must-Fix Items — Verification

| ID | Prior Issue | Verification | Status |
|---|---|---|---|
| RR1 | orderId decorative — reorder page fetched last-essential by userId | `/api/orders/[orderId]/route.ts` calls `getOrderByOrderId(orderId)`. Reorder page fetches from `/api/orders/${orderId}` using `params.orderId`. | **FIXED** |
| EC1 | Sequential `insertReminder` + `markReminderSent` — partial failure causes duplicate | `reorder-worker/route.ts` now calls `markReminderSent` before `insertReminder`. Correct trade-off, clearly commented. | **FIXED** |
| PA1 | Control group conversion path — nothing emitted `control_order_placed` | `ControlGroupSimulator.tsx` added on dashboard. Fires `control_order_placed` via `/api/reorder-events`. Production dependency documented. | **FIXED** |

Prior medium items S1 (DISTINCT ON user_id), EC2 (localStorage reminder_opened deduplication), RR2 (EXPERIMENT_END_DATE guard): all verified fixed.

---

## Architecture Concerns

**AC1 — `getEligibleOrdersForDashboard()` has no `reminder_sent` filter (LOW)**

`getEligibleOrders()` (cron path) filters `AND reminder_sent = false`. `getEligibleOrdersForDashboard()` (dashboard path) does not. After running the cron, all eligible orders flip to `reminder_sent = true` but still appear in the "Eligible Orders" table — making it look like reminders remain pending when they don't. Confusing during a live founder demo.

**AC2 — Write-once cohort still a convention, not a schema constraint (LOW, carried)**

`upsertCohort()` uses `ON CONFLICT (user_id) DO UPDATE SET user_id = EXCLUDED.user_id`. A future engineer reading a "broken upsert" will change it to update `group_name`, destroying cohort stability mid-experiment. Schema does not enforce write-once.

---

## Scalability Risks

No new concerns. Fan-out, DISTINCT ON, LIMIT 500, and experiment end-date guard all verified in place.

---

## Edge Cases

**EC1 — ControlGroupSimulator non-idempotent across page refreshes (MEDIUM)**

Button disables after one click via React component state (`status: "done"`). The dashboard is server-rendered — full page reload reinstantiates the component with all statuses `idle`. Each new click fires `control_order_placed` to PostHog and inserts a new row in `reorder_events`. No `localStorage` guard, no DB `ON CONFLICT DO NOTHING`, no uniqueness constraint on `(user_id, source)`.

During a live founder demo: present deck → run cron → simulate control conversions → founder refreshes dashboard → click again → control conversion count doubles. North Star comparison is corrupted.

The EC2 fix pattern (`localStorage` key per `reminderId`) is the direct fix: key `ozi_control_simulated_${userId}`, checked on mount.

---

## Reliability Risks

**RR1 — `/api/reorder-events` accepts unauthenticated metric writes (MEDIUM, carried)**

No auth, no rate limit, no ownership check. `userId` from request body, not session-validated. Dashboard demo links expose `user_01`–`user_03`. A browser console POST of `{ eventType: "order_placed", userId: "user_01", orderId: "2025610" }` inserts a DB row and fires PostHog `order_placed`. Metric fabrication risk during the Ozi founder pitch. Was flagged as medium in Pass 1 with "fix before demo or document as known gap." Still neither fixed nor documented.

---

## Product Alignment Issues

**PA1 — `getOrdersPlacedCount()` counts only test-group conversions (MEDIUM)**

Queries `WHERE source = 'reminder'` — excludes `source = 'organic'` (control group). The North Star is a **comparison** — test rate vs. control rate. The dashboard shows only one side. A founder walking through the demo will see test conversions only and need a manual explanation that "control is elsewhere." Undercuts pitch coherence.

Fix: split into `{ test, control }` counts and display both in `ExperimentStats`.

---

## Verdict

**APPROVED for QA. Medium items must be fixed before founder demo.**

All three prior MUST FIX blockers are correctly resolved. No new architecture-breaking or QA-blocking issues. The two medium items (EC1 ControlGroupSimulator inflation, PA1 metric display) will visibly undermine the founder pitch if not addressed — they are demo blockers, not QA blockers.

---

## Medium Items (fix before founder demo)

| ID | Severity | Issue | Fix |
|---|---|---|---|
| **EC1** | Medium | ControlGroupSimulator resets on page refresh — control conversions inflate | Add `localStorage` key `ozi_control_simulated_${userId}` in `simulateOrganicOrder()`. Check on mount; disable button if key exists. Same pattern as EC2 `reminder_opened` fix. |
| **PA1** | Medium | Orders Placed stat excludes control group — one-sided dashboard | Update `getOrdersPlacedCount()` to return `{ test: number, control: number }`. Display both in `ExperimentStats`. |
| **RR1** | Medium | `/api/reorder-events` unauthenticated — fabrication risk during pitch | Add static `x-demo-key` header check against `DEMO_SECRET` env var. Document limitation in `README.md`. |

## Low Items (document, no fix required before QA)

| ID | Severity | Issue | Recommendation |
|---|---|---|---|
| **AC1** | Low | `getEligibleOrdersForDashboard()` shows already-processed orders | Add `AND reminder_sent = false` to query. |
| **AC2** | Low | Write-once cohort enforced by SQL convention not schema | Change to `ON CONFLICT (user_id) DO NOTHING` or add inline comment explaining the intentional no-op. |

---

## Prompt Autopsy

```
File: agents/peer-review-agent.md
Section: ## 5 Product Alignment
Add: "For demo-instrumented experiments, verify that any manual simulation tool
(e.g. ControlGroupSimulator) has idempotency guards that survive page reload —
not just in-memory component state. Apply localStorage keying or DB uniqueness
constraints matching the pattern used for PostHog deduplication elsewhere."

File: agents/backend-architect-agent.md
Section: ## Dashboard & Reporting
Add: "Any experiment dashboard stat that measures a North Star comparison
(test vs. control) MUST display BOTH sides of the comparison as separate values.
A single aggregate count that filters to one cohort is not a valid North Star metric display."
```
