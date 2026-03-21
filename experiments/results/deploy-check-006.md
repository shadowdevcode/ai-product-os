# Deploy Check — Issue-006: Ozi Reorder Experiment

**Date**: 2026-03-21
**Stage**: deploy_check
**Agent**: Deploy Agent
**Input**: qa-test-006.md (PASS), peer-review-006.md (APPROVED), metric-plan-006.md, full implementation in apps/ozi-reorder/

---

## 1. Build Verification

**Status: PASS**

```
npm run build — apps/ozi-reorder

✓ Compiled successfully in 1350ms
✓ TypeScript clean (no type errors)
✓ 9 dynamic routes generated:
  - /
  - /api/order-history/[userId]/last-essential
  - /api/orders/[orderId]
  - /api/reminders/opened
  - /api/reorder-events
  - /api/reorder-trigger
  - /api/reorder-worker
  - /api/seed
  - /reorder/[orderId]
```

Dependencies correct: `next@16`, `@neondatabase/serverless`, `posthog-js`, `posthog-node`, `typescript`.

QA medium findings verified fixed before build:

| Finding | Fix | Verified |
|---|---|---|
| QA1: `/api/reminders/opened` unguarded DB call | try/catch around `markReminderOpened`; always returns `{ ok: true }` | CONFIRMED |
| QA2: Worker `Promise.all` PostHog throws → 500 | PostHog calls wrapped in try/catch; returns 200 regardless | CONFIRMED |

---

## 2. Environment Configuration

**Status: PASS** (after fix)

`.env.local.example` exists. Updated to include all required variables:

| Variable | Present | Notes |
|---|---|---|
| `DATABASE_URL` | Yes | Neon DB connection string |
| `NEXT_PUBLIC_POSTHOG_KEY` | Yes | PostHog project key |
| `NEXT_PUBLIC_POSTHOG_HOST` | Yes | PostHog host |
| `CRON_SECRET` | Yes | Trigger auth |
| `NEXT_PUBLIC_CRON_SECRET` | Yes | Client-side trigger button |
| `DEMO_SECRET` | **Added** | `/api/reorder-events` auth (RR1 peer-review fix) |
| `NEXT_PUBLIC_DEMO_SECRET` | **Added** | Client `x-demo-key` header |
| `EXPERIMENT_END_DATE` | **Added** | Optional; halts trigger after experiment window |

No secrets hard-coded in source. All env vars consumed via `process.env.*`.

---

## 3. Infrastructure Readiness

**Status: PASS (manual step required)**

- **Database schema**: `schema.sql` exists, idempotent (`CREATE TABLE IF NOT EXISTS`). 5 tables: `mock_orders`, `experiment_cohorts`, `reminders_sent`, `reorder_events`, `cron_runs`.
- **Cron schedule**: `vercel.json` configures `/api/reorder-trigger` at `0 9 * * *` (09:00 UTC daily).
- **Vercel hosting**: App is a standard Next.js monolith — no additional infra required beyond a Neon DB connection string.

**Manual step before first deploy**:
1. Open Neon SQL Editor
2. Run `apps/ozi-reorder/schema.sql`
3. Verify all 5 tables exist

---

## 4. Monitoring and Logging

**Status: PASS**

| Signal | Implementation |
|---|---|
| Per-worker errors | `console.error` in reorder-worker and reorder-trigger; counted in `cron_runs.errors` |
| Cron run log | `cron_runs` table: `run_at`, `users_evaluated`, `reminders_sent`, `errors` — displayed on dashboard |
| PostHog event stream | 7 events wired; funnel viewable in PostHog |
| DB error banner | Dashboard shows actionable `dbError` state if `DATABASE_URL` is missing or Neon is down |
| PostHog analytics gap | Worker PostHog failures logged to console; DB state remains authoritative |

**Missing before production** (not demo blockers):
- `reminder_trigger_failed` event (per-user failure telemetry)
- `cron_run_completed` event (PostHog-level cron observability)
- `experiment_ended` event (marks conclusion in event stream)

---

## 5. Rollback Plan

**Status: PASS**

| Scenario | Rollback |
|---|---|
| Bad deploy | Revert to previous Vercel deployment (zero-downtime rollback in Vercel dashboard) |
| Schema migration | No migrations — `CREATE TABLE IF NOT EXISTS` only; schema is additive |
| Experiment abort | Set `EXPERIMENT_END_DATE` to today's date and redeploy; trigger halts immediately |
| Data corruption | `experiment_cohorts` is write-once (`ON CONFLICT DO NOTHING`); `mock_orders` can be re-seeded safely |

---

## 6. README Quality Gate

**Status: PASS** (after fix)

`apps/ozi-reorder/README.md` was **missing** — **deployment was initially BLOCKED**.

README created and verified to contain all required sections:

| Check | Status |
|---|---|
| One-liner (what it does + who it's for) | PASS |
| Numbered user journey | PASS |
| Stack table (all layers) | PASS |
| All env vars listed by name | PASS |
| Schema apply step (tables listed, where to run) | PASS |
| `npm run dev` + what success looks like | PASS |
| Every HTTP endpoint documented (method, body, response) | PASS |
| Analytics events table (PostHog) | PASS |
| Key design decisions | PASS |
| `.env.local.example` exists | PASS |
| README is not the Next.js boilerplate | PASS |

---

## Deployment Decision

**APPROVED**

All blockers resolved:

1. ~~README missing~~ → README created at `apps/ozi-reorder/README.md`
2. ~~`.env.local.example` missing `DEMO_SECRET`~~ → Added `DEMO_SECRET`, `NEXT_PUBLIC_DEMO_SECRET`, `EXPERIMENT_END_DATE`

Build: TypeScript clean, 9 routes, 1.35s compile.
QA medium findings (QA1, QA2): both verified fixed.
Infrastructure: `schema.sql` idempotent, Vercel cron configured.
Rollback: Vercel deployment history + `EXPERIMENT_END_DATE` abort guard.

**Manual step required before first deploy**: Apply `schema.sql` in Neon SQL Editor.

**Proceed to `/postmortem`.**
