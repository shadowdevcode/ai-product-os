# MoneyMirror — Performance & quality review (living doc)

_Last updated: 2026-04-06_

This document captures an architecture-style review: root causes, prioritized backlog (P0–P2), test ideas, and best-practice gaps. Update it when major changes ship (e.g. E2E added, CWV wired, font strategy changed).

### Recently shipped (this iteration)

- **`next/font`** — Inter + Space Grotesk self-hosted via `layout.tsx`; removed blocking Google Fonts `@import` from `globals.css`.
- **Core Web Vitals → PostHog** — `WebVitalsReporter` (`src/components/WebVitalsReporter.tsx`) sends `web_vital` events when `NEXT_PUBLIC_POSTHOG_KEY` is set; dev logs metrics to console when the key is unset.
- **Viewport zoom** — `maximumScale` raised to `5` for accessibility.
- **Playwright smoke** — `e2e/smoke.spec.ts` (landing + login); run via `npm run test:e2e` (build + `next start` on port **3333**).

---

## Executive summary (RCA)

| Symptom                                    | Likely root causes                                                                                                                                                                                                                                                    |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Very slow first paint / interactions       | Dev Turbopack compile cost; request waterfall (statements → dashboard → transactions); remote Neon latency per route; Insights path runs a second full DB + Gemini via `/api/dashboard/advisories`. (Google Fonts blocking CSS import **removed** — use `next/font`.) |
| “Failed to load transactions” + empty area | Designed error state when `/api/transactions` fails (e.g. 500). Scope UI comes from `/api/dashboard`; the list is a **separate** request — not a layout bug.                                                                                                          |
| Slowness on tab changes                    | Largely mitigated: dashboard refetch is keyed by **scope** (tab-only URL changes should not refetch `/api/dashboard`).                                                                                                                                                |

---

## Prioritized backlog

### P0 — Fix or verify first (reliability / trust)

1. **Transactions API failures in production** — Ensure 500s are logged and alertable (Sentry). Dev-only `detail` on transaction errors helps locally; prod may need correlation IDs or safe error codes.
2. **Environment / DB** — Validate `DATABASE_URL` and Neon Auth in each environment; consider a small health check for deploy verification.
3. **Browser E2E (expand)** — Smoke tests cover `/` and `/login`. Next: authenticated flow (dashboard + transactions) when a test-safe auth strategy exists.

### P1 — Performance & UX (next)

4. **Duplicate work on Insights** — `/api/dashboard` then `/api/dashboard/advisories` runs `fetchDashboardData` twice + Gemini. Consider short-TTL cache keyed by user + scope, or a single route with `include_narratives`.
5. ~~**Font loading**~~ — Done: `next/font` (see Recently shipped).
6. ~~**Core Web Vitals**~~ — Done: `WebVitalsReporter` + optional PostHog (see Recently shipped).

### P2 — Accessibility, responsive polish, hygiene

7. ~~**Viewport**~~ — Done: `maximumScale: 5` (see Recently shipped).
8. **Responsive layout** — `.page-container` / dashboard shell are intentionally narrow (mobile-first). Clarify product intent for tablet/desktop width.
9. **Inline styles** — Gradual move to shared primitives / Tailwind for consistency and testability.
10. **Component tests** — Add tests for `useDashboardState` tab + scope behavior if E2E is delayed.

---

## Suggested E2E cases (when Playwright exists)

| #   | Flow                                    | Assert                                                          |
| --- | --------------------------------------- | --------------------------------------------------------------- |
| 1   | Login → `/dashboard`                    | Shell renders; no stuck skeleton.                               |
| 2   | Empty statements                        | Upload or empty state; no crash.                                |
| 3   | Transactions tab                        | Rows or “No transactions”; no red error if API healthy.         |
| 4   | Tab: Overview → Transactions → Insights | No redundant `/api/dashboard` for same scope (network panel).   |
| 5   | Insights                                | Narratives load after fast dashboard (if `GEMINI_API_KEY` set). |
| 6   | Filters                                 | Debounced search; no runaway requests.                          |
| 7   | Mobile 375px                            | Nav usable; no horizontal overflow.                             |

---

## Edge cases already partially handled

- AbortController on transactions fetch.
- Debounced search in `TransactionsPanel`.
- Legacy vs unified scope — different API query shapes; test both.

---

## Best-practice snapshot

| Area      | Notes                                   |
| --------- | --------------------------------------- |
| API auth  | `getSessionUser` on protected routes    |
| Telemetry | Fire-and-forget patterns per repo rules |
| DB        | Indexes in `schema.sql`                 |
| E2E / CWV | Gaps — prioritize P0/P1                 |
| A11y      | Review `maximumScale`                   |

---

## Commands to run (local)

Use these from **`apps/money-mirror`** (or via your monorepo root with the appropriate package filter).

### 1. Quality gate (always)

```bash
cd apps/money-mirror && npm run lint && npm run test
```

### 2. Production-like performance (vs `npm run dev`)

```bash
cd apps/money-mirror && npm run build && npm run start
```

Then open `http://localhost:3000` (default Next port). Compare perceived latency to dev mode.

### 3. Local dev (iterate on UI)

```bash
cd apps/money-mirror && npm run dev
```

### 4. Lighthouse (optional — needs running app + Chrome)

With **`npm run start`** or **`npm run dev`** already running on port 3000:

```bash
npx lighthouse http://localhost:3000 --view --only-categories=performance,accessibility
```

**Headless HTML report** (no browser window — writes into `docs/`):

```bash
# After: npm run build && npm run start -- -p 3002
npx lighthouse http://localhost:3002 --only-categories=performance,accessibility \
  --output=html --output=json --output-path=./docs/lighthouse-report --quiet \
  --chrome-flags="--headless --no-sandbox --disable-gpu"
```

Open `docs/lighthouse-report.report.html` locally. Headless runs may log `NO_LCP` and leave the **performance** score empty; use `--view` on your machine for a full performance score.

### 5. Playwright E2E (smoke)

First time only (browser binaries):

```bash
cd apps/money-mirror && npx playwright install chromium
```

Run (builds, starts production server on port **3333**, runs tests):

```bash
cd apps/money-mirror && npm run test:e2e
```

Interactive UI mode: `npm run test:e2e:ui`

---

## Related code

- Dashboard API (fast path, no Gemini): `src/app/api/dashboard/route.ts`
- Lazy Gemini / Insights: `src/app/api/dashboard/advisories/route.ts`, `src/app/dashboard/useDashboardState.ts`
- Transactions: `src/app/api/transactions/route.ts`, `src/app/dashboard/TransactionsPanel.tsx`
- Styles / viewport: `src/app/globals.css`, `src/app/layout.tsx`
