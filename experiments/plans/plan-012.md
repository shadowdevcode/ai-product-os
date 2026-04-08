# Plan 012 — MoneyMirror Gen Z clarity loop: emotional UX, frequency-first insights, performance-to-insight SLAs

**Issue:** 012  
**Project:** MoneyMirror (`apps/money-mirror`)  
**Linear:** Root [**VIJ-52**](https://linear.app/vijaypmworkspace/issue/VIJ-52/issue-012-gen-z-clarity-loop-emotional-ux-frequency-perf-slas); project [issue-012 — Gen Z clarity loop](https://linear.app/vijaypmworkspace/project/issue-012-gen-z-clarity-loop-emotional-ux-frequency-perf-slas-1bbe50903d79). **Depends on:** issue-011 Phase 4 shipped surfaces (merchant/UPI, bad patterns, compare, chat, proactive, rate limits) — **extend**, do not fork.  
**Exploration:** [exploration-012.md](../exploration/exploration-012.md) — **Build**  
**Stage:** plan  
**Status:** approved for execution (order **T0 → T1 → T2**)  
**Date:** 2026-04-07

---

## 1. Plan summary

Issue-012 turns Phase 4’s **accurate** MoneyMirror into a **habit-forming clarity loop** for India **Gen Z / young Millennial** users: **shame-safe copy**, **frequency × small-ticket** storytelling, **deterministic merchant clusters** (quick commerce, food delivery, etc.), **explicit performance-to-insight contracts** (dashboard ready, first advisory), a **short guided review** that ends in **dismiss or one optional saved commitment**, and **high-signal proactive / recap copy** tied to facts. **No new bank rails**, **no unconstrained LLM numerics** — all generative text stays **facts-grounded** (Layer A + bounded txn context) per existing coaching rules.

**Canonical stack (unchanged):** Next.js 16 App Router, Neon Auth (email OTP), Neon Postgres (`@neondatabase/serverless`), Gemini 2.5 Flash where needed, Resend, PostHog (server + browser), Sentry. Server-enforced **ownership** in API routes.

**Theme execution order:** **T0** (emotional UX + perf SLAs + skeleton-first) → **T1** (frequency-first + cluster surfaces) → **T2** (guided loop + proactive/recap copy rules). Matches [exploration-012.md](../exploration/exploration-012.md) recommended ordering.

---

## 2. Product specification (Product Agent)

### Product goal

Increase **repeat statement upload** (North Star proxy continuity from issue-009/010/011) and **engagement depth** by making the **first minute** of review feel **fast**, **specific**, and **emotionally safe** — defaulting to **frequency and cluster** stories, not totals-only accounting.

### Target user

- **Primary:** Gen Z / young Millennials in India (₹20K–₹80K/month band and adjacent), **UPI- and quick-commerce-native**, possibly in **income transition** or **family support** contexts — they need **clarity without judgment**.
- **Secondary:** PM/owner — Linear **VIJ-52**; dependency on **issue-011** baselines.

### User journey (issue-012 highlights)

1. **Land on dashboard** — Skeleton-first shell; **Mirror** and **primary numbers** appear within defined **dashboard ready** timing; heavy lists load **progressively**.
2. **See the story** — **Frequency** and **cluster** callouts (e.g. “Quick commerce / week”, “Food delivery ecosystem”) appear **above the fold** on Overview or Insights as specified in UX — **deterministic** mappings first.
3. **Act on advisories** — Existing bad-pattern and merchant flows remain; copy is **shame-reduced** and **dependence-aware** per tone rules.
4. **Optional guided review** — Short **3-step** flow: acknowledge pattern → pick **one** next-step commitment **or** dismiss; **save commitment** only with **explicit opt-in** (privacy default: ephemeral).
5. **Proactive / recap** — Weekly recap and opt-in channels use **specific**, **fact-tied** copy; no generic AI filler.

### Theme map — MVP vs out of scope

| Theme  | In scope                                                                                                                                                                                                                                                    | Out of scope                                                                                                  |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **T0** | Shame-safe **empty / loading / error** copy; **skeleton-first** dashboard; **performance marks** (`dashboard_ready`, `time_to_first_advisory`) with documented **timing boundaries**; **progressive** load for txn-heavy panels                             | Full **Core Web Vitals** redesign program; rewriting all panels unrelated to dashboard/insights               |
| **T1** | **Frequency-first** cards (orders/week, repeat debits); **merchant cluster** rollups via **curated deterministic** `merchant_key` → cluster mapping; tap-through to **scoped** Transactions; **`frequency_insight_opened`**, **`merchant_cluster_clicked`** | **ML** taxonomy; global **re-clustering** of all history offline                                              |
| **T2** | **3-step guided review** UI + **dismiss / optional saved commitment**; **notification / recap copy rules** document + template tweaks; **`guided_review_*`**, **`commitment_saved`**                                                                        | Long-form journaling; **default** storage of sensitive free-text; new **push** channels beyond existing stubs |

### Decision records (lock before UI freeze)

1. **Clusters** — **Deterministic first:** maintain `merchant_key` / pattern → **cluster id** in versioned **code** (`src/lib/merchant-clusters.ts` or similar). Expand list only with **tests** and **docs** — no ML cluster table in MVP.
2. **Performance SLAs** — **Product timers** (not a substitute for RUM): **dashboard_ready** = time from **dashboard shell mount** (client) to **Mirror + primary summary** ready for **current scope**; **time_to_first_advisory** = to **first advisory card** visible in feed (or explicit “no advisories” completion state). Targets are **budgets for `/metric-plan`** (e.g. p75 goals), not hardcoded throws.
3. **Guided review storage** — **Default:** completion is **telemetry + optional local dismiss**; **persisted commitment** only if user checks **explicit** “Save my commitment” (or equivalent). Server table holds **minimal** fields: `user_id`, optional `statement_id`, `commitment_text` (nullable), `dismissed`, `created_at`.
4. **Generative scope** — Any new LLM strings (recap, coach) must use **existing Layer A + bounded txn** patterns; **no new numeric claims** beyond SQL-derived facts.
5. **Single emission source** — New PostHog events each have **one** authoritative emitter (client vs server) — documented inline per [analytics-framework](../../knowledge/analytics-framework.md).

### Success metrics and Metric → flow → telemetry

| Success metric                        | User flow (where measured)              | Telemetry (single source)                                                                                                           |
| ------------------------------------- | --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| North Star proxy — repeat upload ≤60d | Second successful parse after first     | Existing `statement_parse_success` + cohort (metric-plan)                                                                           |
| Speed to value                        | Dashboard load → ready / first advisory | `dashboard_ready_ms` (or `dashboard_ready` with `duration_ms` property); `time_to_first_advisory_ms` — **client**, documented marks |
| Frequency insight adoption            | User expands/opens frequency module     | `frequency_insight_opened`                                                                                                          |
| Cluster usefulness                    | User taps cluster row → Transactions    | `merchant_cluster_clicked`                                                                                                          |
| Guided loop                           | User completes 3-step flow              | `guided_review_started`, `guided_review_completed`                                                                                  |
| Commitment opt-in                     | User saves commitment                   | `commitment_saved`                                                                                                                  |
| Copy quality                          | (Qual) tone review + support tickets    | No new North Star; optional session replay sampling                                                                                 |

---

## 3. UX design (Design Agent)

### Information architecture

- **Dashboard** — Keep **ScopeBar**, **tab deep links** (`?tab=`) from P4-F. **T0:** Above-the-fold **skeleton** matches final card structure; **avoid layout shift** when Mirror numbers hydrate.
- **Overview / Insights** — **T1:** Add **Frequency** strip or card group and **Cluster** summary rows **without** duplicating full MerchantRollups table — **complementary** story layer.
- **Transactions** — Preserve **lazy** or **paginated** load; **T0** ensures **filter bar** + first page **does not block** dashboard ready metric (scope: Overview tab or agreed boundary in implementation).

### User flows

1. **Dashboard load (T0)** — Route transition → shell skeleton → **Mirror card** + totals → **AdvisoryFeed** hydrates → marks **time_to_first_advisory** when first card renders or empty state shows.
2. **Frequency insight (T1)** — User taps “Why so often?” / frequency module → `frequency_insight_opened` → optional drill to Transactions with **preset** (merchant_key, date range) — **AbortController** on fetch per [ui-standards](../../knowledge/ui-standards.md).
3. **Cluster row (T1)** — User taps **Quick commerce** / **Food delivery** cluster → `merchant_cluster_clicked` → Transactions or scoped rollup.
4. **Guided review (T2)** — Entry from Overview CTA or post-upload prompt → Step 1/2/3 → **Done** → optional **Save commitment** (checkbox) → POST → `commitment_saved` + toast; **Dismiss** → `guided_review_completed` without storage.

### UI components (new / extend)

- **`DashboardSkeleton`** or extend existing loading states — **T0**.
- **`FrequencyInsightCard`** (or section inside **ResultsPanel**) — **T1**.
- **`ClusterChips` / `ClusterRollupRow`** — **T1**; reuse **TxnRow** / **MerchantRollups** label resolution (alias > suggestion > merchant_key).
- **`GuidedReviewSheet`** (mobile-first **drawer / bottom sheet**) — **T2**; focus trap + aria labels on steps.

### Accessibility

- Skeleton regions labeled with **aria-busy** where appropriate; guided review **step X of 3** announced; commitment field **optional** and not auto-focused for dismiss path.

---

## 4. System architecture (Backend Architect Agent)

### Overview

- **Monolith** `apps/money-mirror` — extend **`src/app/api/`**, **`src/lib/`**, **`src/app/dashboard/`**.
- **Auth** — `getSessionUser()` on every new endpoint; **never** trust body `userId`.
- **Data** — Frequency and cluster aggregates are **derived** from `transactions` + deterministic cluster map **in-process** (SQL aggregates + TS join). **No** blocking Gemini on dashboard critical path.
- **Telemetry** — **Client** timers for perceived ready; **server** may optionally log API duration (existing patterns) — **fire-and-forget** PostHog per [CLAUDE.md](../../CLAUDE.md) anti-patterns.

### API surface (conceptual)

| Method     | Path                                           | Purpose                                                                                                                                                                                                                     |
| ---------- | ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET`      | `/api/dashboard`                               | Extend payload or **parallel** fetch: optional `frequency_summary`, `cluster_rollups` — if split, use **`GET /api/insights/frequency-clusters?scope=...`** to protect TTFB (execute-plan decides split vs single response). |
| `POST`     | `/api/guided-review/outcome`                   | Persist **opt-in** commitment or **dismissed** flag only; validate length, auth.                                                                                                                                            |
| (existing) | `/api/transactions`, `/api/insights/merchants` | Reuse for drill-through; **no** relaxed rate limits.                                                                                                                                                                        |

### Data flow

1. **Dashboard** — Auth → scope resolution (existing) → parallel: **core dashboard** + **optional** frequency/cluster query (or second client fetch after ready mark).
2. **Guided review** — Client POST → insert **one row** → return `{ ok: true }` — **no** LLM on this path for MVP.

### Infrastructure

- **Vercel** Fluid Compute; **no** new cron **required** for MVP. Recap copy changes live in **existing** email template path.

---

## 5. Database schema (Database Architect Agent)

### Database

- **Neon Postgres** — extend existing `schema.sql` + idempotent **`schema-upgrades.ts`**.

### New table: `guided_review_outcomes`

| Column            | Type                               | Notes                                        |
| ----------------- | ---------------------------------- | -------------------------------------------- |
| `id`              | UUID PK                            | `gen_random_uuid()`                          |
| `user_id`         | TEXT NOT NULL                      | FK → `profiles(id)` ON DELETE CASCADE        |
| `statement_id`    | UUID NULL                          | FK → `statements(id)` ON DELETE SET NULL     |
| `dismissed`       | BOOLEAN NOT NULL DEFAULT false     | True when user completes without saving text |
| `commitment_text` | TEXT NULL                          | Non-null only when user **opted in** to save |
| `created_at`      | TIMESTAMPTZ NOT NULL DEFAULT now() |                                              |

**Indexes:** `(user_id, created_at DESC)` for “last outcome” queries if needed.

**Privacy:** No extra PII columns; **document** in README that free-text is **opt-in** and **user-deletable** (future: optional delete endpoint or CASCADE on profile delete already covers).

### No new tables required for

- **Merchant clusters** — code registry first.
- **Frequency metrics** — computed from `transactions`.

### Relationship diagram (incremental)

`profiles` 1 — _ `guided_review_outcomes`; `statements` 1 — _ `guided_review_outcomes` (optional link).

---

## 6. Implementation tasks (grouped)

### T0 — Emotional UX + performance SLAs

1. Define **performance marks** + **PostHog** helper in dashboard client (`posthog-browser.ts`); document **boundaries** in code comments.
2. Implement **skeleton-first** loading for **Overview** critical path; reduce **layout shift** when Mirror/advisories load.
3. Pass **shame-safe / dependence-aware** copy for **empty**, **loading**, and **key advisory intros**; update [`docs/COACHING-TONE.md`](../../apps/money-mirror/docs/COACHING-TONE.md) with a short **Gen Z / transition** subsection.
4. **Progressive** enhancement: defer non-critical panels (e.g. heavy txn preview on Overview) **after** `dashboard_ready` mark — without breaking scope/tab URL sync.

### T1 — Frequency + cluster insights

5. Add **`src/lib/merchant-clusters.ts`** — curated map + unit tests; document **how to add** a cluster safely.
6. Implement **SQL** (or reuse rollup query) for **top merchants by frequency** and **small-ticket** bands for **current scope**; expose via dashboard or **`/api/insights/frequency-clusters`**.
7. UI: **FrequencyInsight** + **Cluster** rows; wire **`frequency_insight_opened`**, **`merchant_cluster_clicked`** (single source: client).
8. Drill-through to **Transactions** with **AbortController** and existing query params.

### T2 — Guided loop + proactive copy

9. Schema + **`schema-upgrades`**: `guided_review_outcomes` table.
10. **`POST /api/guided-review/outcome`** — validation, auth, tests (`__tests__/api/...`).
11. **`GuidedReviewSheet`** — 3 steps; **guided_review_started** / **guided_review_completed** / **commitment_saved** per inline single-source comments.
12. **Recap / proactive** — adjust **Resend** templates + any **WhatsApp** stub copy for **specificity** (facts-only placeholders); no new **invented** numbers.

---

## 7. Risks

| Risk                               | Mitigation                                                                                                            |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Cluster mapping feels arbitrary    | Start with **narrow**, **high-confidence** clusters; **iterate** with PM list; tests for known `merchant_key` samples |
| Perf work creeps into full rewrite | **Freeze** surfaces in T0 (Mirror + advisories + agreed marks only)                                                   |
| Guided review storage sensitivity  | **Opt-in** save; **minimal** columns; README **privacy** note                                                         |
| Telemetry dual-emission            | **Code review** checklist: one emitter per event name                                                                 |

---

## 8. Acceptance criteria (issue level)

1. **T0:** Documented **timing boundaries**; **dashboard_ready** and **time_to_first_advisory** events fire on happy path; Overview uses **skeleton-first** pattern; **COACHING-TONE** updated for ICP nuance.
2. **T1:** At least **two** deterministic **clusters** (e.g. quick commerce + food delivery) show when data supports; **frequency** insight visible **default** for qualifying users; drill-through **scoped** correctly.
3. **T2:** User can **complete** guided review **without** saving text; **optional** save persists **only** with explicit consent; **API** tested and **ownership** enforced.
4. **Quality:** `npm test`, `npm run lint`, `npm run build` pass for `apps/money-mirror`; new **env vars** (if any) in **`.env.local.example`** same commit.

---

_Next pipeline step after plan approval: **`/execute-plan`** (start **T0**). **Checkpoint:** **`/linear-sync plan`** to sync PRD + child tasks to Linear per [CLAUDE.md](../../CLAUDE.md)._
