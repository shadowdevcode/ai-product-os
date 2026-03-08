# Metric Plan: AI Personal Finance Advisor (Issue 003)

## North Star Metric
**Daily Log Rate**: The percentage of active users who successfully log an expense (or a `0` spend) within 12 hours of receiving the 8:00 PM nudge.
*(Ties directly to the hypothesis: Does a WhatsApp nudge reduce the friction of budgeting and maintain daily engagement?)*

## Supporting Metrics
1. **Day-7 and Day-14 Retention**: Percentage of users still logging expenses 1 and 2 weeks after their first message.
2. **Weekly Goal Success Rate**: Percentage of users whose Sunday Summary shows `totalSpent <= weekly_goal`.
3. **Ghosting Rate**: Percentage of nudges sent that receive zero reply before the next nudge cycle.

## Event Tracking Plan

| Event Name | Trigger Condition | Properties to Capture |
| :--- | :--- | :--- |
| `user_onboarded` | First message received causing new DB row. | `phone_number_hash`, `timestamp` |
| `daily_nudge_sent` | Cron job successfully fires API dispatch to a user. | `user_id`, `timestamp` |
| `expense_logged` | User replies with a valid numerical amount > 0. | `user_id`, `amount`, `timestamp` |
| `zero_spend_logged` | User explicitly replies with "0". | `user_id`, `timestamp` |
| `invalid_input_received` | User replies but regex fails to find a number. | `user_id`, `raw_text` |
| `weekly_summary_sent` | Sunday cron job successfully dispatches summary. | `user_id`, `total_spent`, `goal`, `budget_status` |

## Funnel Definition
**The Engagement Funnel**
1. User receives 8 PM Nudge (`daily_nudge_sent`).
2. User replies with text (Drop-off point: Ghosting).
3. Text is successfully parsed as an expense or 0 (`expense_logged` / `zero_spend_logged`). (Drop-off point: `invalid_input_received`).

## Success Thresholds
- **Target North Star (Daily Log Rate)**: > 60%
- **Target Retention (Day-14)**: > 40%
- **Target Goal Success Rate**: > 30% of users staying under budget.
- **Alert Threshold**: If `invalid_input_received` occurs for > 15% of total messages, the regex parsing is failing real-world unstructured text and an LLM parser needs to be swapped in.

## Implementation Notes
- **Tool**: Since backend API routes are handling everything, server-side analytics (e.g., PostHog Node.js SDK) should be used inside the webhook and cron functions.
- **Database Proxying**: Alternatively, for an MVP of 20 users, these metrics can be manually derived directly from the Supabase `users` and `logs` tables using SQL aggregation queries, avoiding the need to install a heavy analytics SDK. The `logs.logged_at` timestamp compared against `users.created_at` provides exact retention curves without code overhead.
