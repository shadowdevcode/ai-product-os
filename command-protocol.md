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

Before executing any command, the system must read:

knowledge/product-principles.md
knowledge/coding-standards.md
knowledge/architecture-guide.md
knowledge/ui-standards.md
knowledge/analytics-framework.md
knowledge/prompt-library.md
knowledge/engineering-lessons.md
knowledge/product-lessons.md
knowledge/ai-model-guide.md

These files define system behavior.

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

## New project rule

When /create-issue is run with a new idea that differs from the current active project:
- Archive the current project state by appending it to the Decisions Log with a "project closed" note
- Reset all fields for the new project
- This makes the file always reflect the current active project

## Blocked state rule

If a quality gate returns fail, set status to blocked and add the blocker to the Blockers section.
Do not proceed to the next stage until the blocker is resolved and the gate is re-run.

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

Agents must read:

knowledge/product-principles.md
knowledge/coding-standards.md
knowledge/architecture-guide.md
knowledge/ui-standards.md
knowledge/analytics-framework.md
knowledge/prompt-library.md
knowledge/engineering-lessons.md
knowledge/product-lessons.md
knowledge/ai-model-guide.md

before generating outputs.

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
