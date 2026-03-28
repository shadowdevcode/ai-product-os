# Prompt Library

This document stores reusable prompt patterns discovered through postmortems and experiments.

Agents should consult this file before generating outputs.

---

# Product Planning Prompts

## PRD generation template

When creating a product specification use this structure:

Problem
User
Opportunity
Success Metric
Constraints
MVP Scope

---

# Architecture Prompts

## System design prompt

When designing backend architecture always include:

system components
data flow
API structure
database schema
scaling considerations

---

# Code Generation Prompts

## Implementation rules

When generating implementation code:

follow coding-standards.md
avoid unnecessary abstraction
write readable functions
add comments explaining logic

---

# Review Prompts

## Code review checklist

When reviewing code check:

logic correctness
performance
security
maintainability

---

# Postmortem Learnings

Append system learnings here.

Format:

date
issue
root cause
system improvement

---

## 2026-03-07 — issue-002: Gmail Summary to WhatsApp Notifier

issue: Three systemic failures — unbounded pagination, missing telemetry, and synchronous batch cron
root cause: Architecture plans lacked explicit constraints on data fetching, fan-out patterns for cron jobs, and upfront telemetry requirements
system improvement:

- All data sync loops must declare page limit and date bound before any other logic
- All cron jobs that process N users must use a fan-out trigger pattern — master cron dispatches, never processes
- Telemetry events must be defined in the plan and implemented during feature build, not added post-QA
- Error handling for third-party APIs must classify errors before acting on them — transient vs permanent
- Database schema existence must be verified in deploy-check before any build validation begins
- Data pipelines must implement dead-letter tracking or failure limits per item to prevent poison-pill infinite loops
- Automated fallback/error notifications to users must include strict frequency caps to prevent spam during outages

---

## 2026-03-08 — issue-003: AI Personal Finance Advisor

issue: Serverless API terminations, Thundering Herd cron patterns, and fragile conversational UX.
root cause: Execution failed to account for Vercel's immediate suspension of unawaited background tasks, cron loops defaulted to sequential DB queries instead of concurrent bulk handling, and the conversational webhook failed to handle media payloads or 'zero' amounts.
system improvement:

- Serverless API routes must explicitly `await` external async calls (like WhatsApp dispatches) before completing the HTTP response.
- Cron jobs must implement Batch fetching (`IN` statements) and concurrent mapping (`Promise.allSettled`) to avoid N+1 query structures.
- Webhooks dealing with unstructured messages must explicitly implement logic blocks for unexpected media types (images/audio) and boundary text values (zero/negatives).
- Peer Review Agent must proactively generate an "Adversarial Edge Case List" detailing non-standard inputs for all user-facing systems.

---

## 2026-03-11 — issue-004: Project Clarity (PM To-Do List MVP)

issue: Brittle AI parsing, unbounded list queries, optimistic UI without backend persistence, and data loss on AI timeouts.
root cause: Naive trust in AI response formatting, MVP shortcutting on database limits and state persistence, and absent fallback design for synchronous external calls.
system improvement:

- Always strip/sanitize markdown codeblocks from AI responses before running `JSON.parse()`.
- Enforce `.limit()` clauses on every database list query.
- Never ship an optimistic UI change without an implemented and tested backend persistence (`PUT`/`PATCH`/`DELETE`) endpoint.
- Provide a "Fallback State" (save raw input with default labels) to guarantee zero data loss if downstream AI processing fails or times out.
- Ensure Telemetry SDKs are implemented alongside feature development, not added after QA testing.

---

## 2026-03-19 — issue-005: SMB Feature Bundling Engine

issue: Architecture under-specification propagated 5 systemic issues downstream — rate limiting, sessionId ordering, Gemini timeout, clipboard fallback, and error-path telemetry all caught at review or later.
root cause: backend-architect-agent lacked a mandatory checklist for serverless + paid-API constraints. peer-review-agent Prompt Autopsy produced directional suggestions instead of exact file/section/text changes. execute-plan command only required success-path telemetry implicitly.
system improvement:

- All architecture specs with unauthenticated paid-API endpoints must include a rate limiting strategy before outputting (blocking requirement).
- All architecture specs using a sessionId across analytics + API + DB must specify: generate sessionId before all downstream operations.
- All architecture specs with external AI calls on Vercel must specify: AbortController ≤ 9s, return JSON 504 on timeout.
- All clipboard copy interactions must implement: navigator.clipboard primary → document.execCommand fallback → visible inline error if both fail.
- execute-plan must wire PostHog events on ALL API route branches (success, timeout, parse failure, rate limit) — not just success paths.
- Peer Review Prompt Autopsy must produce exact file + section + text additions, not directional suggestions.

---

## 2026-03-21 — issue-006: Ozi Reorder Experiment

issue: 7 systemic issues — unprotected worker, double event emission, URL ID fidelity, simulation idempotency, PostHog worker resilience, recurring README gap, recurring error-path telemetry gap.
root cause: Architecture under-specification continued from prior cycles (auth, URL lookup, simulation idempotency). Two recurring failures (README, error-path telemetry) persisted despite prior cycle fixes because upstream instructions lacked sufficient specificity.
system improvement:

- All API routes that write to experiment tables must specify auth mechanism by name in the architecture spec. "Internal" is not an auth mechanism.
- Each PostHog event has exactly one canonical emission point — server OR client, never both. North Star events fired server-side must not be re-fired client-side.
- URL entity ID parameters must be used as the primary DB lookup key. Architecture spec must define exact query (table + WHERE clause) for every entity ID URL.
- Simulation tools that fire write-once PostHog events must be idempotent across page refreshes — require both localStorage keying and DB ON CONFLICT DO NOTHING.
- PostHog calls in workers must use Promise.allSettled with per-call .catch(). Telemetry failure must never cause worker HTTP 500.
- README.md and .env.local.example are execute-plan deliverables, not deploy-check fixes. Env vars added in fix cycles must update .env.local.example in the same commit.
- Error-path telemetry (per-user failure event, cron_run_completed, experiment lifecycle events) is a blocking execute-plan requirement — not a production-only enhancement.

---

## 2026-03-28 — issue-008: Nykaa Hyper-Personalized Style Concierge

issue: 4 systemic issues — PostHog in hot path corrupting experiment data, A/B salt and cohort label exposure, frontend defensive programming gaps, North Star metric unmeasurable due to missing UI flow.
root cause: Backend lacked telemetry isolation rules for serverless latency-sensitive routes. Security defaults allowed NEXT*PUBLIC* for shared config without checking sensitivity. Frontend prioritized completion over defensive programming. Product spec defined aspirational metrics without grounding them in the implementation scope.
system improvement:

- PostHog captureServerEvent in user-facing API routes must be fire-and-forget (no await, .catch(() => {})). Admin/cron routes may await. This prevents external telemetry latency from corrupting experiment measurements via false client-side timeouts.
- A/B experiment salts must be server-only env vars (never NEXT*PUBLIC*). Control group API responses must return a neutral label ("default"), never the real cohort string. The true cohort is captured server-side in PostHog only.
- All JSON.parse calls on localStorage/sessionStorage must be wrapped in try/catch. All fetch calls triggered by user input (search, filter) must use AbortController to prevent race conditions.
- Every success metric in a product spec must have a "Metric → Flow Mapping" table confirming the required user action, UI component, and API endpoint exist within the committed MVP scope. Unmeasurable metrics must be descoped or the MVP expanded before /create-plan exits.
