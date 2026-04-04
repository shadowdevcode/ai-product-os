# MoneyMirror

AI-powered personal finance coach for Gen Z Indians that uses Neon Auth plus Neon Postgres to parse Indian bank-account and credit-card statements, reveal the perception gap between perceived and actual spend, and deliver consequence-first nudges.

**Sign in with your email, upload a statement, and get a brutally honest view of where your money actually goes.**

## What it does

1. User signs in with Neon Auth email OTP and lands in a private onboarding flow.
2. User completes 5 onboarding questions and the app calculates a Money Health Score.
3. User uploads a password-free bank-account or credit-card statement PDF and Gemini extracts and categorizes transactions entirely in memory.
4. Dashboard hydrates the latest processed statement and shows the Mirror Moment plus advisory cards.
5. Every Monday at 8:00 AM IST, a Vercel cron fan-out sends a weekly recap email to each eligible user via Resend.

## Stack

| Layer     | Technology                                 |
| --------- | ------------------------------------------ |
| Frontend  | Next.js 16, TypeScript, Tailwind CSS 4     |
| Backend   | Next.js App Router route handlers          |
| Auth      | Neon Auth (`@neondatabase/auth`)           |
| Database  | Neon Postgres (`@neondatabase/serverless`) |
| AI        | Google Gemini 2.5 Flash                    |
| Analytics | PostHog (`posthog-node`)                   |
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
| `NEXT_PUBLIC_SENTRY_DSN`  | Yes      | Sentry DSN                                                          |
| `SENTRY_AUTH_TOKEN`       | Yes      | Sentry auth token                                                   |
| `SENTRY_ORG`              | Yes      | Sentry org slug                                                     |
| `SENTRY_PROJECT`          | Yes      | Sentry project slug                                                 |
| `CI`                      | No       | Optional CI build flag                                              |

### 3. Create Neon project and enable Neon Auth

1. Create a Neon project.
2. Enable Neon Auth for the project.
3. Configure email OTP delivery in Neon Auth.
4. Copy the Postgres connection string into `DATABASE_URL`.
5. Copy the Neon Auth base URL into `NEON_AUTH_BASE_URL`.
6. Only set `NEON_AUTH_COOKIE_SECRET` if Neon explicitly provides that value during auth setup.

### 4. Apply database schema

Run the full contents of [`schema.sql`](/Users/vijaysehgal/Downloads/02-Portfolio/ai-product-os/apps/money-mirror/schema.sql) against your Neon database.

Tables created:

- `profiles`
- `statements`
- `transactions`
- `advisory_feed`

Indexes created:

- `idx_statements_user_created_at`
- `idx_transactions_user_statement`
- `idx_advisory_feed_user_created_at`

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

### `GET /api/dashboard?statement_id=<uuid>`

Returns the full dashboard state for the authenticated user.

**Auth**: Neon Auth session cookie required.

### `GET /api/dashboard/advisories?statement_id=<uuid>`

Returns the advisory subset for the authenticated user and statement.

**Auth**: Neon Auth session cookie required.

### `GET /api/cron/weekly-recap`

Fan-out master route that finds all users with processed statements and triggers worker jobs. This is the scheduled entrypoint configured in [`vercel.json`](/Users/vijaysehgal/Downloads/02-Portfolio/ai-product-os/apps/money-mirror/vercel.json).

**Auth**: `authorization: Bearer <CRON_SECRET>` from Vercel Cron. Local/manual triggering may also use `x-cron-secret: <CRON_SECRET>`.

### `POST /api/cron/weekly-recap/worker`

Sends one recap email for one user.

**Auth**: `x-cron-secret: <CRON_SECRET>`

**Body**:

```json
{ "userId": "user-id" }
```

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

## Key design decisions

- **Neon-only boundary**: auth and database infrastructure now live on Neon so the app does not depend on Supabase-specific auth, RLS, or admin APIs.
- **Server-enforced ownership**: row ownership is checked in route handlers by authenticated `user.id`, replacing Postgres RLS.
- **Email-based identity**: user email is persisted in `profiles` so recap jobs do not need auth-admin lookups at send time.
- **Single-transaction statement persistence**: statement row creation, transaction inserts, and status finalization run in one Neon transaction to avoid partial writes.
- **Zero-retention PDF parsing**: uploaded PDFs are processed in memory and nulled immediately after text extraction.

## Current scope

- Shipped now: email OTP sign-in, onboarding score, multi-bank bank-account parsing, credit-card parsing, dashboard rehydration, 5 advisory triggers, weekly recap email.
- Not shipped in the current app: inbox ingestion from email, WhatsApp/WATI delivery, gamification, Warikoo Priority Ladder goal gating.
