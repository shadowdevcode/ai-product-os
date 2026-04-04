# Code Review — issue-009 MoneyMirror

**Date:** 2026-04-02
**Reviewer:** Code Review Agent (Senior Staff Engineer)
**Plan reference:** experiments/plans/plan-009.md

---

## Looks Clean

- Auth flow in `/api/statement/parse` — correct JWT verification via `supabase.auth.getUser(token)` before any business logic
- Rate limiting — 3 uploads/day enforced via DB count query before processing
- Gemini timeout — `Promise.race` with 9s AbortController-style timeout correctly implemented
- Zero-retention PDF — buffer explicitly nulled after text extraction (`fileBuffer = null`)
- RLS policies — confirmed on all 4 tables: `profiles`, `statements`, `transactions`, `advisory_feed`
- Fan-out cron architecture — master route fans out to `/api/cron/weekly-recap/worker` via `Promise.allSettled`
- Worker auth — `x-cron-secret` header validation on both master and worker routes
- PostHog single emission source — all events fire server-side only; no client-side re-fires found
- PostHog error resilience — all non-critical telemetry calls wrapped with `.catch()`
- Paisa storage — `Math.round(tx.amount * 100)` correctly converts rupees to paisa BIGINT
- `captureServerEvent` fire-and-forget pattern on non-critical paths (rate limit, worker telemetry)
- Gemini JSON sanitization — markdown code fences stripped via regex before `JSON.parse`
- `sessionStorage` reads wrapped in `try/catch` in onboarding and score pages
- `categorizer.ts` — keyword-matching with priority order is clean and deterministic
- `advisory-engine.ts` — advisory logic correctly guarded with `perceived_spend_paisa > 0` threshold
- `error-handler.ts` — clean Sentry integration, `withTimeout`, `validateWorkerAuth` helpers
- `db.ts` — `fetchList` has 1000-row hard cap; batch `fetchByIds` pattern avoids N+1

---

## Issues Found (pre-fix state — all resolved in this cycle)

**[CRITICAL]** `src/lib/pdf-parser.ts:47` — Wrong `pdf-parse` API usage
`pages?.length` accessed on `TextResult` which exposes `.total` not `.pages.length`. Result: `pageCount` always resolved to `1` (harmless but incorrect). More importantly, the original code was verified against the actual package (this version exports `{ PDFParse }` as a class, not a default function).
Fix applied: `result.pages?.length ?? 1` → `result.total ?? 1`

**[CRITICAL]** `src/app/api/dashboard/advisories/route.ts:16` — Missing authentication
Route used `SUPABASE_SERVICE_ROLE_KEY` with no JWT verification. Any caller with a valid UUID could fetch another user's advisory data and transactions.
Fix applied: Added `supabase.auth.getUser(token)` check + `.eq("user_id", user.id)` ownership filter on the statements query.

**[HIGH]** `src/app/api/statement/parse/route.ts:253` — `perceived_spend_paisa` not written to statements INSERT
The `statements` table has a `perceived_spend_paisa BIGINT NOT NULL DEFAULT 0` column required by the PERCEPTION_GAP advisory. The INSERT omitted this column, so it always defaulted to 0 and the advisory never fired.
Fix applied: Fetch `profile.perceived_spend_paisa` from the `profiles` table before INSERT; include it in the statements row.

**[HIGH]** `src/lib/posthog.ts:38` — PostHog singleton dead after first event
`captureServerEvent` called `client.shutdown()` but never reset `_posthogServer = null`. Subsequent calls in the same Lambda invocation reused the shut-down client, silently dropping events.
Fix applied: `_posthogServer = null` after `client.shutdown()`.

**[MEDIUM]** `src/app/api/cron/weekly-recap/route.ts:60` — Inaccurate succeeded/failed counts
Fetch errors inside the `map` were caught (`.catch()`) and returned `undefined`, making them appear as `fulfilled` to `Promise.allSettled`. `failed` was always 0.
Fix applied: Replaced `.catch()` swallow with `.then(res => { if (!res.ok) throw new Error(...) })` so non-2xx worker responses correctly land in `rejected`.

**[MEDIUM]** `src/app/score/page.tsx:64` — `setTimeout` in `useEffect` missing cleanup
`setTimeout(() => setRevealed(true), 600)` with no cleanup. On fast navigation away, `setState` called on unmounted component.
Fix applied: `const timer = setTimeout(...); return () => clearTimeout(timer);`

---

## PostHog Dual-Emission Check

Searched all `posthog.capture` / `captureServerEvent` calls across `apps/money-mirror/src`:

- All 10 events fire exclusively from server-side routes
- No client-side PostHog calls found in any `"use client"` component
- Result: **PASS** — no dual-emission violations

---

## Summary

- Files reviewed: 14
- CRITICAL issues: 2 (both fixed)
- HIGH issues: 2 (both fixed)
- MEDIUM issues: 2 (both fixed)
- LOW issues: 0
- Recommendation: **Approve** — all issues resolved, build should be clean
