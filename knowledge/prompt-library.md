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
