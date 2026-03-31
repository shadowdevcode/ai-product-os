# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Overview

The **AI Product Operating System** is a command-driven development framework that simulates a full product organization using specialized AI agents. Each agent represents a specific role (Research, Product, Design, Engineering, QA, etc.) and is constrained to its assigned responsibilities.

The system enforces a rigorous 12-step pipeline with quality gates, and all runtime state is tracked in `project-state.md`.

---

## Core Architecture

### Command-Driven Workflow

The system operates through sequential slash commands that activate specialized agents:

1. `/create-issue` - Convert idea into structured opportunity (Research Agent)
2. `/explore` - Validate problem and market feasibility (Research Agent)
3. `/create-plan` - Generate specs, UX, architecture, database schema (Product, Design, Backend & DB Architects)
4. `/execute-plan` - Implement frontend and backend (Frontend & Backend Engineers)
5. `/deslop` - Clean and polish AI-generated code (Deslop Agent)
6. `/review` - Baseline implementation review (Code Review Agent)
7. `/peer-review` - Adversarial architecture review (Peer Review Agent)
8. `/qa-test` - Reliability and integration testing (QA Agent)
9. `/metric-plan` - Define tracking and success criteria (Analytics Agent)
10. `/deploy-check` - Production readiness verification (Deploy Agent)
11. `/postmortem` - Analyze bottlenecks and failures (Learning Agent)
12. `/learning` - Extract insights into durable knowledge, update agent files, generate CODEBASE-CONTEXT.md (Learning Agent)

**Utility Commands** (run anytime, not part of the sequential pipeline):

- `/docs` - Generate AI-native codebase documentation (`CODEBASE-CONTEXT.md`) for the active app
- `/explain` - Targeted learning session: understand a concept, pattern, or error via 80/20 rule
- `/eval` - Score a completed issue's pipeline output against its spec using assertion-based grading
- `/assign-reviewers` - Risk-based PR reviewer routing (standalone utility, no pipeline role)

### Quality Gate System

**Critical Rule**: Stages cannot progress unless the previous stage's quality gate passes.

- `execute-plan` requires `create-plan` completion
- `peer-review` requires `review` to pass
- `qa-test` requires `peer-review` to pass
- `metric-plan` requires `qa-test` to pass
- `deploy-check` requires `metric-plan` completion
- `postmortem` requires `deploy-check` to pass

**Enforcement**: Before executing any command, read `project-state.md` and verify the previous stage status. If blocked, stop execution and return the failure reason.

---

## Command Execution Protocol

### Context Loading (REQUIRED for Every Command)

1. **Read project state**: `project-state.md` → extract `active_issue`, `current_stage`, `status`
2. **Load issue file**: `experiments/ideas/<active_issue>.md`
3. **Load related docs** (if available):
   - `experiments/exploration/exploration-<issue_number>.md`
   - `experiments/plans/plan-<issue_number>.md`
4. **Load knowledge base** (MUST read before generating outputs):
   - Load **only** the files listed in the command's `## Required Knowledge` section (at the top of each `commands/*.md` file)
   - Do NOT load all 9 knowledge files for every command — each command specifies exactly what it needs
   - Only `/learning` loads the full knowledge base
   - Full index for reference: product-principles, coding-standards, architecture-guide, ui-standards, analytics-framework, prompt-library, engineering-lessons, product-lessons, ai-model-guide
5. **Load app context** (for engineering commands `/execute-plan`, `/deslop`, `/review`, `/peer-review`, `/qa-test`, `/docs`):
   - `apps/<project_name>/CODEBASE-CONTEXT.md` (if exists)

**Never use hard-coded template examples.** All outputs must reference the active project context.

### State Management

After every command execution, update `project-state.md`:

- Set `last_command_run` to the executed command
- Update `stage` to the current pipeline stage
- Update `status` (in-progress, blocked, done, completed)
- Set quality gate status (pass/fail) for review stages
- Append key decisions to the Decisions Log

**Blocked State Rule**: If a quality gate fails, set `status` to `blocked` and add the blocker to the Blockers section. Do not proceed until resolved.

---

## Repository Structure

```
/agents              # Agent role definitions (see AGENTS.md for index)
/commands            # Workflow command instructions
/knowledge           # System intelligence (standards, patterns, lessons)
/experiments         # Active workspace
  /ideas             # Issue files (issue-NNN.md)
  /exploration       # Market validation outputs
  /plans             # Product specs, UX, architecture, schema
  /results           # QA, review, metric planning outputs
/apps                # Implementation codebases (Next.js apps)
  /[project-name]    # Individual product implementations
/libs                # Shared utility templates (copy to apps/[project]/src/lib/)
  /shared            # posthog.ts, db.ts, error-handler.ts
/scripts             # Enforcement scripts (secrets, file size, drift detection)
/postmortems         # Post-launch analysis (archived after learning extraction)
/.claude             # Claude Code configuration
  /settings.json     # Permission allow/deny lists
  /rules/            # Path-scoped context rules (auto-loaded by file pattern)
  /commands/         # Registered slash commands
system-orchestrator.md   # Stage progression and quality gate rules
command-protocol.md      # Command execution framework
project-state.md         # Live runtime memory (always check this first)
AGENTS.md                # Progressive disclosure index for all agents
```

---

## Progressive Disclosure

Detailed rules are loaded contextually via `.claude/rules/` — they activate automatically when editing matching files:

- **Tech stack & file structure** → `.claude/rules/tech-stack.md` (loads for `apps/**/*.ts`)
- **Code quality & system rules** → `.claude/rules/code-quality.md` (loads for `apps/**/*.ts`)
- **Agent constraints** → `.claude/rules/agents.md` (loads for `agents/**/*.md`)
- **Command protocol** → `.claude/rules/commands.md` (loads for `commands/**/*.md`)
- **Knowledge base rules** → `.claude/rules/knowledge.md` (loads for `knowledge/**/*.md`)
- **Testing standards** → `.claude/rules/testing.md` (loads for `*.test.*`, `*.spec.*`)

Full agent index: [AGENTS.md](AGENTS.md)

---

## Context Management

- Run `/compact` after execute-plan, create-plan, or qa-test (large output commands)
- Run `/compact` before peer-review or postmortem (need headroom for adversarial depth)
- If context exceeds ~80K tokens, compact before proceeding

---

<!-- AUTO: anti-patterns -->

## Key Anti-Patterns (From Production Postmortems)

1. No product or architecture plan can be approved unless every single success metric has a corresponding, explicitly designed user flow and telemetry trigger in the specification.
2. Cryptographic salts for A/B experiments must be server-only env vars (no NEXT*PUBLIC* prefix). API responses to clients must never expose the true cohort label for control groups — return a neutral value like "default". Server-side PostHog events are the correct place to record the real cohort.
3. All local storage reads must be wrapped in try/catch, and all search/filter network requests triggered by user input must utilize an AbortController.
4. Telemetry calls (e.g., PostHog `captureServerEvent`) in user-facing API routes must be fire-and-forget (`.catch(() => {})`) instead of `await`ed to prevent external latency from corrupting performance SLAs and experiment data.
5. Telemetry completeness means happy-path AND error-path events. For every cron worker: (1) wire a per-user failure event in the catch block, (2) wire a cron_run_completed event after Promise.allSettled, (3) wire experiment lifecycle events at every guard evaluation (EXPERIMENT_END_DATE, opt-out threshold). These are blocking requirements, not production-only enhancements.
6. README.md and .env.local.example are mandatory deliverables of /execute-plan, not polish for /deploy-check. Every env var introduced at any pipeline stage (including peer-review fix cycles) must be added to .env.local.example in the same commit that introduces it. A /deploy-check README failure is always an execute-plan prompt failure.
7. All PostHog server-side calls in worker routes must be individually wrapped in try/catch before being passed to Promise.allSettled. A PostHog failure must never cause a worker to return 500. Worker HTTP status must reflect DB write state, not telemetry write state. Pattern: Promise.allSettled([trackA(data).catch(e => console.error(e)), trackB(data).catch(e => console.error(e))]).
8. Any simulation or conversion tool that fires write-once PostHog events must be idempotent across page refreshes. React component state is insufficient. Apply localStorage keying (check on mount → disable if key exists) AND a DB uniqueness constraint (ON CONFLICT DO NOTHING) for every write-once event emitter.
9. When a URL parameter names a specific entity (orderId, reminderId, sessionId), the page or API handler must fetch that exact entity by that ID. Fallback-to-owner lookups (e.g., fetching by userId when orderId is in the URL) corrupt experiment attribution and are never acceptable for experiment-instrumented flows.
10. Each PostHog event that contributes to the North Star metric must have exactly one authoritative emission point — either client OR server, never both. If the server fires the event on API confirmation, all client-side re-firings of the same event name must be removed. Document the single source in an inline comment.
<!-- /AUTO: anti-patterns -->

---

## Learning System

After every project cycle:

1. `/postmortem` analyzes what failed across the full pipeline
2. `/learning` extracts insights and writes to:
   - `knowledge/engineering-lessons.md` (technical rules)
   - `knowledge/product-lessons.md` (product patterns)
   - `knowledge/prompt-library.md` (agent prompts)

Agents must re-read the knowledge files listed in their command's `## Required Knowledge` section to avoid repeating past mistakes.

---

## Human PM Responsibility

While agents execute workflows, **the human PM is responsible for**:

- Deciding which ideas to pursue
- Evaluating agent outputs at each stage
- Overriding blocked quality gates if necessary
- Making final product and architectural decisions
- Approving releases

Agents assist execution but do not replace human judgment.

---

## Getting Started

1. Check `project-state.md` to understand the current active project and stage
2. Run the next command from the 12-step workflow
3. Review generated artifacts and verify `project-state.md` is updated
4. Proceed only when Quality Gates pass

**Build faster, learn systematically, fail safely.**
