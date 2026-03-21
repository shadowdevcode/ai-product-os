# Plan: Issue-006 — Ozi Reorder Experiment

**Agent outputs**: Product Agent · Design Agent · Backend Architect · Database Architect
**Date**: 2026-03-20
**Issue**: issue-006
**Exploration**: experiments/exploration/exploration-006.md

---

## Plan Summary

A 21-day A/B experiment to validate whether a consumption-cycle-aware push notification + low-friction repeat order path improves repeat purchase rate vs. a no-nudge control group. This is an instrumentation layer spec — not a standalone app build. Two key architectural decisions (trigger mechanism and repeat order path) are presented as Option A/B pending confirmation from Ozi engineering.

---

## Product Specification

### Goal

Validate that a timely reorder reminder (Day 18–20 post-delivery) + low-friction repeat order flow improves 21-day repeat purchase rate among diaper/baby essential buyers on Ozi — vs. an organic baseline control group.

### Target User

**Primary**: Routine Replenishment Parent — parents of 0–3 year olds in Delhi-NCR who have placed ≥1 diaper/baby essential order on Ozi and have not reordered within the experiment window.

**Secondary**: Emergency Parent — at risk of churn to Blinkit/Zepto before the next emergency.

### Core User Journey

```
1. User receives diaper/baby essential delivery on Ozi
2. Day 18–20 post-delivery: push notification fires ("Time to restock?")
3. User taps notification → repeat order path (Option A or B)
4. User places order — or doesn't
5. Both outcomes recorded; repeat rate compared vs. control group at Day 21
```

### MVP Scope

**In scope:**
- Push notification trigger on Day 18–20 post `order_delivered` for diaper/essential SKU category
- Single notification variant (no copy A/B testing in V1)
- Repeat order path (Option A: pre-filled cart deep link / Option B: lightweight repeat screen)
- Quantity pre-set to last ordered amount, user-editable before checkout
- 50/50 test vs. control group split
- 7 instrumented events covering the full funnel
- Results computable from event data alone

**Out of scope (V1):**
- ML-based or personalized notification timing
- Per-sub-segment differentiation (Emergency / First-Time Parent)
- A/B testing of notification copy variants
- Multi-channel notifications (push only — no SMS, email, in-app banner)
- Subscription or auto-reorder infrastructure
- AI-suggested or system-recommended quantity changes

### Success Metrics

| Metric | Type | Target |
|---|---|---|
| 21-day repeat purchase rate (test vs. control) | North Star | +10pp lift |
| Notification open rate | Supporting | >25% |
| Cart/repeat screen → order conversion | Supporting | >40% |
| Notification opt-out rate | Guardrail | Alert if >5% |

### Acceptance Criteria

- Trigger fires on Day 18–20 post `order_delivered` for eligible SKU categories only
- Control group receives zero notifications throughout the 21-day experiment window
- All 7 funnel events reach PostHog with correct properties (validated in live view)
- 21-day repeat rate (test vs. control) can be computed from event data without manual data pulling
- Cron/trigger runs are logged with counts for observability

---

## UX Design

### Flow Diagram

```
order_delivered (Day 0)
        │
   [Day 18–20]
        │
  Push notification
  "Your [Brand] order was 3 weeks ago — time to restock?"
        │
        ├── [Option A] Deep link → Pre-filled cart
        │     • Previous SKU + quantity pre-loaded
        │     • Single "Place Order" CTA
        │     • Session expired? → Login → return to cart
        │
        └── [Option B] Deep link → /reorder/:orderId screen
              • Single SKU card (image, name, size, price)
              • Quantity pre-set to last order quantity (editable)
              • "Add to Cart" → standard Ozi checkout
              • Session expired? → Login → return to /reorder/:orderId
```

### Screens

**Screen 1: Push notification (system UI)**
- Title: "Time to restock?"
- Body: "Your [Brand] [Product] order was [N] days ago. Reorder in 1 tap."
- Action: Deep link to repeat order path

**Screen 2a (Option A): Pre-filled cart**
- Existing Ozi cart UI, populated with previous order items + quantities
- No new UI required
- Single "Place Order" CTA

**Screen 2b (Option B): Repeat order screen**
- Product image + name + size
- Quantity selector (pre-set to last ordered amount, editable by user)
- Price displayed
- "Add to Cart" CTA → routes to standard Ozi checkout
- Back button returns to home screen

**Screen 3: Order confirmation**
- Standard Ozi confirmation screen (no changes required)

### Key UX Decisions

- Show single SKU first (most recently ordered essential) — not the full previous order — reduces cognitive load
- Quantity pre-set but editable — trust the default, allow correction
- No promotional content or upsell in the reminder flow — purely functional
- Notification copy is factual ("X days ago"), not urgency-manufactured ("Running out!")
- Session expiry must redirect to login then return user to the same deep link destination

---

## System Architecture

**Architecture type**: Experiment instrumentation layer on top of existing Ozi platform. Not a standalone app.

### Trigger Mechanism

#### Option A — Event-based trigger *(if Ozi already has notification workflow tooling)*

- Hook into existing `order_delivered` event/webhook
- Use existing notification scheduling tool (e.g., OneSignal segment + delay, CleverTap journey, Braze canvas, or Firebase Scheduled Functions) to schedule notification at `delivered_at + 18–20 days`
- SKU category filter (`diapers`, `baby-essentials`) applied at trigger evaluation time
- Experiment cohort assignment (`user_id % 2`) evaluated at scheduling time
- Control group users are silently excluded at assignment — no notification scheduled
- No new cron infrastructure needed

**Advantage**: Lowest implementation cost if tooling exists. Exact timing per user.

#### Option B — Cron-based trigger *(if event-trigger tooling does not exist)*

- Daily cron job (runs at fixed UTC time) queries eligible users:
  ```sql
  SELECT user_id, order_id, sku_category, delivered_at
  FROM orders
  WHERE sku_category IN ('diapers', 'baby-essentials')
    AND delivered_at BETWEEN NOW() - INTERVAL '20 days' AND NOW() - INTERVAL '18 days'
    AND reminder_sent = false
  LIMIT 500
  ```
- Fan-out: for each eligible row, invoke `/api/reorder-worker` (one invocation per user)
- Worker: sends push notification via FCM/push provider, inserts into `reminders_sent`, marks `reminder_sent = true` on order row
- Hard cap: 500 users per cron run; remaining users picked up in next day's run
- Uses `Promise.allSettled` for fan-out — partial failures do not abort the batch
- Cron run logged to `cron_runs` table (users_evaluated, reminders_sent, errors)

**Advantage**: No dependency on existing tooling. Full observability via cron_runs table.

### Repeat Order Path

#### Option A — Pre-filled cart deep link *(if Ozi has cart persistence API or URL scheme)*

- Push notification deep link encodes `order_id` (or `cart_token` from cart persistence API)
- Ozi app resolves link → populates cart from order history
- User sees pre-filled cart with previous SKU + quantity
- Taps "Place Order" → standard checkout

**Implementation requirement**: Confirm with Ozi engineering that a cart deep link scheme exists and accepts `order_id` as a parameter.

#### Option B — Lightweight repeat screen *(if pre-filled cart does not exist)*

- Push notification deep links to `/reorder/:orderId`
- Screen calls `GET /api/order-history/:userId/last-essential` → returns last essential order's primary SKU + quantity
- Renders: product card + editable quantity selector + "Add to Cart" CTA
- "Add to Cart" routes into existing Ozi cart + checkout flow

**Implementation requirement**: One new screen + one new API endpoint.

### Experiment Assignment

- At trigger evaluation time, assign eligible user to test or control:
  ```
  group = (user_id.hashCode() % 2 === 0) ? 'test' : 'control'
  ```
- Write to `experiment_cohorts` table on first assignment (prevents re-randomization across cycles)
- Control group users: eligible for experiment, but no notification sent — used as organic baseline

### API Endpoints (Option B trigger only)

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/reorder-trigger` | Cron-invoked master: query eligible users, fan out to workers |
| POST | `/api/reorder-worker` | Per-user: send push, insert reminders_sent, mark order.reminder_sent |
| GET | `/api/order-history/:userId/last-essential` | Return last essential SKU + quantity for repeat screen (Option B cart) |

### Infrastructure Requirements

| Component | Requirement |
|---|---|
| Push notifications | FCM (Firebase Cloud Messaging) or existing Ozi push provider |
| Database | Existing Ozi PostgreSQL + 4 new experiment tables |
| Analytics | PostHog (project configured for experiment events) |
| Cron runtime | Vercel Cron / existing job scheduler (Option B only) |

---

## Database Schema

Four additive tables — no changes to existing Ozi tables.

```sql
-- Experiment cohort assignment
-- One row per user, persisted at first trigger evaluation to prevent re-randomization
CREATE TABLE experiment_cohorts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       TEXT NOT NULL UNIQUE,
  group_name    TEXT NOT NULL CHECK (group_name IN ('test', 'control')),
  assigned_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Reminder log — one row per notification dispatched
CREATE TABLE reminders_sent (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       TEXT NOT NULL,
  order_id      TEXT NOT NULL,
  sku_category  TEXT NOT NULL,
  trigger_day   INT NOT NULL,
  sent_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  delivered     BOOLEAN NOT NULL DEFAULT FALSE,
  opened        BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX idx_reminders_user     ON reminders_sent(user_id);
CREATE INDEX idx_reminders_sent_at  ON reminders_sent(sent_at);

-- Reorder events — tracks conversions from both test and control groups
CREATE TABLE reorder_events (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             TEXT NOT NULL,
  source              TEXT NOT NULL CHECK (source IN ('reminder', 'organic')),
  reminder_id         UUID REFERENCES reminders_sent(id),  -- null for control/organic
  original_order_id   TEXT NOT NULL,
  new_order_id        TEXT,  -- populated on order_placed
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_reorder_user   ON reorder_events(user_id);
CREATE INDEX idx_reorder_source ON reorder_events(source);

-- Cron run log — observability for Option B trigger
CREATE TABLE cron_runs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  users_evaluated   INT,
  reminders_sent    INT,
  errors            INT
);
```

---

## Implementation Tasks

### Setup (3 tasks)
1. Create `experiments/plans/plan-006.md` (this document) ✓
2. Add 4 experiment tables to Ozi `schema.sql` and apply in DB
3. Configure PostHog project and verify receive mode in live view

### Decision gate (2 tasks — PM + Engineering)
4. Confirm with Ozi engineering: **Option A or B** for trigger mechanism
5. Confirm with Ozi engineering: **Option A or B** for repeat order path

### Trigger layer (5 tasks)
6. Implement experiment assignment logic (`user_id % 2`) with `experiment_cohorts` write-on-first-assignment
7. [Option A trigger] Configure notification workflow with `order_delivered` + 18-day delay + SKU category filter + cohort exclusion
8. [Option B trigger] Build `/api/reorder-trigger` cron endpoint — eligibility query (LIMIT 500), fan-out to workers via `Promise.allSettled`, log to `cron_runs`
9. [Option B trigger] Build `/api/reorder-worker` — send push, insert `reminders_sent`, update `order.reminder_sent = true`
10. Verify control group receives zero notifications: run dry-run against test user in control cohort

### Repeat order path (4 tasks)
11. [Option A cart] Confirm deep link scheme accepts `order_id`; validate pre-population with test order in staging
12. [Option B cart] Build `GET /api/order-history/:userId/last-essential` — return primary SKU + quantity from last order
13. [Option B cart] Build `/reorder/:orderId` screen — product card, editable quantity selector, "Add to Cart" CTA
14. Handle expired session for both options: login redirect → return to original deep link destination

### Instrumentation — 7 required events (7 tasks)
15. `reminder_triggered` — at fan-out time; properties: `{user_id, order_id, sku_category, trigger_day, group: 'test'}`
16. `reminder_delivered` — on push provider delivery callback; properties: `{user_id, reminder_id}`
17. `reminder_opened` — on notification tap / deep link resolution; properties: `{user_id, reminder_id}`
18. `cart_prefilled` — on repeat screen load (Option B) or cart deep link resolution (Option A); properties: `{user_id, order_id, option: 'A'|'B'}`
19. `checkout_started` — on "Add to Cart" or "Place Order" tap; properties: `{user_id, source: 'reminder'}`
20. `order_placed` — on order confirmation for test group; properties: `{user_id, source: 'reminder', new_order_id}`
21. `control_order_placed` — organic orders from control-group users within experiment window; properties: `{user_id, source: 'organic', new_order_id}`

### Validation (4 tasks)
22. Verify all 7 events appear in PostHog live view with correct properties
23. Run dry-run of cron trigger with test user in test cohort: confirm `reminders_sent` row + `reminder_triggered` event in PostHog
24. Verify control-group users receive no notification across 5 consecutive cron evaluations
25. Confirm results query returns test vs. control 21-day repeat rate from PostHog event data alone

---

## Risks

### Technical

| ID | Severity | Risk | Mitigation |
|---|---|---|---|
| T1 | Medium | Option B cron may process >500 users per run at scale | Hard LIMIT 500 in query; remainder caught next day; log `users_evaluated` in cron_runs |
| T2 | Medium | Push opt-in rate unknown — may shrink test cohort below statistical significance | Validate opt-in rate before setting experiment duration; extend window if cohort is small |
| T3 | Low | Option A deep link session expiry silently drops conversion | Handle expired session: login redirect → return to deep link destination |

### Experiment Validity

| ID | Severity | Risk | Mitigation |
|---|---|---|---|
| E1 | Medium | `user_id % 2` is deterministic, not randomized | Acceptable for early-stage validation; note limitation in analysis writeup |
| E2 | Low | Control-group users may receive competitor reorder nudges (Blinkit etc.) | Cannot control; note as confounder in analysis; doesn't invalidate uplift signal |

### Product

| ID | Severity | Risk | Mitigation |
|---|---|---|---|
| P1 | Low | Day 18–20 window may be wrong for First-Time Parent (different pack depletion rate) | Instrument `trigger_day` on all events; test alternative windows in V2 |
| P2 | Low | Single SKU pre-fill may show wrong size if user upgraded between orders | Add size/variant to pre-fill payload; surface size in notification copy |
