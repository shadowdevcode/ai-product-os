# Plan: Nykaa Hyper-Personalized Style Concierge

**Issue**: exploration-008
**Date**: 2026-03-27
**Status**: Draft

---

## Plan Summary

Build a rule-based personalization MVP for Nykaa Fashion that injects a "For You" product shelf on the homepage and re-ranks search results using a simple formula: **Historical Affinity (brand/category buy history) + Real-time In-session Intent (last 3 click events)**. This is an experiment, not a full product. The goal is to measure whether basic rule-based recommendations lift CTR and Add-to-Cart rate versus the default editorial shelf.

---

## 1 Product Specification

_(Product Agent)_

### Product Goal

Enable returning logged-in Nykaa Fashion users to see a personalised "For You" shelf on the homepage and a re-ranked search results page — boosting CTR and Add-to-Cart rates within a single session via a rule-based engine, without requiring an ML model.

### Target User

**Returning logged-in Nykaa Fashion user**

- Has at least 1 past order or 5+ browse sessions
- Shops fashion/beauty 2–4× per month
- Uses Nykaa Fashion on mobile browser or the Nykaa app web-view
- Currently applies manual category/brand filters every session because the homepage is static editorial

### Core User Journey

1. User logs in to Nykaa Fashion
2. Homepage loads → "For You" shelf is injected below the hero banner, seeded from historical affinity (top 2 brands/categories from order history)
3. User clicks 1–3 products (in-session intent captured)
4. "For You" shelf quietly re-weights clicked brand/category signals
5. User navigates to search → results page re-ranks top 20 results using combined affinity + intent score
6. User adds item to cart

### MVP Scope

**Include**

- "For You" shelf component (homepage, logged-in only)
- Historical affinity profile (derived from order history: top brands, top categories, last 30 days recency weight)
- In-session intent tracker (last 3 product clicks stored in session memory)
- Search result re-ranker (re-scores top 20 results using affinity + intent formula)
- A/B cohort split (50/50 logged-in users: control = editorial, test = personalised shelf)
- PostHog event instrumentation (shelf_impression, shelf_click, search_rerank_impression, add_to_cart)

**Exclude**

- ML / collaborative filtering
- Cold-start onboarding flow (swipe cards)
- Computer vision tags
- Push notifications / email triggers
- Admin tuning UI for category team (manual boost levers excluded from V1)
- Unauthenticated (guest) users

### Success Metrics

| Metric                                | Target      | Measurement Window |
| ------------------------------------- | ----------- | ------------------ |
| Shelf CTR (test vs control)           | ≥ +15% lift | 2-week experiment  |
| Add-to-Cart rate (test vs control)    | ≥ +10% lift | 2-week experiment  |
| Search re-rank CTR                    | ≥ +10% lift | 2-week experiment  |
| Shelf load latency (P95)              | ≤ 200ms     | Continuous         |
| Zero regression on homepage load time | < +50ms     | Continuous         |

### Acceptance Criteria

- Logged-in returning user sees "For You" shelf within 200ms of homepage load
- Shelf shows ≥ 6 products (falls back to editorial if <6 products available for user profile)
- Clicking a shelf product fires `shelf_click` PostHog event with `{userId, productId, position, sessionId}`
- Search re-ranking fires `search_rerank_impression` event with cohort label
- A/B cohort assignment is persistent per user (not per-session)
- Control group sees default editorial shelf (no "For You" visible)

---

## 2 UX Design

_(Design Agent)_

### User Flow

```
Login
  └── Homepage Load
        └── [IF logged-in returning user AND test cohort]
              └── "For You" shelf renders below hero banner
                    └── User clicks a shelf product
                          └── Product detail page (PDP)
                                └── User navigates to Search
                                      └── Search results re-ranked (top 20)
                                            └── User adds to cart
```

### Screens

| Screen                        | Purpose                                                                                                                         |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **Homepage**                  | Inject "For You" shelf below hero banner (test cohort only). No page redesign — shelf slot replaces one existing editorial row. |
| **Product Detail Page (PDP)** | Unchanged. Click on shelf item routes here. In-session intent captured on page load.                                            |
| **Search Results Page**       | Top 20 results re-ranked using affinity + intent score. No visual indicator to the user that re-ranking is active.              |

### UI Components

| Component       | Description                                                                                                  |
| --------------- | ------------------------------------------------------------------------------------------------------------ |
| `ForYouShelf`   | Horizontal scroll strip. Label: "Picked for you". Shows 6–12 product cards. Lazy-loaded.                     |
| `ProductCard`   | Existing Nykaa product card (reuse). Wrap with click-tracker HOC for intent capture.                         |
| `ShelfSkeleton` | Placeholder skeleton shown during shelf hydration (<200ms target). Falls back to editorial row if API fails. |

### Interaction Logic

1. On homepage mount: fire `GET /api/personalisation/shelf` with auth cookie. Display `ShelfSkeleton` while waiting.
2. On API response: replace skeleton with `ForYouShelf`. If API errors or times out in >500ms → render editorial row instead (silent fallback).
3. On product card click: store `{productId, brandId, categoryId, ts}` to `sessionStorage` (max 3 entries, FIFO). Fire `shelf_click` PostHog event.
4. On search page mount: fire `GET /api/personalisation/rerank?q={query}` (replaces direct Nykaa search call). Backend re-ranks and returns sorted results.

### UX Risks

- **Latency > 200ms** → shelf renders below the fold or flickers. Mitigate: edge-cached affinity profile + synchronous session intent from client.
- **Poor recommendations (too few past orders)** → inaccurate shelf damages trust. Mitigate: require minimum 2 past purchases OR 10 sessions to qualify; otherwise suppress shelf entirely.
- **Re-ranking surfaces irrelevant items** → user ignores. Mitigate: only re-rank top 20, not change the entire result set. Keep editorial integrity for positions 21+.

---

## 3 System Architecture

_(Backend Architect Agent)_

### Security Pre-Approval Gate

1. **RLS**: All user-scoped tables (`user_affinity_profiles`, `experiment_cohorts`, `session_events`) have RLS enabled. Policies restrict reads/writes to the owning `user_id` via Supabase auth JWT.
2. **Worker endpoint auth**: `POST /api/personalisation/ingest-event` (click ingestion) requires valid Supabase JWT (Authorization: Bearer). `POST /api/admin/cohort-assign` (batch cohort seeder, internal cron) requires `CRON_SECRET` header.
3. **Rate limiting**: `GET /api/personalisation/shelf` and `GET /api/personalisation/rerank` are limited to 30 req/60s per IP using an in-memory sliding window Map. No paid external API is called on these routes — scoring is pure arithmetic.
4. **Env vars**: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`, `CRON_SECRET`, `NEXT_PUBLIC_POSTHOG_KEY`, `POSTHOG_HOST`, `NYKAA_CATALOG_API_KEY` (read-only catalog API for product data), `NEXT_PUBLIC_AB_EXPERIMENT_SALT`.

### System Overview

```
Browser (Next.js app)
  ├── GET /api/personalisation/shelf           → PersonalisationService → Supabase (user_affinity_profiles + session_events)
  ├── GET /api/personalisation/rerank?q=...    → PersonalisationService → Nykaa Catalog API (product search) → RerankEngine
  └── POST /api/personalisation/ingest-event   → EventIngestionService → Supabase (session_events)

Supabase (PostgreSQL)
  ├── user_affinity_profiles  (historical affinity — refreshed nightly by cron)
  ├── experiment_cohorts       (A/B assignment — stable per user)
  └── session_events          (in-session intent clicks — TTL 24h)

Cron Job (daily)
  └── POST /api/admin/rebuild-affinity (CRON_SECRET) → reads order history → writes user_affinity_profiles
```

### Services

| Service                    | Responsibility                                                                                                                                    |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| **PersonalisationService** | Loads user affinity profile + last 3 session clicks. Computes shelf product list or re-ranks a candidate set. Pure arithmetic — no AI model.      |
| **EventIngestionService**  | Writes click events to `session_events` table. Called by client on every product click. Must be <50ms.                                            |
| **RerankEngine**           | Scores each product: `score = 0.6 × affinity_match + 0.4 × intent_match`. Sorts descending. Returns top 20.                                       |
| **CohortService**          | Deterministic cohort assignment: `SHA-256(userId + SALT) % 2 → 0=control, 1=test`. Stable across sessions. Result cached in `experiment_cohorts`. |

### API Endpoints

| Method | Endpoint                            | Auth                 | Input                                | Output                                        | Purpose                                                     |
| ------ | ----------------------------------- | -------------------- | ------------------------------------ | --------------------------------------------- | ----------------------------------------------------------- |
| GET    | `/api/personalisation/shelf`        | Supabase JWT         | —                                    | `{ products: ProductCard[], cohort: string }` | Return "For You" shelf products for logged-in user          |
| GET    | `/api/personalisation/rerank`       | Supabase JWT         | `?q=<query>`                         | `{ results: ProductCard[] }`                  | Return re-ranked search results                             |
| POST   | `/api/personalisation/ingest-event` | Supabase JWT         | `{ productId, brandId, categoryId }` | `{ ok: true }`                                | Store in-session click event                                |
| POST   | `/api/admin/rebuild-affinity`       | `CRON_SECRET` header | `{ date: ISO }`                      | `{ usersProcessed: number }`                  | Nightly batch: rebuild affinity profiles from order history |

### Data Flow

1. User logs in → Supabase JWT issued
2. Homepage mounts → `GET /api/personalisation/shelf` called with JWT
3. PersonalisationService reads `user_affinity_profiles` (pre-built) + `session_events` (last 3 clicks today)
4. RerankEngine scores candidate products → returns shelf list
5. User clicks product → `POST /api/personalisation/ingest-event` writes click event to `session_events`
6. User searches → `GET /api/personalisation/rerank?q=dress` fetches Nykaa Catalog API results, re-ranks top 20
7. Nightly cron fires `POST /api/admin/rebuild-affinity` → reads order history → upserts `user_affinity_profiles`

### Infrastructure

| Resource     | Choice                        | Reason                                               |
| ------------ | ----------------------------- | ---------------------------------------------------- |
| Hosting      | Vercel (Next.js)              | Zero-config deployment, edge functions available     |
| Database     | Supabase (PostgreSQL)         | Relational, RLS built-in, instant REST/realtime      |
| Cron         | Vercel Cron (daily)           | No separate infra; calls protected internal endpoint |
| Catalog Data | Nykaa Catalog API (read-only) | Product metadata for shelf + re-ranking              |
| Analytics    | PostHog                       | Event tracking, A/B cohort analysis                  |

**Vercel timeout**: All routes calling Nykaa Catalog API are wrapped in `Promise.race` with `AbortController` at 8s. Return `{ error: 'timeout', fallback: true }` with HTTP 200 — client renders editorial fallback.

**SessionId ordering**: `sessionId = crypto.randomUUID()` generated client-side before any API calls. Passed in all PostHog events and API request headers. Never derived from DB return values.

### Technical Risks

| Risk                                       | Severity | Mitigation                                                              |
| ------------------------------------------ | -------- | ----------------------------------------------------------------------- |
| Nykaa Catalog API latency                  | High     | Cache product metadata in Supabase for 1h. Serve from cache on re-rank. |
| Affinity cold-start (insufficient history) | Medium   | Require ≥2 orders or ≥10 sessions. Suppress shelf for ineligible users. |
| Session event write latency blocking UX    | Medium   | Fire-and-forget: `ingest-event` is called async, not awaited by UI      |
| A/B cohort drift (user clears cookies)     | Low      | Cohort is stored in DB (`experiment_cohorts`), not cookie-dependent     |

**Anti-Sycophancy Check (Backend Architect required)**:

1. **Most fragile point**: The Nykaa Catalog API is an external dependency for both shelf and re-rank. If it's slow or down, both features degrade. We mitigate with caching and a client-side editorial fallback — but the cache TTL (1h) means stale catalog is possible.
2. **Risky assumption**: Order history is accessible. If the Nykaa order history API has different auth scopes or rate limits, affinity rebuild could silently fail for some users.
3. **At 10x traffic**: The in-memory rate-limit Map on Vercel serverless will NOT persist across function instances. At scale, replace with Redis (Upstash). This is a known limitation acceptable for MVP.
4. **Simpler alternative considered**: Could skip the custom API layer and do all personalization client-side using sessionStorage + a pre-fetched affinity blob. Rejected because: (a) exposes affinity profile to client, (b) harder to A/B test cleanly with server-controlled cohort splitting.

---

## 4 Database Schema

_(Database Architect Agent)_

### Database Choice

**Neon DB (Serverless PostgreSQL)**. _[Deviation Note: Originally planned for Supabase to leverage native RLS via JWTs. Replaced with Neon DB per user request. Authorization and RLS-equivalent strict bounds are enforced at the application layer via parameterized SQL queries]_ Relational structure fits the normalized user → events → affinity model.

### Tables

#### `experiment_cohorts`

Stores stable A/B cohort assignment per user.

| Column          | Type                        | Notes                       |
| --------------- | --------------------------- | --------------------------- |
| `id`            | `uuid` PK                   | auto-generated              |
| `user_id`       | `uuid` NOT NULL             | FK → auth.users             |
| `experiment_id` | `text` NOT NULL             | e.g. `'personalisation-v1'` |
| `cohort`        | `text` NOT NULL             | `'control'` or `'test'`     |
| `assigned_at`   | `timestamptz` DEFAULT NOW() |                             |

Unique constraint: `(user_id, experiment_id)`

---

#### `user_affinity_profiles`

Pre-computed historical affinity per user. Rebuilt nightly by cron.

| Column           | Type                        | Notes                                                    |
| ---------------- | --------------------------- | -------------------------------------------------------- |
| `id`             | `uuid` PK                   |                                                          |
| `user_id`        | `uuid` NOT NULL             | FK → auth.users                                          |
| `top_brands`     | `text[]`                    | up to 5 brand IDs, ordered by recency-weighted frequency |
| `top_categories` | `text[]`                    | up to 5 category IDs                                     |
| `order_count`    | `int` DEFAULT 0             | number of past orders used                               |
| `session_count`  | `int` DEFAULT 0             | browse sessions last 90 days                             |
| `updated_at`     | `timestamptz` DEFAULT NOW() |                                                          |

Unique constraint: `(user_id)`

---

#### `session_events`

Stores in-session product click events. TTL: cleared after 24h via Postgres cron `pg_cron` extension or Supabase scheduled delete.

| Column        | Type                        | Notes                 |
| ------------- | --------------------------- | --------------------- |
| `id`          | `uuid` PK                   |                       |
| `user_id`     | `uuid` NOT NULL             | FK → auth.users       |
| `session_id`  | `text` NOT NULL             | client-generated UUID |
| `product_id`  | `text` NOT NULL             |                       |
| `brand_id`    | `text`                      | nullable              |
| `category_id` | `text`                      | nullable              |
| `created_at`  | `timestamptz` DEFAULT NOW() |                       |

---

### Relationships

```
auth.users
  ├── 1:1 → user_affinity_profiles (one affinity profile per user)
  ├── 1:1 → experiment_cohorts (per experiment, one cohort per user)
  └── 1:N → session_events (many click events per user per session)
```

### RLS Policies

```sql
-- experiment_cohorts
ALTER TABLE experiment_cohorts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own cohort" ON experiment_cohorts
  FOR SELECT USING (auth.uid() = user_id);

-- user_affinity_profiles
ALTER TABLE user_affinity_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own affinity" ON user_affinity_profiles
  FOR SELECT USING (auth.uid() = user_id);

-- session_events
ALTER TABLE session_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users insert own events" ON session_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "service role reads events" ON session_events
  FOR SELECT USING (auth.role() = 'service_role');
```

### Indexes

| Table                    | Index                                    | Reason                       |
| ------------------------ | ---------------------------------------- | ---------------------------- |
| `experiment_cohorts`     | `(user_id, experiment_id)` UNIQUE        | Fast lookup at homepage load |
| `user_affinity_profiles` | `(user_id)` UNIQUE                       | Fast lookup at shelf render  |
| `session_events`         | `(user_id, session_id, created_at DESC)` | Fast last-3-clicks query     |
| `session_events`         | `(created_at)`                           | Fast TTL cleanup query       |

### Data Risks

| Risk                                                  | Mitigation                                                                                                                                      |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `session_events` grows unboundedly                    | Schedule nightly `DELETE FROM session_events WHERE created_at < NOW() - INTERVAL '24 hours'` via `pg_cron`                                      |
| `top_brands` / `top_categories` array staleness       | Nightly rebuild covers most users. Accept 24h lag in affinity refresh.                                                                          |
| User ID mismatch between Nykaa auth and Supabase auth | Map Nykaa user ID → Supabase user ID at login. Store mapping if needed in `user_identity_map` table (not in V1 schema — flag as open question). |

---

## 5 Implementation Tasks

### Phase 1 — Database Foundation

- **T1**: Create Supabase schema (3 tables + RLS + indexes)
- **T2**: Seed `experiment_cohorts` for staging test users

### Phase 2 — Core API

- **T3**: Implement `GET /api/personalisation/shelf` (PersonalisationService + CohortService)
- **T4**: Implement `POST /api/personalisation/ingest-event` (EventIngestionService)
- **T5**: Implement `GET /api/personalisation/rerank` (RerankEngine + Nykaa Catalog API integration)
- **T6**: Implement `POST /api/admin/rebuild-affinity` (nightly batch, protected by CRON_SECRET)

### Phase 3 — Frontend (can run parallel with Phase 2 after T1 complete)

- **T7**: Build `ForYouShelf` component + `ShelfSkeleton` fallback
- **T8**: Wrap product card click with intent tracker (sessionStorage write + ingest-event call)
- **T9**: Integrate search page with `/api/personalisation/rerank` (replace direct catalog call)
- **T10**: Homepage cohort check: show shelf only to `cohort = 'test'` users

### Phase 4 — Instrumentation

- **T11**: Implement PostHog events: `shelf_impression`, `shelf_click`, `search_rerank_impression`, `add_to_cart`
- **T12**: Validate A/B split in PostHog dashboard (50/50 cohort ratio check)

---

## 6 JSON Implementation Manifest

See: `experiments/plans/manifest-008.json`

---

## Risks

| Risk                                                                  | Severity  | Owner                                                |
| --------------------------------------------------------------------- | --------- | ---------------------------------------------------- |
| Nykaa Catalog API rate limits or availability                         | High      | Backend Engineer                                     |
| Cold-start users (insufficient history) see empty shelf               | Medium    | Frontend Engineer (fallback UI)                      |
| In-memory rate limiter doesn't persist across serverless instances    | Low (MVP) | Backend Engineer (upgrade to Upstash Redis post-MVP) |
| Order history / affinity rebuild covering all users within 24h window | Medium    | Backend Engineer                                     |
| User identity mapping between Nykaa auth and Supabase                 | Unknown   | Open Question — resolve in T1                        |
