# Project State

## Active Project
- name: AI Personal Finance Advisor
- repo_path: apps/finance-advisor
- owner: Vijay
- started_on: 2026-03-08
- goal (1 sentence): Build an AI Personal Finance Advisor that leverages WhatsApp for daily financial nudges and weekly summaries.

## Current Stage
- stage: learning
- last_command_run: /learning
- status: cycle-complete

## Active Work
- active_branch: main
- last_commit:
- open_pr_link:
- environments: local

## Quality Gates
- review: approved (round 3)
- peer_review: approved (must-fix resolved)
- qa_test: approved
- deploy_check: approved

## Pending Queue
- None

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

## Links
- linear_project:
- docs_home: experiments/plans/plan-003.md
- analytics_dashboard:
