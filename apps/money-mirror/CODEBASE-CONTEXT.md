# Codebase Context: MoneyMirror

Last updated: 2026-04-04

## What This App Does

MoneyMirror is a mobile-first PWA AI financial coach for Gen Z Indians (₹20K–₹80K/month). Users sign in with Neon Auth email OTP, upload a password-free Indian bank-account or credit-card statement PDF, and Gemini 2.5 Flash parses and categorizes each transaction into needs/wants/investment/debt/other. The "Mirror moment" reveals the gap between self-reported spend from onboarding and actual spend from the statement. An advisory engine fires up to 5 consequence-first nudges, and a weekly recap email is sent by a Vercel cron fan-out every Monday at 8:00 AM IST. The primary North Star proxy is second-month statement upload rate (≥60%).

## Architecture Overview

- **Frontend**: Next.js 16 App Router (RSC by default, `"use client"` for interactive panels). Key pages: `/` (landing), `/onboarding` (5-question flow), `/score` (Money Health Score reveal), `/dashboard` (Mirror + advisory feed + upload).
- **Backend**: Next.js API routes under `src/app/api/`. Neon Auth for session auth, Neon Postgres for persistence, Gemini 2.5 Flash for PDF parse + categorization, Resend for weekly recap emails, PostHog for server-side telemetry.
- **Database**: Neon Postgres. 4 tables: `profiles`, `statements`, `transactions`, `advisory_feed`. `profiles` persists monthly income and perceived spend; `statements` now tracks `institution_name`, `statement_type`, and optional credit-card due metadata. All monetary values are stored as `BIGINT` in paisa (₹ × 100) to avoid float precision errors.
- **AI Integration**: Gemini 2.5 Flash via `@google/genai`. Used for: (1) PDF text → structured bank-account or credit-card statement JSON, (2) transaction category normalization. The statement-parse route currently enforces a 25s timeout and returns JSON 504 on timeout.
- **Analytics**: PostHog (server-side only, `posthog-node`). 10 events tracked: `onboarding_completed`, `statement_parse_started/rate_limited/success/timeout/failed`, `weekly_recap_triggered/completed`, `weekly_recap_email_sent/failed`. All calls fire-and-forget (`.catch(() => {})`).
- **Error tracking**: Sentry via `@sentry/nextjs` (`sentry.server.config.ts`, `sentry.edge.config.ts`, `src/instrumentation.ts`, `src/instrumentation-client.ts`). Uses `NEXT_PUBLIC_SENTRY_DSN` plus org/project/auth token vars as in app `README.md` / `.env.local.example`.

## Key Files

| File                                               | Purpose                                                                                                                                                                                               |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/app/api/statement/parse/route.ts`             | Core pipeline: PDF upload → statement-type-aware Gemini parse → DB persist → advisory generation. Fail-closed: deletes parent statement row if transactions insert fails.                             |
| `src/app/api/statement/parse/persist-statement.ts` | Extracted helper: writes statements + transactions atomically; returns failure if child insert fails.                                                                                                 |
| `src/app/api/dashboard/route.ts`                   | Authenticated GET — rehydrates the latest processed statement + transactions + advisory feed from DB. Called on every dashboard first-load (refresh, deep link, email CTA).                           |
| `src/app/api/dashboard/advisories/route.ts`        | Authenticated GET — returns advisory_feed rows for the current user via the active Neon session cookie.                                                                                               |
| `src/app/api/cron/weekly-recap/route.ts`           | Master cron: scheduled GET entrypoint for Vercel Cron; accepts Bearer `CRON_SECRET` or local `x-cron-secret`, paginates users in 1000-row batches, and fans out to the worker via Promise.allSettled. |
| `src/app/api/cron/weekly-recap/worker/route.ts`    | Worker: sends Resend email per user. Returns HTTP 502 on failure so master counts it correctly.                                                                                                       |
| `src/lib/advisory-engine.ts`                       | Fires 5 advisory types based on spend ratios and thresholds. Writes to `advisory_feed` table.                                                                                                         |
| `src/lib/scoring.ts`                               | Computes Money Health Score (0–100) from 5 onboarding question responses.                                                                                                                             |
| `src/lib/statements.ts`                            | Defines statement types, parser prompts, metadata validation, and shared display labels for bank-account and credit-card uploads.                                                                     |
| `src/lib/pdf-parser.ts`                            | Extracts raw text from PDF buffer using `pdf-parse`. Uses `result.total` (not `result.pages?.length`) for page count — v2 API.                                                                        |
| `src/lib/posthog.ts`                               | Server-side PostHog singleton. Reads `POSTHOG_KEY` and `POSTHOG_HOST` (server-only, no `NEXT_PUBLIC_` prefix).                                                                                        |

## Data Model

- **profiles**: One row per user. `id` = Neon Auth user id (TEXT). Stores `monthly_income_paisa`, `perceived_spend_paisa`, `target_savings_rate`, `money_health_score`.
- **statements**: One per uploaded PDF. Tracks `institution_name`, `statement_type` (`bank_account` or `credit_card`), statement period, optional card due metadata, and `status`. Status never set to `processed` before `transactions` child insert succeeds.
- **transactions**: Many per statement. All amounts in paisa (BIGINT). `category` CHECK: `needs | wants | investment | debt | other` (lowercase).
- **advisory_feed**: Advisory nudges generated per statement. `trigger` identifies which advisory type fired.

## API Endpoints

| Method | Path                            | Auth                                                           | Purpose                                                                                |
| ------ | ------------------------------- | -------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| POST   | `/api/statement/parse`          | Neon session cookie                                            | Upload PDF plus `statement_type`, parse with Gemini, persist to DB, return mirror data |
| GET    | `/api/dashboard`                | Neon session cookie                                            | Rehydrate latest processed statement + advisory feed (refresh/deep link path)          |
| GET    | `/api/dashboard/advisories`     | Neon session cookie                                            | Fetch advisory_feed rows for user                                                      |
| POST   | `/api/onboarding/complete`      | Neon session cookie                                            | Save onboarding income, score, and perceived spend to profiles                         |
| GET    | `/api/cron/weekly-recap`        | `authorization: Bearer <CRON_SECRET>` or local `x-cron-secret` | Scheduled master fan-out                                                               |
| POST   | `/api/cron/weekly-recap/worker` | `x-cron-secret` header                                         | Worker: send one recap email; returns 502 on failure                                   |
| ALL    | `/api/auth/[...path]`           | —                                                              | Neon Auth passthrough                                                                  |

## Things NOT to Change Without Reading First

1. **`pdf-parser.ts` uses `result.total` for page count** — not `result.pages?.length`. The `pdf-parse` v2 API changed this property. Do not revert to `result.numpages` or `result.pages?.length`.
2. **`persist-statement.ts` is fail-closed** — if the transactions bulk insert fails, it rolls back the statement insert and returns an error. Do not add a try/catch that swallows the child insert failure and allows the parent to stay as `processed`.
3. **`posthog.ts` reads `POSTHOG_KEY` and `POSTHOG_HOST`** — server-only (no `NEXT_PUBLIC_` prefix). Adding the prefix would leak the key to the browser bundle and also break the server-side client which reads the non-prefixed var.
4. **Dashboard hydration depends on the active Neon session cookie** — any refactor of dashboard data loading must preserve authenticated session-based access across `/api/dashboard` and related reads.
5. **Weekly recap worker returns HTTP 502 on email failure** — master uses HTTP status, not JSON body, to count failures. Do not change the worker to return 200 with `{ ok: false }`.
6. **All monetary values are stored in paisa (BIGINT)** — divide by 100 to display as rupees. Never store or compute in rupees directly.
7. **Ownership is enforced in route handlers** — this app no longer uses Supabase RLS or service-role patterns.

## Known Limitations

- Statement history browsing not yet implemented — dashboard always shows the latest processed statement. `GET /api/dashboard` accepts `?statement_id=` as a future extension point.
- Password removal stays manual outside the app. Password-protected PDFs are rejected with a clear retry message.
- Inbox ingestion from email is not implemented. Users must manually download the PDF and upload it.
- PDF parsing reliability depends on the PDF being text-based (not scanned/image). Scanned PDFs return 400.
- Rate limit for uploads is 3/day per user (in-memory, resets on server restart) — not durable across deployments.
- Weekly recap email only triggers if the user has at least one processed statement. New users without statements are silently skipped.
- Share button (`navigator.share`) is hidden on desktop browsers — only rendered when Web Share API is available.
- Current automated validation count is 45 tests across route and library coverage.
