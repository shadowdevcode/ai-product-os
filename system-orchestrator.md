# AI Product Operating System

This repository is an AI-assisted product development system.

The system simulates a full product organization where specialized agents collaborate to build products.

The human product manager orchestrates the workflow using commands.

---

# System Structure

Agents represent specialized roles:

Research Agent
Product Agent
Design Agent
Backend Architect
Database Architect
Frontend Engineer
Backend Engineer
Code Review Agent
Peer Review Agent
QA Agent
Deploy Agent
Analytics Agent
Docs Agent
Deslop Agent
Metric Plan Agent
Learning Agent

Each agent must only perform its assigned responsibility.

---

# Workflow Commands

The system follows this workflow.

1 Capture Idea

/create-issue

Convert raw idea into structured opportunity.

Agent involved:
Research Agent

---

2 Explore Opportunity

/explore

Validate the problem and analyze market.

Agent involved:
Research Agent

---

3 Create Product Plan

/create-plan

Generate product specification, UX design, system architecture, and database schema.

Agents involved:
Product Agent
Design Agent
Backend Architect
Database Architect

---

4 Execute Plan

/execute-plan

Implement frontend and backend.

Agents involved:
Frontend Engineer
Backend Engineer

---

5 Deslop

/deslop

Clean and polish AI-generated code before review. Remove unnecessary complexity, fix naming, improve readability.

Agent involved:
Deslop Agent

---

6 Code Review

/review

Review implementation quality.

Agent involved:
Code Review Agent

---

7 Peer Review

/peer-review

Perform adversarial architecture review. Runs Challenge Mode: Assumption Audit, Anti-Sycophancy mandate, Multi-Perspective Challenge (Reliability Engineer / Adversarial User / Future Maintainer stances), and Prompt Autopsy Check. Optionally uses multi-model review — Claude leads and adjudicates, GPT-4o for bug analysis, Gemini for UI critique.

Agent involved:
Peer Review Agent

---

8 QA Testing

/qa-test

Test system reliability.

Agent involved:
QA Agent

---

9 Metric Plan

/metric-plan

Define post-launch metrics tracking, events, funnels, and success criteria.

Agent involved:
Analytics Agent

---

10 Deployment Check

/deploy-check

Verify production readiness.

Agent involved:
Deploy Agent

---

11 Postmortem

/postmortem

Analyze results and identify what went wrong across the full cycle. Includes mandatory Prompt Autopsy section: traces failures back to specific agent prompt instructions and proposes exact fixes to those agent files.

Agent involved:
Learning Agent

---

12 Learning

/learning

Convert postmortem insights into durable system intelligence. Writes lessons to knowledge files, applies Prompt Autopsy findings directly to agent files, and generates apps/<project_name>/CODEBASE-CONTEXT.md for future agent sessions.

Agent involved:
Learning Agent

---

# Utility Commands (Run Anytime)

These commands are not part of the sequential pipeline and have no quality gate dependencies. They can be run at any stage.

/docs
Generate AI-native codebase documentation.
Writes CODEBASE-CONTEXT.md to the active app directory (apps/<project_name>/CODEBASE-CONTEXT.md).
Use after any significant implementation or architecture change, or before handing off to a new agent session.
Agent involved: Docs Agent (or active engineering agent)

/explain
Targeted learning session for the PM.
Explains a concept, pattern, or error via the 80/20 rule tailored to a technical PM's knowledge level.
Does not modify code or update pipeline state.
Agent involved: none (Claude Code direct)

---

# Rules

Always follow the command workflow.

Do not skip validation steps.

Prefer small MVP experiments.

Prioritize user value and learning speed.

---

# Product Manager Responsibility

The human product manager is responsible for:

deciding which ideas to pursue
evaluating agent outputs
approving releases
making final product decisions

Agents assist execution but do not replace judgment.

---

# Quality Gate System

The AI Product OS enforces stage progression using quality gates.

A stage cannot proceed unless the previous stage passes its gate.

---

## Stage Order

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

---

## Gate Rules

execute-plan cannot start unless:
create-plan is complete

deslop cannot start unless:
execute-plan is complete

review cannot start unless:
deslop is complete

peer-review cannot start unless:
review passes

qa-test cannot start unless:
peer-review passes

metric-plan cannot start unless:
qa-test passes

deploy-check cannot start unless:
metric-plan is complete

postmortem cannot start unless:
deploy-check passes

learning cannot start unless:
postmortem is complete

---

## Gate Enforcement

Before executing a command:

1 Read project-state.md
2 Verify previous stage status
3 If gate not satisfied → stop execution
4 Return reason for failure

---

# Context Loading Protocol

Before executing any command, the system must load the active project context.

Step 1
Read project-state.md.

Extract:
- project_name
- active_issue
- current_stage

Step 2
Load the issue file:

experiments/ideas/<active_issue>.md

Step 3
If available, load related documents:

experiments/exploration/exploration-<issue_number>.md
experiments/plans/plan-<issue_number>.md

Step 4
Load knowledge base.

All agents must read:

knowledge/product-principles.md
knowledge/coding-standards.md
knowledge/architecture-guide.md
knowledge/ui-standards.md
knowledge/analytics-framework.md
knowledge/prompt-library.md
knowledge/engineering-lessons.md
knowledge/product-lessons.md
knowledge/ai-model-guide.md

For engineering commands (execute-plan, deslop, review, peer-review, qa-test, docs), also load if available:

apps/<project_name>/CODEBASE-CONTEXT.md

Step 5
Provide this context to all agents.

Agents must use this context when generating outputs.

Templates must not contain hard-coded product examples.

---

# Next Command Resolution

The AI Product OS determines the next command based on the current stage.

Pipeline Order

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

---

Resolution Logic

If current_stage = create-issue
next_command = /explore

If current_stage = explore
next_command = /create-plan

If current_stage = create-plan
next_command = /execute-plan

If current_stage = execute-plan
next_command = /deslop

If current_stage = deslop
next_command = /review

If current_stage = review
next_command = /peer-review

If current_stage = peer-review
next_command = /qa-test

If current_stage = qa-test
next_command = /metric-plan

If current_stage = metric-plan
next_command = /deploy-check

If current_stage = deploy-check
next_command = /postmortem

If current_stage = postmortem
next_command = /learning

If current_stage = learning
next_command = none — cycle complete. Run /create-issue to start next project.
