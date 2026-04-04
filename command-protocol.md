# Command Execution Protocol

This repository uses command-driven workflows to activate specialized agents.

When the user runs a command, the system must locate the corresponding command file and execute the instructions.

Commands are stored in:

commands/

Each command defines:

purpose
role
inputs
process
output format

---

# Command Execution Rules

When a command is triggered:

1. Locate the command file inside the commands directory.

2. Read the instructions defined in the command file.

3. Identify which agents must be activated.

4. Load the agent instructions from the agents directory.

5. Apply system knowledge from the knowledge directory.

6. Execute the workflow defined in the command.

7. Produce output in the specified format.

---

# Knowledge Context

Before executing any command, the system must read only the knowledge files listed in the command's `## Required Knowledge` section (at the top of each `commands/*.md` file).

Do NOT load all knowledge files for every command. Each command specifies exactly what it needs. Only `/learning` loads the full knowledge base.

Full index for reference: product-principles, coding-standards, architecture-guide, ui-standards, analytics-framework, prompt-library, engineering-lessons, product-lessons, ai-model-guide.

---

# Agent Activation

Agents are defined inside:

agents/

Each agent represents a specialized role.

When a command requires an agent:

Load the agent instructions
Apply the agent responsibilities
Generate output using the agent's output format

Agents must not perform responsibilities outside their role.

---

# Workflow Order

The system must follow this development pipeline.

create-issue
explore
create-plan
execute-plan
deslop
review
peer-review
qa-test
metric-plan
deploy-check
postmortem
learning

Commands must be executed sequentially unless the product manager overrides.

Utility Commands (run anytime, outside the sequential pipeline):

docs — Generate AI-native CODEBASE-CONTEXT.md for the active app
explain — Targeted PM learning session via 80/20 rule
eval — Score a completed issue's pipeline output against its spec using assertion-based grading
linear-bind — Bind the active repo issue to a Linear team/project
linear-sync — Sync repo artifacts and workflow state into Linear
linear-brief — Summarize the current Linear view for the active issue
linear-close — Close the Linear project after repo workflow completion

---

# Context Resolution

Commands must resolve the active project dynamically.

The system determines the working context by reading:

project-state.md

Field:
active_issue

Using this value the system loads:

experiments/ideas/<active_issue>.md

The issue number is extracted from the active_issue field (e.g. issue-002 → 002).

The system then loads:

experiments/exploration/exploration-002.md
experiments/plans/plan-002.md

For engineering commands (execute-plan, deslop, review, peer-review, qa-test, docs):

Load app context if available:

apps/<project_name>/CODEBASE-CONTEXT.md

Agents must use this file as the primary source of truth for the problem definition.

Agents must never rely on hard-coded template examples.

---

# Output Consistency

All outputs must follow the output format defined in the command file.

Avoid free-form responses.

Structured output improves system reliability.

---

# State Management (Automatic)

project-state.md is the live runtime memory of the system.

The system must update project-state.md after every command execution.

## Rules for state updates

After /create-issue:

- Set name to the new project name
- Set goal to the one-sentence hypothesis
- Set stage to create-issue
- Set status to in-progress
- Set last_command_run to /create-issue

After /explore:

- Set stage to explore
- Set last_command_run to /explore
- Append exploration decision to Decisions Log

After /create-plan:

- Set stage to create-plan
- Set last_command_run to /create-plan
- Update docs_home to point to the plan file in experiments/plans/
- Append key architecture decisions to Decisions Log
- Confirm manifest-<issue_number>.json was saved to experiments/plans/

After /execute-plan:

- Set stage to execute-plan
- Set last_command_run to /execute-plan
- Update active_branch and environments as applicable
- Verify npm test exits 0 (TDD mandate — failing tests = blocked stage)
- Verify telemetry verification table shows no missing events (§10 of execute-plan.md)

After /deslop:

- Set stage to deslop
- Set last_command_run to /deslop
- Set status to done when clean

After /review:

- Set last_command_run to /review
- Update Quality Gates: review to pass or fail

After /peer-review:

- Set last_command_run to /peer-review
- Update Quality Gates: peer_review to pass or fail

After /qa-test:

- Set last_command_run to /qa-test
- Update Quality Gates: qa_test to pass or fail

After /metric-plan:

- Set stage to metric-plan
- Set last_command_run to /metric-plan
- Set status to done when metrics are defined

After /deploy-check:

- Set stage to deploy-check
- Set last_command_run to /deploy-check
- Update Quality Gates: deploy_check to pass or fail
- If all gates pass: record PR URL returned by gh pr create in project-state.md

After /postmortem:

- Set stage to postmortem
- Set status to done
- Append postmortem learnings to Decisions Log

After /learning:

- Set stage to learning
- Set status to completed
- Update project-registry.md: set stage to learning, status to completed
- Append a note to Decisions Log confirming knowledge files were updated

After /docs:

- Does not update pipeline stage
- Writes apps/<project_name>/CODEBASE-CONTEXT.md
- No state change required

After /explain:

- Does not update pipeline stage
- No state change required

After /linear-bind:

- Does not update pipeline stage
- Writes only Linear metadata fields in `project-state.md`
- Must not create duplicate Linear projects for the same active issue

After /linear-sync:

- Does not update pipeline stage
- Updates `linear_last_sync` and `linear_sync_status`
- Must upsert Linear objects instead of duplicating them

After /linear-brief:

- Does not update pipeline stage
- No state change required unless the command explicitly records a sync-health diagnostic

After /linear-close:

- Does not update pipeline stage
- Updates `linear_last_sync` and `linear_sync_status`
- Must not close a project unless repo completion is already recorded

## New project rule

When /create-issue is run with a new idea that differs from the current active project:

- Archive the current project state by appending it to the Decisions Log with a "project closed" note
- Reset all fields for the new project
- This makes the file always reflect the current active project

## Blocked state rule

If a quality gate returns fail, set status to blocked and add the blocker to the Blockers section.
Do not proceed to the next stage until the blocker is resolved and the gate is re-run.

---

# Linear Sync Protocol

Linear is an optional PM layer, not the workflow engine.

Rules:

1. Read repo state first. `project-state.md` and repo artifacts remain canonical.
2. Linear commands must never modify the 12-step pipeline stage progression.
3. Linear sync must be idempotent. Re-running the same sync should update existing Linear objects rather than create duplicates.
4. Use the repo issue number as the stable foreign key across systems.
5. Persist durable Linear ids in `experiments/linear-sync/issue-<NNN>.json`.
6. Child Linear tasks should be derived from `manifest-<issue_number>.json` when available.
7. If Linear is unavailable, raise an explicit error with operation context. Do not silently skip.

## Mandatory Checkpoints (not optional — execute after every pipeline run)

- After `create-issue`: `linear-bind` (auto), then `linear-sync issue`
- After `create-plan`: `linear-sync plan`
- After `review`, `peer-review`, `qa-test`: `linear-sync status`
- After `deploy-check`: `linear-sync release`
- After `learning`: `linear-close`

If a sync is skipped at any checkpoint, the next command must run the missed sync before proceeding. Never silently skip a Linear sync.

## Default State Mapping

- `create-issue`, `explore` -> discovery or triage
- `create-plan` -> planned
- `execute-plan`, `deslop` -> in progress
- blocked review stages -> blocked or at risk
- successful `deploy-check` -> release ready
- successful `learning` -> completed

---

# Command Execution Framework

Every command in the AI Product OS must follow this execution order.

Step 1
Load project state.

Read:

project-state.md

Identify:
current_stage
pending_commands
blockers

---

Step 2
Validate stage order.

Check system-orchestrator.md to confirm the command is allowed.

If stage is invalid → stop execution.

---

Step 3
Load knowledge.

Agents must read only the knowledge files listed in the command's `## Required Knowledge` section (at the top of each `commands/*.md` file).

Do NOT load all 9 knowledge files for every command — each command specifies exactly what it needs. Only `/learning` loads the full knowledge base.

Full index for reference: product-principles, coding-standards, architecture-guide, ui-standards, analytics-framework, prompt-library, engineering-lessons, product-lessons, ai-model-guide.

---

Step 4
Load required agents.

The command file specifies which agents activate.

Load those agents from the agents/ directory.

---

Step 5
Execute workflow.

Agents generate outputs according to command instructions.

Outputs must follow structured format.

---

Step 6
Update system state.

Update:

project-state.md

Fields updated:

last_command_run
current_stage
pending_commands

---

Step 7
Store artifacts.

Outputs should be written to the appropriate folder:

experiments/
src/
postmortems/
knowledge/

depending on command type.

---

Step 8
Recommend next command.

After completing execution and updating project-state.md, inform the user of the next recommended command.

Use the Next Command Resolution table from system-orchestrator.md:

If current_stage = create-issue → suggest /explore
If current_stage = explore → suggest /create-plan
If current_stage = create-plan → suggest /execute-plan
If current_stage = execute-plan → suggest /deslop
If current_stage = deslop → suggest /review
If current_stage = review → suggest /peer-review
If current_stage = peer-review → suggest /qa-test
If current_stage = qa-test → suggest /metric-plan
If current_stage = metric-plan → suggest /deploy-check
If current_stage = deploy-check → suggest /postmortem
If current_stage = postmortem → suggest /learning
If current_stage = learning → pipeline complete, suggest /create-issue to start a new cycle

If the stage is blocked (quality gate failed), do not suggest the next command. Instead, state the blocker and what must be fixed before re-running the current stage.

Format:

✅ Next step: run `/[command]` to [one-line description of what it does]

Or if blocked:

🚫 Blocked: [reason]. Fix the issue and re-run `/[current-command]`.

---

Step 8.5
Context management advisory.

After completing execute-plan, create-plan, or qa-test:
Display: "💡 Consider running /compact before the next command to free context space."

Before peer-review or postmortem:
Display: "💡 Run /compact now — adversarial analysis needs maximum context headroom."

---

# Real-Time Feedback Capture Protocol

When the PM provides corrective feedback at any point during the pipeline, the system must act immediately — not defer to /learning.

## Required actions (execute in order):

1. Identify the agent or command file responsible for the failure
2. Open that file and add the new rule as a hard constraint (not a note)
3. Update CHANGELOG.md with a dated entry: what changed, why, which file
4. Update project-state.md Decisions Log with the correction

## Rule

Every mid-pipeline PM correction = immediate write to agent/command file + CHANGELOG entry.

The /learning command reinforces these rules at end of cycle. It is not the first capture point.

If feedback is not captured immediately, it will be lost if the cycle is abandoned, compacted, or restarted.

---

# CHANGELOG Discipline

CHANGELOG.md must be updated whenever:

- Any agent file is modified (agents/\*.md)
- Any command file is modified (commands/\*.md)
- Any knowledge file is modified (knowledge/\*.md)
- CLAUDE.md or command-protocol.md is modified
- Any system-level behavior is changed based on PM feedback

Format:

## YYYY-MM-DD — [Short title]

**What:** One or two sentences describing the change.
**Why:** The PM feedback or postmortem finding that triggered it.
**Files:** List of files changed.
