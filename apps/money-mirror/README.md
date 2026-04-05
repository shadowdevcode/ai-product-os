# MoneyMirror

AI-powered personal finance coach for Gen Z Indians that uses Neon Auth plus Neon Postgres to parse Indian bank-account and credit-card statements, reveal the perception gap between perceived and actual spend, and deliver consequence-first nudges.

**Sign in with your email, upload a statement, and get a brutally honest view of where your money actually goes.**

For AI- and agent-oriented architecture, data model, and API reference, see [`CODEBASE-CONTEXT.md`](./CODEBASE-CONTEXT.md).

## What it does

1. User signs in with Neon Auth email OTP and lands in a private onboarding flow.
2. User completes 5 onboarding questions (including monthly income) and the app calculates a Money Health Score.
3. User uploads a password-free bank-account or credit-card statement PDF, optionally tagging it with a nickname, account purpose, and card network. Gemini extracts and categorizes transactions entirely in memory.
4. Dashboard shows four tabs:
   - **Overview** — Mirror card (perceived vs actual spend side-by-side), summary breakdown by needs/wants/investments/debt.
   - **Insights** — Merchant rollups, consequence-first advisory cards, and (when `GEMINI_API_KEY` is set) facts-grounded Gemini narratives with a **Sources** drawer tied to Layer A server facts.
   - **Transactions** — Paginated, filterable transaction list for the selected statement (ground truth for spend).
   - **Upload** — Upload new statements; statement library lists all past uploads with month and institution labels.
5. Month picker and statement picker let users filter the dashboard across multiple months and accounts.
6. Multi-account support: bank accounts and credit cards are tracked separately; credit-card-safe math prevents card payments from inflating income.
7. Every Monday at 8:00 AM IST, a Vercel cron fan-out sends a weekly recap email to each eligible user via Resend.

## Stack

| Layer     | Technology                                 |
| --------- | ------------------------------------------ |
| Frontend  | Next.js 16, TypeScript, Tailwind CSS 4     |
| Backend   | Next.js App Router route handlers          |
| Auth      | Neon Auth (`@neondatabase/auth`)           |
| Database  | Neon Postgres (`@neondatabase/serverless`) |
| AI        | Google Gemini 2.5 Flash                    |
| Analytics | PostHog (`posthog-node`)                   |
| Errors    | Sentry (`@sentry/nextjs`)                  |
| Email     | Resend                                     |
| Hosting   | Vercel                                     |

## Setup

### 1. Install dependencies

```bash
cd apps/money-mirror
npm install
```

### 2. Configure environment variables

```bash
cp .env.local.example .env.local
```

Fill in these values:

| Variable                  | Required | Description                                                         |
| ------------------------- | -------- | ------------------------------------------------------------------- |
| `DATABASE_URL`            | Yes      | Neon Postgres connection string                                     |
| `NEON_AUTH_BASE_URL`      | Yes      | Base URL for your Neon Auth project                                 |
| `NEON_AUTH_COOKIE_SECRET` | No       | Optional only if Neon explicitly gives one for your project/runtime |
| `GEMINI_API_KEY`          | Yes      | Google AI Studio API key                                            |
| `RESEND_API_KEY`          | Yes      | Resend API key                                                      |
| `POSTHOG_KEY`             | Yes      | Server-side PostHog key                                             |
| `POSTHOG_HOST`            | Yes      | PostHog host URL                                                    |
| `NEXT_PUBLIC_APP_URL`     | Yes      | Public app URL used in recap links                                  |
| `CRON_SECRET`             | Yes      | Shared secret for cron routes                                       |
| `NEXT_PUBLIC_SENTRY_DSN`  | No       | Client Sentry DSN — optional locally if you skip browser reporting  |
| `SENTRY_AUTH_TOKEN`       | Yes\*    | \*Required for production builds that upload source maps to Sentry  |
| `SENTRY_ORG`              | No       | Optional locally — used by Sentry CLI / webpack plugin for releases |
| `SENTRY_PROJECT`          | No       | Optional locally — same as above                                    |
| `CI`                      | No       | Optional CI build flag                                              |

### 3. Create Neon project and enable Neon Auth

1. Create a Neon project.
2. Enable Neon Auth for the project.
3. Configure email OTP delivery in Neon Auth.
4. Copy the Postgres connection string into `DATABASE_URL`.
5. Copy the Neon Auth base URL into `NEON_AUTH_BASE_URL`.
6. Only set `NEON_AUTH_COOKIE_SECRET` if Neon explicitly provides that value during auth setup.

### 4. Apply database schema

Run the full contents of [`schema.sql`](./schema.sql) against your Neon database.

Tables created:

- `profiles`
- `statements`
- `transactions`
- `advisory_feed`

Indexes created:

- `idx_statements_user_created_at`
- `idx_transactions_user_statement`
- `idx_transactions_user_date` (user_id, date DESC)
- `idx_transactions_user_merchant` (partial) where `merchant_key` is not null
- `idx_advisory_feed_user_created_at`

Transaction rows include optional `merchant_key` (heuristic normalization for rollups; see `src/lib/merchant-normalize.ts`). New parses persist `merchant_key` on insert; existing rows can be backfilled via `POST /api/transactions/backfill-merchant-keys` (authenticated).

### 5. Run locally

```bash
npm run dev
```

Open `http://localhost:3000`.

Success looks like:

- landing page loads
- `/login` can send an email OTP
- successful sign-in reaches onboarding
- dashboard loads after uploading a PDF

First-run failure looks like:

- `Error: DATABASE_URL is required.`
- `Error: NEON_AUTH_BASE_URL is required`

## API

### `POST /api/onboarding/complete`

Persists the money health score and perceived spend for the authenticated user.

**Auth**: Neon Auth session cookie required.

**Body**:

```json
{
  "money_health_score": 62,
  "perceived_spend_paisa": 2500000
}
```

**Returns**:

```json
{ "ok": true }
```

### `POST /api/statement/parse`

Accepts `multipart/form-data` with a `file` field and optional `statement_type`, extracts statement data, categorizes transactions, and persists a processed statement.

**Auth**: Neon Auth session cookie required.

**Returns**:

```json
{
  "statement_id": "uuid",
  "institution_name": "Kotak Mahindra Bank",
  "statement_type": "bank_account",
  "period_start": "2026-03-01",
  "period_end": "2026-03-31",
  "transaction_count": 47,
  "summary": {
    "needs_paisa": 850000,
    "wants_paisa": 1200000,
    "investment_paisa": 400000,
    "debt_paisa": 300000,
    "other_paisa": 50000,
    "total_debits_paisa": 2800000,
    "total_credits_paisa": 5000000
  }
}
```

### `GET /api/statements`

Returns all processed statements for the authenticated user, sorted by creation date descending. Used by the statement library and month picker.

**Auth**: Neon Auth session cookie required.

**Returns**: Array of statement records including `statement_id`, `institution_name`, `statement_type`, `period_start`, `period_end`, `nickname`, `account_purpose`, `card_network`.

### `GET /api/dashboard`

Returns the full dashboard state for the authenticated user (Overview aggregates + generated advisories + optional `coaching_facts` Layer A JSON + Gemini-enriched `narrative` / `cited_fact_ids` on each advisory when AI succeeds).

**Auth**: Neon Auth session cookie required.

**Query (choose one mode):**

- **Legacy (single statement):** `?statement_id=<uuid>` optional — if omitted, uses the latest processed statement.
- **Unified scope:** `?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD` plus optional `statement_ids=<uuid1,uuid2,...>`. Omit `statement_ids` to include **all** processed statements in the date range. Response includes `scope` metadata and `perceived_is_profile_baseline`.

### `GET /api/dashboard/advisories`

Same query parameters as `GET /api/dashboard`. Returns `{ advisories, coaching_facts }` (same shapes as the parent dashboard payload).

**Auth**: Neon Auth session cookie required.

### `POST /api/dashboard/coaching-facts-expanded`

Fires PostHog `coaching_facts_expanded` when the user opens **Sources** on an advisory card (server-side, fire-and-forget).

**Auth**: Neon Auth session cookie required.

**Body**: `{ "advisory_id": string }`

**Returns**: `{ "ok": true }`

### `POST /api/dashboard/scope-changed`

Body: `{ "date_preset": string | null, "source_count": number }`. Fires PostHog `scope_changed` (server-side, fire-and-forget).

**Auth**: Neon Auth session cookie required.

### `GET /api/transactions`

Paginated transactions for the authenticated user. Joins `statements` for nickname and institution labels.

**Auth**: Neon Auth session cookie required.

**Query params** (all optional except pagination defaults):

| Param                  | Description                                                                                           |
| ---------------------- | ----------------------------------------------------------------------------------------------------- |
| `limit`                | Max 100, default 50                                                                                   |
| `offset`               | Default 0                                                                                             |
| `date_from`, `date_to` | `YYYY-MM-DD` (inclusive range)                                                                        |
| `statement_id`         | Single UUID; must belong to the user or **404**                                                       |
| `statement_ids`        | Comma-separated UUIDs; each must belong to the user or **404** (takes precedence over `statement_id`) |
| `category`             | `needs` \| `wants` \| `investment` \| `debt` \| `other`                                               |
| `type`                 | `debit` \| `credit`                                                                                   |
| `search`               | Substring match on description (max 200 chars)                                                        |
| `merchant_key`         | Exact match on normalized merchant key                                                                |

**Returns**: `{ transactions, total, limit, offset }`.

### `POST /api/transactions/view-opened`

Fires the `transactions_view_opened` PostHog event (server-side). Call once per browser session when the user opens the Transactions tab (the client uses `sessionStorage` to dedupe).

**Auth**: Neon Auth session cookie required.

**Returns**: `{ ok: true }`.

### `POST /api/transactions/backfill-merchant-keys`

Sets `merchant_key` for the current user’s rows where it is null, using `normalizeMerchantKey(description)`.

**Auth**: Neon Auth session cookie required.

**Returns**: `{ ok: true, updated: number }`.

### `GET /api/insights/merchants`

Top merchants by **debit** spend for the current user, scoped like `GET /api/transactions` (same `date_from` / `date_to` / `statement_id` / `statement_ids` rules). Aggregates `GROUP BY merchant_key` for debits with a non-null key.

**Auth**: Neon Auth session cookie required.

**Query params**:

| Param                  | Description                                                                          |
| ---------------------- | ------------------------------------------------------------------------------------ |
| `limit`                | Max 50, default 12                                                                   |
| `min_spend_paisa`      | Minimum total debit paisa per merchant row (inclusive), default 0                    |
| `date_from`, `date_to` | `YYYY-MM-DD` (inclusive), optional when using `statement_id`-only legacy scope       |
| `statement_id`         | Single UUID; **404** if not owned                                                    |
| `statement_ids`        | Comma-separated UUIDs; **404** if any missing (takes precedence over `statement_id`) |

**Returns**: `{ merchants: [{ merchant_key, debit_paisa, txn_count }], scope_total_debit_paisa, keyed_debit_paisa }` — `keyed_debit_paisa` is the sum of debits that have a `merchant_key` (used for reconciliation; the listed rows may be a top-N subset).

### `POST /api/insights/merchant-click`

Body: `{ "merchant_key": string }`. Fires PostHog `merchant_rollup_clicked` with a short **bucket** label (no raw key). Single emission source for that event.

**Auth**: Neon Auth session cookie required.

**Returns**: `{ ok: true }`.

### `GET /api/cron/weekly-recap`

Fan-out master route that finds all users with processed statements and triggers worker jobs. This is the scheduled entrypoint configured in [`vercel.json`](./vercel.json).

**Auth**: `authorization: Bearer <CRON_SECRET>` from Vercel Cron. Local/manual triggering may also use `x-cron-secret: <CRON_SECRET>`.

**Operator smoke (expected behavior):**

| Request                                                                 | Expected                                                                                                |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| No `Authorization` / no `x-cron-secret`                                 | **401** JSON `{ "error": "Unauthorized" }` — by design; blocks unauthenticated fan-out and email sends. |
| `Authorization: Bearer <CRON_SECRET>` or `x-cron-secret: <CRON_SECRET>` | **200** `{ ok, total, succeeded, failed }` — `total` may be `0` if no eligible users.                   |

Contract is asserted in [`__tests__/api/weekly-recap.test.ts`](./__tests__/api/weekly-recap.test.ts).

### `POST /api/cron/weekly-recap/worker`

Sends one recap email for one user.

**Auth**: `x-cron-secret: <CRON_SECRET>`

**Body**:

```json
{ "userId": "user-id" }
```

### `GET|POST|PUT|PATCH|DELETE /api/auth/[...path]`

Neon Auth API catch-all (email OTP, session, callbacks). Implemented via `authApiHandler()` from `@neondatabase/auth/next/server`.

**Returns**: JSON or redirects depending on subpath; not used directly by app code except through the Neon Auth client.

### `GET /api/sentry-example-api`

Intentional error route to verify Sentry server-side capture (`SentryExampleAPIError`). **Returns**: throws (500) — for local or staging verification only.

## Analytics

| Event                          | Where                                          | Properties                                                                            |
| ------------------------------ | ---------------------------------------------- | ------------------------------------------------------------------------------------- |
| `onboarding_completed`         | `/api/onboarding/complete`                     | `money_health_score`, `perceived_spend_paisa`                                         |
| `statement_parse_started`      | `/api/statement/parse`                         | `pdf_text_length`                                                                     |
| `statement_parse_rate_limited` | `/api/statement/parse`                         | `uploads_today`, `limit`                                                              |
| `statement_parse_success`      | `/api/statement/parse`                         | `latency_ms`, `transaction_count`, `period_start`, `period_end`, `total_debits_paisa` |
| `statement_parse_timeout`      | `/api/statement/parse`                         | `timeout_ms`                                                                          |
| `statement_parse_failed`       | `/api/statement/parse` and persistence helpers | `error_type`, optional context                                                        |
| `weekly_recap_triggered`       | `/api/cron/weekly-recap`                       | `user_count`                                                                          |
| `weekly_recap_completed`       | `/api/cron/weekly-recap`                       | `total`, `succeeded`, `failed`                                                        |
| `weekly_recap_email_sent`      | `/api/cron/weekly-recap/worker`                | `period_start`, `period_end`, `total_debits_paisa`                                    |
| `weekly_recap_email_failed`    | `/api/cron/weekly-recap/worker`                | `error`                                                                               |
| `transactions_view_opened`     | `/api/transactions/view-opened`                | `surface`                                                                             |
| `transactions_filter_applied`  | `/api/transactions` (GET with any filter set)  | `filter_types`, `scope`                                                               |
| `merchant_rollup_clicked`      | `/api/insights/merchant-click`                 | `merchant_key_bucket`, `key_length`                                                   |
| `scope_changed`                | `POST /api/dashboard/scope-changed`            | `date_preset`, `source_count`                                                         |
| `coaching_narrative_completed` | `/api/dashboard` (after Gemini)                | `latency_ms`, `advisory_count` (only when Gemini ran)                                 |
| `coaching_narrative_timeout`   | `/api/dashboard`                               | `timeout_ms`                                                                          |
| `coaching_narrative_failed`    | `/api/dashboard`                               | `error_type`, optional `detail`                                                       |
| `coaching_facts_expanded`      | `POST /api/dashboard/coaching-facts-expanded`  | `advisory_id`                                                                         |

## Key design decisions

- **Neon-only boundary**: auth and database infrastructure now live on Neon so the app does not depend on Supabase-specific auth, RLS, or admin APIs.
- **Server-enforced ownership**: row ownership is checked in route handlers by authenticated `user.id`, replacing Postgres RLS.
- **Email-based identity**: user email is persisted in `profiles` so recap jobs do not need auth-admin lookups at send time.
- **Single-transaction statement persistence**: statement row creation, transaction inserts, and status finalization run in one Neon transaction to avoid partial writes.
- **Zero-retention PDF parsing**: uploaded PDFs are processed in memory and nulled immediately after text extraction.

## Docs

- [`docs/COACHING-TONE.md`](./docs/COACHING-TONE.md) — Coaching language guide: consequence-first nudge patterns, Layer A facts-only numerics, Gemini narrative guardrails, tone constraints for advisory copy.

## Current scope

**Shipped:**

- Email OTP sign-in (Neon Auth)
- Onboarding: 5-question Money Health Score, monthly income capture
- Multi-bank bank-account PDF parsing (Kotak, HDFC, and others via Gemini)
- Credit-card PDF parsing with card-safe summary math
- Upload labels: `nickname`, `account_purpose`, `card_network`
- 4-tab dashboard: Overview (mirror card + summary), Insights (AI advisories), Transactions (list + filters), Upload (statement library)
- Mirror card: perceived vs actual spend side-by-side
- Statement library with month picker and statement picker
- Multi-account support (G1): separate tracking per bank account and credit card
- 5 advisory triggers + expanded categorizer
- Weekly recap email via Resend (Monday 8:00 AM IST Vercel cron)
- Phase 3 T4: Zod-validated **Layer A** facts (`src/lib/coaching-facts.ts`), Gemini structured narratives with `cited_fact_ids` validation, **Sources** drawer (`FactsDrawer`)
- 15+ PostHog analytics events (server-side; includes coaching narrative + sources expansion)

**Not shipped (Sprint 4 backlog):**

- Spend-trend comparison across months (F3)
- Multi-account aggregated spend view (G2–G3)
- In-app coaching tone personalization (H3)
- Inbox ingestion from email, WhatsApp/WATI delivery, gamification, Warikoo Priority Ladder goal gating
