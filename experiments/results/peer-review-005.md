# Peer Review: Issue-005 — SMB Feature Bundling Engine

**Command**: /peer-review
**Date**: 2026-03-19
**Status**: BLOCKED — 3 Must-Fix items required before QA

---

## Challenge Mode — Assumption Audit

**Assumption 1: "Neon DB write failure is non-critical"**
The implementation silently swallows DB insert failures and proceeds with `sessionId = "unknown"`. This is dangerous because:
- The `pitch_copied` PATCH call will attempt to update `bundle-sessions/unknown/copied` → the UUID regex rejects it → 400, silently failing
- PostHog's `bundle_generated` fires with `distinctId: "unknown"` for every failed session — all events attributed to the same phantom user, poisoning analytics
- `>50% pitch copy rate` is the North Star metric — DB failures make this unmeasurable

**Assumption 2: "A single Gemini call is fast enough (<5s p95)"**
No timeout on the Gemini call. `gemini-2.5-flash` tail latency at p99 can exceed 10s — the Vercel serverless limit. On timeout, the client receives a 504 HTML response. The frontend `await res.json()` throws on HTML, caught as "Network error. Please check your connection" — misleading.

**Assumption 3: "No auth means no abuse surface"**
The `/api/generate-proposal` endpoint is fully open with no rate limiting. Each call makes a Gemini API call (token cost) AND a Neon DB write. 1000 automated requests/hour = real money + junk analytics data.

---

## Three-Perspective Challenge

### Reliability Engineer (3am)

**R1 — No AbortController on Gemini call**
Gemini call has no timeout. Vercel will hard-kill the function at 10s. No JSON error body returned to client.

**R2 — `sessionId = "unknown"` poisons PostHog attribution**
All DB-failure sessions share `distinctId: "unknown"` in PostHog. Funnels become unreliable.

**R3 — PostHog `flushAt: 1` adds per-request latency**
Every event triggers a synchronous network flush. Slow PostHog ingest = slow generation response.

### Adversarial User

**A1 — Open Gemini endpoint (S1 from /review, still unimplemented)**
No rate limiting. Bots can spam at full Gemini token cost.

**A2 — PATCH endpoint has no session expiry**
Any valid UUID (guessed or enumerated) can update `pitch_copied` indefinitely. No TTL on sessions.

**A3 — Clipboard API fails silently on non-HTTPS**
`navigator.clipboard.writeText()` requires secure context. No fallback. Silent failure during live sales call.

### Future Maintainer

**M1 — `price_range_label` can diverge from clamped `monthly_price_inr`**
When Gemini returns a price outside 500–15000, the price is clamped but `price_range_label` keeps the original Gemini string. Stored DB row has inconsistent label vs price.

**M2 — `GoogleGenAI` client instantiated per request**
`new GoogleGenAI({ apiKey })` is called inside `generateProposal()` on every invocation — inconsistent with the singleton pattern used for Neon and PostHog.

**M3 — `_sql` singleton stale on long-running processes**
Fine on Vercel. Traps local `npm run dev` if Neon recycles the connection during development.

---

## Architecture Concerns

**AC1 — Sequential DB + PostHog awaits add ~300ms to every response**
`insertBundleSession` and `trackBundleGenerated` are fully independent but run sequentially after Gemini. Should be parallelised with `Promise.allSettled`.

**AC2 — No explicit CORS policy**
No `Access-Control-Allow-Origin` header. Fragile if ever moved to a different origin.

**AC3 — Feature whitelist inconsistency risk**
`FEATURE_LABELS_WHITELIST` (server) and `FEATURES` (client) are defined separately. A partial update will pass client-side but fail server-side validation silently.

---

## Scalability Risks

**SC1 — No rate limiting = unbounded Gemini cost** (S1 from /review, still open)

**SC2 — `bundle_sessions` table grows unbounded**
No TTL, no archival strategy, no row limit in the schema.

**SC3 — PostHog `flushAt: 1` at scale**
Per-request network call. Acceptable for MVP, needs revisiting under real traffic.

---

## Edge Cases

**EC1 — 504 timeout returns HTML, not JSON**
Client `res.json()` throws on 504 HTML body. Surfaced as "Network error" — misleading.

**EC2 — 10 features selected overwhelms prompt**
Prompt instructs "Reference 2–3 features" but gives no prioritisation guidance with 10 features. Output quality degrades.

**EC3 — Clipboard API failure on non-HTTPS / unpermissioned browser**
No fallback mechanism. Silent copy failure in a live sales demo.

**EC4 — No "Clear All" affordance on Rebuild**
`handleRebuild` preserves `selectedIds`. PM must manually deselect all features for a fresh start. Friction during live calls.

---

## Reliability Risks

**RR1 — MUST-FIX: `sessionId = "unknown"` corrupts analytics**
Generate `crypto.randomUUID()` before DB insert. Use it as the session ID regardless of DB success. PostHog gets a real UUID; PATCH gets a valid UUID that returns 404 (not found) rather than 400 (invalid format).

**RR2 — MUST-FIX: No Gemini timeout**
Add AbortController with 9s timeout. Return `{ error: "Generation timed out. Please try again." }` with status 504 so client shows a meaningful message.

**RR3 — Price clamping creates label/price inconsistency**
When `monthly_price_inr` is clamped, recalculate `price_range_label` from the clamped value rather than storing Gemini's original string.

---

## Product Alignment Issues

**PA1 — "Rebuild Bundle" lacks "Clear All" for live sales use**
Product goal is <2 min from landing to copied pitch including mid-call use. Forcing manual deselection adds friction at the worst moment.

**PA2 — No stale proposal indicator**
Features can be toggled after proposal is shown. No visual cue that the current proposal is out of sync with the current selection.

**PA3 — MUST-FIX: `[First Name]` placeholder is literal in copied pitch**
The email opens with "Hi [First Name],". There is no UI affordance (editable field, highlight, or instruction) to tell the PM to replace it. A PM copying and pasting "Hi [First Name]," directly into WhatsApp will undermine the product's credibility in a live deal context.

---

## Agent Prompt Improvements

| Agent | Issue | Improvement |
|---|---|---|
| `backend-architect-agent` | No Gemini timeout specified | Add: "All AI calls must define AbortController timeout ≤ 9s for Vercel" |
| `backend-architect-agent` | sessionId tied to DB success | Add: "Generate sessionId (crypto.randomUUID()) before DB insert, not after" |
| `frontend-engineer-agent` | Clipboard without fallback | Add: "clipboard.writeText() must have try/catch + execCommand fallback" |
| `backend-architect-agent` | Rate limiting deferred post-review | Add: "Unauthenticated endpoints calling paid APIs must specify rate limiting in architecture spec" |

---

## Verdict

| ID | Severity | Item |
|---|---|---|
| RR1 | MUST-FIX | Pre-generate `crypto.randomUUID()` as sessionId before DB insert |
| RR2 | MUST-FIX | Add AbortController (9s) to Gemini call; return JSON 504 on timeout |
| PA3 | MUST-FIX | Add UI affordance for `[First Name]` placeholder before copy |
| S1 | REQUIRED | Rate limit `/api/generate-proposal` (carried from /review) |
| RR3 | RECOMMENDED | Recalculate `price_range_label` from clamped price |
| PA2 | RECOMMENDED | Stale proposal indicator when features change post-generation |
| A3/EC3 | RECOMMENDED | Clipboard fallback for non-HTTPS contexts |
| EC4 | OPTIONAL | "Clear All" on Rebuild for faster mid-call re-pitching |
