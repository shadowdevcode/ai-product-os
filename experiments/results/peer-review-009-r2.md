# Peer Review Round 2: MoneyMirror (issue-009)

**Date:** 2026-04-02  
**Agent:** Peer Review Agent (Round 2 — re-review after fixes)  
**Status:** APPROVED — all prior blockers fixed  
**Input:** Updated implementation (`apps/money-mirror/`), `peer-review-009.md`, `plan-009.md`

---

## Prior Findings — Verification

### ✅ A1 — Dashboard rehydration path added

`apps/money-mirror/src/app/api/dashboard/route.ts` now provides the planned authenticated dashboard read path, and `apps/money-mirror/src/app/dashboard/page.tsx` hydrates from persisted DB state on first load. Refreshes and weekly recap deep links now reconstruct the latest processed mirror instead of dropping users back into a blank upload state.

### ✅ R1 — Parse persistence is now fail-closed

`apps/money-mirror/src/app/api/statement/parse/route.ts` now:

- reads onboarding spend from `profiles.id` instead of a non-existent `user_id` column
- inserts `statements` as `processing`
- aborts with 500 if `transactions` insert fails
- deletes the parent row on failure
- marks the statement `processed` only after child rows persist
- emits success telemetry only after the full write succeeds

This removes the partial-write corruption path.

### ✅ R2 — Weekly recap failure accounting is now truthful

`apps/money-mirror/src/app/api/cron/weekly-recap/worker/route.ts` returns HTTP 502 on email-send failure, and `apps/money-mirror/src/app/api/cron/weekly-recap/route.ts` rejects unsuccessful worker responses before counting success. `weekly_recap_completed` now reflects real delivery outcomes.

### ✅ P1 — Coaching feed now renders in the core flow

The dashboard no longer calls the authenticated advisories route without auth. The post-upload path reuses the authenticated `/api/dashboard` response, so advisories arrive with the rest of the mirror data and the "Truth Bombs" section can render correctly.

### ✅ A2 — Weekly recap coverage no longer stops at the first 1000 rows

`apps/money-mirror/src/app/api/cron/weekly-recap/route.ts` now paginates through processed statements in 1000-row batches and deduplicates user IDs across the full eligible set before fan-out.

---

## Challenge Mode — Assumption Audit (Round 2)

### Assumption 1: "Lazy clients and build-safe route setup could mask runtime config problems"

**Why it might be risky:** Moving Supabase and Resend initialization out of module scope fixes build stability, but a bad deployment could now fail only at request time.

**Counterargument strength:** Strong. Runtime failure is the correct failure mode for missing secrets in a dynamic route. The build now validates the app shape without requiring production credentials, while request handlers still throw if configuration is absent.

### Assumption 2: "Dashboard hydration by latest statement is sufficient for the MVP"

**Why it might be risky:** A user with multiple uploaded statements may expect explicit history selection rather than implicit "latest statement" behavior.

**Counterargument strength:** Strong. The current plan only requires a persisted dashboard, not a statement history browser. The new route also accepts `statement_id`, which gives a clean extension path without blocking the MVP.

### Assumption 3: "Deleting the parent statement on transaction failure is acceptable"

**Why it might be risky:** A delete-on-failure strategy can hide evidence of failed parse attempts if auditability is needed later.

**Counterargument strength:** Strong. For this product phase, correctness of saved user-facing financial data matters more than retaining broken partial rows. The route still emits failure telemetry, which is the right audit trail for MVP.

---

## Multi-Perspective Challenge (Round 2)

### 1. Reliability Engineer — "What breaks at 3am?"

No blocking reliability issue remains in the peer-reviewed paths. The parse flow is now fail-closed, recap metrics match actual worker outcomes, and build-safe client initialization removes the prior deploy-time crash path.

### 2. Adversarial User / Confused User — "How does a real person break this?"

No blocking issue remains in the reviewed flows. A user can now refresh `/dashboard` or arrive from the recap email and still see persisted mirror data instead of being forced into duplicate uploads.

### 3. Future Maintainer — "What will confuse the next engineer?"

No blocking issue remains. The implementation now aligns with the planned route surface: `/api/dashboard` exists, dashboard hydration is explicit, and the worker/master contract for recap failures is coherent.

---

## Lens 1: Architecture & Scalability

No blocking issues.

The architecture now matches the product plan materially better:

- persisted authenticated dashboard read path exists
- dashboard rehydrates from DB, not from ephemeral client memory
- recap fan-out paginates instead of silently truncating at 1000 rows

---

## Lens 2: Edge Cases, Security & Reliability

No blocking issues.

Validated improvements:

- no false parse success on incomplete writes
- no stale `processed` parent rows without transactions
- no false-positive recap success counts on failed emails
- build-safe route initialization for missing env vars at compile time

---

## Lens 3: Product Coherence & PM Alignment

No blocking issues.

The core product loop now behaves as promised:

- upload → persisted mirror
- refresh/deep-link → same persisted mirror
- coaching feed shows in the primary dashboard experience
- recap email CTA lands on a meaningful dashboard state

---

## Prompt Autopsy Check

No new prompt gaps beyond the ones already captured in `peer-review-009.md`. The fixes validated those proposed rule additions rather than surfacing a new class of failure.

---

## Verdict

**APPROVED.**

Validation:

- `npm test` — PASS
- `npm run build` — PASS
