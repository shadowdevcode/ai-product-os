# Nykaa Hyper-Personalized Style Concierge

> AI-driven, affinity-weighted product recommendation engine for Nykaa Fashion.  
> **Experiment**: issue-008 · **Stack**: Next.js 16, Neon DB, PostHog

---

## Problem

Nykaa Fashion's homepage shows the same editorial content to all users regardless of purchase history. Logged-in users who have already signaled brand/category preferences through orders still see generic product feeds, leading to missed conversion opportunities.

## Solution

A personalisation engine that replaces the static editorial shelf with an **AI-scored "Picked for you" strip**:

- **Historical Affinity** (60% weight): Top brands + categories from past orders
- **In-Session Intent** (40% weight): Recent product clicks within the current session
- **A/B Testing**: Deterministic SHA-256 cohort split (test vs control)
- **Search Re-ranking**: Personalised search results for test group users

## User Journey

1. **User Authentication**: User accesses the Nykaa platform.
2. **Intent Capture**: The system captures in-session categorical or product clicks using the intent tracker.
3. **Affinity Matching**: The historical affinity scores of brands and categories are retrieved.
4. **Personalized Shelf Delivery**: The user receives a blend of historically preferred and recently intended products on their homepage shelf.
5. **Search Re-ranking**: Search results are proactively reordered based on the user's affinity profile.

## Tech Stack

| Layer          | Technology                               |
| -------------- | ---------------------------------------- |
| Frontend       | Next.js (App Router), React, TailwindCSS |
| Backend        | Next.js Route Handlers                   |
| Database       | Neon PostgreSQL (Serverless)             |
| Analytics      | PostHog                                  |
| Error Tracking | Sentry                                   |

## Architecture

```
┌─────────────┐     ┌──────────────────────┐     ┌──────────┐
│  Homepage    │────▶│  GET /api/shelf       │────▶│  Neon DB  │
│  ForYouShelf │     │  PersonalisationSvc   │     │  3 tables │
└─────────────┘     └──────────────────────┘     └──────────┘
       │                     │
       │              ┌──────┴──────┐
       │              │ CohortSvc   │
       │              │ SHA-256 A/B │
       │              └─────────────┘
       │
┌──────┴──────┐     ┌──────────────────────┐
│ Product     │────▶│ POST /api/ingest     │──▶ session_events
│ Click       │     │ EventIngestionSvc    │
└─────────────┘     └──────────────────────┘

┌─────────────┐     ┌──────────────────────┐
│ Search Page │────▶│ GET /api/rerank      │──▶ Re-scored results
└─────────────┘     │ RerankEngine         │
                    └──────────────────────┘

┌─────────────┐     ┌──────────────────────┐
│ Nightly     │────▶│ POST /api/rebuild    │──▶ user_affinity_profiles
│ Cron        │     │ AffinityBuilder      │
└─────────────┘     └──────────────────────┘
```

## Getting Started

### Prerequisites

- Node.js 20+
- A [Neon DB](https://neon.tech) project
- PostHog project key (optional for local dev)

### Setup

```bash
cd apps/nykaa-personalisation
cp .env.local.example .env.local
# Fill in DATABASE_URL, CRON_SECRET, and optionally PostHog keys
npm install
```

### Database

Apply the schema to your Neon database:

```bash
# Copy-paste contents of schema.sql into Neon SQL Editor
# Or use psql:
psql "$DATABASE_URL" < schema.sql
```

Seed test data:

```bash
curl -X POST http://localhost:3000/api/seed \
  -H "x-cron-secret: YOUR_CRON_SECRET"
```

### Run

```bash
npm run dev     # → http://localhost:3000
npm run build   # TypeScript check + production build
```

## API Reference

| Route                               | Method | Auth          | Description                 |
| ----------------------------------- | ------ | ------------- | --------------------------- |
| `/api/personalisation/shelf`        | GET    | Bearer JWT    | Personalised shelf products |
| `/api/personalisation/ingest-event` | POST   | Bearer JWT    | Record session click event  |
| `/api/personalisation/rerank`       | GET    | Bearer JWT    | Re-rank search results      |
| `/api/admin/rebuild-affinity`       | POST   | x-cron-secret | Nightly affinity rebuild    |
| `/api/seed`                         | POST   | x-cron-secret | Seed test data              |

## Environment Variables

| Variable                         | Required | Description                       |
| -------------------------------- | -------- | --------------------------------- |
| `DATABASE_URL`                   | Yes      | Neon PostgreSQL connection string |
| `CRON_SECRET`                    | Yes      | Secret for admin/cron endpoints   |
| `NEXT_PUBLIC_POSTHOG_KEY`        | No       | PostHog project API key           |
| `POSTHOG_HOST`                   | No       | PostHog host URL                  |
| `NEXT_PUBLIC_AB_EXPERIMENT_SALT` | No       | Salt for A/B cohort hash          |

## Key Decisions

1. **Neon DB over Supabase**: Direct PostgreSQL access via `@neondatabase/serverless`, no ORM overhead
2. **No ML model**: Pure arithmetic scoring (brand/category match). Easier to debug, explain, and iterate
3. **App-level auth**: JWT verification in route handlers instead of Supabase RLS
4. **SessionStorage for intent**: FIFO buffer of last 3 clicks, synced to DB via ingest-event API
5. **In-memory rate limiter**: MVP-grade; upgrade to Redis for production

## Telemetry

| Event                        | Source | Trigger                    |
| ---------------------------- | ------ | -------------------------- |
| `shelf_impression`           | Server | Shelf API returns products |
| `shelf_click`                | Client | User clicks shelf product  |
| `search_rerank_impression`   | Server | Search API returns results |
| `add_to_cart`                | Client | User adds product to cart  |
| `shelf_load_failed`          | Server | Shelf API error/fallback   |
| `rerank_failed`              | Server | Rerank API error           |
| `ingest_event_failed`        | Server | Ingest API error           |
| `page_viewed`                | Client | Page mount                 |
| `affinity_rebuild_completed` | Server | Cron success               |
| `affinity_rebuild_failed`    | Server | Cron error                 |
