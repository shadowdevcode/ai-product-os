# Plan 010 — MoneyMirror Phase 3: Unified dashboard, transaction truth, merchant insights, facts-grounded AI

**Issue:** 010  
**Project:** MoneyMirror (`apps/money-mirror`)  
**Linear:** Parent **VIJ-37**; children **VIJ-38** (T1) → **VIJ-41** (T4). **VIJ-25** superseded → duplicate of VIJ-37.  
**Stage:** plan  
**Status:** approved for execution (start **VIJ-38** / T1)  
**Date:** 2026-04-05

---

## 1. Plan Summary

Phase 3 makes MoneyMirror **multi-statement-native**: a **single scope model** (date range + sources), **transaction-level truth** in the UI, **merchant-level rollups** that Overview and Insights agree on, and **expert-style coaching** where generative copy is **strictly grounded** in server-computed **Layer A facts** (no invented amounts). **T5–T6** (URL-backed tabs, compare months) stay **deferred** until T1–T3 validate.

**Canonical stack (unchanged):** Next.js 16 App Router, Neon Auth (email OTP), Neon Postgres, Gemini 2.5 Flash (parse + structured outputs where used), Resend, PostHog (`POSTHOG_KEY` / `POSTHOG_HOST` server-side), Sentry. Ownership is **server-enforced in route handlers** (not Supabase RLS).

---

## 2. Product specification (Product Agent)

### Product goal

Increase **trust and repeat engagement** for users with **multiple** bank/card uploads by making every headline number **traceable** to **line items** and **deterministic server math**, so category and coaching views feel credible and the **North Star proxy** (second-month / repeat statement upload) can compound.

### Target user

- **Primary:** Gen Z Indians (₹20K–₹80K/month) on mobile, using **multiple** statements over time (bank + credit card).
- **Secondary:** PM/owner — delivery via Linear **T1–T4** without duplicate scope vs archived Sprint 4 backlog.

### User journey (Phase 3)

1. **Land on dashboard** with a clear **scope bar**: date range + **which accounts/statements** are included (not only a single statement picker).
2. **See Overview** numbers that match the same scope as **Transactions** and **Insights** (no hidden filter mismatch).
3. **Open Transactions** — paginated list, filters, search — as **ground truth** for “where did this ₹ come from?”
4. **Open Insights** — merchant/category rollups with **deep links** back to filtered transaction rows.
5. **Read coaching** — copy may be fluent, but **amounts and counts** come only from **Layer A facts JSON** returned by the server.

### MVP scope (this plan)

| Track  | In scope                                                                                             | Out of scope (explicit)                                   |
| ------ | ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| **T1** | Transactions **API + UI** (pagination, filters, auth, performance caps)                              | Full merchant AI normalization                            |
| **T2** | **Unified scope** on dashboard (global date range + source inclusion + consistent rollup semantics)  | T5 URL-backed tab product/growth work                     |
| **T3** | **Merchant rollups** + Overview↔Insights **coupling** + deep links                                   | T6 month-compare UI                                       |
| **T4** | **Facts JSON schema** + coaching path that **only references facts**; extend `docs/COACHING-TONE.md` | Investment advice tone; bespoke portfolio recommendations |

**Deferred (T5–T6):** IA/growth (URL-backed tabs, desktop share), **compare months** + related hygiene — backlog AC listed in §8; no execution until PM lifts deferral after T1–T3.

### Success metrics

| Metric                    | Role                           | Target / note                                                                                                            |
| ------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| **North Star proxy**      | Primary (issue-009 continuity) | Second-month / repeat statement upload rate ≥ **60%** (cohort-defined in `/metric-plan`)                                 |
| **Trust proxy (Phase 3)** | Supporting                     | ↑ sessions where user opens **Transactions** or follows a **deep link** from Insights within 7 days of second upload     |
| **Performance**           | Gate                           | Transactions list API **p95** within agreed budget (e.g. &lt; 2s warm) for typical account sizes; **no unbounded scans** |
| **Safety**                | Gate                           | Zero production incidents from **hallucinated rupee amounts** in AI surfaces (facts-only numerics)                       |

### Decision records (PRD — lock before UI freeze)

1. **Perceived vs actual under “all sources” rollup**
   - **Decision (recommended default):** Show **one blended “actual”** for the selected global scope (sum of included statements’ actuals in range). Show **perceived** as the **single profile baseline** (`profiles.perceived_spend_paisa`) with **inline copy** that it is a self-reported monthly estimate, **not** per-account.
   - **Alternative (if PM prefers):** Per-account perceived requires **new persisted fields** (not only `profiles`) — out of scope for T2 unless explicitly added to schema/tasks.

2. **Merchant identity v1**
   - **Decision:** **Heuristic normalization** in application code (deterministic rules: UPI handle extraction, common merchant tokens, case folding). **No** Gemini merchant pass in T1. Optional **T3** spike: structured Gemini **label suggestions** stored separately with confidence + fallback to raw description — only if heuristic quality blocks the demo.

---

## 3. UX design (Design Agent)

### Information architecture

- **Dashboard** remains the hub; add a persistent **Scope bar** (T2): date range + **Included sources** (all / subset of statements).
- **New primary surface:** **Transactions** (tab or route — follow existing `DashboardNav` patterns; prefer **route** `/dashboard/transactions` or tab inside shell per implementation, but **one** canonical entry).
- **Insights** remains the coaching/rollup surface; must **reuse the same scope** object as Overview and Transactions (single source of truth in client state + URL query sync minimum for shareable state **without** waiting for T5).

### User flows

1. **Transactions:** User adjusts scope → list loads with skeleton → infinite scroll or **cursor/page** pagination → tap row → optional detail sheet (description, category, statement badge).
2. **Merchant rollup → evidence:** User taps “Zomato” row in Insights → navigates to Transactions with **query preset** (`merchant_key` / filter token) → list shows matching rows.
3. **Coaching card:** Headline + body; **tap “Sources”** expands **facts bullets** (from Layer A); no rupee figure in prose without matching fact id.

### UI components (extend existing)

- **ScopeBar:** Date range (presets + custom), multi-select statements (nicknames), “All uploaded data in range” mode.
- **TransactionList:** Virtualized or paginated list rows; category chip; debit/credit; date; **statement badge** (nickname / institution).
- **FilterSheet / toolbar:** Category, type, text search (debounced + **AbortController** per ui-standards patterns used elsewhere).
- **MerchantRollupCard:** Merchant label, ₹ total, txn count, CTA “See transactions”.
- **FactsDrawer:** Renders structured facts array (read-only), not raw JSON dump.

### Interaction logic

- **Search/filter** requests cancel prior fetches (`AbortController`).
- **localStorage** usage (if any for scope prefs): **try/catch** on read/write.
- **Loading / empty / error** states for all new async views (skeleton + inline error).

### Accessibility

- Scope controls and list rows keyboard-focusable; filter chips labeled.

---

## 4. System architecture (Backend Architect Agent)

### Overview

- **Monolith:** `apps/money-mirror` — new **read-heavy** routes and **optional** rollup helpers under `src/lib/`.
- **Auth:** Every new API uses `getSessionUser()` (or equivalent) and **never** trusts client `userId` from body without session match.
- **Pagination:** **Cursor or offset** with **hard cap** (e.g. `limit` ≤ 100). **Required:** `.limit()` on SQL side.
- **ID fidelity:** Any URL or query param that names `statement_id`, `transaction_id`, or `merchant_key` must drive **that** query — **no** silent fallback to “latest for user” (anti-pattern from CLAUDE).

### New / changed API surface (conceptual)

| Method | Path                                                                                     | Purpose                                                                                                                                                                                                   |
| ------ | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/api/transactions`                                                                      | Paginated, filtered transactions for **session user**, scoped by date + statement ids + category + type + text search                                                                                     |
| GET    | `/api/dashboard` (extend) or GET `/api/dashboard/summary`                                | Return **scope-aware** aggregates for Overview (actual totals, category breakdown) — **or** extend existing `fetchDashboardData` with scope params **without breaking** current `?statement_id=` behavior |
| GET    | `/api/insights/merchants` (or under `/api/dashboard`)                                    | Top merchant rollups for current scope (limit + min spend threshold)                                                                                                                                      |
| POST   | `/api/coaching/facts` (optional split) or **server-only** builder used by advisory route | Build **Layer A facts** object used by Gemini narrative step                                                                                                                                              |

**Telemetry:** Fire-and-forget PostHog per existing patterns; **no** `await` flush on user-facing routes.

### Data flow

1. Client resolves **scope** → calls transactions / summary / merchants with same query params.
2. Server validates scope (statements **owned by user**); rejects unknown ids with **404/400**.
3. Rollups computed in SQL (GROUP BY) or **precomputed** table if needed for perf (T3 decision).

### Infrastructure

- No new managed services. **Schema migrations** via `schema.sql` (idempotent `ALTER` / `CREATE INDEX`).

### Risks mitigated in design

- **Parser variance:** Transactions API exposes **raw description** + optional `merchant_key`; UI never claims PDF line match unless we add a future “receipt” feature.
- **Performance:** Composite indexes for `(user_id, date DESC)` and `(user_id, statement_id, date)`; explain-analyze budget in `/execute-plan` verification.

---

## 5. Database schema (Database Architect Agent)

**DB:** Neon Postgres (existing).

### Existing tables (reference)

- `profiles`, `statements`, `transactions`, `advisory_feed` — see `apps/money-mirror/schema.sql`.

### Proposed additions (T1–T4)

| Change                                                  | Table                      | Purpose                                                                                                                     |
| ------------------------------------------------------- | -------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| **Add column**                                          | `transactions`             | `merchant_key TEXT` — normalized key for rollup v1 (nullable until backfill).                                               |
| **Add column** (optional T3)                            | `transactions`             | `merchant_display_label TEXT` — human label for UI; may equal `merchant_key` initially.                                     |
| **Index**                                               | `transactions`             | `CREATE INDEX … ON transactions (user_id, date DESC)` if not redundant with existing idx.                                   |
| **Index**                                               | `transactions`             | `CREATE INDEX … ON transactions (user_id, merchant_key)` **where** `merchant_key IS NOT NULL` (partial) for rollup queries. |
| **New table** (optional if GROUP BY too heavy at scale) | `merchant_rollups_monthly` | `(user_id, month, merchant_key, …)` — **only** if profiling shows need; default T3 = **on-the-fly** SQL.                    |

### Backfill strategy

- On deploy T1: **one-time** or **lazy** backfill: compute `merchant_key` from `description` using shared `src/lib/merchant-normalize.ts` (new). Old rows updated in migration script or on read (prefer **migration** for consistent rollups).

### Relationships

- `transactions.statement_id` → `statements.id` (unchanged).
- Scope queries **always** constrain `user_id` + optional `statement_id IN (…)`.

---

## 6. Analytics (Analytics Framework alignment)

Define in **execute-plan**; verify in **review**. Suggested **new** events (names snake_case):

- `transactions_view_opened`
- `transactions_filter_applied` (properties: filter_type, scope — no raw PII)
- `merchant_rollup_clicked` (merchant_key hashed or bucketed if needed)
- `coaching_facts_expanded`
- `scope_changed` (date_preset, source_count)

**Existing** events stay authoritative where already defined; **single emission source** per event name (no duplicate client+server for the same business event).

North Star and funnels finalized in `/metric-plan`; this plan lists instrumentation **intent** only.

---

## 7. Implementation tasks (by phase)

Phases align with **T1→T4** and Linear **VIJ-38–VIJ-41**.

### Phase A — T1 / VIJ-38: Transaction surface + API (P0)

1. Add `merchant_key` (nullable) + indexes in `schema.sql`; migration notes in README.
2. Implement `normalizeMerchantKey(description: string): string | null` (pure, tested).
3. Backfill or write path: set `merchant_key` on insert + batch backfill existing rows.
4. Implement `GET /api/transactions` with auth, pagination, filters, hard limit, ownership checks.
5. Add Transactions UI (shell integration + list + empty/error).
6. Tests: API route + normalization unit tests.

### Phase B — T2 / VIJ-39: Unified scope model

1. Define **scope object** (Zod or TS type) shared client/server.
2. Extend dashboard data loading to accept **date_from/date_to** + **statement_ids** (validated).
3. Align Overview metrics to scope; **decision record §2** for perceived copy.
4. PostHog: `scope_changed`.

### Phase C — T3 / VIJ-40: Merchant rollups + coupling

1. SQL or helper: top merchants by spend for scope.
2. Insights UI: merchant cards + deep link to `/api/transactions?…`.
3. Ensure Overview totals **match** sum of transaction debits for same scope (smoke test).

### Phase D — T4 / VIJ-41: Facts-grounded AI coaching

1. Define **Layer A facts JSON schema** (Zod); server builds facts from DB only.
2. Gemini step: **narrative only**; prompt lists facts as input; structured output = `{ narrative, cited_fact_ids[] }` validation.
3. Update `docs/COACHING-TONE.md` with expert examples + “no new numbers” rule.
4. Wire advisory or new coaching panel to facts-backed path; feature-flag if needed.

---

## 8. Acceptance criteria

### T1 — Transaction surface + API (VIJ-38)

- [ ] Authenticated user can open **Transactions** and see **paginated** rows for their data only.
- [ ] `GET /api/transactions` supports at least: **date range**, **statement_id** filter, **category**, **type**, **search substring** on description, **sort** by date desc.
- [ ] Response includes **statement nickname/institution** for each row (via join or batch).
- [ ] **401** unauthenticated; **400** invalid params; **no** unbounded result set.
- [ ] `merchant_key` populated for **new** inserts; backfill documented for old rows.
- [ ] PostHog: `transactions_view_opened` (single emission source agreed in implementation).

### T2 — Unified scope (VIJ-39)

- [ ] User can set **global date range** + **which statements** included; Overview reflects that scope.
- [ ] Transactions and Overview **use the same scope parameters** (no hidden mismatch).
- [ ] Perceived vs actual display follows **§2 Decision record** (blended actual + single perceived baseline **or** explicit PM override documented).

### T3 — Merchant rollups + coupling (VIJ-40)

- [ ] Insights shows **top merchants** (threshold + limit) for current scope.
- [ ] Tapping a merchant navigates to Transactions with filters applied and **matching rows** shown.
- [ ] Category/merchant totals **reconcile** to transaction sums within **₹1** rounding tolerance (paisa-aware).

### T4 — Facts-grounded AI (VIJ-41)

- [ ] Server exposes **Layer A facts** object per coaching response; **all** rupee figures in UI trace to facts or DB fields.
- [ ] Gemini output **validated**; if validation fails, show safe fallback copy (no invented numbers).
- [ ] `docs/COACHING-TONE.md` updated with **expert examples** and generative guardrails.

### T5 — Deferred (IA + growth)

- [ ] URL-backed primary tabs / shareable dashboard state (spec only until un-deferred).

### T6 — Deferred (Compare months + hygiene)

- [ ] Month-over-month comparison view + data hygiene (spec only until un-deferred).

---

## 9. Risks

| Risk                           | Mitigation                                                                             |
| ------------------------------ | -------------------------------------------------------------------------------------- |
| PDF/issuer variance            | Transactions show **parsed** rows; copy avoids “matches PDF line-by-line” unless true. |
| Merchant normalization quality | Heuristics v1 + iterate; optional Gemini assist **after** metrics.                     |
| Perf regression                | Indexes, limits, explain-analyze, no N+1.                                              |
| Regulatory / tone              | Facts-only numerics; COACHING-TONE + legal disclaimer patterns from existing doc.      |
| Scope creep                    | T5–T6 explicitly deferred; PRD decisions in §2.                                        |

---

## 10. Next step

Run **`/execute-plan`** starting with **VIJ-38 / T1** (transactions API + UI + schema). After plan approval, run **`/linear-sync plan`** to sync PRD + child tasks to Linear (mandatory checkpoint per repo protocol).
