# Metric Plan — MoneyMirror Gen Z Clarity Loop (issue-012)

**Date:** 2026-04-07
**Issue:** 012
**Status:** Completed

---

## North Star Metric

**Repeat statement upload within 60 days of first success**

- **Hypothesis Connection:** Shame-safe copy, frequency-first insights, and guided reviews build emotional safety and a habit loop, driving users to return and upload their next statement for meaning, not just accounting.

---

## Supporting Metrics

1. **Dashboard Load Performance (T0):** P75 `dashboard_ready` duration and `time_to_first_advisory` duration.
2. **Frequency Insight Adoption (T1):** % of dashboard visitors who expand or engage with the frequency module.
3. **Merchant Cluster Engagement (T1):** % of visitors who click on a deterministic merchant cluster (e.g., "Quick commerce") to view transactions.
4. **Guided Review Completion Rate (T2):** % of users who start the 3-step guided review and complete it (either dismiss or save).
5. **Commitment Save Rate (T2):** % of completed reviews where the user opted-in to save a commitment.

---

## Event Tracking Plan

| Event Name                 | Trigger Condition                                             | Properties to Capture          | Owner/Source  |
| :------------------------- | :------------------------------------------------------------ | :----------------------------- | :------------ |
| `dashboard_ready`          | Dashboard shell mounts and Mirror + primary summary is ready. | `duration_ms`, `scope`         | Client        |
| `first_advisory_loaded`    | First advisory card becomes visible or empty state renders.   | `duration_ms`                  | Client        |
| `frequency_insight_opened` | User expands or opens the frequency module.                   | `source_panel`                 | Client        |
| `merchant_cluster_clicked` | User taps a cluster row (e.g., Food delivery).                | `cluster_id`, `merchant_count` | Client        |
| `guided_review_started`    | User taps entry CTA to begin the 3-step review.               | `source`                       | Client        |
| `guided_review_completed`  | User reaches the final step and finishes the flow.            | `dismissed` (boolean)          | Client        |
| `commitment_saved`         | User explicitly opts-in to save their commitment text.        | `has_text` (boolean)           | Client/Server |

_Note: As per `analytics-framework.md` and postmortem lessons, each event has exactly one authoritative emission point (mostly client for UI interactions) to prevent dual-emission skew._

---

## Funnel Definition

### 1. Dashboard to Insight Funnel

- `dashboard_ready`
- `first_advisory_loaded`
- `frequency_insight_opened` OR `merchant_cluster_clicked`
  **Goal:** Maximize the number of users who engage with the new frequency and cluster storytelling features immediately after the dashboard loads.

### 2. Guided Review Funnel

- `guided_review_started`
- `guided_review_completed`
- `commitment_saved`
  **Goal:** Minimize drop-off during the 3-step review process. Measure the ratio of users who feel safe enough to save a commitment vs. those who just dismiss.

---

## Success Thresholds

- **Performance Targets:**
  - `dashboard_ready` P75 < 800ms
  - `time_to_first_advisory` P75 < 1500ms
- **Engagement Targets:**
  - Guided Review Completion Rate > 60% (of those who start)
  - Frequency Insight Adoption > 20% of dashboard loads
- **Alert Thresholds:**
  - `dashboard_ready` P95 > 3000ms (investigate immediately for performance degradation)
  - `guided_review_completed` drop-off > 80% (investigate UX friction in the 3-step flow)

---

## Implementation Notes

- **Analytics Tool:** PostHog (via `posthog-js` on the frontend and `posthog-node` on the backend).
- **Codebase Locations:**
  - Performance marks (`dashboard_ready`, `time_to_first_advisory`) implemented via `posthog-browser.ts` in `DashboardClient.tsx` or related dashboard components.
  - Frequency and cluster clicks (`frequency_insight_opened`, `merchant_cluster_clicked`) tracked in `FrequencyClusterSection.tsx` and `ClusterRollupRow`.
  - Guided review events (`guided_review_started`, `guided_review_completed`, `commitment_saved`) tracked in `GuidedReviewSheet.tsx`.
- **Integrations:** Ensure no synchronous LLM calls block the dashboard critical path. All metrics use fire-and-forget telemetry (`.catch(() => {})`) to avoid impacting user experience or strict SLA timers.
