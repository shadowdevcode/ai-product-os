# Peer Review: Nykaa Hyper-Personalized Style Concierge (issue-008)

**Date:** 2026-03-28  
**Agent:** Peer Review Agent  
**Status:** BLOCKED — 3 MUST-FIX items, 3 MEDIUM items  
**Input:** Code review results, full implementation (`apps/nykaa-personalisation/`), schema.sql, plan-008.md

---

## Challenge Mode — Assumption Audit

### Assumption 1: "The base64 JWT is sufficient auth for an experiment MVP"

**Why it's risky:** The current auth system (`auth.ts`) decodes a base64-encoded `{ userId }` JSON blob from the `Authorization` header. There is zero signature verification — any client can forge any userId by computing `btoa('{"userId":"user-001"}')`. This isn't just a "production concern" — it corrupts the experiment itself. If a demo viewer manually hits `/api/personalisation/ingest-event` with a forged token, session events and affinity signals are poisoned for that userId, making the A/B experiment data meaningless.

**Failure mode:** An adversarial user or confused developer POSTs click events for `user-001` while actually being `user-003`. The affinity profile during nightly rebuild merges these phantom signals. Experiment result: test cohort CTR is inflated or deflated by foreign signals. The 15–25% CVR lift target becomes unmeasurable.

**Counterargument strength:** Weak. This is a demo/experiment system, but the entire value proposition is measuring a clean A/B lift. Unsigned tokens undermine the one thing this MVP exists to prove.

### Assumption 2: "In-memory rate limiting is acceptable for MVP"

**Why it's risky:** Vercel serverless functions are stateless cold-start instances. The in-memory `Map` in `rate-limit.ts` resets on every cold start, and different requests may hit different function instances. At any meaningful traffic level, the rate limiter is effectively a no-op.

**Failure mode:** If this demo is shared publicly or if Nykaa engineering team runs load tests, the rate limiter provides zero protection. The `/shelf` and `/rerank` endpoints hit the Neon DB on every request (2-3 queries each). Neon's free tier has connection limits — rapid requests will exhaust the connection pool and 500 all users.

**Counterargument strength:** Moderate. The plan explicitly acknowledges this as a known MVP limitation. However, the plan also says "no paid external API is called on these routes" — but Neon DB IS an external service with connection limits, so the claim is misleading.

### Assumption 3: "PostHog failure on shelf route await is non-blocking"

**Why it's risky:** In `shelf/route.ts` lines 50-54, the `shelf_impression` event is `await`ed before returning the response. If PostHog is slow (common: PostHog's `flush()` can take 500ms+), this directly adds to the shelf API latency. The 200ms P95 SLA from the product spec becomes impossible to guarantee when a telemetry flush is in the critical path.

**Failure mode:** PostHog ingestion server has a bad day → `flush()` blocks for 2-3 seconds → shelf endpoint returns after 3+ seconds → ForYouShelf client-side AbortController fires at 500ms → user sees editorial fallback even though the personalization data was ready. The test cohort shows artificially lower CTR because PostHog latency is masquerading as API unavailability. Experiment results are compromised.

**Counterargument strength:** Weak. This is a measurable latency regression in production conditions.

---

## Multi-Perspective Challenge

### 1. Reliability Engineer — "What breaks at 3am?"

The `rebuild-affinity` cron endpoint (`POST /api/admin/rebuild-affinity`) calls `rebuildAffinityProfiles()` which iterates all users sequentially with individual `await upsertAffinityProfile()` calls inside a `for` loop (AffinityBuilder.ts:52). For 5 mock users this is fine. For 5,000 real users on Nykaa, this is a classic serverless timeout: 5000 sequential DB writes × ~50ms each = 250 seconds. Vercel Pro maxes at 60s. The cron silently fails, affinity profiles go stale, and the shelf degrades to editorial fallback for all users. No alert fires because the only telemetry is `affinity_rebuild_failed` in the catch block — but the catch never triggers because Vercel hard-kills the function.

**Finding: RR1 (MUST FIX)** — AffinityBuilder processes users sequentially inside a for loop. At production scale this will exceed serverless timeout limits.

### 2. Adversarial User — "How does a bad actor break this?"

The `ingest-event` route has no rate limiting. Unlike `/shelf` and `/rerank` (which have `isRateLimited` checks), the POST endpoint at `/api/personalisation/ingest-event` accepts unlimited requests. An attacker can:

1. Forge a base64 token for any userId
2. POST thousands of synthetic click events for `brand-zara` / `cat-dresses`
3. The nightly affinity rebuild reads from `session_events`, and even though it currently uses mock order history, the session events table grows unboundedly between the 24h TTL cleanup windows
4. The session_events table has no per-user daily insert limit — 1M rows per user is valid

**Finding: RR2 (MEDIUM)** — `POST /api/personalisation/ingest-event` has no rate limiting, unlike the other user-facing endpoints.

### 3. Future Maintainer — "What confuses the next engineer?"

The `NEXT_PUBLIC_AB_EXPERIMENT_SALT` env var is used in `CohortService.ts` to compute the SHA-256 cohort hash. It's marked `NEXT_PUBLIC_*` which means it's exposed to the browser bundle. This is a subtle correctness problem: if a user reads the salt from the JS bundle, they can compute their own cohort assignment and choose to only behave differently when in "test" — poisoning the experiment. The salt should be server-only (`AB_EXPERIMENT_SALT`).

**Finding: EC1 (MUST FIX)** — `NEXT_PUBLIC_AB_EXPERIMENT_SALT` exposes A/B salt to client-side JavaScript, enabling cohort self-selection by sophisticated users.

---

## Architecture Concerns

### AC1: PostHog in the critical path corrupts experiment measurement (MUST FIX)

**Location:** `shelf/route.ts:50-54`, `rerank/route.ts:48-53`, `ingest-event/route.ts:36-41`

All three user-facing API routes `await captureServerEvent()` before returning the HTTP response. `captureServerEvent()` calls `client.flush()` which is a network call to PostHog's ingestion server. This creates three problems:

1. **Latency addition:** The 200ms P95 shelf latency SLA cannot be met when a ~200-500ms PostHog flush is in the hot path.
2. **PostHog failure = API failure:** In `ingest-event/route.ts:36`, if PostHog throws, the `catch` at line 44 fires and the user gets a 500 — even though the DB write succeeded. The click event is lost from PostHog but present in DB, creating a measurement discrepancy.
3. **Self-cancellation:** The shelf endpoint's PostHog flush takes long → client AbortController kills the request at 500ms → shelf falls back to editorial → PostHog records the event as successful but the user never saw the personalised shelf. `shelf_impression` fires but user saw editorial. North Star CTR is inflated.

**Fix:** Move PostHog captures to fire-and-forget with `.catch(() => {})` in user-facing routes. Do NOT await `captureServerEvent`. The DB write is the source of truth; PostHog is observability, not the critical path.

---

## Scalability Risks

### S1: Sequential DB writes in AffinityBuilder (already captured as RR1)

### S2: Seed endpoint uses sequential loop

`db.ts:166-176` — `seedTestCohorts` runs individual INSERT statements in a sequential `for` loop. This is fine for 5 users but the pattern will be copy-pasted for production seeding.

**Severity:** Low (demo only). No action required — but note for production migration.

---

## Edge Cases

### EC1: NEXT_PUBLIC_AB_EXPERIMENT_SALT (already captured above) — MUST FIX

### EC2: Search page hardcodes activeUser to user-001 (MEDIUM)

`search/page.tsx:20` — `const [activeUser] = useState(DEMO_USERS[0])` — the search page always uses `user-001` regardless of which user was selected on the homepage. The user switcher on the homepage changes `activeUser` state, but navigating to `/search` via `Link` creates a new page component with fresh state. The demo breaks: you select "Arjun (Activewear)" on the homepage, navigate to search, and get Priya's reranking.

**Fix:** Pass activeUser via URL query param or shared context (React context or URL state).

### EC3: Control cohort shelf response reveals cohort label (MEDIUM)

`shelf/route.ts:27-31` returns `{ cohort: "control", products: EDITORIAL_PRODUCTS }`. The JSON response explicitly tells the client `"cohort": "control"`. If a Nykaa PM or engineer inspects the network tab, they know their cohort assignment. This is an A/B experiment contamination risk — knowing your assignment can change behavior.

**Fix:** Return `"cohort": "default"` for control group responses. The server should track the real cohort for analytics but never surface the label to the client. Better: remove the `cohort` field from client-facing responses entirely, and use PostHog server-side events (which already capture cohort) for all analytics.

---

## Reliability Risks

### RR1: AffinityBuilder sequential processing (MUST FIX)

**Location:** `AffinityBuilder.ts:30-63`

The `for...of` loop with sequential `await upsertAffinityProfile()` calls will timeout on Vercel for any meaningful user count. This is a known anti-pattern from engineering lessons #3 and #7.

**Fix:** Batch the upserts using a single multi-row `INSERT ... ON CONFLICT` statement, or at minimum use `Promise.allSettled` with chunked batches (e.g., 50 users per batch) to parallelize.

### RR2: Ingest-event has no rate limiting (MEDIUM — already captured)

### RR3: No Sentry integration

`coding-standards.md` mandates Sentry as a requirement for all apps. No `sentry.client.config.ts`, `sentry.server.config.ts`, or `@sentry/nextjs` dependency exists. While this would normally be caught at deploy-check, the pattern of deferring error tracking to later stages has been identified as a recurring problem.

**Severity:** Low for peer review (deploy-check will catch it). Noted for completeness.

---

## Product Alignment Issues

### PA1: add_to_cart event is never emitted (KEY MEASUREMENT GAP)

The product spec defines "Add-to-Cart rate" as the second success metric with a ≥+10% lift target. The event taxonomy defines `ADD_TO_CART` in `events.ts`. But **no code anywhere in the codebase emits this event**.

- The `ProductCard` component has an `onClick` handler that fires intent tracking (shelf_click), but there is no "Add to Cart" button on any product card.
- There is no PDP (Product Detail Page) in the implementation.
- The comment in `search/page.tsx:37` says "add_to_cart would be handled on PDP, not here" — but no PDP exists.

This means 50% of the experiment's success metrics (Add-to-Cart rate lift) are unmeasurable with the current implementation. The `/metric-plan` stage will flag this, but the product alignment gap is structural — it's not a missing telemetry event, it's a missing user flow.

**Impact:** Medium. The shelf CTR metric alone is sufficient to validate the hypothesis for an MVP experiment. But the plan explicitly commits to measuring ATC rate — so either the plan needs amendment or a minimal PDP/ATC flow needs to exist.

---

## Recommendations

### MUST FIX (blocking for QA)

| ID      | Finding                                                                           | Location                                                              | Fix                                                                                                                                                    |
| ------- | --------------------------------------------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **RR1** | AffinityBuilder sequential processing will timeout at scale                       | `AffinityBuilder.ts:30-63`                                            | Use batched SQL `INSERT ... ON CONFLICT` or `Promise.allSettled` with chunked batches                                                                  |
| **EC1** | A/B salt exposed to client via `NEXT_PUBLIC_*` prefix                             | `CohortService.ts:14`, `.env.local.example`                           | Rename to `AB_EXPERIMENT_SALT` (server-only). Remove `NEXT_PUBLIC_` prefix. Since CohortService runs only on server routes, no client access is needed |
| **AC1** | PostHog `await flush()` in critical path adds latency and creates false fallbacks | `shelf/route.ts:50`, `rerank/route.ts:48`, `ingest-event/route.ts:36` | Remove `await` from `captureServerEvent` calls in user-facing routes. Use `.catch(() => {})` pattern (fire-and-forget for observability calls)         |

### MEDIUM (fix before demo, not blocking for QA)

| ID      | Finding                                                            | Location                | Fix                                                                                         |
| ------- | ------------------------------------------------------------------ | ----------------------- | ------------------------------------------------------------------------------------------- |
| **EC2** | Search page ignores homepage user selection — always uses user-001 | `search/page.tsx:20`    | Pass userId as URL query param from homepage Link, or use React context/global state        |
| **EC3** | Control cohort label exposed in API response                       | `shelf/route.ts:28`     | Return `"cohort": "default"` for control group, or remove cohort field from client response |
| **RR2** | `POST /ingest-event` has no rate limiting                          | `ingest-event/route.ts` | Add `isRateLimited(ip)` check consistent with shelf and rerank routes                       |

### LOW (noted, no action required)

| ID      | Finding                                          | Notes                                                                                                    |
| ------- | ------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| **PA1** | `add_to_cart` event never emitted, no PDP exists | Plan amendment needed at metric-plan stage — shelf CTR alone is sufficient for MVP experiment validation |
| **RR3** | No Sentry integration                            | Will be caught at deploy-check per established pipeline                                                  |
| **S2**  | Seed helpers use sequential INSERT loop          | Demo-only code, not a blocking issue                                                                     |

---

## Prompt Autopsy Check

No new agent prompt gaps identified for this review cycle. The existing engineering lessons and agent instructions correctly cover all patterns encountered:

- Sequential processing anti-pattern → engineering-lessons.md #3, #7
- Rate limiting requirement → engineering-lessons.md #11 (covers paid APIs; ingest-event doesn't call a paid API but is a write endpoint)
- PostHog in critical path → partially covered by engineering-lessons.md #15 (error-path events) but the latency-in-hot-path variant is new

**Candidate rule for /learning if this pattern is confirmed in postmortem:**

File: `knowledge/engineering-lessons.md`
Section: Lessons (append)
Add: "PostHog captureServerEvent calls in user-facing API routes must be fire-and-forget (no await) unless the route's SLA explicitly permits telemetry latency. Awaiting flush() in the hot path adds 200-500ms of uncontrollable external latency and causes false client-side timeouts that corrupt experiment measurement. Exception: admin/cron routes where latency SLA doesn't apply."

File: `agents/backend-architect-agent.md`
Section: Mandatory Pre-Approval Checklist
Add: "8. For every API route with a latency SLA (P95 target), confirm that PostHog/telemetry calls are fire-and-forget (not awaited). Awaited telemetry in hot paths violates latency contracts and creates false fallback triggers in experiment flows."

---

## Verdict

**BLOCKED.** Fix RR1, EC1, and AC1 before proceeding to `/qa-test`. Medium items EC2, EC3, RR2 should be fixed before any demo session.
