# MoneyMirror — production launch checklist (issue-010 follow-up)

_Use this after Phase 3 pipeline close; does not reopen quality gates._

## Pre-push (GitHub)

| #   | Task                                                                                                               | Owner |
| --- | ------------------------------------------------------------------------------------------------------------------ | ----- |
| 1   | `cd apps/money-mirror && npm run lint` — zero errors                                                               | Eng   |
| 2   | `npm run test` — all Vitest tests green                                                                            | Eng   |
| 3   | `npm run test:e2e` — Playwright smoke (`/`, `/login`); first run: `npx playwright install chromium`                | Eng   |
| 4   | `npm run build` — production build succeeds (Sentry upload may warn if token missing; build should still complete) | Eng   |
| 5   | Branch pushed; open PR; squash/merge to `main` per team convention                                                 | Eng   |

## Environment (Vercel / Neon)

| #   | Task                                                                                                                                                                                                                                                                                                                | Owner |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| 6   | `DATABASE_URL`, Neon Auth vars, `POSTHOG_KEY`/`POSTHOG_HOST`, `GEMINI_API_KEY`, `RESEND_API_KEY`, `CRON_SECRET`, `NEXT_PUBLIC_APP_URL` match production                                                                                                                                                             | Ops   |
| 7   | Optional: `NEXT_PUBLIC_POSTHOG_KEY` (same project key) for browser **web_vital** events                                                                                                                                                                                                                             | Ops   |
| 8   | Neon: schema from `apps/money-mirror/schema.sql` applied; **if DB predates Phase 3**, run `cd apps/money-mirror && npm run db:upgrade` (or tail of `schema.sql` in SQL Editor) so `transactions.merchant_key` exists — see [`apps/money-mirror/docs/SCHEMA-DRIFT.md`](../../apps/money-mirror/docs/SCHEMA-DRIFT.md) | Ops   |
| 9   | Neon Auth: allowed redirect origins include production URL                                                                                                                                                                                                                                                          | Ops   |

## Smoke (production or preview)

| #   | Task                                                                                                               | Owner |
| --- | ------------------------------------------------------------------------------------------------------------------ | ----- |
| 10  | `/` and `/login` load (200)                                                                                        | QA    |
| 11  | OTP sign-in works                                                                                                  | QA    |
| 12  | Upload PDF → dashboard → **Transactions** tab loads rows or empty state — **no** red “Failed to load transactions” | QA    |
| 13  | **Insights** tab: narratives load or fallback copy (if `GEMINI_API_KEY` unset, AI step skipped)                    | QA    |
| 14  | `GET /api/cron/weekly-recap` → 401 without secret; 200 with `x-cron-secret`                                        | Ops   |

## Optional quality bar

| #   | Task                                                                                                  | Owner    |
| --- | ----------------------------------------------------------------------------------------------------- | -------- |
| 15  | Local Lighthouse: `npm run build && npm run start` then `npx lighthouse http://localhost:3000 --view` | Eng      |
| 16  | Address any **P0** items in `apps/money-mirror/docs/PERFORMANCE-REVIEW.md`                            | PM + Eng |

## Deploy

| #   | Task                                                                                                       | Owner |
| --- | ---------------------------------------------------------------------------------------------------------- | ----- |
| 17  | From monorepo root: `vercel deploy --prod` with project `rootDirectory` = `apps/money-mirror` (see README) | Ops   |
| 18  | Verify production alias (`NEXT_PUBLIC_APP_URL`)                                                            | Ops   |

## Known dev-environment noise

- **`uv_interface_addresses` / `getNetworkHosts` unhandled rejection** — can appear in some sandboxes or restricted Node environments when Next tries to print the LAN URL. The dev server may still work on `http://localhost:3000`. Workaround: run `next dev -H 127.0.0.1` or use full OS permissions; not a production issue.
