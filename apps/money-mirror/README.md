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

Production deploys are expected to come from the Vercel-linked `main` branch for this app.

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

| Variable                             | Required | Description                                                                                                                           |
| ------------------------------------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                       | Yes      | Neon Postgres connection string                                                                                                       |
| `NEON_AUTH_BASE_URL`                 | Yes      | Base URL for your Neon Auth project                                                                                                   |
| `NEON_AUTH_COOKIE_SECRET`            | No       | Optional only if Neon explicitly gives one for your project/runtime                                                                   |
| `GEMINI_API_KEY`                     | Yes      | Google AI Studio API key                                                                                                              |
| `RESEND_API_KEY`                     | Yes      | Resend API key                                                                                                                        |
| `POSTHOG_KEY`                        | Yes      | Server-side PostHog key                                                                                                               |
| `POSTHOG_HOST`                       | Yes      | PostHog host URL                                                                                                                      |
| `NEXT_PUBLIC_POSTHOG_KEY`            | No       | Same key as `POSTHOG_KEY` — enables client `web_vital` (CWV) events                                                                   |
| `NEXT_PUBLIC_POSTHOG_HOST`           | No       | Defaults to `https://app.posthog.com` if unset                                                                                        |
| `NEXT_PUBLIC_PAYWALL_PROMPT_ENABLED` | No       | `.env.local.example` sets `1` so local QA sees the Phase 4 soft paywall on Overview; unset or `0` in production if you do not want it |
| `NEXT_PUBLIC_APP_URL`                | Yes      | Public app URL used in recap links                                                                                                    |
| `CRON_SECRET`                        | Yes      | Shared secret for cron routes                                                                                                         |
| `WHATSAPP_API_URL`                   | No       | Optional webhook endpoint for WhatsApp opt-in relay (P4-D spike); when unset, endpoint runs in telemetry-only stub mode               |
| `WHATSAPP_API_TOKEN`                 | No       | Optional bearer token for WhatsApp relay endpoint                                                                                     |
| `NEXT_PUBLIC_SENTRY_DSN`             | No       | Client Sentry DSN — optional locally if you skip browser reporting                                                                    |
| `SENTRY_AUTH_TOKEN`                  | Yes\*    | \*Required for production builds that upload source maps to Sentry                                                                    |
| `SENTRY_ORG`                         | No       | Optional locally — used by Sentry CLI / webpack plugin for releases                                                                   |
| `SENTRY_PROJECT`                     | No       | Optional locally — same as above                                                                                                      |
| `CI`                                 | No       | Optional CI build flag                                                                                                                |
| `MONEYMIRROR_SKIP_AUTO_SCHEMA`       | No       | Set to `1` to skip automatic idempotent DDL on server boot (`instrumentation.ts`); default is to run when `DATABASE_URL` is set       |

### 3. Create Neon project and enable Neon Auth

1. Create a Neon project.
2. Enable Neon Auth for the project.
3. Configure email OTP delivery in Neon Auth.
4. Copy the Postgres connection string into `DATABASE_URL`.
5. Copy the Neon Auth base URL into `NEON_AUTH_BASE_URL`.
6. Only set `NEON_AUTH_COOKIE_SECRET` if Neon explicitly provides that value during auth setup.

### 4. Apply database schema

Run the full contents of [`schema.sql`](./schema.sql) against your Neon database.

**Already have a DB from before Phase 2 / Phase 3?** Your `transactions` table may be missing `merchant_key` (and related indexes), which breaks the Transactions tab and merchant insights. From this app directory, with `DATABASE_URL` in `.env.local`:

```bash
npm run db:upgrade
```

That runs idempotent `ALTER TABLE … ADD COLUMN IF NOT EXISTS` and `CREATE INDEX IF NOT EXISTS` statements (same as the tail of `schema.sql`). Safe to run multiple times.

**Automatic upgrades on server start:** When the Node server boots (`next dev` / `next start` / Vercel), MoneyMirror runs the same idempotent DDL once if `DATABASE_URL` is set and `MONEYMIRROR_SKIP_AUTO_SCHEMA` is not `1`. After pulling new code, **restart the dev server** so this runs; you usually do not need a separate migration step for missing `merchant_key` on Neon.

Full **root cause, verification steps, and opt-out** for schema drift: [`docs/SCHEMA-DRIFT.md`](./docs/SCHEMA-DRIFT.md).

Tables created:

- `profiles`
- `statements`
- `transactions`
- `advisory_feed`
- `user_merchant_aliases` — user-defined display label per `merchant_key` (Phase 4 P4-A)
- `merchant_label_suggestions` — optional async Gemini label suggestions (Phase 4 P4-A; cron-filled)

Indexes created:

- `idx_statements_user_created_at`
- `idx_transactions_user_statement`
- `idx_transactions_user_date` (user_id, date DESC)
- `idx_transactions_user_merchant` (partial) where `merchant_key` is not null
- `idx_transactions_user_upi` (partial) where `upi_handle` is not null
- `idx_advisory_feed_user_created_at`

Transaction rows include optional `merchant_key` (heuristic normalization for rollups; see `src/lib/merchant-normalize.ts`) and optional **`upi_handle`** (extracted VPA when the description matches UPI patterns). New parses persist both on insert; existing rows can be backfilled for `merchant_key` via `POST /api/transactions/backfill-merchant-keys` (authenticated). Re-upload or a future backfill can populate `upi_handle` for older rows.

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

**Dev server: `uv_interface_addresses` / `getNetworkHosts` warning** — In some restricted environments Next may log an unhandled rejection while resolving the LAN URL; the app often still serves on `http://localhost:3000`. Use `npm run dev:loopback` to bind only to `127.0.0.1` and avoid that code path, or run the dev server outside a sandbox.

## Testing

| Command                  | What it runs                                                                                                     |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| `npm run test`           | Vitest — API routes, libs, parsers                                                                               |
| `npm run test:issue-011` | Vitest — P4 regression (bad-pattern advisories, MoM compare, rate limits, paywall helpers, chat, proactive APIs) |
| `npm run test:e2e`       | Playwright — builds, serves on port **3333**, smoke-tests `/` and `/login`                                       |

**Manual QA (issue-011 / P4-E):** Bad-pattern cards (`MICRO_UPI_DRAIN`, `REPEAT_MERCHANT_NOISE`, `CC_MIN_DUE_INCOME_STRESS`) only appear when aggregates in [`src/lib/bad-pattern-signals.ts`](./src/lib/bad-pattern-signals.ts) are met (e.g. micro-UPI debit total ≥ ₹1,500, or ≥15 micro-UPI debits, or repeat-merchant noise thresholds). Upload statements with enough small UPI debits / repeat merchants / CC min-due vs income, or run `npm run test:issue-011` to assert engine logic.

First-time E2E setup: `npx playwright install chromium`. See [`docs/PERFORMANCE-REVIEW.md`](./docs/PERFORMANCE-REVIEW.md) for Lighthouse and performance notes.

Optional: set `NEXT_PUBLIC_POSTHOG_KEY` (same project as `POSTHOG_KEY`) to send **Core Web Vitals** (`web_vital` events) and **bad-pattern advisory** engagement (`bad_pattern_advisory_shown` / `bad_pattern_advisory_clicked`) from the browser.

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

Returns the full dashboard state for the authenticated user (Overview aggregates + generated advisories + optional `coaching_facts` Layer A JSON). **Does not** call Gemini — responses are fast for Overview and Transactions. Rule-based advisory copy is returned immediately.

**Auth**: Neon Auth session cookie required.

**Query (choose one mode):**

- **Legacy (single statement):** `?statement_id=<uuid>` optional — if omitted, uses the latest processed statement.
- **Unified scope:** `?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD` plus optional `statement_ids=<uuid1,uuid2,...>`. Omit `statement_ids` to include **all** processed statements in the date range. Response includes `scope` metadata and `perceived_is_profile_baseline`.

### `GET /api/dashboard/advisories`

Same query parameters as `GET /api/dashboard`. Returns `{ advisories, coaching_facts }`. This endpoint runs the **Gemini coaching narrative** step (can take up to ~9s) and is what the **Insights** tab calls after the fast dashboard load.

**Auth**: Neon Auth session cookie required.

### `GET /api/dashboard/compare-months`

Returns scope-aligned **current vs previous-period** totals for debits and credits. The previous window is automatically computed to match the current window length.

**Auth**: Neon Auth session cookie required.

**Query (same scope model as dashboard):**

- **Legacy (single statement):** `?statement_id=<uuid>` optional — if omitted, uses the latest processed statement and its `period_start`/`period_end`.
- **Unified scope:** `?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD` plus optional `statement_ids=<uuid1,uuid2,...>`.

**Returns**: `{ scope, current, previous, delta }` where `delta` includes absolute paisa change and percentage change (`null` when previous is 0).

### `POST /api/chat`

Facts-only chat over the active dashboard scope. The backend composes Layer A facts plus a bounded recent-transaction context window, then returns a concise answer with cited fact IDs.

**Auth**: Neon Auth session cookie required.

**Query**: same scope model as `GET /api/dashboard` (`statement_id` legacy or `date_from` + `date_to` + optional `statement_ids`).

**Body**:

```json
{ "message": "Where am I overspending this month?" }
```

**Returns**:

```json
{
  "answer": "Your wants share is elevated versus needs in this scope. Focus on recurring low-value debits first.",
  "cited_fact_ids": ["wants_paisa", "discretionary_paisa"],
  "facts": { "version": 1, "generated_at": "..." }
}
```

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

| Param                  | Description                                                                                                                                         |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `limit`                | Max 100, default 50                                                                                                                                 |
| `offset`               | Default 0                                                                                                                                           |
| `date_from`, `date_to` | `YYYY-MM-DD` (inclusive range)                                                                                                                      |
| `statement_id`         | Single UUID; must belong to the user or **404**                                                                                                     |
| `statement_ids`        | Comma-separated UUIDs; each must belong to the user or **404** (takes precedence over `statement_id`)                                               |
| `category`             | `needs` \| `wants` \| `investment` \| `debt` \| `other`                                                                                             |
| `type`                 | `debit` \| `credit`                                                                                                                                 |
| `search`               | Substring match on description (max 200 chars)                                                                                                      |
| `merchant_key`         | Exact match on normalized merchant key                                                                                                              |
| `upi_micro`            | `1` = only **debit** rows with a non-empty `upi_handle` and amount ≤ ₹500 (same cap as dashboard micro-UPI signal); omit or invalid value → **400** |

**Returns**: `{ transactions, total, limit, offset }`. Each transaction includes `upi_handle` (nullable) and `merchant_alias_label` (nullable; from `user_merchant_aliases` when set).

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

**Returns**: `{ merchants: [{ merchant_key, display_label, debit_paisa, txn_count, suggested_label, suggestion_confidence }], scope_total_debit_paisa, keyed_debit_paisa }` — `display_label` prefers the user alias, else a formatted `merchant_key`. `suggested_label` / `suggestion_confidence` are set when the async merchant-enrich cron has stored a Gemini suggestion (see `GET /api/cron/merchant-enrich`). `keyed_debit_paisa` is the sum of debits that have a `merchant_key` (used for reconciliation; the listed rows may be a top-N subset).

### `GET /api/merchants/alias`

Lists all saved merchant display labels for the current user.

**Auth**: Neon Auth session cookie required.

**Returns**: `{ aliases: [{ merchant_key, display_label, updated_at }] }`.

### `POST /api/merchants/alias`

Upserts a display label for a normalized `merchant_key`.

**Auth**: Neon Auth session cookie required.

**Body**: `{ "merchant_key": string, "display_label": string }` (1–128 / 1–120 chars after trim).

**Returns**: `{ ok: true, merchant_key, display_label }`. Fires PostHog `merchant_alias_saved` (server-side, fire-and-forget).

### `DELETE /api/merchants/alias?merchant_key=<key>`

Removes a user-defined label for that key (UI falls back to formatted `merchant_key`).

**Auth**: Neon Auth session cookie required.

**Returns**: `{ ok: true }`.

### `POST /api/merchants/suggest-accept`

Copies a stored Gemini suggestion into `user_merchant_aliases` for the given key.

**Auth**: Neon Auth session cookie required.

**Body**: `{ "merchant_key": string }`.

**Returns**: `{ ok: true, merchant_key, display_label }`. Fires PostHog `merchant_suggestion_accepted` (server-side, fire-and-forget).

### `GET /api/cron/merchant-enrich`

Batch job (scheduled weekly in [`vercel.json`](./vercel.json)) that creates `merchant_label_suggestions` rows for `merchant_key` values missing suggestions. Requires `GEMINI_API_KEY`; otherwise returns `{ skipped: true }`. **Not on the statement upload path.**

**Auth**: `authorization: Bearer <CRON_SECRET>` or `x-cron-secret: <CRON_SECRET>`.

**Returns**: `{ ok: true, processed: [{ user_id, merchant_key, status }] }`.

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

### `POST /api/proactive/whatsapp-opt-in`

Captures explicit WhatsApp opt-in for the authenticated user.

**Auth**: Neon Auth session cookie required.

**Body**:

```json
{ "phone_e164": "+919876543210" }
```

If `WHATSAPP_API_URL` and `WHATSAPP_API_TOKEN` are configured, the route forwards an opt-in payload to that provider endpoint. Otherwise it returns `mode: "stub"` and records telemetry only.

### `POST /api/proactive/push-subscription`

Captures successful web-push subscription grants from the client.

**Auth**: Neon Auth session cookie required.

**Body**:

```json
{ "endpoint": "https://push.example/...", "user_agent": "Mozilla/5.0 ..." }
```

### `GET /api/insights/frequency-clusters`

Returns top merchants by debit frequency and deterministic cluster rollups (quick commerce, food delivery, etc.) for the given scope.

**Auth**: Neon Auth session cookie required.

**Query params**: `date_from`, `date_to` (required; unified scope only), `statement_ids` (optional comma-separated UUIDs).

**Response**:

```json
{
  "top_merchants": [{ "merchant_key": "zomato", "debit_count": 15, "debit_paisa": 120000 }],
  "clusters": [
    {
      "cluster": { "id": "food_delivery", "label": "Food delivery" },
      "totalDebitPaisa": 120000,
      "debitCount": 15,
      "merchantKeys": ["zomato"]
    }
  ]
}
```

### `POST /api/guided-review/outcome`

Saves a guided review outcome (dismissed or optional saved commitment). Commitment text is opt-in only.

**Auth**: Neon Auth session cookie required.

**Body**:

```json
{
  "dismissed": true,
  "statement_id": "uuid-or-null",
  "commitment_text": "optional string (max 500)"
}
```

### `GET|POST|PUT|PATCH|DELETE /api/auth/[...path]`

Neon Auth API catch-all (email OTP, session, callbacks). Implemented via `authApiHandler()` from `@neondatabase/auth/next/server`.

**Returns**: JSON or redirects depending on subpath; not used directly by app code except through the Neon Auth client.

### `GET /api/sentry-example-api`

Intentional error route to verify Sentry server-side capture (`SentryExampleAPIError`). **Returns**: throws (500) — for local or staging verification only.

## Analytics

| Event                          | Where                                                                                                     | Properties                                                                            |
| ------------------------------ | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `onboarding_completed`         | `/api/onboarding/complete`                                                                                | `money_health_score`, `perceived_spend_paisa`                                         |
| `statement_parse_started`      | `/api/statement/parse`                                                                                    | `pdf_text_length`                                                                     |
| `statement_parse_rate_limited` | `/api/statement/parse`                                                                                    | `uploads_today`, `limit`                                                              |
| `statement_parse_success`      | `/api/statement/parse`                                                                                    | `latency_ms`, `transaction_count`, `period_start`, `period_end`, `total_debits_paisa` |
| `statement_parse_timeout`      | `/api/statement/parse`                                                                                    | `timeout_ms`                                                                          |
| `statement_parse_failed`       | `/api/statement/parse` and persistence helpers                                                            | `error_type`, optional context                                                        |
| `weekly_recap_triggered`       | `/api/cron/weekly-recap`                                                                                  | `user_count`                                                                          |
| `weekly_recap_completed`       | `/api/cron/weekly-recap`                                                                                  | `total`, `succeeded`, `failed`                                                        |
| `weekly_recap_email_sent`      | `/api/cron/weekly-recap/worker`                                                                           | `period_start`, `period_end`, `total_debits_paisa`                                    |
| `weekly_recap_email_failed`    | `/api/cron/weekly-recap/worker`                                                                           | `error`                                                                               |
| `transactions_view_opened`     | `/api/transactions/view-opened`                                                                           | `surface`                                                                             |
| `transactions_filter_applied`  | `/api/transactions` (GET with any filter set)                                                             | `filter_types`, `scope`                                                               |
| `merchant_rollup_clicked`      | `/api/insights/merchant-click`                                                                            | `merchant_key_bucket`, `key_length`                                                   |
| `merchant_alias_saved`         | `POST /api/merchants/alias`                                                                               | `merchant_key_bucket`                                                                 |
| `merchant_suggestion_accepted` | `POST /api/merchants/suggest-accept`                                                                      | `merchant_key_bucket`, optional `confidence`                                          |
| `scope_changed`                | `POST /api/dashboard/scope-changed`                                                                       | `date_preset`, `source_count`                                                         |
| `coaching_narrative_completed` | `/api/dashboard` (after Gemini)                                                                           | `latency_ms`, `advisory_count` (only when Gemini ran)                                 |
| `coaching_narrative_timeout`   | `/api/dashboard`                                                                                          | `timeout_ms`                                                                          |
| `coaching_narrative_failed`    | `/api/dashboard`                                                                                          | `error_type`, optional `detail`                                                       |
| `coaching_facts_expanded`      | `POST /api/dashboard/coaching-facts-expanded`                                                             | `advisory_id`                                                                         |
| `bad_pattern_advisory_shown`   | Insights `AdvisoryFeed` (client, `posthog-js` when `NEXT_PUBLIC_POSTHOG_KEY` set)                         | `trigger`, `advisory_id` — once per trigger per mount                                 |
| `bad_pattern_advisory_clicked` | Insights `AdvisoryFeed` CTA → Transactions (client)                                                       | `trigger`, `advisory_id`, `preset` (`micro_upi` \| `merchant_key` \| `scope_only`)    |
| `paywall_prompt_seen`          | Overview `PaywallPrompt` (client, when `NEXT_PUBLIC_PAYWALL_PROMPT_ENABLED=1` and mirror section visible) | `surface` (`overview_mirror`) — once per browser session                              |
| `upgrade_intent_tapped`        | Overview `PaywallPrompt` primary CTA (client)                                                             | `surface` (`overview_mirror`)                                                         |
| `whatsapp_opt_in_completed`    | `POST /api/proactive/whatsapp-opt-in`                                                                     | `provider_configured`, `country_code`                                                 |
| `chat_query_submitted`         | `POST /api/chat`                                                                                          | `message_length`, `txn_context_count`, `scope_kind`                                   |
| `chat_response_rendered`       | `POST /api/chat`                                                                                          | `latency_ms`, `cited_fact_count`                                                      |
| `chat_rate_limited`            | `POST /api/chat`                                                                                          | `retry_after_sec`                                                                     |
| `rate_limit_hit`               | Heavy read endpoints (`/api/dashboard`, `/api/transactions`, `/api/insights/merchants`)                   | `route`, `retry_after_sec`                                                            |
| `push_subscription_granted`    | `POST /api/proactive/push-subscription`                                                                   | `endpoint_hash`, `user_agent`                                                         |

## Golden PDF regression

Keep known-good statement fixtures in `apps/money-mirror/__tests__/fixtures/` and run targeted parse regressions before parser changes:

```bash
npm --prefix apps/money-mirror test -- __tests__/api/parse.test.ts
```

## Product Hunt launch hooks

Use this checklist when preparing a Product Hunt submission (complements [`experiments/results/production-launch-checklist-010.md`](../../experiments/results/production-launch-checklist-010.md)):

| Asset / field     | Suggested source                                                                                                                         |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **Tagline**       | “Statement-native Money Mirror for India — see where your salary actually goes.”                                                         |
| **Link**          | Production URL: `https://money-mirror-rho.vercel.app` (update if custom domain).                                                         |
| **Gallery**       | 3–5 screenshots: login → upload PDF → Overview (Money Mirror + category breakdown) → Insights advisory → Transactions with merchant/UPI. |
| **First comment** | Short founder story: Gen Z India, PDF-only privacy, merchant + UPI legibility, no investment advice; invite feedback on bank coverage.   |
| **Demo video**    | 30–60s screen recording: OTP → one bank PDF → Overview mirror + one tap to Transactions filtered by advisory.                            |

## Key design decisions

- **Neon-only boundary**: auth and database infrastructure now live on Neon so the app does not depend on Supabase-specific auth, RLS, or admin APIs.
- **Server-enforced ownership**: row ownership is checked in route handlers by authenticated `user.id`, replacing Postgres RLS.
- **Email-based identity**: user email is persisted in `profiles` so recap jobs do not need auth-admin lookups at send time.
- **Single-transaction statement persistence**: statement row creation, transaction inserts, and status finalization run in one Neon transaction to avoid partial writes.
- **Zero-retention PDF parsing**: uploaded PDFs are processed in memory and nulled immediately after text extraction.

## Docs

- [`docs/COACHING-TONE.md`](./docs/COACHING-TONE.md) — Coaching language guide: consequence-first nudge patterns, Layer A facts-only numerics, Gemini narrative guardrails, tone constraints for advisory copy.
- [`docs/PERFORMANCE-REVIEW.md`](./docs/PERFORMANCE-REVIEW.md) — Performance review notes (fonts, lazy Insights path, Web Vitals, Lighthouse).
- [`docs/SCHEMA-DRIFT.md`](./docs/SCHEMA-DRIFT.md) — Schema drift RCA, `SCHEMA_DRIFT` API behavior, `db:upgrade` vs boot-time DDL.

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
- Phase 4 P4-A: `transactions.upi_handle`, `user_merchant_aliases`, `merchant_label_suggestions`; merchant rename + UPI chips in UI; async `GET /api/cron/merchant-enrich` for Gemini label suggestions (non-blocking vs uploads)
- Phase 4 P4-E: deterministic bad-pattern advisories (`MICRO_UPI_DRAIN`, `REPEAT_MERCHANT_NOISE`, `CC_MIN_DUE_INCOME_STRESS`) in `advisory-engine.ts`; Transactions deep link via `upi_micro=1` or `merchant_key`; client PostHog for bad-pattern CTA
- Phase 4 P4-G: `profiles.plan` (`free` \| `pro`, default `free`); soft paywall prompt on Overview when `NEXT_PUBLIC_PAYWALL_PROMPT_ENABLED=1`; client PostHog `paywall_prompt_seen` / `upgrade_intent_tapped`
- 15+ PostHog analytics events (server + optional client for CWV, bad-pattern engagement, and optional paywall intent)
- Issue-012 T0: Skeleton-first dashboard loading; performance marks (`dashboard_ready_ms`, `time_to_first_advisory_ms`); progressive disclosure for month-compare; shame-safe empty/loading copy; `COACHING-TONE.md` Gen Z / income-transition subsection
- Issue-012 T1: Deterministic merchant cluster mapping (`src/lib/merchant-clusters.ts`: quick_commerce, food_delivery, entertainment, transport, shopping); `GET /api/insights/frequency-clusters`; frequency + cluster UI on Insights tab; `frequency_insight_opened` / `merchant_cluster_clicked` events
- Issue-012 T2: `guided_review_outcomes` table; `POST /api/guided-review/outcome`; 3-step `GuidedReviewSheet` (acknowledge → optional commitment → finish); `guided_review_started` / `guided_review_completed` / `commitment_saved` events; fact-specific weekly recap email copy

**Schema migration (issue-012):** Run `npm run db:upgrade` or restart dev server to create the `guided_review_outcomes` table on existing Neon DBs.

**Not shipped (backlog):**

- Multi-account aggregated spend view (G2–G3)
- In-app coaching tone personalization (H3)
- Inbox ingestion from email, WhatsApp/WATI delivery, gamification, Warikoo Priority Ladder goal gating
