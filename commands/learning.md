# Command: /learning

## Required Knowledge

Load ALL knowledge files before executing (this is the one command that legitimately needs the full knowledge base):

- knowledge/product-principles.md
- knowledge/coding-standards.md
- knowledge/architecture-guide.md
- knowledge/ui-standards.md
- knowledge/analytics-framework.md
- knowledge/prompt-library.md
- knowledge/engineering-lessons.md
- knowledge/product-lessons.md
- knowledge/ai-model-guide.md

---

Purpose:
Activate the Learning Agent to convert postmortem insights into durable system intelligence.

This is the final step of every pipeline cycle. It closes the loop by writing lessons back into the knowledge layer so that each project makes the next one better.

---

# Context

Load the active project context before executing.

Read project-state.md.

Extract:

- active_issue
- project_name

Load:

- experiments/results/postmortem.md
- experiments/results/peer-review-2.md (if exists)
- experiments/results/qa-test.md (if exists)
- experiments/results/deploy-check.md (if exists)

---

# Agent Activated

learning-agent.md

---

# Inputs

- Latest postmortem file
- QA test results
- Peer review findings
- Deploy check results
- Decisions Log from project-state.md

---

# Execution Steps

## Step 1 — Categorize Issues

Read the postmortem and all result files.

For each issue identified, assign one of these categories:

- engineering: architecture, performance, code quality, security, scalability
- product: scoping, prioritization, UX decisions, hypothesis quality
- process: pipeline gaps, agent instruction failures, review misses, quality gate weaknesses

---

## Step 2 — Extract Durable Lessons

For each issue, apply the Learning Agent format:

Issue Observed
Root Cause
Preventative Rule
System Improvement
Target Knowledge File

---

## Step 3 — Write Engineering Lessons

Append engineering-category findings to:

knowledge/engineering-lessons.md

Format:

---

date: YYYY-MM-DD
project: <project_name>
issue: <one-line description>
root_cause: <why it happened>
rule: <rule that prevents recurrence>
improvement: <what to change in agents or commands>

---

---

## Step 4 — Write Product Lessons

Append product-category findings to:

knowledge/product-lessons.md

Format:

---

date: YYYY-MM-DD
project: <project_name>
issue: <one-line description>
root_cause: <why it happened>
rule: <rule that prevents recurrence>
improvement: <what to change in product or planning agents>

---

---

## Step 5 — Update Prompt Library

Append process-category findings and any new reusable prompt patterns to:

knowledge/prompt-library.md

Under the relevant section:

- Product Planning Prompts
- Architecture Prompts
- Code Generation Prompts
- Review Prompts
- Postmortem Learnings

---

## Step 6 — Apply Prompt Autopsy to Agent Files

Read the Prompt Autopsy section from the postmortem.

For each agent identified as underperforming:

1. Read the agent file: `agents/<agent-name>.md`
2. Locate the relevant section (Rules, Process, or Responsibilities)
3. Append the proposed fix as a new rule or instruction
4. Mark the change with a comment: `# Added: YYYY-MM-DD — <project_name>`

This step is not optional. Agent files must improve after every cycle.

If the postmortem Prompt Autopsy section is empty or missing, raise a flag: "Prompt Autopsy was not completed. Run /postmortem again and complete Section 6 before /learning can close the cycle."

---

## Step 7 — Generate CODEBASE-CONTEXT.md

After all lessons are written, generate a `CODEBASE-CONTEXT.md` file inside the app directory (`apps/<project_name>/CODEBASE-CONTEXT.md`).

This file is for future AI agent sessions — it gives any new agent instant context about the codebase without requiring manual re-explanation.

Structure:

```
# Codebase Context: <project_name>
Last updated: YYYY-MM-DD

## What This App Does
One paragraph: the user problem, the core feature, and the primary user flow.

## Architecture Overview
- Frontend: <tech, key files>
- Backend: <API routes, key files>
- Database: <schema summary, key tables>
- AI Integration: <model used, what it does>
- Analytics: <PostHog events tracked>

## Key Files
List the 5-8 most important files and what each does.

## Data Model
Brief description of tables and relationships.

## API Endpoints
List each endpoint with method, path, and purpose.

## Things NOT to Change Without Reading First
List any fragile patterns, non-obvious decisions, or traps for future agents.

## Known Limitations
List any known issues, TODOs, or future improvements noted in postmortem.
```

---

# Output Format

Return a structured summary:

---

## Learning Run: <project_name>

Date: YYYY-MM-DD

### Engineering Lessons Written

- List each rule appended to engineering-lessons.md

### Product Lessons Written

- List each rule appended to product-lessons.md

### Prompt Library Updates

- List each update appended to prompt-library.md

### Agent Files Updated

- List each agent file modified and what was added
- If Prompt Autopsy was empty: flag this explicitly

### CODEBASE-CONTEXT.md

- Confirm file was written to apps/<project_name>/CODEBASE-CONTEXT.md

---

# Files Updated

knowledge/engineering-lessons.md
knowledge/product-lessons.md
knowledge/prompt-library.md
agents/<agent-name>.md (one or more, based on Prompt Autopsy)
apps/<project_name>/CODEBASE-CONTEXT.md

---

# Rules

Every rule written must be generalizable — it must apply to future projects, not just this one.

Do not write one-time fixes. Write system guardrails.

If the same root cause appears in multiple issues, write one consolidated rule.

Agent files must be updated based on Prompt Autopsy findings — not just recommended. This is the mechanism by which the system improves itself.

Mark state update: after /learning, set stage to learning and status to completed in project-state.md.

The pipeline cycle is now complete.
