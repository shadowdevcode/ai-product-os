# Plan 011 — MoneyMirror Phase 4: Merchant-native visibility, proactive coaching, growth readiness

**Issue:** 011  
**Project:** MoneyMirror (`apps/money-mirror`)  
**Linear:** Parent **VIJ-43**; child epics **VIJ-44** (P4-A), **VIJ-45** (P4-E), **VIJ-46** (P4-G), **VIJ-47** (P4-F), **VIJ-48** (P4-D), **VIJ-49** (P4-B), **VIJ-51** (P4-C), **VIJ-50** (P4-H). [Plan snapshot](https://linear.app/vijaypmworkspace/document/issue-011-plan-snapshot-f8ddb7ff33ef). Prior Phase 3 cycle: **VIJ-37** (issue-010) complete.  
**Stage:** plan  
**Status:** approved for execution (start **P4-A / VIJ-44**)  
**Date:** 2026-04-06

---

## 1. Plan summary

Phase 4 completes the MoneyMirror wedge for India: **statement-native truth** at **merchant and UPI-handle** granularity, **deterministic bad-pattern** signals in the advisory engine, **monetization and Product Hunt** readiness, **proactive channels** (email first; WhatsApp spike parallel), **ingestion trust** for heavy testers, optional **facts-only chat**, and **hardening** (per-user rate limits on heavy reads, Gemini HTTP-abort follow-ups). Phase 3 delivered unified scope, transactions, merchant rollups, and facts-grounded coaching; Phase 4 **extends** those surfaces without relaxing **ownership checks**, **facts-only numerics** for generative copy, or **single emission source** for PostHog.

**Canonical stack (unchanged):** Next.js 16 App Router, Neon Auth (email OTP), Neon Postgres, Gemini 2.5 Flash, Resend, PostHog (`POSTHOG_KEY` / `POSTHOG_HOST` server-side), Sentry. Server-enforced ownership in route handlers (not RLS).

**Epic execution order:** **P4-A → P4-E → P4-G → P4-F → P4-D → P4-B → P4-C → P4-H** (see [exploration-011.md](../exploration/exploration-011.md)).

---

## 2. Product specification (Product Agent)

### Product goal

Increase **trust**, **depth of engagement** (transactions, insights, advisories), and **repeat statement upload** (North Star proxy continuity from issue-009/010) by making **where money went** legible at **merchant / UPI** level, surfacing **high-signal leaks** (micro-UPI, recurring, CC min-due), and establishing a **paid / launch** story without hallucinated amounts.

### Target user

- **Primary:** Gen Z Indians (₹20K–₹80K/month), UPI-native, multi-account, bank + credit card PDF uploads.
- **Secondary:** PM/owner — Linear parent **VIJ-43** + epics **P4-A–P4-H**; production hygiene per [production-launch-checklist-010.md](../results/production-launch-checklist-010.md).

### User journey (Phase 4 highlights)

1. **Dashboard** — User sees merchant/UPI-aware labels (and optional rename) consistent across Overview, Transactions, Insights.
2. **Insights / feed** — New **bad-pattern** advisories (micro-UPI, recurring noise, CC risk) with tap-through to **scoped** Transactions.
3. **Upgrade / paywall** — After Mirror moment or key value action, user may see **upgrade intent** or paywall UI (experiment slice; payment integration scoped in manifest).
4. **IA** — URL-backed tab selection and **month-over-month** compare (deferred Phase 3 T5–T6) ship as **P4-F**.
5. **Proactive** — Richer weekly recap; optional **WhatsApp** opt-in + sandbox; optional **web push** for high-signal alerts.
6. **Ingestion** — Queue/retry UX and golden-PDF regression for trust at scale.
7. **Chat (optional)** — User asks questions; answers cite **Layer A facts + bounded txn context** only.
8. **Hardening** — Heavy APIs rate-limited per user; Gemini calls per existing timeout/abort policy.

### Epic map — MVP vs out of scope

| Epic     | In scope                                                                                                                                                                                              | Out of scope (explicit)                                                        |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| **P4-A** | UPI handle extraction/display; `user_merchant_aliases` (rename map); optional async Gemini **re-label** with persisted audit (`merchant_key` → suggested label, confidence); reduce “other” dominance | Real-time bank/SMS aggregation; blocking parse on Gemini                       |
| **P4-E** | Micro-UPI totals, recurring pattern, CC min-due / risk flags in `advisory-engine.ts`; new triggers + tap-through                                                                                      | Investment product recommendations; non-deterministic thresholds without tests |
| **P4-G** | Pricing hypothesis; paywall **prompt** / entitlements flag; Product Hunt checklist + landing hooks                                                                                                    | Full payment provider integration unless scoped in execute-plan slice          |
| **P4-F** | URL-backed primary tabs / shareable `?tab=`; month-over-month compare view + copy                                                                                                                     | Desktop-only polish beyond mobile-first PWA                                    |
| **P4-D** | Richer Resend templates; WhatsApp **spike** (sandbox, opt-in); web push **optional** behind permission UX                                                                                             | Full TRAI/compliance program; bulk SMS                                         |
| **P4-B** | Upload queue UX; limits policy clarity; golden PDF fixtures + CI/regression hook                                                                                                                      | Unlimited uploads bypassing abuse controls                                     |
| **P4-C** | `POST /api/chat` (or similar) grounded in `buildLayerAFacts` + txn subset; rate limit; citations UI                                                                                                   | Open-ended chat over raw PDF text; client-only “answers”                       |
| **P4-H** | Per-user rate limits on authenticated heavy `GET`s; document/follow-up true HTTP abort for Gemini                                                                                                     | Global DDoS edge product                                                       |

### Decision records (lock before UI freeze)

1. **UPI identity** — Extract **VPA/handle** to a dedicated column **`transactions.upi_handle TEXT`** (nullable) when parse/description matches UPI patterns; keep `description` raw. Display uses **alias map** → enriched label → `merchant_key` → description.
2. **Merchant rename** — **User wins:** `user_merchant_aliases (user_id, merchant_key UNIQUE, display_label)` overrides display everywhere rollups read labels.
3. **Gemini re-label** — **Never on critical path** for upload; batch/cron or on-demand enrichment writes to **`merchant_label_suggestions`** (or merges into alias after user confirm). Store `source`, `confidence`, `model`, `created_at` for audit.
4. **Paywall** — First slice = **feature flag + server entitlements column** on `profiles` OR separate `entitlements` table; full Stripe/Razorpay deferred unless PM expands scope in execute-plan.
5. **Chat context** — Server sends **Layer A JSON** + **limited txn list** (cap count + date range); prompt forbids new numbers; validate structured output like existing coaching narrative path.

### Success metrics and Metric → flow → telemetry

| Success metric                                  | User flow (where measured)                                     | Telemetry (single source)                                                                                         |
| ----------------------------------------------- | -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| North Star proxy — repeat statement upload ≤60d | Second successful upload after first                           | Existing `statement_parse_success` + cohort in `/metric-plan` (finalize in metric-plan stage)                     |
| Merchant clarity engagement                     | User opens Insights merchant row or Transactions from merchant | `merchant_rollup_clicked` (existing)                                                                              |
| Bad-pattern usefulness                          | User taps new advisory card → Transactions                     | `bad_pattern_advisory_shown`, `bad_pattern_advisory_clicked` (server or client; **one** source pair)              |
| Upgrade intent                                  | User sees paywall prompt after Mirror / key action             | `paywall_prompt_seen`, `upgrade_intent_tapped`                                                                    |
| Chat adoption                                   | User sends chat message                                        | `chat_query_submitted`, `chat_response_rendered`                                                                  |
| Proactive reach                                 | User opens recap email / WhatsApp / push                       | `weekly_recap_email_sent` (existing); add `whatsapp_opt_in_completed`, `push_subscription_granted` if implemented |
| API abuse resistance                            | Heavy dashboard loads                                          | `rate_limit_hit` (existing pattern) on throttled routes                                                           |

---

## 3. UX design (Design Agent)

### Information architecture

- **Dashboard** — Preserve **ScopeBar**; ensure merchant labels and UPI handles appear in **Transactions** rows, **Merchant rollups**, and **Overview** where merchant text is shown.
- **P4-F** — **URL-synced** primary tab (`?tab=overview|transactions|insights`) and deep links; **Compare** subview or toggle for month-vs-month with clear scope copy.
- **P4-C** — Chat as **drawer or bottom sheet** on mobile; **citations** list (fact ids + txn refs); **rate limit** messaging.

### User flows

1. **Rename merchant** — Insights or merchant row → “Rename” → modal → save → `POST /api/.../merchant-alias` → immediate UI update; optional “Use suggestion” if Gemini suggestion exists.
2. **Bad-pattern advisory** — Feed card → tap “Review transactions” → Transactions with **query preset** (filters for micro-UPI or merchant_key); **AbortController** on fetch per [ui-standards](../../knowledge/ui-standards.md).
3. **Paywall prompt** — Shown after defined trigger (e.g. Mirror card viewed); dismiss or upgrade CTA; **try/catch** on any local persistence.

### UI components (extend)

- **Txn row** — Show `upi_handle` chip and effective **display label** (alias > suggestion > merchant_key).
- **MerchantRollups** — Use resolved label; show “Other” reduction only when backed by data.
- **AdvisoryFeed** — New card variants for P4-E triggers; loading/error states.
- **ChatPanel** — Message list, input, citation accordion, daily limit banner.

### Accessibility

- Focus traps in modals; aria labels on merchant rename and chat send.

---

## 4. System architecture (Backend Architect Agent)

### Overview

- **Monolith** `apps/money-mirror` — new routes under `src/app/api/`; libraries under `src/lib/`.
- **Auth** — `getSessionUser()` on every new endpoint; **no** trusting body `userId`.
- **Merchant pipeline** — Extend [merchant-normalize.ts](../../apps/money-mirror/src/lib/merchant-normalize.ts), [persist-statement](../../apps/money-mirror/src/app/api/statement/parse/) path; optional **`/api/cron/merchant-enrich`** or internal job after upload.
- **Advisories** — Extend [advisory-engine.ts](../../apps/money-mirror/src/lib/advisory-engine.ts) with deterministic SQL aggregates for micro-UPI bands, recurring detection, CC min-due vs income (reuse statement/card fields).
- **Chat** — New route: load facts via existing **Layer A** builder; attach **redacted** txn list; Gemini structured answer + citations; **≤9s** timeout aligned with engineering lessons.
- **Proactive** — Extend weekly recap worker and templates under existing cron patterns; WhatsApp via HTTP API stub (**env-gated**).
- **Rate limits** — Middleware or per-route **token bucket** keyed by `user_id` for listed `GET` routes (P4-H).

### API surface (conceptual)

| Method   | Path                                            | Purpose                                                |
| -------- | ----------------------------------------------- | ------------------------------------------------------ |
| GET/POST | `/api/merchant-alias` or `/api/merchants/alias` | CRUD user alias for `merchant_key`                     |
| POST     | `/api/merchants/suggest-accept`                 | Optional accept Gemini suggestion                      |
| GET      | `/api/dashboard` (extend)                       | Include resolved merchant display names where relevant |
| POST     | `/api/chat`                                     | Facts-grounded chat turn                               |
| POST     | `/api/webhooks/whatsapp`                        | Stub/inbound if spike needs it                         |
| GET      | `/api/compare-months`                           | MoM aggregates for P4-F (or folded into dashboard)     |

**Telemetry:** Fire-and-forget PostHog; no `await flush` on user-facing routes.

### Data flow

1. Parse path sets `merchant_key`, **`upi_handle`** when detected.
2. Rollups **JOIN** `user_merchant_aliases` for display label.
3. Advisory engine runs **after** txn load; inserts into `advisory_feed` with new `trigger` enum values (document in code).

### Infrastructure

- Neon only; migrations via `schema.sql` + idempotent ALTERs; align with [schema-upgrades](../../apps/money-mirror/src/lib/schema-upgrades.ts).

---

## 5. Database schema (Database Architect Agent)

**DB:** Neon Postgres (existing).

### New / changed objects

| Object                       | Purpose                                                                                                                                |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `transactions.upi_handle`    | Nullable TEXT; extracted VPA/handle for display and rollup subgrouping                                                                 |
| `user_merchant_aliases`      | `(user_id, merchant_key)` PK or UNIQUE; `display_label TEXT NOT NULL`; `updated_at`                                                    |
| `merchant_label_suggestions` | Optional: `user_id`, `merchant_key`, `suggested_label`, `confidence NUMERIC`, `source TEXT`, `created_at`; partial unique per user+key |
| `profiles`                   | Optional: `entitlements JSONB` or `plan TEXT` for paywall MVP                                                                          |
| Indexes                      | `(user_id, upi_handle)` partial WHERE NOT NULL; alias FK/index on `user_id`                                                            |

### Relationships

- Unchanged: `transactions.statement_id` → `statements.id`; all queries scoped by `user_id`.

---

## 6. Analytics (Analytics Framework alignment)

- New events listed in `manifest-011.json` **`posthog_events`** array.
- **Single emission source** per business event (CLAUDE anti-pattern §9).
- Workers/cron: error-path + completion events per existing patterns.

---

## 7. Implementation tasks

See [manifest-011.json](manifest-011.json) for phased tasks, dependencies, verification commands, and Linear epic mapping.

---

## 8. Acceptance criteria (by epic)

### P4-A — Merchant + UPI visibility v2

- [ ] `transactions.upi_handle` populated where parse detects UPI/VPA; migration in `schema.sql` + upgrades path.
- [ ] UI shows handle and/or resolved **display label** on txn rows and merchant rollups.
- [ ] User can **rename** a `merchant_key`; persisted in `user_merchant_aliases`; rollups and Transactions use it.
- [ ] Optional Gemini re-label **does not block** parse; suggestions stored with audit fields; user can accept/reject.
- [ ] PostHog: `merchant_alias_saved`, `merchant_suggestion_accepted` (if suggestions ship) — single source each.

### P4-E — Bad-pattern detection

- [ ] At least **three** new deterministic signals (e.g. micro-UPI month total, recurring noise, CC min-due risk) with tests.
- [ ] New advisories appear in feed with **tap-through** to Transactions + matching filters.
- [ ] `bad_pattern_advisory_*` events wired per metric table.

### P4-G — Monetization + Product Hunt

- [ ] Paywall **prompt** or gating behind `plan`/`entitlements` with safe default (all current users grandfathered).
- [ ] `paywall_prompt_seen` / `upgrade_intent_tapped` emitted per spec.
- [ ] Product Hunt checklist references landing, demo asset hooks — doc or README section.

### P4-F — Deferred T5–T6 (Phase 3 backlog)

- [ ] **URL-backed** dashboard tabs (`?tab=` sync + shareable state).
- [ ] **Month-over-month** compare for scope-aligned totals (with paisa rounding rules documented).

### P4-D — Proactive + channels

- [ ] Richer **email** recap content (within Resend limits); no PII leakage in logs.
- [ ] WhatsApp: **opt-in** + sandbox send OR documented stub with env flag **off** in prod default.
- [ ] Web push: optional; permission UX only if implemented.

### P4-B — Ingestion scale + trust

- [ ] Upload **queue** or retry UX when parse fails/times out; user-visible status.
- [ ] **Golden PDF** fixtures in repo + test or CI step documented in README.

### P4-C — Conversational coach (facts-only)

- [ ] Chat API returns answers **only** from facts + bounded txn evidence; structured validation; coaching tone per [COACHING-TONE.md](../../apps/money-mirror/docs/COACHING-TONE.md).
- [ ] Daily rate limit per user; 429 with clear message.

### P4-H — Hardening

- [ ] Per-user rate limits on agreed heavy `GET` routes (list in execute-plan).
- [ ] Gemini: follow-up issue or inline note for true HTTP **AbortController** if still missing.

---

## 9. Risks

| Risk                         | Mitigation                                       |
| ---------------------------- | ------------------------------------------------ |
| Gemini re-label latency/cost | Async only; batch; cache suggestions             |
| WhatsApp vendor delay        | Email first; sandbox spike; opt-in               |
| Chat token cost              | Rate limits; small context; facts-only           |
| Paywall backlash             | Grandfather existing users; soft prompt first    |
| Parser regression            | Golden PDFs; no issuer change without fixture    |
| Regulatory / tone            | COACHING-TONE + disclaimers on chat and WhatsApp |

---

## 10. Next step

Run **`/execute-plan`** starting with **P4-A** (see manifest). Then **`/linear-sync plan`** (mandatory checkpoint) to sync PRD + child epics to Linear **VIJ-43** project.
