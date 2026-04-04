# Metric Plan — MoneyMirror: AI-Powered Personal Finance Coach

**Issue:** 009
**Project:** MoneyMirror
**Date:** 2026-04-02
**Agent:** Analytics Agent (Metric Plan)
**Status:** COMPLETE — Instrumentation verified by QA

---

## North Star Metric

**Metric:** **Second-month Statement Upload Rate**
**Definition:** % of users who upload at least one bank statement in their second 30-day period after onboarding.
**Hypothesis Connection:** This is the primary signal of habit formation and the product's durable utility. If a user returns to "clean the mirror" again, the accountability mechanism is working.

---

## Supporting Metrics

| Metric                  | Definition                                            | Target       | Proxy For                                 |
| ----------------------- | ----------------------------------------------------- | ------------ | ----------------------------------------- |
| **Activation Rate**     | Onboarding Score Revealed → First PDF Upload Success  | ≥40%         | Motivation of "Money Health Score" hook   |
| **Mirror Moment Delta** | Average (Actual Spend - Perceived Spend) %            | ≥50%         | Magnitude of the "Perception Gap"         |
| **Recap Engagement**    | Weekly Monday Recap Email Open Rate                   | ≥30%         | Proactive coaching effectiveness          |
| **Advisory Utility**    | Ratio of "Helpful" vs "Too Harsh" button clicks       | ≥8:1         | Coaching tone/accuracy fit                |
| **Score Velocity**      | Change in Money Health Score between 1st & 2nd Upload | +5 to 10 pts | Behavioral change (savings/category cuts) |

---

## Event Tracking Plan

PostHog is the primary telemetry platform. All events are configured with a single-emission source rule.

### 1. Conversion & Activation

- **`onboarding_completed`**
  - **Trigger:** Final onboarding question answered.
  - **Properties:** `perceived_spend_paisa`, `salary_paisa`, `primary_worry`, `current_investor`.
- **`statement_parse_started`**
  - **Trigger:** PDF upload initiated.
- **`statement_parse_success`** (Critical)
  - **Trigger:** Gemini parse complete + DB transaction success.
  - **Properties:** `total_debits_paisa`, `transaction_count`, `period_days`, `parse_duration_ms`.
- **`mirror_viewed`**
  - **Trigger:** Side-by-side card loaded in dashboard with state.

### 2. Engagement & Coaching

- **`advisory_feedback_clicked`**
  - **Trigger:** User clicks "Helpful" or "Too Harsh" on an Advisory.
  - **Properties:** `type` (Subscription, Leak, BNPL), `sentiment` (helpful/harsh).
- **`weekly_recap_email_sent`**
  - **Trigger:** Cron worker executes Resend request.
- **`share_intent_sent`**
  - **Trigger:** System share sheet triggered via "Share My Mirror".

### 3. Failure Monitoring

- **`statement_parse_timeout`**
  - **Trigger:** 9s Gemini abort controller fires.
- **`statement_parse_failed`**
  - **Trigger:** PDF.js extraction or LLM JSON parse error.

---

## Funnel Definition

The path from awareness to behavioral change:

1. **Awareness:** Home page visit (`landing_page_viewed`)
2. **Setup:** Onboarding complete (`onboarding_completed`)
3. **Hook:** Money Health Score revealed (In-app state)
4. **Action:** PDF Upload Success (`statement_parse_success`)
5. **Aha! Moment:** Perceived vs Actual comparison viewed (`mirror_viewed`)
6. **Retention:** Weekly digest opened (Email event)
7. **Habit:** Month 2 Statement Upload (North Star)

---

## Success Thresholds

| Metric                 | Threshold | Alert Trigger                           |
| ---------------------- | --------- | --------------------------------------- |
| **North Star**         | ≥60%      | <40% (Re-examine coaching value)        |
| **Parse Success Rate** | ≥95%      | <85% (HDFC format drift / PDF.js issue) |
| **Onboarding → PDF %** | ≥40%      | <20% (Trust barrier or friction)        |
| **Email Open Rate**    | ≥35%      | <15% (Spam filter or bad timing)        |

---

## Implementation Notes

- **Primary Tool:** PostHog (Integrated via `posthog-js` on frontend and `posthog-node` on backend).
- **Database Logic:** Ground-truth calculation for 60-day reduction (Hypothesis #1) to be performed via Neon SQL queries comparing `category` sums across monthly statement batches.
- **Instrumentation Audit:** All 10 core events verified as functional by QA (Ref: `qa-test-009.md`).
- **Dashboarding:** Funnel and North Star cohorts to be built in PostHog. Revenue queries to be calculated in Neon against `profiles` table.

---

## Rules Check

- [x] Connects to hypothesis? Yes (Perception Gap, 2nd-month retention).
- [x] Simple & measurable? Yes (Upload rate).
- [x] No vanity metrics? Yes (Focus on retention and behavioral delta).
- [x] Verified wired? Yes (Confirmed in `qa-test-009.md`).
