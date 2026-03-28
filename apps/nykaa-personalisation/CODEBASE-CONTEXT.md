# Codebase Context: nykaa-personalisation

Last updated: 2026-03-28

## What This App Does

A rule-based personalisation engine for Nykaa Fashion that replaces the static editorial homepage feed with a user-affinity weighted "For You" shelf and personalised search re-ranking. Uses a deterministic SHA-256 A/B cohort split (test vs. control) to measure whether affinity-weighted product ranking lifts shelf CTR for logged-in users. The core flow: user visits homepage → shelf loads personalised products (test) or editorial fallback (control) → user clicks product → intent tracked → nightly cron rebuilds affinity profile from session events + order history.

## Architecture Overview

- **Frontend:** Next.js 16 (App Router), TypeScript, Tailwind CSS. Server Components by default, Client Components for interactive shelf and search.
- **Backend:** 5 API routes under `src/app/api/`. User-facing routes use fire-and-forget PostHog telemetry. Admin routes use `CRON_SECRET` auth.
- **Database:** Neon DB (serverless PostgreSQL via `@neondatabase/serverless`). 3 tables: `experiment_cohorts`, `user_affinity_profiles`, `session_events`. All queries parameterized (no SQL injection risk).
- **AI Integration:** None — pure rule-based scoring. Affinity (0.6 weight) + Intent (0.4 weight) computed in `score-product.ts`.
- **Analytics:** PostHog (`posthog-node` server-side, `posthog-js` client-side). 10 events defined in `events.ts`. Single emission source per event enforced.
- **Error Tracking:** Sentry (`@sentry/nextjs`) configured for client, server, and edge runtimes (`sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`).

## Key Files

| File                                                | Purpose                                                                                                         |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `src/lib/personalisation/score-product.ts`          | Shared scoring function (affinity 0.6 + intent 0.4). Used by both shelf and rerank.                             |
| `src/lib/personalisation/CohortService.ts`          | Deterministic SHA-256 A/B assignment. Server-only salt (`AB_EXPERIMENT_SALT`).                                  |
| `src/lib/personalisation/PersonalisationService.ts` | Orchestrates shelf product ranking for test cohort users.                                                       |
| `src/lib/personalisation/RerankEngine.ts`           | Re-ranks search results using affinity + intent signals.                                                        |
| `src/lib/personalisation/AffinityBuilder.ts`        | Nightly cron: rebuilds affinity profiles from order history. Batched (50 users/chunk) via `Promise.allSettled`. |
| `src/lib/db.ts`                                     | All Neon DB queries. Parameterized. Write-once cohort (ON CONFLICT DO NOTHING).                                 |
| `src/lib/posthog.ts`                                | Server-side PostHog wrapper. `captureServerEvent` flushes per call (serverless pattern).                        |
| `src/app/page.tsx`                                  | Homepage with demo user switcher (5 test users: Priya, Arjun, Meera, Rahul, Ananya).                            |
| `src/app/search/page.tsx`                           | Search page with personalised re-ranking + "Personalised" badge for test cohort.                                |
| `src/lib/auth.ts`                                   | Both auth mechanisms: `getUserIdFromRequest()` (base64 JWT) and `verifyCronSecret()` (CRON_SECRET header).      |
| `src/lib/rate-limit.ts`                             | In-memory sliding window rate limiter (30 req/60s per IP). Resets on cold start.                                |
| `src/components/personalisation/ForYouShelf.tsx`    | Client component. 500ms AbortController timeout → editorial fallback on slow response.                          |

## Data Model

- **experiment_cohorts**: Stable A/B assignment per user per experiment. Write-once (first assignment wins). `UNIQUE(user_id, experiment_id)`.
- **user_affinity_profiles**: Pre-computed top brands/categories per user. Rebuilt nightly by `AffinityBuilder`. `UNIQUE(user_id)`.
- **session_events**: Ephemeral click-stream (product views). 24h TTL via `cleanupExpiredEvents()`. Used for real-time intent scoring.

## API Endpoints

| Method | Path                                | Auth        | Purpose                                                        |
| ------ | ----------------------------------- | ----------- | -------------------------------------------------------------- |
| GET    | `/api/personalisation/shelf`        | Base64 JWT  | Returns 12 personalised (test) or editorial (control) products |
| GET    | `/api/personalisation/rerank`       | Base64 JWT  | Re-ranks search results by affinity + intent                   |
| POST   | `/api/personalisation/ingest-event` | Base64 JWT  | Records product click in session_events                        |
| POST   | `/api/admin/rebuild-affinity`       | CRON_SECRET | Nightly cron: rebuilds all affinity profiles                   |
| POST   | `/api/seed`                         | CRON_SECRET | Seeds 5 demo users with cohorts + affinity profiles            |

## Auth Flow

Two mechanisms, both defined in `src/lib/auth.ts`:

1. **User routes** (shelf, rerank, ingest-event): `Authorization: Bearer <token>` where token is `btoa(JSON.stringify({userId: "user-001"}))`. Parsed by `getUserIdFromRequest()`. Unsigned — any client can forge a userId. Demo-grade only.
2. **Admin routes** (rebuild-affinity, seed): `x-cron-secret` header compared against `process.env.CRON_SECRET`. Verified by `verifyCronSecret()`. Used by Vercel Cron and manual seed calls.

No session cookies, no OAuth, no Supabase Auth. Auth tokens are generated client-side in `page.tsx` and `search/page.tsx` via `btoa(JSON.stringify({userId}))`.

## Things NOT to Change Without Reading First

1. **`score-product.ts` is shared** — used by both shelf and rerank routes. Changes affect both flows.
2. **CohortService uses server-only `AB_EXPERIMENT_SALT`** — do NOT add `NEXT_PUBLIC_` prefix. This was a security fix (peer-review EC1).
3. **Control group returns `cohort: "default"`, NOT `"control"`** — intentional masking to prevent experiment contamination.
4. **PostHog is fire-and-forget in user-facing routes** — do NOT add `await` to `captureServerEvent()` calls in shelf/rerank/ingest-event. This was a latency fix (peer-review AC1).
5. **AffinityBuilder uses batched Promise.allSettled** — do NOT revert to sequential `for` loop. Prior version caused serverless timeout.
6. **`EDITORIAL_PRODUCTS` is `MOCK_PRODUCTS.slice(0, 8)`** — positional. Reordering MOCK_PRODUCTS changes the control baseline silently.

## Known Limitations

1. **No PDP or Add-to-Cart flow** — the metric plan defines ATC rate as North Star, but no product detail page or ATC button exists. Shelf CTR is the measurable proxy for MVP.
2. **In-memory rate limiting** — `rate-limit.ts` Map resets on cold start and doesn't share across Vercel instances. Documented as acceptable for demo; upgrade to Upstash Redis for production.
3. **Base64 JWT auth is unsigned** — any client can forge userId. Acceptable for demo/experiment; not for production.
4. **Rerank endpoint still returns real cohort label** — inconsistent with shelf's "default" masking (peer-review L1). Low severity.
5. **`useIntentTracker.ts` JSON.parse risk** — sessionStorage reads should be try/catch wrapped (QA medium finding). Fix before scaling.
6. **`useSearch.ts` missing AbortController** — rapid search submissions can cause race conditions (QA medium finding). Fix before scaling.
