# Metric Plan: Gmail Summary to WhatsApp Notifier

**Date:** 2026-03-07
**Project:** issue-002 (Gmail Summary to WhatsApp Notifier)

---

## North Star Metric

**Daily Summary Read Rate**
- **Definition:** The percentage of sent WhatsApp digests that are actively read by the user on the same day.
- **Why:** This metric directly proves the core hypothesis: "Users want passive awareness without active inbox management." If digests are being delivered but ignored (low read rate), the product is failing to deliver value or the summaries are not useful enough to warrant attention.

---

## Supporting Metrics

1. **Day-14 Retention Rate**
   - **Definition:** Percentage of users who are still active (receiving and reading digests) 14 days after signup.
   - **Why:** Measures whether the service provides enduring value after the initial novelty wears off.
2. **Weekly Active Users (WAU)**
   - **Definition:** Count of unique users who read at least one digest in a 7-day period.
   - **Why:** Tracks overall growth and ongoing usage of the active user base.
3. **Opt-Out / Pause Rate**
   - **Definition:** Percentage of users who go to Settings and change `is_active = false` or revoke Google Auth tokens.
   - **Why:** An early warning signal for user dissatisfaction, spam fatigue, or lack of trust.

---

## Event Tracking Plan

| Event Name | Trigger Condition | Properties to Capture |
|---|---|---|
| `landing_page_view` | User visits the root URL `/` | `source`, `campaign` |
| `signup_started` | User clicks "Connect Gmail" | none |
| `gmail_connected` | User successfully completes Google OAuth | `has_refresh_token` (boolean) |
| `setup_completed` | User saves WhatsApp number + frequency | `frequency_choice` (2h/3x_day/daily) |
| `digest_sent` | Cron job successfully delivers via Twilio | `email_count`, `priority_urgent`, `priority_important`, `priority_fyi` |
| `digest_read` | Twilio webhook reports message status as `read` | `time_to_read` (minutes since sent) |
| `settings_updated` | User changes frequency or phone number | `old_frequency`, `new_frequency` |
| `service_paused` | User sets `is_active = false` or disconnects | `reason` (if feedback collected), `days_active` |

---

## Funnel Definition

**Core Onboarding Funnel:**
1. **Visitor** (`landing_page_view`)
2. **Started Signup** (`signup_started`)
3. **Authenticated** (`gmail_connected`)
4. **Activated User** (`setup_completed` — *Conversion Point*)

**Engagement Funnel (Daily):**
1. **Digest Generated** (System successfully fetches and summarizes)
2. **Digest Delivered** (`digest_sent` event)
3. **Digest Consumed** (`digest_read` event — *Conversion Point*)

---

## Success Thresholds

| Metric | Target (Success) | Alert Threshold (Investigate) |
|---|---|---|
| **Daily Summary Read Rate** | ≥ 60% | < 40% |
| **Day-14 Retention Rate** | ≥ 40% | < 20% |
| **Beta Sign-ups (first 14d)** | ≥ 50 users | < 25 users |
| **Onboarding Conversion** | ≥ 30% (Visitor to Activated) | < 15% |
| **Opt-Out / Pause Rate** | < 10% per month | > 20% per month |

---

## Implementation Notes

1. **Analytics Tool:** PostHog (Open source, generous free tier, supports web + server-side events).
2. **Frontend Tracking:** 
   - Integrate `posthog-js` for anonymous web tracking (`landing_page_view`, `signup_started`).
   - Call `posthog.identify()` upon Google OAuth redirect to tie anonymous data to the `user_id`.
3. **Backend Tracking:**
   - Integrate `posthog-node` in the Next.js API routes securely.
   - Track `setup_completed` in `/api/setup`.
   - Track `settings_updated` and `service_paused` in `/api/settings`.
4. **Twilio Webhook Integration:**
   - Create a new endpoint (e.g., `/api/webhooks/twilio`) to catch message status updates.
   - When Twilio sends `MessageStatus == 'read'`, fire the `digest_read` server-side event to accurately track the North Star Metric.
5. **Database Alignment:** Ensure `digests.delivery_status` is updated by the Webhook to keep a hard system record alongside the product analytics.
