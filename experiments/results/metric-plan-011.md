# Metric Plan — issue-011 MoneyMirror Phase 4

**Date:** 2026-04-07  
**Command:** `/metric-plan`  
**App:** `apps/money-mirror`  
**Inputs:** `experiments/ideas/issue-011.md`, `experiments/plans/plan-011.md`, `experiments/results/qa-test-011.md`, `experiments/plans/manifest-011.json`, codebase `captureServerEvent` + `posthog-browser` audit

---

## North Star Metric

**Repeat statement upload rate (second successful parse within 60 days of the first)** — same cohort definition as issue-009 / issue-010 / `metric-plan-010.md`: among users who reach at least one `statement_parse_success`, the share who record a **second** successful parse (distinct statement / successful session) within **60 days** of the first.

- **Ties to:** Issue-011 hypothesis — merchant/UPI visibility, ingestion trust, proactive + chat surfaces increase **engagement**, **repeat upload**, and **willingness to pay** versus bucket-only highlights. The North Star remains the durable behavioral proof that users trust the product enough to return with more PDFs.
- **Ground truth:** Neon `statements` (+ timestamps) by `user_id`; PostHog `statement_parse_success` for trend mirrors — **DB cohorts are authoritative** for finance-grade reporting.

---

## Supporting Metrics

1. **Merchant clarity engagement (Phase 4 — P4-A):** Share of users with ≥1 `statement_parse_success` who, within **14 days**, fire **`merchant_rollup_clicked`** OR **`merchant_alias_saved`** (or **`merchant_suggestion_accepted`**) — validates “where money went” depth beyond Phase 3 baselines.
2. **Bad-pattern usefulness (P4-E):** Conversion from **`bad_pattern_advisory_shown`** → **`bad_pattern_advisory_clicked`** (client-side pair in `posthog-browser.ts` / `AdvisoryFeed.tsx`); segment by `trigger` / advisory type when available in properties.
3. **Chat demand vs. fulfillment (P4-C):**
   - **Attempted demand:** **`chat_query_submitted`** (server `POST /api/chat`) — **QA caveat:** this event fires **before** the `GEMINI_API_KEY` availability guard; interpret as **attempted chat usage**, not guaranteed model execution.
   - **Successful turns:** **`chat_response_rendered`**; **`chat_rate_limited`** for guardrail hits.
4. **Monetization intent (P4-G, flag-gated):** When `NEXT_PUBLIC_PAYWALL_PROMPT_ENABLED=1`, funnel **`paywall_prompt_seen`** → **`upgrade_intent_tapped`** (client `PaywallPrompt.tsx` + `posthog-browser.ts`).
5. **Read-path + abuse health (P4-H):** Per-user **`rate_limit_hit`** on `GET /api/dashboard`, `GET /api/transactions`, `GET /api/insights/merchants` — track rate per 1k authenticated requests vs. **parse success rate** (`statement_parse_success` / parse attempts) rolling 7d.

---

## Event Tracking Plan

| Event name                                              | Trigger                                      | Properties (non-PII / bucketed)        | Owner                                              |
| ------------------------------------------------------- | -------------------------------------------- | -------------------------------------- | -------------------------------------------------- |
| `statement_parse_started`                               | Parse route begins                           | As implemented                         | Server `parse/route.ts`                            |
| `statement_parse_success`                               | Persist + txn insert OK                      | As implemented                         | Server `parse/route.ts`                            |
| `statement_parse_failed`                                | Parse/persist failure                        | `error_type`, sanitized                | Server                                             |
| `statement_parse_timeout`                               | Gemini timeout                               | As implemented                         | Server                                             |
| `statement_parse_rate_limited`                          | Upload daily cap                             | As implemented                         | Server                                             |
| `transactions_view_opened`                              | POST view-opened                             | —                                      | Server `view-opened/route.ts`                      |
| `transactions_filter_applied`                           | GET `/api/transactions` with filters         | Scope/filter hints                     | Server `transactions/route.ts`                     |
| `scope_changed`                                         | POST scope-changed                           | `date_preset`, `source_count`, …       | Server                                             |
| `merchant_rollup_clicked`                               | POST merchant-click                          | Bucketed `merchant_key`                | Server `merchant-click/route.ts`                   |
| `merchant_alias_saved`                                  | Alias POST/PUT success                       | —                                      | Server `merchants/alias/route.ts`                  |
| `merchant_suggestion_accepted`                          | Accept suggestion                            | —                                      | Server `merchants/suggest-accept/route.ts`         |
| `bad_pattern_advisory_shown`                            | Advisory card visible (IntersectionObserver) | `trigger` / advisory id as implemented | Client `AdvisoryFeed.tsx` via `posthog-browser.ts` |
| `bad_pattern_advisory_clicked`                          | User taps CTA                                | `trigger` / advisory id as implemented | Client                                             |
| `paywall_prompt_seen`                                   | Mirror section visible (session-once)        | —                                      | Client `PaywallPrompt.tsx`                         |
| `upgrade_intent_tapped`                                 | Upgrade CTA                                  | —                                      | Client                                             |
| `chat_query_submitted`                                  | Chat request accepted (pre-guard)            | `message_length` or similar            | Server `chat/route.ts`                             |
| `chat_response_rendered`                                | Model returned valid structured answer       | Citation count                         | Server `chat/route.ts`                             |
| `chat_rate_limited`                                     | Daily chat cap                               | `Retry-After` context                  | Server `chat/route.ts`                             |
| `whatsapp_opt_in_completed`                             | Successful opt-in POST                       | —                                      | Server `proactive/whatsapp-opt-in/route.ts`        |
| `push_subscription_granted`                             | Push subscription saved                      | —                                      | Server `proactive/push-subscription/route.ts`      |
| `rate_limit_hit`                                        | Heavy GET throttled                          | `route` / bucket metadata              | Server dashboard/transactions/merchants            |
| `coaching_facts_expanded`                               | Facts drawer                                 | `advisory_id`                          | Server                                             |
| `coaching_narrative_*`                                  | Enrich path                                  | Latency / error                        | Server `coaching-enrich.ts`                        |
| `weekly_recap_triggered` / `weekly_recap_completed`     | Cron master                                  | Counts                                 | Server cron                                        |
| `weekly_recap_email_sent` / `weekly_recap_email_failed` | Worker                                       | Per user                               | Server worker                                      |
| `onboarding_completed`                                  | Onboarding                                   | —                                      | Server                                             |
| `web_vital`                                             | Web Vitals                                   | metric name, value                     | Client `WebVitalsReporter.tsx`                     |

**Single emission source:** Each business event has one authoritative path (server `captureServerEvent` in `posthog.ts` vs. client `getPosthogBrowser()` in `posthog-browser.ts` — see comments in `posthog.ts` for client-only bad-pattern events).

---

## Funnel Definition

**A — Acquisition → first value** (unchanged from Phase 3)

1. `onboarding_completed` → `statement_parse_started` → `statement_parse_success`
2. Drop-off: `statement_parse_failed`, `statement_parse_timeout`, `statement_parse_rate_limited`

**B — North Star (repeat upload within 60d)**

1. First `statement_parse_success` (cohort entry)
2. Second `statement_parse_success` within 60 days
3. **Conversion** = step 2 / step 1

**C — Phase 4 “merchant truth” loop**

1. `statement_parse_success`
2. `transactions_view_opened` OR `merchant_rollup_clicked`
3. `merchant_alias_saved` OR `merchant_suggestion_accepted` (optional depth step)

**D — Bad-pattern loop**

1. `bad_pattern_advisory_shown`
2. `bad_pattern_advisory_clicked` → (optional) `transactions_filter_applied` with micro-UPI / merchant preset

**E — Chat (attempted vs. successful)**

1. `chat_query_submitted`
2. `chat_response_rendered` OR `chat_rate_limited` OR parse-side failure events (do **not** assume every step-1 reaches step-2; step-1 includes attempts when Gemini is unavailable)

**F — Proactive channels**

1. `weekly_recap_email_sent` (existing)
2. `whatsapp_opt_in_completed` / `push_subscription_granted` as optional branches

---

## Success Thresholds

| Metric                                                                              | Success (initial)                                       | Investigate (alert)                                  |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------- | ---------------------------------------------------- |
| Repeat 60d upload                                                                   | ≥ **50%** early → **60%** at maturity (issue-009 proxy) | **&lt; 35%** rolling 4-week cohort                   |
| Merchant clarity (14d after first parse)                                            | ≥ **35%** with rollup click or alias/suggestion         | **&lt; 18%**                                         |
| Bad-pattern click-through (shown → clicked)                                         | ≥ **12%**                                               | **&lt; 5%**                                          |
| Chat: `chat_response_rendered` / `chat_query_submitted` (among users who attempted) | ≥ **70%** (excludes intentional rate limits)            | **&lt; 45%** combined with unexplained failure spike |
| Parse success rate (7d rolling)                                                     | ≥ **92%**                                               | **&lt; 85%**                                         |
| `rate_limit_hit` / authenticated heavy GETs                                         | **&lt; 3%**                                             | **&gt; 8%** (UX friction or abuse)                   |

Calibrate after 2–4 weeks of production volume.

---

## Implementation Notes

- **Tool:** PostHog — **`posthog-node`** via `captureServerEvent` in `apps/money-mirror/src/lib/posthog.ts` (env: **`POSTHOG_KEY`**, **`POSTHOG_HOST`**, server-only).
- **Client:** `posthog-js` via `apps/money-mirror/src/lib/posthog-browser.ts` for **bad-pattern** + **paywall** events only; keep **single source** per event name.
- **Dashboards (PostHog):** (1) North Star cohort trend, (2) Funnels B–E, (3) Parse + coaching health, (4) Rate limit + recap reliability.
- **DB alignment:** Repeat-upload cohorts from `statements` + `user_id`; cross-check monthly against `statement_parse_success`.
- **Privacy:** No raw transaction text, account numbers, or phone numbers in properties; merchant keys bucketed/hashed per existing patterns.
- **Follow-up (non-blocking):** Moving `chat_query_submitted` after availability guard would align funnel E with “true chat demand” — tracked as peer-review suggestion; until then, label dashboards **“chat attempts.”**

---

**Quality gate:** Metric plan complete for issue-011. **Next pipeline command:** `/deploy-check`.
