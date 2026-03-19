# Postmortem: Issue-005 — SMB Feature Bundling Engine

**Command**: /postmortem
**Date**: 2026-03-19
**Pipeline span**: /create-issue → /deploy-check (same day)

---

## Issue Inventory

---

### PM-1 — Rate Limiting Deferred Across Three Stages

**Observed at**: /review (S1 flagged), /peer-review (escalated to REQUIRED), fixed at /peer-review

**Root cause**: backend-architect-agent never identified cost-surface exposure as a risk category. No prompt instruction required it to specify a rate limiting strategy for unauthenticated endpoints calling paid external APIs.

**Preventative Rule**: Any architecture spec that includes an unauthenticated endpoint calling a paid external API must include a rate limiting strategy. This is a blocking architecture requirement.

---

### PM-2 — SessionId Tied to DB Success

**Observed at**: /peer-review (RR1 MUST-FIX)

**Root cause**: Architecture spec specified the `bundle_sessions` table and sessionId field but gave no ordering constraint. Engineer generated sessionId after DB insert. If Neon was unavailable, sessionId = "unknown" — poisoning PostHog and causing 400s on PATCH.

**Preventative Rule**: When a sessionId is used across analytics, API routes, and DB, the architecture spec must state: "Generate sessionId before all downstream operations so it is stable regardless of DB or service failures."

---

### PM-3 — No Gemini Timeout Specified in Architecture

**Observed at**: /peer-review (RR2 MUST-FIX)

**Root cause**: backend-architect-agent mentioned "API latency" as a risk but did not mandate a concrete timeout for Vercel's serverless environment. Vercel hard-kills functions at 10s returning HTML, which the client parsed as JSON and threw as "Network error."

**Preventative Rule**: All architecture specs with external AI API calls on Vercel must include: "Wrap in Promise.race with AbortController at 9s. Return JSON 504 on timeout — never let Vercel's HTML error page reach the client."

---

### PM-4 — Silent Clipboard Failure in Core Use Case

**Observed at**: /qa-test (QA1 HIGH — required fix)

**Root cause**: No frontend standard required a fallback + error state for clipboard operations. Engineer implemented happy path only.

**Preventative Rule**: Any clipboard copy interaction must implement: (1) navigator.clipboard.writeText() primary, (2) document.execCommand('copy') fallback, (3) visible inline error state if both fail. Silent catch blocks on user-facing actions are never acceptable.

---

### PM-5 — Error-Path Telemetry Missing Until Deploy-Check

**Observed at**: /metric-plan (gaps identified), /deploy-check (still missing, added)

**Root cause**: The CLAUDE.md rule ("Implement telemetry during feature development, not post-QA") was applied only to success-path events. Error-path events were treated as analytics concerns rather than implementation requirements. Additionally, PostHogProvider had `capture_pageview: false` (intentional) but no manual `landing_page_viewed` capture existed — metric plan assumed auto-capture.

**Preventative Rule**: During /execute-plan, every API route error path (catch blocks, timeout branches, rate-limit branches) must include a PostHog event. The metric plan verifies events — it does not define which ones exist.

---

## System Improvements

| Improvement | Target | Priority |
|---|---|---|
| Add Vercel timeout constraint to architecture spec | backend-architect-agent.md | Critical |
| Add sessionId ordering rule to architecture spec | backend-architect-agent.md | Critical |
| Add rate limiting requirement for paid API endpoints | backend-architect-agent.md | Critical |
| Add clipboard fallback standard | coding-standards.md | High |
| Add error-path telemetry requirement | execute-plan command | High |
| Add pageview capture verification step | metric-plan command | Medium |

---

## Knowledge Updates

- `knowledge/engineering-lessons.md` — 3 new rules (PM-1, PM-2, PM-3)
- `knowledge/coding-standards.md` — 1 new rule (PM-4)
- `agents/backend-architect-agent.md` — Mandatory Pre-Approval Checklist (Prompt Autopsy)
- `agents/peer-review-agent.md` — Step 4 exactness requirement (Prompt Autopsy)

---

## Prompt Autopsy

---

### Agent: `backend-architect-agent`

**What it missed**: Three architecture-level requirements caught only at peer-review (2–3 stages late):
1. No rate limiting for unauthenticated endpoint calling Gemini
2. No ordering constraint on sessionId generation relative to DB
3. No Vercel timeout constraint on Gemini call

**Root cause in prompt**: `## 6 Technical Risks` uses vague examples. The Anti-Sycophancy 10x traffic question doesn't surface cost-abuse (100 bot requests ≠ 10x load). No checklist exists for serverless + paid-API constraints.

**Proposed fix** — add to `agents/backend-architect-agent.md` under `## 6 Technical Risks`:

```
## Mandatory Pre-Approval Checklist (Serverless + AI)

Before finalizing the architecture, answer all of the following. Any gap must
be fixed in the spec before outputting.

1. Paid API exposure: Does any unauthenticated endpoint call a paid external API
   (Gemini, OpenAI, Twilio, Stripe, etc.)?
   → If yes: specify rate limiting strategy (e.g., 5 req/60s per IP, in-memory Map).
   → This is a blocking architecture requirement, not a post-review improvement.

2. Vercel timeout: Does any API route call an external AI model?
   → If yes: specify "Wrap in Promise.race with AbortController at ≤ 9s.
   Return JSON 504 on timeout — never expose Vercel's HTML error page to client."

3. SessionId / correlation ID ordering: Is there a sessionId used across
   analytics, API routes, and DB?
   → If yes: specify "Generate sessionId (crypto.randomUUID()) before all
   downstream operations. Never derive it from DB return values."
```

---

### Agent: `peer-review-agent`

**What it missed**: Challenge Mode Step 4 (Prompt Autopsy Check) produced directional suggestions ("add: AbortController timeout rule") but not exact text additions to specific files. Learning only flows through if /learning correctly translates vague directions into concrete changes.

**Root cause in prompt**: Step 4 says "Report these as: `Agent Prompt Improvements`" but doesn't require exact file + section + text. The output is directional, not actionable.

**Proposed fix** — replace Step 4 in `agents/peer-review-agent.md` Challenge Mode:

```
**Step 4 — Prompt Autopsy Check**

For each agent prompt gap identified:
- Name the exact agent file (e.g., agents/backend-architect-agent.md)
- Name the exact section to modify (e.g., ## 6 Technical Risks)
- Write the exact text to add — not a direction, but the actual sentence or rule

Format as:
  File: agents/[agent-name]-agent.md
  Section: [section name]
  Add: "[exact text]"

This output is consumed directly by /learning to update agent files.
Vague directions ("add a timeout rule") are not acceptable outputs.
```

---

### Command: `/execute-plan`

**What it missed**: Error-path PostHog events were not wired during implementation. Happy-path events (bundle_generated, pitch_copied) were implemented. Error catch blocks were written for reliability only, not observability.

**Root cause in prompt**: Execute-plan instructs engineers to implement telemetry but doesn't distinguish happy-path from error-path. Implicit assumption: telemetry = success events.

**Proposed fix** — add to execute-plan command instructions under telemetry section:

```
## Telemetry Completeness Requirement

For every API route calling an external AI service, implement PostHog events
in ALL branches:

- Success path: event with latency_ms + key response properties
- Timeout branch: event with timeout_ms property
- Parse/AI failure branch: event with error_type property
- Rate limit branch: event (no PII)

An API route with partial telemetry is equivalent to no telemetry for funnel
analysis. The metric plan verifies event schema — it does not define which
events exist.
```

---

## Summary Table

| Issue | Caught At | Should Have Been Caught | Stages Late |
|---|---|---|---|
| No rate limiting on paid API | /review | /create-plan (architecture) | 2 |
| SessionId tied to DB success | /peer-review | /create-plan (architecture) | 3 |
| No Gemini timeout | /peer-review | /create-plan (architecture) | 3 |
| Silent clipboard failure | /qa-test | /execute-plan | 1 |
| Error-path telemetry missing | /metric-plan → /deploy-check | /execute-plan | 2–3 |

All 5 systemic issues share a root cause: architecture under-specification propagated downstream until caught by adversarial review. The backend-architect-agent is the highest-leverage fix point — updating its mandatory checklist eliminates 3 of 5 issues at source.
