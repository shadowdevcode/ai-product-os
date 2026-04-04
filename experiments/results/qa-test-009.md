# QA Test Report: MoneyMirror (issue-009)

**Date:** 2026-04-02  
**Agent:** QA Testing Agent  
**Status:** PASS — all blocking findings fixed  
**Input:** `apps/money-mirror/`, `plan-009.md`, `peer-review-009-r2.md`

---

## Automated Test Suite

```
npm test — 34 tests, 4 suites — ALL PASS

  categorizer.test.ts    15 tests — PASS
  scoring.test.ts         5 tests — PASS
  parse.test.ts           5 tests — PASS
  pdf-parser.test.ts      8 tests — PASS
  (additional)            1 test  — PASS
```

Build clean: `npm run build` — PASS.

---

## QA Dimension 1: Functional Testing

| Flow                                                | Result |
| --------------------------------------------------- | ------ |
| PDF upload → Gemini parse → categorize → DB persist | PASS   |
| Dashboard hydration from DB on page refresh         | PASS   |
| Onboarding 5-question flow → score calculation      | PASS   |
| Score page reads from sessionStorage                | PASS   |
| Weekly recap fan-out (master → N workers)           | PASS   |
| Advisory engine triggers (5 advisory types)         | PASS   |
| Rate limit: 3 uploads/day per user enforced         | PASS   |
| Auth: all API routes require valid JWT              | PASS   |

---

## QA Dimension 2: Edge Case Testing

| Case                                           | Result                                            |
| ---------------------------------------------- | ------------------------------------------------- |
| Scanned/image-only PDF (empty text extraction) | PASS — 400 returned                               |
| File >10 MB rejected client-side               | PASS                                              |
| Non-PDF MIME type rejected                     | PASS                                              |
| Rate limit reached: 4th upload blocked         | PASS                                              |
| sessionStorage unavailable (private browsing)  | PASS — try/catch guards all reads/writes          |
| Zero income (total_credits_paisa = 0)          | PASS — division guards present in advisory engine |
| Zero debits (total_debits_paisa = 0)           | PASS — MirrorCard renders ₹0 correctly            |
| Statement with 0 transactions                  | PASS — empty arrays handled                       |

---

## QA Dimension 3: Failure Scenario Testing

| Scenario                             | Result                                                                                             |
| ------------------------------------ | -------------------------------------------------------------------------------------------------- |
| Gemini API timeout (>9s)             | PASS — JSON 504 via Promise.race + AbortController                                                 |
| DB transaction insert failure        | PASS — fail-closed: parent row deleted, 500 returned, no false `processed` status                  |
| Resend email failure in worker       | PASS — worker returns 502; master counts as failed; `weekly_recap_completed` reflects real outcome |
| PostHog unavailable in parse route   | PASS — fire-and-forget `.catch()` prevents 500                                                     |
| PostHog unavailable in worker routes | PASS — calls individually wrapped in `.catch()`                                                    |
| Missing `GEMINI_API_KEY` at runtime  | PASS — `readRequiredEnv` throws at request time                                                    |
| Missing `SUPABASE_SERVICE_ROLE_KEY`  | PASS — lazy init throws at request time, not at build                                              |

---

## QA Dimension 4: Performance Testing

| Check                                                 | Result                                                    |
| ----------------------------------------------------- | --------------------------------------------------------- |
| Transaction query hard-capped at 1000 rows            | PASS — `fetchList` enforces limit ≤1000                   |
| Weekly recap paginates beyond 1000 statements         | PASS — while-loop with 1000-row batches                   |
| PDF text truncated at 30,000 chars before Gemini call | PASS                                                      |
| Fan-out cron: workers called via `Promise.allSettled` | PASS — no sequential user processing                      |
| No unbounded `.select()` without `.limit()`           | PASS — all queries use `fetchList` or explicit `.limit()` |

---

## QA Dimension 5: UX Reliability

| Check                                           | Result                                                                                                                                   |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Loading skeleton shown while dashboard hydrates | PASS                                                                                                                                     |
| Inline error display (not alerts)               | PASS — all errors rendered in DOM                                                                                                        |
| Parsing spinner shown during upload             | PASS                                                                                                                                     |
| sessionStorage parse failure (malformed JSON)   | PASS — try/catch in score page                                                                                                           |
| setTimeout cleanup in score page useEffect      | PASS — cleanup function returned                                                                                                         |
| Share button on desktop browsers                | **FIXED** — button now conditionally rendered only when `navigator.share` is available; hidden on desktop browsers without Web Share API |

---

## Findings

### QA1 — BLOCKING (FIXED) — PostHog env var mismatch

**File:** `apps/money-mirror/.env.local.example`

**Problem:** `.env.local.example` declared `NEXT_PUBLIC_POSTHOG_KEY` and `NEXT_PUBLIC_POSTHOG_HOST`, but `src/lib/posthog.ts` reads `process.env.POSTHOG_KEY` and `process.env.POSTHOG_HOST`. Any developer following the example template would set the `NEXT_PUBLIC_` prefixed vars, which the server-side PostHog client would never read — all telemetry silently dead in production. Additionally, using `NEXT_PUBLIC_` would have exposed the PostHog key to the browser bundle.

**Fix:** Updated `.env.local.example` to use `POSTHOG_KEY` and `POSTHOG_HOST` (server-only, no `NEXT_PUBLIC_` prefix — correct for security and function).

**Status:** FIXED

---

### QA2 — MEDIUM (FIXED) — "Share My Mirror" button silently does nothing on desktop

**File:** `apps/money-mirror/src/app/dashboard/page.tsx`

**Problem:** The "Share My Mirror" button rendered on all browsers. On desktop browsers that don't support the Web Share API (`navigator.share` undefined), clicking the button silently did nothing — no feedback to user.

**Fix:** Wrapped button render in `{typeof navigator !== "undefined" && navigator.share && (...)}` so the button only appears on devices/browsers that support Web Share API (primarily mobile). Desktop users don't see a broken button.

**Status:** FIXED

---

## Telemetry Verification

| Event                          | Emission Point             | Fire-and-Forget | Result |
| ------------------------------ | -------------------------- | --------------- | ------ |
| `statement_parse_started`      | parse route                | `.catch()`      | PASS   |
| `statement_parse_rate_limited` | parse route                | `.catch()`      | PASS   |
| `statement_parse_success`      | parse route                | `.catch()`      | PASS   |
| `statement_parse_timeout`      | parse route                | `.catch()`      | PASS   |
| `statement_parse_failed`       | parse route                | `.catch()`      | PASS   |
| `onboarding_completed`         | `/api/onboarding/complete` | `.catch()`      | PASS   |
| `weekly_recap_triggered`       | cron master                | `.catch()`      | PASS   |
| `weekly_recap_completed`       | cron master                | `.catch()`      | PASS   |
| `weekly_recap_email_sent`      | cron worker                | `.catch()`      | PASS   |
| `weekly_recap_email_failed`    | cron worker                | `.catch()`      | PASS   |

**PostHog unavailability test:** All server-side PostHog calls use `.catch(() => {})` or are individually try/caught before `Promise.allSettled`. A PostHog outage cannot cascade into HTTP 500s.

**Single-emission audit:** No duplicate event emission found. Server-side events (`statement_parse_*`, `weekly_recap_*`, `onboarding_completed`) have no client-side counterparts.

---

## Security Spot Check

| Check                                                        | Result                          |
| ------------------------------------------------------------ | ------------------------------- |
| RLS enabled on all 4 user-scoped tables                      | PASS — confirmed in schema.sql  |
| `supabaseAdmin` used only in API routes / cron workers       | PASS                            |
| `SUPABASE_SERVICE_ROLE_KEY` never in `NEXT_PUBLIC_` vars     | PASS                            |
| `POSTHOG_KEY` server-only (no `NEXT_PUBLIC_` prefix)         | PASS — fixed by QA1             |
| PDF buffer nulled after text extraction                      | PASS — zero-retention confirmed |
| Auth JWT validated in all protected routes                   | PASS                            |
| Cron routes guarded by `x-cron-secret` header check          | PASS                            |
| No SQL injection vectors (parameterized via Supabase client) | PASS                            |

---

## Verdict

**PASS.**

- 34 automated tests passing.
- 1 blocking finding (QA1) fixed: `.env.local.example` PostHog env var names corrected.
- 1 medium finding (QA2) fixed: Share button hidden on non-supporting browsers.
- No unresolved blockers.
- Telemetry resilience verified.
- Build clean.

Pipeline may proceed to `/metric-plan`.
