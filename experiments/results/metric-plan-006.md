# Metric Plan — Issue-006: Ozi Reorder Experiment

**Date**: 2026-03-21
**Stage**: metric_plan
**Agent**: Analytics Agent
**Input**: issue-006.md, plan-006.md, qa-test-006.md

---

## North Star Metric

**21-Day Repeat Purchase Rate: Test vs. Control**

Definition: The percentage of users in each cohort who place a new diaper/baby essential order within 21 days of their qualifying `order_delivered` event.

```
test_repeat_rate  = orders_placed (test group, source='reminder', within 21d) / test_cohort_size
control_repeat_rate = control_order_placed events (within 21d) / control_cohort_size
lift = test_repeat_rate − control_repeat_rate
```

**Target**: ≥ +10 percentage-point lift (test vs. control)

**Why this is the right North Star**: Directly tests the hypothesis — that a timely nudge + low-friction reorder path improves repeat purchase within the consumption cycle. All other metrics are upstream signals that help explain whether this number moves or doesn't.

**Ground-truth source**: Both PostHog (`order_placed` + `control_order_placed` events) and the `reorder_events` DB table. If PostHog and DB diverge, DB is authoritative.

---

## Supporting Metrics

| # | Metric | Definition | Target | Why It Matters |
|---|---|---|---|---|
| S1 | **Notification Open Rate** | `reminder_opened` / `reminder_triggered` | > 25% | Validates timing (Day 18–20) and copy relevance; if open rate is low, the problem is reach/messaging, not the reorder flow |
| S2 | **Post-Open Conversion Rate** | `order_placed` / `reminder_opened` | > 40% | Isolates friction in the reorder screen itself; low conversion here means the UX or product card is failing, not the notification |
| S3 | **Funnel Drop-Off: Cart → Checkout** | `checkout_started` / `cart_prefilled` | > 60% | Shows whether the pre-filled card creates enough intent to proceed; drop-off here suggests price/quantity mismatch |
| S4 | **Cron Reliability Rate** | Workers completed without error / total workers invoked | > 98% | Ensures the trigger is reaching eligible users reliably; a low rate means the North Star denominator is understated |
| S5 | **Notification Opt-Out Rate** | Users who disable push notifications after receiving reminder / users who received reminder | < 5% (guardrail) | Experiment health guardrail — high opt-out means the reminder is perceived as spam, not a service |

---

## Event Tracking Plan

All 7 events are already wired in the implementation. Locations and properties documented below.

### Event 1: `reminder_triggered`

| Property | Type | Value |
|---|---|---|
| `user_id` | string | Ozi user identifier |
| `order_id` | string | Original qualifying order |
| `sku_category` | string | `'diapers'` or `'baby-essentials'` |
| `trigger_day` | number | Days since `delivered_at` at trigger time |
| `group` | string | `'test'` (control users never reach this event) |

**Trigger**: `POST /api/reorder-worker` — after `insertReminder` succeeds
**Location**: `apps/ozi-reorder/src/lib/posthog.ts` → `trackReminderTriggered()`
**Note**: PostHog call is now wrapped in try/catch (QA2 fix). A failed PostHog call creates a DB/analytics gap — `cron_runs.errors` catches this at the aggregate level.

---

### Event 2: `reminder_delivered`

| Property | Type | Value |
|---|---|---|
| `user_id` | string | Ozi user identifier |
| `reminder_id` | UUID | ID from `reminders_sent` table |

**Trigger**: Same worker invocation as `reminder_triggered` — fired in `Promise.all` alongside it
**Location**: `apps/ozi-reorder/src/lib/posthog.ts` → `trackReminderDelivered()`
**Note**: In this demo, `delivered` is inferred from successful worker completion (no push provider webhook). In production, wire to actual FCM delivery callback.

---

### Event 3: `reminder_opened`

| Property | Type | Value |
|---|---|---|
| `user_id` | string | Ozi user identifier |
| `reminder_id` | UUID | From URL param (nullable — guarded before firing) |

**Trigger**: `/reorder/[orderId]` page load — client-side, once per session (deduplicated via `localStorage`)
**Location**: `apps/ozi-reorder/src/app/reorder/[orderId]/page.tsx`
**Note**: Fire-and-forget via `void fetch('/api/reminders/opened')`. If POST fails (QA1 medium), PostHog shows `opened` event from client but DB `reminders_sent.opened` is not updated. This creates a minor open-rate overcount in the dashboard vs. PostHog. Acceptable for demo; fix for production.

---

### Event 4: `cart_prefilled`

| Property | Type | Value |
|---|---|---|
| `user_id` | string | Ozi user identifier |
| `order_id` | string | The specific order ID pre-filled from |
| `option` | string | `'B'` (lightweight reorder screen, as implemented) |

**Trigger**: `/reorder/[orderId]` page — fires on successful product fetch, once per session
**Location**: `apps/ozi-reorder/src/app/reorder/[orderId]/page.tsx`

---

### Event 5: `checkout_started`

| Property | Type | Value |
|---|---|---|
| `user_id` | string | Ozi user identifier |
| `source` | string | `'reminder'` |

**Trigger**: "Add to Cart" button tap on reorder screen
**Location**: `apps/ozi-reorder/src/app/reorder/[orderId]/page.tsx`

---

### Event 6: `order_placed`

| Property | Type | Value |
|---|---|---|
| `user_id` | string | Ozi user identifier |
| `source` | string | `'reminder'` |
| `new_order_id` | string | Generated order ID for this repeat purchase |
| `reminder_id` | UUID or null | Links back to originating reminder |
| `original_order_id` | string | Qualifying order that triggered experiment |

**Trigger**: `POST /api/reorder-events` — server-side on "Place Order" confirmation
**Location**: `apps/ozi-reorder/src/app/api/reorder-events/route.ts`
**Note**: Guarded by `x-demo-key` header check (RR1 peer-review fix). Fires once; idempotent via `reorder_events` insert.

---

### Event 7: `control_order_placed`

| Property | Type | Value |
|---|---|---|
| `user_id` | string | Control-group Ozi user identifier |
| `source` | string | `'organic'` |
| `new_order_id` | string | Generated order ID |
| `original_order_id` | string | Qualifying baseline order |

**Trigger**: `ControlGroupSimulator` component on dashboard — simulates organic reorder by a control-group user
**Location**: `apps/ozi-reorder/src/components/ControlGroupSimulator.tsx`
**Note**: Deduplicated per user via `localStorage` (EC1 peer-review fix). This is a demo proxy for the real organic conversion signal that would come from Ozi's order platform in production.

---

### Missing Error-Path Events (Required Before Production)

The following events are absent from the current implementation. They are not demo blockers but are required before a production rollout:

| Event | Where to Add | Why |
|---|---|---|
| `reminder_trigger_failed` | `reorder-worker` catch block | Tracks per-user worker failures; complements `cron_runs.errors` aggregate |
| `cron_run_completed` | `reorder-trigger` after `Promise.allSettled` | PostHog-level cron observability; enables trend alerts on delivery rate |
| `experiment_ended` | Any guard that evaluates `EXPERIMENT_END_DATE` | Marks the experiment conclusion timestamp in the event stream |

---

## Funnel Definition

### Primary Funnel: Reminder → Repeat Purchase

```
reminder_triggered          (server — cron worker, test group only)
        │
        ▼
reminder_delivered          (server — inferred from worker success)
        │
        ▼  [open rate: reminder_opened / reminder_triggered]
reminder_opened             (client — reorder page load)
        │
        ▼  [pre-fill rate: cart_prefilled / reminder_opened]
cart_prefilled              (client — product card rendered)
        │
        ▼  [intent rate: checkout_started / cart_prefilled]
checkout_started            (client — "Add to Cart" tapped)
        │
        ▼  [conversion rate: order_placed / checkout_started]
order_placed                (server — /api/reorder-events)
```

**Overall funnel conversion**: `order_placed / reminder_triggered`
This is the end-to-end efficiency of the reminder → repeat purchase pipeline.

### Control Baseline Funnel

```
[user in control cohort — no notification]
        │
        ▼  [organic repeat rate]
control_order_placed        (dashboard simulator proxy)
```

**North Star computation**: `order_placed rate (test)` vs. `control_order_placed rate (control)`

### Drop-off Interpretation

| Stage | Low Rate Diagnosis |
|---|---|
| `triggered → opened` | Notification timing wrong (Day 18–20 not aligned to SKU depletion) or push opt-in too low |
| `opened → cart_prefilled` | Product resolution failing (wrong SKU shown, broken orderId lookup) |
| `cart_prefilled → checkout_started` | Price, quantity, or product relevance mismatch |
| `checkout_started → order_placed` | Checkout friction (session expiry, payment errors, network drop) |

---

## Success Thresholds

### Experiment Success Criteria

| Metric | Success | Investigate | Abort Experiment |
|---|---|---|---|
| 21-day repeat rate lift (test − control) | ≥ +10pp | +3pp to +9pp | < 0pp (test ≤ control) |
| Notification open rate | ≥ 25% | 10–24% | < 10% |
| Post-open conversion rate | ≥ 40% | 20–39% | < 20% |
| Cron reliability rate | ≥ 98% | 90–97% | < 90% |
| Notification opt-out rate | ≤ 5% | 5–8% | > 8% |

### Alert Thresholds (PostHog Alerts to Configure)

| Alert | Threshold | Action |
|---|---|---|
| `reminder_triggered` event count drops to zero for 2 consecutive days | — | Check cron schedule and CRON_SECRET; verify Vercel cron is active |
| `cron_runs.errors / cron_runs.reminders_sent > 10%` | DB query | Inspect worker error logs; likely DB connection or auth failure |
| `order_placed` events per day drops > 50% vs. prior 3-day average | PostHog alert | Check reorder screen for UI breakage; verify DEMO_SECRET header |
| Opt-out rate crosses 5% | Manual review (demo) / PostHog alert (prod) | Pause experiment; review notification copy and timing |

### Minimum Viable Cohort Size

For the experiment to be statistically interpretable (not just directionally suggestive):
- Minimum **50 users per cohort** (test + control) within the 21-day window
- At the demo scale (15 mock orders), results are directional only — frame as proof-of-concept, not statistically significant
- In production, compute required sample size from Ozi's baseline organic repeat rate before committing to experiment duration

---

## Implementation Notes

### Analytics Tool
**PostHog** — `posthog-node` for server-side events (worker, reorder-events), `posthog-js` via React context for client-side events (reorder page, ControlGroupSimulator).

### Event Locations in Codebase

| Event | File | Line Notes |
|---|---|---|
| `reminder_triggered` / `reminder_delivered` | [posthog.ts](apps/ozi-reorder/src/lib/posthog.ts) | `trackReminderTriggered`, `trackReminderDelivered` |
| Worker orchestration | [reorder-worker/route.ts](apps/ozi-reorder/src/app/api/reorder-worker/route.ts) | PostHog calls in try/catch after DB writes |
| `reminder_opened`, `cart_prefilled`, `checkout_started`, `order_placed` (client) | [reorder/[orderId]/page.tsx](apps/ozi-reorder/src/app/reorder/[orderId]/page.tsx) | Client components, deduped via localStorage |
| `order_placed` (server) | [api/reorder-events/route.ts](apps/ozi-reorder/src/app/api/reorder-events/route.ts) | Auth-guarded; inserts to `reorder_events` table |
| `control_order_placed` | [ControlGroupSimulator.tsx](apps/ozi-reorder/src/components/ControlGroupSimulator.tsx) | Dashboard; write-once per user |

### Ground-Truth Analytics Queries

**North Star — test repeat rate:**
```sql
SELECT
  COUNT(DISTINCT user_id) FILTER (WHERE source = 'reminder') AS test_conversions,
  (SELECT COUNT(DISTINCT user_id) FROM experiment_cohorts WHERE group_name = 'test') AS test_cohort_size
FROM reorder_events
WHERE created_at >= NOW() - INTERVAL '21 days';
```

**North Star — control repeat rate:**
```sql
SELECT
  COUNT(DISTINCT user_id) FILTER (WHERE source = 'organic') AS control_conversions,
  (SELECT COUNT(DISTINCT user_id) FROM experiment_cohorts WHERE group_name = 'control') AS control_cohort_size
FROM reorder_events
WHERE created_at >= NOW() - INTERVAL '21 days';
```

**Funnel — open rate:**
```sql
SELECT
  COUNT(*) FILTER (WHERE opened = true) AS opened,
  COUNT(*) AS sent,
  ROUND(100.0 * COUNT(*) FILTER (WHERE opened = true) / COUNT(*), 1) AS open_rate_pct
FROM reminders_sent;
```

### Integration Requirements Before Production

1. **Push provider webhook**: `reminder_delivered` should be wired to FCM/OneSignal delivery callback, not inferred from worker success. Current implementation overstates delivery if the push fails silently after the worker completes.

2. **Ozi order event feed**: `order_placed` and `control_order_placed` should be triggered by actual Ozi order confirmations, not the demo reorder screen. The experiment's source-of-truth for repeat purchases must be Ozi's order management system.

3. **Push opt-in gate**: Before experiment launch, measure push opt-in rate across the target cohort. If opt-in rate is < 40%, the test group will be too small relative to the cohort for meaningful lift measurement — adjust notification delivery or experiment window accordingly.

4. **Separate PostHog project for production**: Use a dedicated PostHog project (not the demo project) to avoid contaminating experiment data with seed/test events.
