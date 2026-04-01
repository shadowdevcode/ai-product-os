# AI Product Operating System

A simulated, end-to-end product development organization where specialized AI agents collaborate to take an idea from raw hypothesis to deployed, instrumented product — following the same rigor as a real product team.

**Who this is for:** Product Managers, indie founders, and ICPs who want to ship AI-assisted products faster without skipping the parts that matter — research, architecture review, QA, metrics, and learning.

> **Live:** [ai-product-os-493e.vercel.app](https://ai-product-os-493e.vercel.app/) | Built and operated with [Claude Code](https://claude.ai/code). You need Claude Code to run the slash commands.

---

## Quick Navigation

| What you're looking for                  | Where to find it                                                         |
| ---------------------------------------- | ------------------------------------------------------------------------ |
| Active project status, stage, blockers   | [`project-state.md`](project-state.md)                                   |
| Product ideas and issue definitions      | [`experiments/ideas/issue-NNN.md`](experiments/ideas/)                   |
| Market research and problem exploration  | [`experiments/exploration/exploration-NNN.md`](experiments/exploration/) |
| PRDs, UX specs, architecture plans       | [`experiments/plans/plan-NNN.md`](experiments/plans/)                    |
| QA, code review, metrics, deploy results | [`experiments/results/`](experiments/results/)                           |
| Demo scripts and presentations           | [`experiments/demos/`](experiments/demos/)                               |
| Built app codebases                      | [`apps/[project-name]/`](apps/)                                          |
| Pipeline command instructions            | [`commands/`](commands/)                                                 |
| Agent role definitions                   | [`agents/`](agents/)                                                     |
| Engineering and product knowledge base   | [`knowledge/`](knowledge/)                                               |
| Quality gate rules and stage progression | [`system-orchestrator.md`](system-orchestrator.md)                       |
| Command execution framework              | [`command-protocol.md`](command-protocol.md)                             |

---

## Projects Built

| Issue | App                                                  | What It Does                                                                                          | Stack                             | Status   |
| ----- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | --------------------------------- | -------- |
| 002   | —                                                    | Gmail → WhatsApp daily digest summarizer                                                              | Next.js, Supabase, Gemini, Twilio | Archived |
| 003   | [finance-advisor](apps/finance-advisor/)             | AI personal finance advisor                                                                           | Next.js, Supabase, Gemini         | Complete |
| 004   | [clarity](apps/clarity/)                             | PM to-do list with AI task categorization                                                             | Next.js, Neon, Gemini             | Complete |
| 005   | [smb-bundler](apps/smb-bundler/)                     | Feature bundle + value-based pricing engine for B2B SaaS PMs                                          | Next.js, Neon, Gemini             | Complete |
| 006   | [ozi-reorder](apps/ozi-reorder/)                     | Reorder reminder experiment for dark-store baby essentials (50/50 test vs. control, 7 PostHog events) | Next.js, Neon, PostHog            | Complete |
| 007   | [ozi-insights](apps/ozi-insights/)                   | Synthetic Freshdesk support data for order reliability research (30 tickets, grounded in Play Store)  | Data workspace                    | Explored |
| 008   | [nykaa-personalisation](apps/nykaa-personalisation/) | Hyper-personalized discovery feed (affinity + intent scoring, 10 PostHog events, 5 API routes)        | Next.js, Neon, PostHog            | Archived |
| —     | [landing](apps/landing/)                             | Framework landing page showcasing pipeline, agents, and shipped products                              | Next.js, Tailwind CSS             | Live     |

Each issue number maps directly across all folders: `experiments/ideas/issue-NNN.md`, `experiments/exploration/exploration-NNN.md`, `experiments/plans/plan-NNN.md`, and `experiments/results/*-NNN.md`.

---

## The 12-Step Pipeline

The OS enforces a sequential pipeline with quality gates. A stage cannot start until the previous stage passes.

| #   | Command         | Agent                                    | Output                                               |
| --- | --------------- | ---------------------------------------- | ---------------------------------------------------- |
| 1   | `/create-issue` | Research Agent                           | Structured opportunity brief                         |
| 2   | `/explore`      | Research Agent                           | Market validation, recommendation                    |
| 3   | `/create-plan`  | Product + Design + Backend/DB Architects | PRD, UX, architecture, DB schema                     |
| 4   | `/execute-plan` | Frontend + Backend Engineers             | Working app codebase                                 |
| 5   | `/deslop`       | Deslop Agent                             | Clean, comment-free code                             |
| 6   | `/review`       | Code Review Agent                        | Critical issues list (blocks until fixed)            |
| 7   | `/peer-review`  | Peer Review Agent                        | Adversarial architecture review                      |
| 8   | `/qa-test`      | QA Agent                                 | Reliability and edge-case test results               |
| 9   | `/metric-plan`  | Analytics Agent                          | North Star, funnels, ground-truth queries            |
| 10  | `/deploy-check` | Deploy Agent                             | Production readiness sign-off                        |
| 11  | `/postmortem`   | Learning Agent                           | Root cause analysis of pipeline failures             |
| 12  | `/learning`     | Learning Agent                           | Engineering rules extracted → knowledge base updated |

**Utility commands** (run anytime):

- `/docs` — Generate `CODEBASE-CONTEXT.md` for the active app
- `/explain` — Deep-dive on a concept, pattern, or error
- `/linear-bind` — Bind the active repo issue to a Linear team/project
- `/linear-sync` — Sync repo artifacts and workflow status into Linear
- `/linear-brief` — Summarize the current Linear state for the active issue
- `/linear-close` — Close the Linear project after the repo workflow completes

---

## Knowledge Base

The system gets smarter with every cycle. After each `/learning` run, insights from postmortems are extracted into durable rules:

- [`knowledge/engineering-lessons.md`](knowledge/engineering-lessons.md) — Technical rules (e.g., fan-out cron, pagination bounds, telemetry resilience)
- [`knowledge/product-lessons.md`](knowledge/product-lessons.md) — Product patterns and anti-patterns
- [`knowledge/prompt-library.md`](knowledge/prompt-library.md) — Refined agent prompts extracted from what worked
- [`knowledge/coding-standards.md`](knowledge/coding-standards.md) — TypeScript, Next.js, Supabase/Neon standards
- [`knowledge/architecture-guide.md`](knowledge/architecture-guide.md) — Default system architecture patterns
- [`knowledge/analytics-framework.md`](knowledge/analytics-framework.md) — PostHog event schema and funnel design

Every agent reads the knowledge base before executing — preventing the same class of mistake from appearing twice.

---

## Linear PM Layer

Linear is an optional PM-facing layer on top of the repo workflow.

The source of truth remains in this repository:

- `project-state.md` is the canonical workflow state
- `experiments/` contains the canonical issue, exploration, plan, and result artifacts
- `experiments/linear-sync/` stores durable Linear sync identities per issue
- `commands/` defines the execution contracts

Linear exists to improve:

- prioritization
- roadmap visibility
- blocker communication
- task tracking from execution manifests
- release and closeout visibility

Recommended usage:

1. Run `/linear-bind` after `/create-issue`
2. Run `/linear-sync issue` after the issue brief exists
3. Run `/linear-sync plan` after `/create-plan` to publish plan artifacts and child tasks
4. Run `/linear-sync status` after review gates to reflect blockers or approvals
5. Run `/linear-sync release` after `/deploy-check`
6. Run `/linear-close` after `/learning`

If Linear is unavailable, the Linear utility command should fail explicitly. The 12-step pipeline remains usable because Linear is not the workflow engine.

---

## Getting Started (Forking This Repo)

1. **Check the current state** — read [`project-state.md`](project-state.md) to see what stage the system is at and which issue is active
2. **Pick an idea** — browse [`experiments/ideas/`](experiments/ideas/) for context on past issues, or create a new one with `/create-issue`
3. **Run commands sequentially** — pass the command file from [`commands/`](commands/) to Claude Code (e.g., paste `commands/create-issue.md` content and follow it)
4. **Read the knowledge base first** — every command in the pipeline reads all files in [`knowledge/`](knowledge/) before generating output to avoid repeating past mistakes
5. **Track gates, not just progress** — check `project-state.md` after each command; blocked = do not proceed

**Default tech stack** (used across all apps):

- Frontend: Next.js 16+ (App Router), TypeScript strict, Tailwind CSS 4+
- Backend: Next.js API Routes, Neon DB (`@neondatabase/serverless`) or Supabase
- AI: Google Gemini 2.5 Flash/Pro via `@google/genai` with structured outputs
- Analytics: PostHog (`posthog-js` + `posthog-node`)
- Hosting: Vercel

**Environment setup per app:**

```bash
cd apps/[project-name]
cp .env.local.example .env.local   # fill in your keys
npm install
npm run dev
```

Each app includes a `schema.sql` (idempotent) that must be applied in your database editor before first run.

---

## The Human PM Role

Agents execute but do not replace judgment. The human PM is responsible for:

- Deciding which ideas to pursue
- Evaluating agent outputs at each stage
- Overriding blocked quality gates when the tradeoff is justified
- Making final product and architectural decisions
- Approving releases

---

## Repository Structure

```
/agents                    # Agent role definitions (one file per role)
/commands                  # Pipeline command instructions (one file per command)
/knowledge                 # Shared intelligence: standards, lessons, prompts
/experiments
  /ideas                   # Issue briefs (issue-NNN.md)
  /exploration             # Market validation outputs (exploration-NNN.md)
  /plans                   # PRDs, UX, architecture, DB schema (plan-NNN.md)
  /results                 # QA, reviews, metrics, deploy artifacts (*-NNN.md)
  /demos                   # Demo scripts and presentations
/apps                      # Built codebases (one folder per project)
  /[project-name]
    src/app/               # Next.js App Router pages and API routes
    src/components/        # UI components
    src/lib/               # Utilities, DB clients, AI helpers
    schema.sql             # Idempotent DB schema
    CODEBASE-CONTEXT.md    # Auto-generated docs (via /docs command)
    README.md              # Setup and run instructions
    .env.local.example     # Required env vars (no secrets)
project-state.md           # Live runtime memory — always check this first
system-orchestrator.md     # Quality gate rules and stage progression
command-protocol.md        # How commands load context and update state
```

---

## System Evolution

This OS isn't static — it improves with every cycle. Full history in [`CHANGELOG.md`](CHANGELOG.md).

| Phase  | What Changed                                                                                                                                                 | PM Decision                                                                                       |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| **v0** | Manual pipeline, no enforcement                                                                                                                              | Proved the 12-step concept works end-to-end                                                       |
| **v1** | Quality gates, knowledge base, 5 shipped products                                                                                                            | Each postmortem generated rules that prevented the same class of failure in the next cycle        |
| **v2** | Developer tooling (husky, prettier, enforcement scripts), test infrastructure (Vitest + shared mocks), progressive disclosure (.claude/rules/), landing page | Finalized with Nykaa Hyper-Personalization (issue-008). AI Product OS v2 is now feature-complete. |

---

_Build faster. Learn systematically. Fail safely._
