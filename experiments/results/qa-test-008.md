# QA Test Results for Nykaa Hyper-Personalized Style Concierge (issue-008)

---

## Functional Tests

- **Shelf Loading:** Successfully returns 12 personalized products for the test cohort and 12 editorial products for the control group. The server-side parallelization of affinity and intent history fetches works effectively. **[PASS]**
- **Search Reranking:** Successfully filters down to 20 candidate items. Correctly applies 60/40 scoring algorithm for test-cohort users, while naturally truncating base catalog candidates for control. **[PASS]**
- **Event Ingestion:** POST `/api/personalisation/ingest-event` correctly inserts session clickstreams into Neon DB and handles random `sessionId` distribution smoothly. **[PASS]**
- **Affinity Building Cron:** Evaluates the mock order list in batches of 50 via `Promise.allSettled`, avoiding lambda timeout thresholds, and successfully populates `user_affinity_profiles`. **[PASS]**

## Edge Cases

- **Empty Search Queries:** Gracefully returns HTTP 400 Bad Request if the query is blank or missing. **[PASS]**
- **In-Memory Capping:** `sessionStorage` correctly utilizes standard Array splicing via `.slice(-3)` to prevent intent payloads from continuously expanding off browser limits. **[PASS]**
- **Oversized API Payloads:** `ingest-event` does not enforce maximum string lengths on `brandId` and `categoryId`; oversized data could be technically sent but will be truncated by postgres schemas or rate limits. **[LOW RISK]**

## Failure Scenarios

- **Telemetry Unavailability Test:** When PostHog is disabled or times out, the `captureServerEvent` swallows the rejection and does NOT interrupt or fail any API route. Both the worker endpoints (like `rebuild-affinity`) and user-facing endpoints (`shelf`/`rerank`) remain 200 OK. Analytics fall back safely. **[PASS]**
- **Failure Telemetry Verification:** Simulated fatal SQL errors inside APIs (such as `shelf` dropping DB connection) are cleanly intercepted by top-level `catch` blocks. These blocks correctly record `_FAILED` telemetry (e.g. `SHELF_LOAD_FAILED`, `RERANK_FAILED`) alongside fallback responses without 500-crashing user UI requests! **[PASS]**
- **Database Cold Starts:** The `ForYouShelf.tsx` features a strict 500ms client-side `AbortController` rendering loop. If the query to `/api/personalisation/shelf` takes longer than 500ms (e.g., Neon serverless cold start), the hook aborts gracefully and renders the `EDITORIAL_PRODUCTS` fallback. **[PASS]**

## Performance Risks

- **Parallel Database Loads:** Independent DB operations over `getUserCohort` and `searchProducts` inside the rerank engine use `Promise.all`, preventing sequential waterfall delays. **[PASS]**
- **Rate Limiting Checks:** `isRateLimited` efficiently curbs any abuse of unauthenticated proxy requests across exposed API borders. **[PASS]**

## UX Issues

- **Unprotected JSON Parsing:** Inside `useIntentTracker.ts`, reading from `sessionStorage` fires a raw `JSON.parse(raw)`. If storage becomes corrupted, poisoned, or unreadable, this will trigger an unhandled runtime exception, silently breaking client-side logic on click events. **[MEDIUM RISK]**
- **Race Condition in Search Payload:** `useSearch.ts` issues asynchronous HTTP `fetch()` requests without utilizing an `AbortController`. If a user rapidly taps enter or fires overlapping identical form dispatches, it can result in older search results overwriting newer ones due to network packet race conditions. **[MEDIUM RISK]**

---

## Final QA Verdict

**PASS**

The system handles both functional core loops and extreme infrastructural failure tests perfectly. The dual PostHog outage handling and strict DB exception handling models are fully observed and implemented perfectly.

_Recommendation: Resolve the two medium risk UX issues (try/catch over tracker JSON parsing, and search AbortController cleanup) prior to scaling._
