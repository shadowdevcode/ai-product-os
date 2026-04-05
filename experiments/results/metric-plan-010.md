# Metric Plan — issue-010 MoneyMirror Phase 3

**Date:** 2026-04-05  
**Command:** `/metric-plan`  
**App:** `apps/money-mirror`  
**Inputs:** `experiments/ideas/issue-010.md`, `experiments/plans/plan-010.md`, `experiments/results/qa-test-010.md`, `experiments/plans/manifest-010.json`, codebase `captureServerEvent` audit

---

## North Star Metric

**Repeat statement upload rate (second upload within 60 days of first successful parse)** — cohort-defined as: among users who reach `statement_parse_success` at least once, the share who record a **second** distinct `statements` row (or second successful parse session) within **60 days** of the first.

- **Ties to:** Issue-009 North Star proxy and `plan-010` success table (“second-month / repeat statement upload ≥ **60%**”); issue-010 hypothesis that transaction truth + scope + merchant evidence + facts-grounded coaching increase **trust** and speed **return uploads**.
- **Why this star:** Phase 3 is validated when multi-statement users **come back with more PDFs** — the behavioral signal that the dashboard is credible enough to use again.
- **Ground truth:** Neon `statements` (and/or parse success events) aggregated by `user_id` and upload timestamps; PostHog can mirror cohort reporting but DB counts are authoritative for finance-grade accuracy.

---

## Supporting Metrics

1. **Phase 3 trust proxy (composite):** Share of users with **≥2** successful statement parses who, within **7 days** of the second parse, fire **`transactions_view_opened`** OR **`merchant_rollup_clicked`** (evidence-seeking behavior aligned with `plan-010`).
2. **Unified scope adoption:** Sessions with **`scope_changed`** (non-default scope) per active user per week — indicates users are using the multi-source model, not a single-statement mental model.
3. **Facts-grounded coaching engagement:** Rate of **`coaching_facts_expanded`** per advisory impressions (and **`coaching_narrative_completed` / failed / timeout** ratio) — measures use of evidence UI and Gemini path health.
4. **Parse reliability:** **`statement_parse_success` / (`statement_parse_success` + `statement_parse_failed` + `statement_parse_timeout`)** over rolling 7 days — parser and AI stability.
5. **Read-path performance (gate):** Server-side **`transactions_filter_applied`** volume vs. error rates; monitor p95 latency for `GET /api/transactions` and `GET /api/insights/merchants` in Vercel/Neon (no unbounded scans per plan).

---

## Event Tracking Plan

| Event name                     | Trigger                                       | Properties (non-PII / bucketed)                       |
| ------------------------------ | --------------------------------------------- | ----------------------------------------------------- |
| `onboarding_completed`         | Onboarding API persists profile               | As implemented in route                               |
| `statement_parse_started`      | Parse route begins work                       | As implemented                                        |
| `statement_parse_success`      | Transactions + statement persist success      | As implemented                                        |
| `statement_parse_failed`       | Parse or persist failure                      | `error_type` / sanitized context                      |
| `statement_parse_timeout`      | Gemini timeout path                           | As implemented                                        |
| `statement_parse_rate_limited` | User hits upload rate limit                   | As implemented                                        |
| `transactions_view_opened`     | POST `/api/transactions/view-opened`          | As implemented                                        |
| `transactions_filter_applied`  | GET `/api/transactions` with active filters   | `filter_type` / scope hints (no raw descriptions)     |
| `scope_changed`                | POST `/api/dashboard/scope-changed`           | `date_preset`, `source_count`, etc.                   |
| `merchant_rollup_clicked`      | POST `/api/insights/merchant-click`           | Bucketed / hashed `merchant_key` per existing pattern |
| `coaching_facts_expanded`      | POST `/api/dashboard/coaching-facts-expanded` | `advisory_id`                                         |
| `coaching_narrative_completed` | Enrich path returns narrative                 | Fact counts / latency metadata as implemented         |
| `coaching_narrative_timeout`   | Gemini timeout (9s)                           | `timeout_ms`                                          |
| `coaching_narrative_failed`    | Enrich failure                                | Error class as implemented                            |
| `weekly_recap_triggered`       | Cron master                                   | System distinct id                                    |
| `weekly_recap_completed`       | Cron master completion                        | Success/fail counts                                   |
| `weekly_recap_email_sent`      | Worker send OK                                | Per user                                              |
| `weekly_recap_email_failed`    | Worker send failure                           | Per user                                              |

**Single emission source:** Each business event has one authoritative server emission (see `apps/money-mirror/src/lib/posthog.ts` and call sites). No duplicate client+server for the same event name.

---

## Funnel Definition

**A — Acquisition → first value**

1. `onboarding_completed`
2. `statement_parse_started` → `statement_parse_success` (drop-off: `statement_parse_failed`, `statement_parse_timeout`, `statement_parse_rate_limited`)

**B — North Star (repeat upload)**

1. First `statement_parse_success` (cohort entry)
2. Second statement upload / second `statement_parse_success` within 60 days
   - Conversion = step 2 / step 1 for eligible cohorts

**C — Phase 3 “trust loop” (after ≥2 statements)**

1. `transactions_view_opened` or `merchant_rollup_clicked`
2. `scope_changed` (optional refinement step)
3. `coaching_facts_expanded` (evidence UI)

Measure drop-off at each step; segment by mobile vs desktop if needed later.

---

## Success Thresholds

| Metric                                                                | Success                                             | Investigate (alert)                    |
| --------------------------------------------------------------------- | --------------------------------------------------- | -------------------------------------- |
| Repeat statement upload (60d)                                         | ≥ **50%** early signal → target **60%** at maturity | &lt; **35%** for 4-week rolling cohort |
| Trust proxy (7d after 2nd parse)                                      | ≥ **40%** open txn or click merchant                | &lt; **20%**                           |
| Parse success rate                                                    | ≥ **92%** rolling 7d                                | &lt; **85%**                           |
| `coaching_narrative_failed` + `timeout` share of narrative attempts   | &lt; **8%** combined                                | &gt; **15%**                           |
| Weekly recap worker failures (`weekly_recap_email_failed` / attempts) | &lt; **5%**                                         | &gt; **12%**                           |

_(Thresholds are initial; calibrate after 2–4 weeks of production volume.)_

---

## Implementation Notes

- **Tool:** PostHog via **`posthog-node`** — `captureServerEvent` in `apps/money-mirror/src/lib/posthog.ts`; env: **`POSTHOG_KEY`**, **`POSTHOG_HOST`** (server-only; see QA env audit).
- **No client `posthog-js` usage** in current codebase for custom events; pageviews/session replay can be added later under T5+ without changing server event names.
- **Dashboards:** PostHog — (1) North Star cohort trend, (2) Funnel A/B/C, (3) Parse + coaching health, (4) Cron recap reliability.
- **DB alignment:** Build cohort queries that join `statements.user_id`, `statements.created_at` (or parse time) for repeat-upload ground truth; cross-check PostHog `statement_parse_success` counts monthly.
- **Privacy:** No raw transaction descriptions or account numbers in event properties; merchant keys bucketed/hashed as already implemented.
- **Deferred (T5–T6):** URL-backed tabs / compare months may add events in a future issue; not required for this metric plan.

---

**Gate:** Metric plan complete for issue-010. **`/deploy-check`** may proceed.
