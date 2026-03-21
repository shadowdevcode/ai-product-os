# Codebase Context: ozi-reorder
Last updated: 2026-03-21

## What This App Does

Parents of 0–3 year olds on Ozi's dark-store platform frequently forget to reorder baby essentials (diapers, wipes, etc.) until they run out. This app is an experiment instrumentation layer that tests whether a timely push reminder (Day 18–20 after an order is delivered) combined with a one-tap pre-filled reorder screen improves the 21-day repeat purchase rate. It simulates Ozi's order infrastructure with mock data, assigns users to test/control groups 50/50, fires push notifications via the cron trigger, tracks the full funnel (reminder_triggered → reminder_delivered → reminder_opened → cart_prefilled → checkout_started → order_placed), and presents a founder-facing dashboard showing both sides of the North Star comparison.

## Architecture Overview

- **Frontend**: Next.js 16 (App Router), TypeScript strict, Tailwind CSS. Dashboard at `/` (server component with client sub-components). Reorder screen at `/reorder/[orderId]` (client component with product card, quantity selector, and PostHog event wiring).
- **Backend**: Next.js API Routes. Master cron at `/api/reorder-trigger` (fan-out pattern, LIMIT 500). Per-user worker at `/api/reorder-worker` (cohort assignment, reminder insert, PostHog). Order lookup at `/api/orders/[orderId]`. Reorder event ingestion at `/api/reorder-events` (DEMO_SECRET auth). Reminder opened tracking at `/api/reminders/opened`.
- **Database**: Neon (serverless PostgreSQL via `@neondatabase/serverless`). 5 tables: `mock_orders`, `experiment_cohorts`, `reminders_sent`, `reorder_events`, `cron_runs`. No auth, no RLS (demo context).
- **AI Integration**: None. This app is a pure experiment instrumentation layer — no AI calls.
- **Analytics**: PostHog (`posthog-js` client + `posthog-node` server). 7 events wired. North Star: 21-day repeat purchase rate lift (test vs. control, +10pp target).

## Key Files

| File | Purpose |
|---|---|
| `src/app/page.tsx` | Dashboard — experiment stats, eligible orders table, cron run log, ControlGroupSimulator, TriggerButton |
| `src/app/reorder/[orderId]/page.tsx` | Reorder screen — fetches specific order by orderId, fires reminder_opened/cart_prefilled/checkout_started/order_placed |
| `src/app/api/reorder-trigger/route.ts` | Master cron (CRON_SECRET auth) — fetches eligible orders (LIMIT 500, reminder_sent=false, 18–20 days post-delivery), fans out to reorder-worker |
| `src/app/api/reorder-worker/route.ts` | Per-user worker (CRON_SECRET auth) — deterministic cohort assign (hash-based), inserts reminder row, fires PostHog events via Promise.allSettled with per-call .catch() |
| `src/app/api/reorder-events/route.ts` | Reorder event ingestion (DEMO_SECRET auth via x-demo-key header) — inserts to reorder_events, fires order_placed PostHog event (single server-side emission) |
| `src/lib/db.ts` | All Neon DB operations — getEligibleOrders, upsertCohort, insertReminder, markReminderSent, getOrderByOrderId, getExperimentStats, etc. |
| `src/lib/posthog.ts` | posthog-node server-side client — trackReminderTriggered, trackReminderDelivered, trackOrderPlaced |
| `src/components/ControlGroupSimulator.tsx` | Dashboard control group tool — fires control_order_placed via /api/reorder-events; idempotent via localStorage key `ozi_control_simulated_${userId}` checked on mount |
| `schema.sql` | Idempotent DDL for all 5 tables — apply in Neon SQL Editor before first deploy |

## Data Model

| Table | Key Columns | Notes |
|---|---|---|
| `mock_orders` | `order_id` (TEXT UNIQUE), `user_id`, `sku_category`, `delivered_at`, `reminder_sent` | Simulates Ozi's order table. `reminder_sent` flipped before inserting reminder (write-before-read pattern to prevent duplicate on partial failure). |
| `experiment_cohorts` | `user_id` (UNIQUE), `group_name` (test/control), `assigned_at` | Write-once: `ON CONFLICT (user_id) DO NOTHING`. Cohort assignment is deterministic (hash-based) and permanent for the experiment duration. |
| `reminders_sent` | `user_id`, `order_id`, `trigger_day`, `delivered`, `opened` | One row per notification dispatched. `opened` flipped by `/api/reminders/opened`. |
| `reorder_events` | `user_id`, `source` (reminder/organic), `reminder_id` (FK), `original_order_id` | Both test (source=reminder) and control (source=organic) conversions land here. North Star queries JOIN this with experiment_cohorts. |
| `cron_runs` | `run_at`, `users_evaluated`, `reminders_sent`, `errors` | Cron observability — displayed on dashboard. |

## API Endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `POST` | `/api/reorder-trigger` | `Authorization: Bearer CRON_SECRET` | Master cron — triggers per-user workers via Promise.allSettled fan-out |
| `POST` | `/api/reorder-worker` | `Authorization: Bearer CRON_SECRET` | Per-user: assign cohort, insert reminder, fire PostHog events |
| `GET` | `/api/orders/[orderId]` | None | Fetch specific order by order_id for reorder screen |
| `GET` | `/api/order-history/[userId]/last-essential` | None | Legacy helper — returns last essential order by userId (NOT used for reorder screen — orderId-specific route used instead) |
| `POST` | `/api/reorder-events` | `x-demo-key: DEMO_SECRET` | Ingest order_placed events (both test via reminder and control via organic). Single server-side emission point for order_placed. |
| `POST` | `/api/reminders/opened` | None | Mark reminder as opened + update PostHog. Fire-and-forget from client. Try/catch swallows DB errors (analytics gap acceptable). |
| `POST` | `/api/seed` | None | Insert 15 mock baby essential orders for demo. Idempotent (ON CONFLICT DO NOTHING). |

## Things NOT to Change Without Reading First

1. **`markReminderSent` is called BEFORE `insertReminder`** in `reorder-worker`. This is intentional — prevents duplicate reminders on partial DB failure. Reversing the order breaks the deduplication guarantee. See inline comment.

2. **`order_placed` fires only from `/api/reorder-events`** — the reorder page does NOT fire it via useEffect. The server is the single canonical emission source. Adding a client-side re-fire will double-count the North Star metric.

3. **Cohort assignment uses `ON CONFLICT (user_id) DO NOTHING`** — the upsert is intentionally a no-op on conflict. Do not change it to `DO UPDATE SET group_name = ...` — that would destroy cohort stability mid-experiment.

4. **`ControlGroupSimulator` checks `localStorage.getItem(LS_KEY(userId))` on mount** — this is the page-reload idempotency guard. Do not replace with component state only.

5. **`reorder-worker` uses `Promise.allSettled` with per-call `.catch()` for PostHog** — PostHog failure must never return 500 from the worker. The trigger counts workers as failed based on HTTP status.

6. **`getEligibleOrders` (cron path) filters `reminder_sent = false`** — `getEligibleOrdersForDashboard` also filters this now (post-peer-review fix). Both must maintain this filter or the dashboard will show already-processed orders.

## Known Limitations

- **Error-path telemetry not wired**: `reminder_trigger_failed`, `cron_run_completed`, `experiment_ended` events are missing. Required before production. Flagged in postmortem-006.
- **No real push infra**: Reminders are simulated — no actual WhatsApp/FCM/email push is sent. Production would require Ozi engineering integration with their push delivery system.
- **Demo auth only**: `DEMO_SECRET` / `NEXT_PUBLIC_DEMO_SECRET` are visible in the client bundle. Acceptable for demo context. Replace with proper session auth before production.
- **`/api/seed` is unauthenticated**: Safe because of `ON CONFLICT DO NOTHING`, but should be removed or locked down in production.
- **`insertMockOrders` uses sequential await loop**: ~150ms slower than parallel. Low priority for demo. Refactor to `Promise.all(orders.map(...))` before production (QA4).
- **`POST /api/reminders/opened`** is fire-and-forget from the client — a network failure creates a discrepancy between PostHog `reminder_opened` events and the dashboard open-rate stat.
