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
   - `knowledge/product-principles.md`
   - `knowledge/coding-standards.md`
   - `knowledge/architecture-guide.md`
   - `knowledge/ui-standards.md`
   - `knowledge/analytics-framework.md`
   - `knowledge/prompt-library.md`
   - `knowledge/engineering-lessons.md`
   - `knowledge/product-lessons.md`
   - `knowledge/ai-model-guide.md`
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

## Key Anti-Patterns (From Production Postmortems)

1. Fire-and-forget promises in serverless functions
2. Unbounded database queries without `.limit()`
3. Synchronous `await` loops (use `Promise.all()`)
4. Processing all users in a single cron execution
5. Using AI snippets/previews instead of full payloads
6. Treating all third-party errors as permanent failures
7. Skipping RLS because "it's just an MVP"
8. Adding telemetry after QA instead of during implementation
9. Naive `JSON.parse(ai_response)` without sanitization
10. Optimistic UI without backend persistence endpoints

---

## Learning System

After every project cycle:

1. `/postmortem` analyzes what failed across the full pipeline
2. `/learning` extracts insights and writes to:
   - `knowledge/engineering-lessons.md` (technical rules)
   - `knowledge/product-lessons.md` (product patterns)
   - `knowledge/prompt-library.md` (agent prompts)

**All agents must re-read these files at the start of every command** to avoid repeating past mistakes.

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
