# Metric Plan: Nykaa Hyper-Personalized Style Concierge (issue-008)

## North Star Metric

**Add-to-Cart (ATC) Rate Lift (Test vs. Control)**
The single most important metric that proves the hypothesis is whether affinity-based ranking actually drives users to add products to their cart. We need to see a statistically significant lift in the ATC rate within the same session.

- **Target:** ≥ +10% lift for the Test cohort compared to Control.

## Supporting Metrics

1. **Homepage "For You" Shelf Click-Through Rate (CTR):** Measures engagement with the personalized shelf. Target: +15% lift vs. editorial row (Control).
2. **Search Re-rank Click-Through Rate (CTR):** Measures relevance of re-ordered top 20 search results. Target: +10% lift vs. base catalog ranking.
3. **Shelf Load Latency (P95):** Ensures personalization does not degrade the core UX. Target: ≤ 200ms API response time.
4. **Cold-Start Suppression Rate:** Percentage of users who receive the editorial fallback because they lacked the requisite affinity data (e.g. <2 past orders). Monitors the reach of the feature.

## Event Tracking Plan

**1. `shelf_impression`**

- **Trigger:** When the homepage shelf finishes loading and is visible to the user.
- **Properties:** `userId`, `sessionId`, `cohort` ('test' | 'control'), `productIds` (array of displayed IDs), `fallback` (boolean, true if rendered fallback).
- **Location:** Client-side inside `useEffect` in `ForYouShelf.tsx`.

**2. `shelf_click`**

- **Trigger:** When a user clicks on a product card specifically within the new homepage shelf.
- **Properties:** `userId`, `sessionId`, `productId`, `brandId`, `categoryId`, `position` (index in list), `cohort`.
- **Location:** Client-side on `ProductCard` click wrapper / `useIntentTracker`.

**3. `search_rerank_impression`**

- **Trigger:** When a user lands on a search results page containing our re-ranked top 20 items.
- **Properties:** `userId`, `sessionId`, `query`, `cohort`.
- **Location:** Client-side inside `useSearch` resolution or server-side when API successfully returns.

**4. `add_to_cart`**

- **Trigger:** When a user taps the "Add to Bag" button either from the shelf, search listing, or PDP.
- **Properties:** `userId`, `sessionId`, `productId`, `source` (e.g., 'for-you-shelf', 'search', 'editorial'), `cohort`.
- **Location:** Client-side ATC callback.

**5. Error-Path Events**

- `shelf_load_failed`: Fired server-side when `/api/personalisation/shelf` fails (e.g., Neon DB timeout).
- `rerank_failed`: Fired server-side when `/api/personalisation/rerank` crashes or timeouts.

## Funnel Definition

1. **Homepage Visit** (`pageview` or basic visit signal where `userId` is present)
2. **Exposure** (`shelf_impression`)
3. **Engagement** (`shelf_click` / `search_rerank_impression` -> search click)
4. **Intent** (Product Detail Page View)
5. **Conversion** (`add_to_cart`)

Drop-offs will be closely monitored between **Exposure → Engagement** to see if the recommendations are relevant enough, and **Engagement → Conversion** to see if the clicked items represent genuine purchase intent vs. curiosity clicks.

## Success Thresholds

- **Add-to-Cart Lift:** ≥ +10% for test cohort (Primary).
- **Shelf CTR Lift:** ≥ +15% for test cohort.
- **Search Re-rank CTR Lift:** ≥ +10% for test cohort.
- **Alert Thresholds:**
  - Investigate if P95 latency exceeds 500ms (the strict AbortController limit where it falls back to editorial).
  - Investigate if `shelf_load_failed` fires for > 2% of total `shelf_impression` events.
  - Investigate if test vs. control assignment deviates from a 50/50 split outside a 48/52 acceptable margin.

## Implementation Notes

- **Tooling:** PostHog will be the analytics backend, capturing both client-side and server-side events.
- **Client Fallbacks & Single Source of Truth:** `shelf_click` must be a single emission without duplication (validated in prior `/review` step). PostHog failures must be swallowed cleanly by fire-and-forget implementations so as to not block UX or API responses (verified in `/qa-test`).
- **Data Cross-referencing:** `session_events` in Neon DB acts as a ground truth table for in-session clickstreams which can be joined against `experiment_cohorts` inside Metabase or Supabase Studio to validate PostHog's data streams manually.
- **Cohort Stickiness:** Test vs. Control splits are persisted in the `experiment_cohorts` table via deterministic SHA-256 hashing. Always pull `cohort` label from the verified backend to pass down for event tracking, never rely purely on frontend cookie states.
