# Project State

## Active Project
- name: SMB Feature Bundling Engine
- repo_path: apps/smb-bundler
- owner: Vijay
- started_on: 2026-03-19
- goal (1 sentence): Enable B2B SaaS PMs to instantly assemble custom feature bundles and generate value-based pricing proposals tailored to Indian SMB buyers.

## Current Stage
- stage: learning
- last_command_run: /learning
- status: completed

## Active Work
- active_branch: main
- last_commit:
- open_pr_link:
- environments: local

## Quality Gates
- review: approved (round 1) — issue-005
- peer_review: approved — all must-fix items resolved (RR1, RR2, PA3, S1)
- qa_test: approved — QA1 (clipboard fallback) fixed
- metric_plan: done — North Star: Pitch Copy Rate (>50%). 3 events to add before deploy-check.
- deploy_check: approved — all 4 telemetry events added, build passes clean

## Pending Queue
- none

## Blockers
- none

## Decisions Log (append-only)
- 2026-03-05: Chose PostgreSQL via Supabase because relational model fits users → digests → processed_emails structure
- 2026-03-05: Chose monolith + cron worker over microservices because MVP speed is the priority
- 2026-03-05: Excluded reply-from-WhatsApp from MVP because it adds OAuth write scope complexity and is not needed to validate core hypothesis
- 2026-03-05: [project closed] AI PM Portfolio Generator — stage was create-issue, archived to run Gmail WhatsApp Notifier as active project
- 2026-03-05: Built as single Next.js app (API routes + frontend + cron endpoint) instead of splitting across Vercel + Railway for MVP simplicity
- 2026-03-05: Used lazy Supabase client via Proxy to allow builds without env vars present
- 2026-03-06: Fixed review items — encrypted OAuth tokens (AES-256-GCM), mandatory cron auth, batched Gmail API, parallel cron processing, bounded processed_emails query, Google token revocation on disconnect
- 2026-03-06: Fixed round-2 review items — OAuth CSRF state param, cron error propagation (throw + 500), frequency validation on cron endpoint, JWT fallback removal + lazy init
- 2026-03-06: Peer review must-fix items — E1 (conditional refresh token upsert), A1 (RLS policies on all tables), S1 (processed_emails TTL cleanup via pg_cron + app-level)
- 2026-03-07: Performed second round of adversarial `/peer-review` yielding new issues S1 (Serverless timeout), E1 (Failed summaries loop), R1 (Twilio failed send user pausing), R2 (SPOF API), and A1 (Synchronous batch cron execution). Result saved to `experiments/results/peer-review-2.md`
- 2026-03-07: Fixed PR 2 blockers — implemented decoupled worker API for parallel individual user crons, added permanent error detection for Twilio to prevent false-pausing, and added fallback mock digests for when Gemini AI fails completely.
- 2026-03-07: Performed manual `/qa-test` yielding two high risks: Infinite Pagination Loop leading to Vercel timeouts and Shallow Email Context (snippet only). Result saved to `experiments/results/qa-test.md`.
- 2026-03-07: Fixed QA blockers — capped Gmail pagination to 5 pages with `newer_than:30d`, and extracted full text/plain body payloads to improve AI context.
- 2026-03-07: Re-ran `/qa-test` validation. High-risk blockers verified fixed. Proceeding to `/metric-plan`.
- 2026-03-07: Executed `/metric-plan`. Defined 'Daily Summary Read Rate' as the North Star. Outlined PostHog integration and Twilio Webhooks to track the Core Onboarding and Daily Engagement funnels. Result saved to `experiments/results/metric-plan.md`.
- 2026-03-07: Executed `/deploy-check` validation. High-risk failures detected: Supabase DB schema is not initialized and PostHog/Twilio webhooks are missing. Result saved to `experiments/results/deploy-check.md`.
- 2026-03-07: Fixed deployment blockers. Applied `schema.sql` logic manually via Supabase editor, mitigating the schema deficit. Added `posthog-js` locally for web events (`landing_page_view`) and `posthog-node` for server-side metrics (`digest_sent`, `setup_completed`). Ready to re-run `/deploy-check`.
- 2026-03-07: Re-ran `/deploy-check` validation. Production NextJS compilation successful with Database and Telemetries properly bundled. Finalized deployments and advanced to `/postmortem`.
- 2026-03-07: Executed `/postmortem`. Analyzed infinite loops, telemetry failures, and single-point-of-failure deployment architecture. Outlined overarching system rules on Async Fan-outs and upfront PostHog integrations. MVP marked completed. Result saved to `experiments/results/postmortem.md`.
- 2026-03-07: Executed `/learning`. Extracted 6 engineering rules and 3 product rules from postmortem and result files. Written to knowledge/engineering-lessons.md, knowledge/product-lessons.md, and knowledge/prompt-library.md. Full pipeline cycle for issue-002 complete.
- 2026-03-08: AI Personal Finance Advisor (issue-003) — Completed postmortem and learning execution. Extracted rules on serverless promise suspension, cron query batching, and UX fallbacks for media/0-spend. Full pipeline cycle for issue-003 complete.
- 2026-03-11: Project Clarity (PM To-Do List MVP, issue-004) set as active project.
- 2026-03-11: Completed `/review` for Clarity MVP. Applied critical limits (taskText max 500 chars, GET limit 100) and graceful UI error fallbacks to prevent abuse and handle Gemini potential failures.
- 2026-03-11: Completed `/peer-review` for Clarity MVP. Implemented MUST-FIX items: added `PUT` endpoint for persistent state, and added fallback AI parsing to prevent data loss if Gemini returns invalid JSON.
- 2026-03-11: Completed `/qa-test` for Clarity MVP. Validated system reliability against missing payloads, network drops, empty strings, and long initial load times. Results logged to `experiments/results/qa-test-004.md`.
- 2026-03-11: Completed `/metric-plan` for Clarity MVP. Defined "Tasks Categorized per User" as North Star. Outlined PostHog integration linking frontend submission funnels with backend `ai_latency_ms` and fallback alerts. Results logged to `experiments/results/metric-plan-004.md`.
- 2026-03-11: Completed `/deploy-check`. Verified Next.js production builds via `npm run build` and integrated PostHog telemetry across frontend (`posthog-js`) and backend (`posthog-node`). Approved for deployment.
- 2026-03-11: Completed `/learning`. Extracted 4 engineering rules and 1 product rule. Full pipeline cycle for Project Clarity (issue-004) complete.
- 2026-03-19: SMB Feature Bundling Engine (issue-005) created. Target user: B2B SaaS PM selling into Indian SMB market. Core hypothesis: custom feature bundle + value-based pricing proposal reduces deal cycle and inconsistent pricing.
- 2026-03-19: Executed /explore for issue-005. Recommendation: Build. Problem is real and gap is unoccupied at the right weight class. Central risk: PM trust in AI-generated INR pricing proposals. MVP = feature selection board + Gemini structured output for price + pitch. Saved to experiments/exploration/exploration-005.md.
- 2026-03-19: Executed /create-plan for issue-005. Architecture: single Next.js monolith, Neon DB (serverless PostgreSQL via @neondatabase/serverless), no auth. Gemini 2.5 Flash with structured output JSON schema for INR pricing + email pitch. 10-feature whitelist to prevent prompt injection. bundle_sessions table tracks selected_features + pitch_copied. PostHog for bundle_generated and pitch_copied events. 20-task implementation plan. Saved to experiments/plans/plan-005.md.
- 2026-03-19: Chose Neon DB over Supabase because no auth is needed — Neon is lighter (connection string only, no client SDK, no RLS setup) and @neondatabase/serverless works natively in Vercel serverless functions via HTTP without a connection pool.
- 2026-03-19: Executed /execute-plan for issue-005. Implemented full apps/smb-bundler Next.js app: FeatureBoard with 10-item catalogue, POST /api/generate-proposal (whitelist validation + Gemini 2.5 Flash structured output + Neon insert), PATCH /api/bundle-sessions/[id]/copied, PostHog server (bundle_generated) and client (pitch_copied) telemetry. DB failure non-blocking. All 20 tasks complete.
- 2026-03-19: Executed /deslop for issue-005. No naming, complexity, hallucination, or standards violations found. Removed 11 restatement comments across gemini.ts, route.ts, EmailPitchCard.tsx, FeatureCard.tsx, page.tsx. Removed 1 dead guard (!disabled &&) from FeatureCard.tsx onClick. Ready for /review.
- 2026-03-19: Executed /review for issue-005. Approved. No critical issues or architecture violations. 1 required fix before deploy: S1 rate limiting on /api/generate-proposal (Gemini cost abuse). Low items: Q1 roi_points length not validated, Q2 "unknown" sessionId contaminates PostHog, Q3 posthog.__loaded is internal API, P1 sequential DB+PostHog awaits (parallelisable). Proceeding to /peer-review.
- 2026-03-19: Executed /peer-review for issue-005. BLOCKED. 3 must-fix items: RR1 (sessionId="unknown" fallback corrupts PostHog analytics and causes 400 on PATCH — fix: pre-generate crypto.randomUUID()), RR2 (no Gemini timeout — add AbortController 9s + JSON 504), PA3 ([First Name] literal placeholder in copied pitch with no UI affordance). Additional: S1 rate limiting still required. Result saved to experiments/results/peer-review-005.md.
- 2026-03-19: Fixed all 4 peer-review blockers. RR1: pre-generate crypto.randomUUID() before DB insert in route.ts + db.ts accepts caller-supplied id. RR2: Promise.race with 9s timeout in gemini.ts, returns JSON 504 on timeout. PA3: amber warning note added to EmailPitchCard above pitch text. S1: in-memory rate limiter (5 req/60s per IP) added to route.ts. TypeScript clean. peer_review gate: approved.
- 2026-03-19: Executed /qa-test for issue-005. BLOCKED. QA1 (required): silent clipboard failure in EmailPitchCard.tsx — empty catch block gives PM zero feedback if copy fails during live sales call. Additional findings: QA2 stale proposal visible after feature toggle (medium), QA3 sequential DB+PostHog awaits (medium), QA4-6 low severity items. Results saved to experiments/results/qa-test-005.md.
- 2026-03-19: Fixed QA1 — clipboard copy now tries navigator.clipboard first, falls back to document.execCommand, and shows "Copy failed — please select manually" inline error with red button state if both fail. qa_test gate: approved.
- 2026-03-19: Executed /metric-plan for issue-005. North Star: Pitch Copy Rate (>50% of sessions). Supporting: latency p95, Gemini failure rate, feature distribution in copied sessions, daily volume. 3 missing events before deploy: proposal_generation_failed, proposal_generation_timeout, proposal_generation_rate_limited. Ground-truth analytics via bundle_sessions.pitch_copied in Neon DB. Result saved to experiments/results/metric-plan-005.md.
- 2026-03-19: Executed /postmortem for issue-005. 5 systemic issues identified. Root cause: architecture under-specification (backend-architect-agent missing Mandatory Pre-Approval Checklist). Key rules: rate limit unauthenticated paid-API endpoints at architecture stage, pre-generate sessionId before DB ops, AbortController ≤9s on all Gemini calls, clipboard fallback required, error-path telemetry required during /execute-plan. Prompt autopsy targets: backend-architect-agent (mandatory checklist), peer-review-agent (Step 4 exactness), execute-plan command (error-path telemetry requirement). Result saved to experiments/results/postmortem-005.md.
- 2026-03-19: Executed /learning for issue-005. Extracted 4 engineering rules (rate limiting, sessionId ordering, Gemini timeout, clipboard fallback) and 1 process lesson. Written to knowledge/engineering-lessons.md, knowledge/prompt-library.md, knowledge/coding-standards.md. Agent files updated: backend-architect-agent.md (Mandatory Pre-Approval Checklist), peer-review-agent.md (Step 4 exactness), commands/execute-plan.md (Telemetry Completeness Requirement). CODEBASE-CONTEXT.md written to apps/smb-bundler/. Full pipeline cycle for issue-005 complete.
- 2026-03-19: Executed /deploy-check for issue-005. Initially BLOCKED — 4 missing telemetry events (proposal_generation_failed, proposal_generation_timeout, proposal_generation_rate_limited, landing_page_viewed). Added all 4 events: 3 server-side in posthog.ts + wired into route.ts catch/timeout/rate-limit branches; landing_page_viewed via useEffect in page.tsx. Build passes clean (3.2s, TypeScript clean). Manual step: apply schema.sql in Neon SQL Editor before first deploy. APPROVED. Result saved to experiments/results/deploy-check-005.md.

## Links
- linear_project:
- docs_home: experiments/plans/plan-005.md
- analytics_dashboard:
