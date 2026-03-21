# Metric Plan: Issue-005 — SMB Feature Bundling Engine

**Command**: /metric-plan
**Date**: 2026-03-19
**QA Gate**: Approved (QA1 fixed — clipboard fallback with inline error)

---

## North Star Metric

**Pitch Copy Rate**
The percentage of completed generation sessions where the PM copies the email pitch (`pitch_copied = true` in `bundle_sessions`).

**Why this is the right north star**: The hypothesis is that PMs will trust and use AI-generated INR pricing proposals to close deals faster. Copying the pitch is the highest-confidence behavioral signal — it means the PM judged the output good enough to send to a real SMB prospect. It is backed by both PostHog events (`pitch_copied`) and durable DB state (`bundle_sessions.pitch_copied`), making it resistant to event drop.

**Target**: > 50% of sessions end in a pitch copy.

---

## Supporting Metrics

| # | Metric | What It Measures | Why It Matters |
|---|---|---|---|
| 1 | **Time to First Copy** | Seconds from `landing_page_viewed` to first `pitch_copied` event (session-level) | Validates the "under 2 minutes" product promise from the issue |
| 2 | **Proposal Generation Latency** | `latency_ms` property on `bundle_generated` events (p50 / p95) | Confirms <5s p95 SLA; slow generation kills live sales demo use case |
| 3 | **Gemini Failure Rate** | `proposal_generation_failed` events / total generation calls | Validates <2% parse failure target; spike indicates prompt regression |
| 4 | **Feature Selection Distribution** | SQL: which features appear most in sessions where `pitch_copied = true` vs. false | Tells us which features produce winning pitches — informs future catalogue decisions |
| 5 | **Daily Generation Volume** | Count of `bundle_generated` events per day | Primary adoption signal; flat or falling = tool not being used |

---

## Event Tracking Plan

### Already Implemented

| Event | Trigger | Properties | Location |
|---|---|---|---|
| `bundle_generated` | Gemini returns valid response + DB insert succeeds | `session_id`, `selected_features[]`, `feature_count`, `latency_ms`, `generated_price_inr`, `environment` | `lib/posthog.ts` + `app/api/generate-proposal/route.ts` |
| `pitch_copied` | PM clicks "Copy Email" and clipboard write succeeds | `session_id`, `selected_features[]` | `components/EmailPitchCard.tsx` |

### Missing — Must Add Before Deploy

| Event | Trigger | Properties | Location |
|---|---|---|---|
| `landing_page_viewed` | PostHog `capture_pageviews: true` auto-fires on load | `$current_url` (automatic) | Already wired via `PostHogProvider.tsx` — verify in PostHog live events |
| `proposal_generation_failed` | API route returns 500 (Gemini parse error or missing key) | `error_type: 'ai_parse' \| 'api_key_missing'`, `selected_features[]` | `app/api/generate-proposal/route.ts` catch block |
| `proposal_generation_timeout` | `AbortController` fires at 9s; route returns 504 | `selected_features[]`, `timeout_ms: 9000` | `app/api/generate-proposal/route.ts` timeout branch |
| `proposal_generation_rate_limited` | Rate limiter returns 429 | (no PII — anonymous session) | `app/api/generate-proposal/route.ts` rate limit branch |

---

## Funnel Definition

```
landing_page_viewed
        ↓
  [PM selects ≥1 feature and clicks Generate]
        ↓
bundle_generated                          ← conversion point 1
  (or proposal_generation_failed)         ← drop-off: Gemini error / timeout
        ↓
  [PM reviews pricing card + email pitch]
        ↓
pitch_copied                              ← conversion point 2 (North Star)
```

**PostHog funnel**: 3-step — `landing_page_viewed` → `bundle_generated` → `pitch_copied`

### Key Drop-off Points

| Stage | Alert If | Likely Cause |
|---|---|---|
| `landing_page_viewed` → `bundle_generated` | Conversion < 60% | Feature board friction, unclear CTA |
| `bundle_generated` → `pitch_copied` | Conversion < 50% | Pitch quality, irrelevant ROI points, generic tone |

---

## Success Thresholds

| Metric | Target | Alert Threshold | Investigate If |
|---|---|---|---|
| Pitch Copy Rate | > 50% of sessions | < 40% for 3 consecutive days | Tone regression in Gemini prompt, irrelevant ROI anchors |
| Time to First Copy | < 120 seconds (p50) | > 180 seconds p50 | UX friction in feature board, latency spike |
| Generation Latency p95 | < 5,000ms | > 5,000ms | Gemini model degradation, Vercel cold start spike |
| Gemini Failure Rate | < 2% | > 5% for any day | Prompt breaking change, Gemini API outage |
| Landing → Generate Conversion | > 60% | < 40% | Feature board UX issue, tool discoverability problem |
| Daily Generation Volume | Stable/growing after launch | Drop > 30% day-over-day | Deployment issue, tool not being shared |

---

## Implementation Notes

### Analytics Tool

PostHog (`posthog-js` client + `posthog-node` server). Both already integrated.

### Ground-Truth Source

`bundle_sessions` table in Neon DB is the authoritative analytics source for `pitch_copied`. Survives PostHog event drop and can be queried directly.

```sql
-- North Star: Pitch Copy Rate by Day
SELECT
    COUNT(*) FILTER (WHERE pitch_copied = true)::FLOAT / COUNT(*) AS pitch_copy_rate,
    DATE_TRUNC('day', created_at) AS day
FROM bundle_sessions
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY day
ORDER BY day DESC;

-- Supporting: Top Features in Copied Sessions
SELECT
    UNNEST(selected_features) AS feature,
    COUNT(*) AS sessions_copied
FROM bundle_sessions
WHERE pitch_copied = true
    AND created_at > NOW() - INTERVAL '30 days'
GROUP BY feature
ORDER BY sessions_copied DESC;
```

### Required Code Changes Before /deploy-check

1. **`proposal_generation_failed`** — add PostHog event to the Gemini error catch block in `app/api/generate-proposal/route.ts`
2. **`proposal_generation_timeout`** — add PostHog event to the 504 timeout branch in the same file
3. **Verify `landing_page_viewed`** — confirm auto-captured via `capture_pageviews: true` in `PostHogProvider.tsx` by checking PostHog live events in dev

### PostHog Dashboards (Create After First Week)

| Dashboard | Chart | Events |
|---|---|---|
| North Star Tracker | Time series: `pitch_copied` / `bundle_generated` ratio | `pitch_copied`, `bundle_generated` |
| Funnel Health | 3-step conversion funnel | `landing_page_viewed` → `bundle_generated` → `pitch_copied` |
| System Reliability | Line: failure rate + latency p50/p95 | `proposal_generation_failed`, `proposal_generation_timeout`, `bundle_generated.latency_ms` |
| Feature Adoption | Bar: feature frequency in generated vs. copied sessions | `bundle_generated.selected_features` (filter by `pitch_copied`) |
