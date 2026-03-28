# Metric Success Framework: Hyper-Personalised Style Concierge

This document defines the North Star, supporting metrics, and alert thresholds for the `issue-008` personalisation experiment.

## 1. North Star Metric: Add-to-Cart (ATC) Rate Lift

**Definition:** Percentage increase in unique "Add to Cart" actions per active session for the Personalized (Test) cohort vs. the Trending (Control) cohort.

- **Threshold for Success:** ≥ +10% lift.
- **Why it matters:** ATC is the strongest leading indicator of purchase intent in fashion e-commerce.

---

## 2. Supporting Performance Metrics

| Metric                  | Target  | Measurement Strategy                                         |
| :---------------------- | :------ | :----------------------------------------------------------- |
| **Shelf CTR Lift**      | +15%    | Measured via `shelf_click` events on the homepage.           |
| **Search Re-rank CTR**  | +10%    | Measured via `search_result_click` for personalized results. |
| **PDP Discovery Depth** | +20%    | Number of "You Might Also Like" clicks per PDP session.      |
| **P95 Latency**         | < 200ms | Server-side timing log for `GET /api/shelf`.                 |

---

## 3. Experiment Guardrails (Health Metrics)

- **Graceful Fallback Rate:** < 2% of visitors. If more users see editorial products due to latency timeouts (500ms), investigate Neon DB connection pooling or PostHog queue delays.
- **A/B Cohort Balance:** 48/52 split. Verify SHA-256 deterministic hashing logic if drift occurs.
- **Zero-Signal Coverage:** Capture % of users with no affinity profile who successfully initialized intent tracking within 3 clicks.

---

## 4. PostHog Dashboard Layout

- **Funnel:** Discovery (Homepage/Search) -> PDP Impression -> Add-to-Cart.
- **Cohort Contrast:** Side-by-side comparison of "Test" vs "Control" for average session value.
- **Error Tracking:** Trend of `SHELF_LOAD_FAILED` and `RERANK_FAILED` events.
