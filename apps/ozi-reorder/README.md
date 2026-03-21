# Ozi Reorder Experiment

An experiment instrumentation layer for Ozi's dark-store platform that validates whether a timely reorder reminder (Day 18–20 post-delivery) and one-tap pre-filled cart repeat order improves 21-day repeat purchase rate for diaper and baby essential buyers.

**Founder sees test vs. control repeat purchase lift in a live demo in under 5 minutes.**

---

## What it does

1. Seed 15 mock baby essential orders (Pampers, MamyPoko, Huggies, Himalaya, Johnson's) representing recent Ozi deliveries
2. Cron trigger evaluates eligible orders (Day 18–20 since delivery, reminder not yet sent) and fans out one worker per order
3. Each worker deterministically assigns the user to test or control (50/50 hash-based), then inserts a reminder row and fires PostHog events for test-group users
4. Test-group users receive a `/reorder/[orderId]` deep link — the reorder screen shows the exact product with a pre-filled quantity card
5. User taps "Add to Cart" → "Place Order" → `order_placed` event fires to DB and PostHog
6. Dashboard displays North Star (test repeat rate vs. control repeat rate), funnel stats, eligible orders table, and cron run log

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, TypeScript, Tailwind CSS 4 |
| Backend | Next.js API Routes (fan-out cron pattern) |
| AI | None — pure experiment instrumentation |
| Database | Neon DB via `@neondatabase/serverless` |
| Analytics | PostHog (`posthog-js` + `posthog-node`) |
| Hosting | Vercel (cron via `vercel.json`) |

---

## Setup

### 1. Install dependencies

```bash
cd apps/ozi-reorder
npm install
```

### 2. Configure environment variables

```bash
cp .env.local.example .env.local
# Fill in all values before running
```

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | Neon DB connection string |
| `NEXT_PUBLIC_POSTHOG_KEY` | Yes | PostHog project API key |
| `NEXT_PUBLIC_POSTHOG_HOST` | Yes | PostHog host (default: `https://app.posthog.com`) |
| `CRON_SECRET` | Yes | Auth secret for `/api/reorder-trigger` (server-side) |
| `NEXT_PUBLIC_CRON_SECRET` | Yes | Same secret, exposed to client for dashboard "Run Trigger Now" button |
| `DEMO_SECRET` | Yes | Static key to guard `/api/reorder-events` against metric fabrication during demo |
| `NEXT_PUBLIC_DEMO_SECRET` | Yes | Same secret, sent as `x-demo-key` header from reorder page client |
| `EXPERIMENT_END_DATE` | Optional | ISO date string (e.g. `"2026-04-10"`) — trigger halts after this date |

> **Note**: `NEXT_PUBLIC_DEMO_SECRET` is intentionally visible in client JS — this is demo-scoped auth, not production auth.

### 3. Apply database schema

Open your Neon DB SQL Editor and run `schema.sql`. All statements are idempotent (`CREATE TABLE IF NOT EXISTS`).

Tables created:

| Table | Purpose |
|---|---|
| `mock_orders` | Simulates Ozi's order history (additive — no real table changes needed) |
| `experiment_cohorts` | One row per user; write-once cohort assignment (test/control) |
| `reminders_sent` | One row per dispatched notification; tracks opened status |
| `reorder_events` | Conversion events for both test (`source='reminder'`) and control (`source='organic'`) |
| `cron_runs` | Cron run log: users evaluated, reminders sent, errors |

Verify the five tables exist before running the app.

### 4. Run locally

```bash
npm run dev
# → http://localhost:3000
```

**What you should see on success**: The experiment dashboard with an "Eligible Orders" table showing 0 rows and a "Seed Demo Orders" button.

**If setup is wrong**: A red `dbError` banner on the dashboard confirms the DB connection failed. Check `DATABASE_URL` in `.env.local`.

---

## API

### `POST /api/seed`

Seeds 15 mock baby essential orders into `mock_orders`. Safe to run multiple times (`ON CONFLICT DO NOTHING`).

**Body**: none

**Returns**: `{ inserted: number }`

---

### `POST /api/reorder-trigger`

Cron master endpoint. Evaluates eligible orders and fans out one worker per order.

**Auth**: `Authorization: Bearer <CRON_SECRET>` header required. Returns 401 otherwise.

**Behavior**: Checks `EXPERIMENT_END_DATE` guard. Fetches orders where `delivered_at` is Day 18–20 ago and `reminder_sent = false` (LIMIT 500). Invokes `/api/reorder-worker` for each via `Promise.allSettled`. Logs aggregate result to `cron_runs`.

**Returns**: `{ evaluated: number, sent: number, errors: number }`

**Cron schedule**: `0 9 * * *` (09:00 UTC daily) via `vercel.json`.

---

### `POST /api/reorder-worker`

Processes one eligible order. Assigns cohort, inserts reminder, fires PostHog.

**Auth**: `Authorization: Bearer <CRON_SECRET>` header required.

**Body**: `{ userId: string, orderId: string, skuCategory: string, triggerDay: number }`

**Behavior**:
- Assigns user to test/control deterministically (hash of userId)
- Control group: returns `{ group: "control", skipped: true }`, no reminder inserted
- Test group: calls `markReminderSent` (prevents re-eligibility), then `insertReminder`, then fires `reminder_triggered` + `reminder_delivered` PostHog events in parallel. PostHog failure is non-fatal — DB writes are already committed.

**Returns**: `{ group: "test", reminderId: string }` or `{ group: "control", skipped: true }`

---

### `GET /api/orders/[orderId]`

Fetches a specific order by `orderId` for the reorder screen.

**Returns**: `{ order_id, user_id, product_name, brand, quantity, price_inr, image_url, sku_category }` or 404.

---

### `GET /api/order-history/[userId]/last-essential`

Fetches the most recent diaper or baby-essential order for a user. Used internally by the ControlGroupSimulator.

**Returns**: order object or 404.

---

### `POST /api/reminders/opened`

Marks a reminder as opened in `reminders_sent`. Called fire-and-forget from the reorder page.

**Body**: `{ reminderId: string }`

**Behavior**: DB errors are caught and logged; always returns `{ ok: true }` (analytics gap is acceptable — PostHog captures the client-side event regardless).

---

### `POST /api/reorder-events`

Records a conversion event for test or control group. Used for `checkout_started`, `order_placed`, and `control_order_placed`.

**Auth**: `x-demo-key: <DEMO_SECRET>` header required (when `DEMO_SECRET` env var is set).

**Body**: `{ eventType: "checkout_started" | "order_placed" | "control_order_placed", userId: string, orderId: string, reminderId?: string, newOrderId?: string }`

**Behavior**:
- `checkout_started`: PostHog only, no DB row (prevents inflating orders placed count)
- `order_placed`: inserts into `reorder_events` (source=`reminder`) + fires PostHog `order_placed`
- `control_order_placed`: inserts into `reorder_events` (source=`organic`) + fires PostHog `control_order_placed`

**Returns**: `{ eventId: string, newOrderId: string }`

---

## Analytics

| Event | Where | Properties |
|---|---|---|
| `reminder_triggered` | Server (`posthog-node`) | `user_id`, `order_id`, `sku_category`, `trigger_day`, `group: "test"` |
| `reminder_delivered` | Server (`posthog-node`) | `user_id`, `reminder_id` |
| `reminder_opened` | Client (`posthog-js`) | `user_id`, `reminder_id` |
| `cart_prefilled` | Client (`posthog-js`) | `user_id`, `order_id`, `option: "B"` |
| `checkout_started` | Client via `/api/reorder-events` | `user_id`, `source: "reminder"` |
| `order_placed` | Server via `/api/reorder-events` | `user_id`, `source`, `new_order_id` |
| `control_order_placed` | Server via `/api/reorder-events` | `user_id`, `source: "organic"`, `new_order_id` |

**North Star query**: 21-day repeat purchase rate lift — `order_placed (test) / test_cohort_size` vs. `control_order_placed (control) / control_cohort_size`. Target: ≥ +10pp lift.

**Missing error-path events** (required before production): `reminder_trigger_failed`, `cron_run_completed`, `experiment_ended`.

---

## Key design decisions

- **Experiment instrumentation layer, not a standalone product** — this app piggybacks on mock Ozi orders; in production, the trigger and reorder path would integrate with Ozi's real order management system and push provider.
- **Neon DB over Supabase** — no auth is needed; Neon is lighter (connection string only, no RLS setup) and works natively in Vercel serverless via HTTP.
- **Cron fan-out pattern** — `/api/reorder-trigger` fans out to one `/api/reorder-worker` invocation per eligible order via `Promise.allSettled`, preventing a single user failure from blocking the batch.
- **`markReminderSent` before `insertReminder`** — if `insertReminder` fails after marking sent, the order becomes ineligible (no duplicate notification) with only an analytics gap. The reverse ordering risks sending two notifications.
- **Deterministic cohort assignment** — `assignCohort(userId)` uses a hash so reruns produce the same 50/50 split; `ON CONFLICT DO NOTHING` on `experiment_cohorts` makes the assignment write-once.
- **`DEMO_SECRET` auth on `/api/reorder-events`** — lightweight header check prevents trivial metric fabrication from browser console during the founder pitch. Not production auth.
- **ControlGroupSimulator** — a dashboard component that proxies organic conversion signals for the control group. In production, this would be wired to Ozi's real order confirmation events.
