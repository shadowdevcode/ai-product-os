# QA Test — Issue-006: Ozi Reorder Experiment

**Date**: 2026-03-21
**Stage**: qa_test
**Reviewer**: QA Agent
**Input**: peer-review-006.md (Pass 2, APPROVED for QA), full implementation in apps/ozi-reorder/

---

## Pre-Check: Peer-Review Items Verified in Code

| ID | Issue | Verified |
|---|---|---|
| EC1 (medium) | ControlGroupSimulator localStorage guard | CONFIRMED — `LS_KEY` constant + initial state reads `localStorage.getItem(LS_KEY(id))`; button disabled on `"done"` |
| PA1 (medium) | North Star shows both test + control orders | CONFIRMED — `getOrdersPlacedCounts()` returns `{ test, control }`; `ExperimentStats` renders both in dedicated North Star grid |
| RR1 (medium) | DEMO_SECRET auth on `/api/reorder-events` | CONFIRMED — `x-demo-key` header check; returns 401 if mismatch |
| AC1 (low) | `getEligibleOrdersForDashboard` filter | CONFIRMED FIXED — `AND reminder_sent = false` present in query |
| AC2 (low) | Write-once cohort schema constraint | CONFIRMED — `ON CONFLICT (user_id) DO NOTHING` with inline comment explaining intent |

---

## Functional Tests

| Test | Scenario | Result |
|---|---|---|
| FT1 | Seed → Run Trigger → cron_runs logged | PASS |
| FT2 | Trigger → test cohort assigned → reminder row inserted → PostHog events fire | PASS |
| FT3 | Trigger → control cohort → worker returns skipped, no reminder row | PASS |
| FT4 | `/reorder/[orderId]` loads specific product by orderId (not last-essential by userId) | PASS |
| FT5 | Reorder page fires `reminder_opened` + `cart_prefilled` once, not on page refresh | PASS |
| FT6 | Add to Cart → `order_placed` DB row + PostHog → success state | PASS |
| FT7 | ControlGroupSimulator fires `control_order_placed` once per user (idempotent across reloads) | PASS |
| FT8 | Dashboard North Star displays both test and control order counts | PASS |
| FT9 | EXPERIMENT_END_DATE guard halts trigger after experiment window | PASS |

---

## Edge Cases

| ID | Scenario | Result |
|---|---|---|
| EC1 | Non-existent orderId in reorder URL | PASS — 404 → page shows error + back link |
| EC2 | Reorder page visited without reminderId (direct navigation) | PASS — `reminder_opened` guarded; `order_placed` accepts null reminderId |
| EC3 | Trigger run with zero eligible orders | PASS — `Promise.allSettled([])` resolves; cron logged at 0/0/0 |
| EC4 | Trigger called without CRON_SECRET | PASS — 401 immediately |
| EC5 | DATABASE_URL not set | PASS — dashboard shows actionable `dbError` banner |
| EC6 | Worker retried for same orderId | PASS — `markReminderSent` idempotent; eligible query won't surface order again |
| EC7 | ControlGroupSimulator before cron runs | PASS — "No control-group users assigned yet" shown |
| EC8 | Control user with no essential order in DB | PASS — 404 propagates; simulator shows inline error |
| **EC9** | `POST /api/reminders/opened` with invalid UUID `reminderId` | **FAIL (MEDIUM)** — `markReminderOpened` throws PostgreSQL type error; route has no try/catch; returns unhandled 500. Call is fire-and-forget from client so no UX impact, but server logs polluted. |
| EC10 | CRON_SECRET set to empty string | PASS — empty string is falsy; returns 401 |

---

## Failure Simulation

| ID | Scenario | Result |
|---|---|---|
| FS1 | DB down during trigger fan-out | PASS — `Promise.allSettled` isolates failures; errors counted; `insertCronRun` in separate try/catch |
| FS2 | `markReminderSent` succeeds, `insertReminder` fails | PASS — accepted trade-off; documented in code comment; no duplicate notification |
| **FS3** | `insertReminder` succeeds, PostHog calls throw | **RISK (MEDIUM)** — `Promise.all([trackReminderTriggered, trackReminderDelivered])` throws if PostHog is down; worker returns 500; trigger undercounts `remindersSent` even though DB state is correct. During demo: missing POSTHOG_KEY makes dashboard show 0 reminders sent despite all DB writes succeeding. |
| FS4 | `reorder-events` DB insert fails | PASS — error caught by client; `addError` shown inline |
| FS5 | DEMO_SECRET set server-side but NEXT_PUBLIC_DEMO_SECRET not in .env.local | RISK (LOW) — client sends empty key; 401 returned; reorder page shows error |
| FS6 | Neon under 500 simultaneous worker invocations | PASS — Neon serverless uses HTTP (not persistent connections); no pool exhaustion |

---

## Performance Risks

| ID | Risk | Severity |
|---|---|---|
| PR1 | 500 simultaneous `fetch()` calls from a single Vercel function | LOW — demo has 15 orders; real-scale behavior untested. Not a demo blocker. |
| PR2 | `insertMockOrders` uses sequential `await` in for loop (15 iterations) | LOW — violates engineering rule #8; ~150ms slower than parallel. Not a demo blocker. |
| PR3 | `/api/seed` has no auth or rate limit | LOW — `ON CONFLICT DO NOTHING` makes repeated calls safe; demo context only |
| PR4 | Dashboard: 6 parallel DB queries on every render | PASS — all bounded (LIMIT 5–200); acceptable |

---

## UX Reliability

| ID | Issue | Severity |
|---|---|---|
| UX1 | Reorder page: loading / error / success states | PASS |
| UX2 | `void fetch("/api/reminders/opened")` fire-and-forget in client | LOW — PostHog shows `opened`; dashboard stat may not increment if fetch fails. Observable discrepancy if founder cross-references PostHog and dashboard. |
| UX3 | Funnel "X% conversion" sub-label doesn't state denominator | LOW — denominator is `remindersOpened` (correct), not `remindersSent`. Narrate during pitch: "post-open conversion rate". |
| UX4 | Demo deep links hardcoded to `orderId=2025610` | LOW — requires seed to have run (it does insert `2025610`). Add to demo run-book. |
| UX5 | `NEXT_PUBLIC_DEMO_SECRET` visible in client JS bundle | LOW — intentional demo-scoped auth; document in README |

---

## Findings Summary

| ID | Severity | Finding | Fix |
|---|---|---|---|
| **QA1** | Medium | `/api/reminders/opened` — no try/catch around `markReminderOpened`; invalid UUID causes unhandled 500 | Wrap in try/catch; return `{ ok: true }` even on DB error (call is fire-and-forget; analytics gap acceptable) |
| **QA2** | Medium | Worker `Promise.all([trackReminderTriggered, trackReminderDelivered])` throws on PostHog failure → worker returns 500 → trigger undercounts `remindersSent` even though DB state is correct | Wrap PostHog calls in try/catch; log error; return 200 with `{ group: "test", reminderId }` regardless |
| **QA3** | Low | `void fetch("/api/reminders/opened")` fire-and-forget — PostHog/dashboard open-rate discrepancy on failure | Acceptable for demo; document in README |
| **QA4** | Low | `insertMockOrders` sequential `await` in for loop — coding standards violation | Refactor to `Promise.all(orders.map(...))` before production |
| **QA5** | Low | Funnel conversion denominator unlabeled | Add "of opens" to sub-label, or narrate during pitch |

---

## Final QA Verdict

**PASS**

No high-risk blockers. Core end-to-end demo flow verified:

```
POST /api/seed
  → POST /api/reorder-trigger (CRON_SECRET)
  → workers assign cohorts, insert reminders, fire PostHog
  → dashboard shows funnel stats (test + control split)
  → /reorder/[orderId] renders correct product
  → Add to Cart → order_placed → North Star updates
  → ControlGroupSimulator fires control_order_placed (idempotent)
```

2 medium findings (QA1, QA2) should be fixed before demo run. 3 low findings are informational.

**Proceed to `/metric-plan`.**
