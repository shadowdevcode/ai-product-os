# Command: /learning

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

### Agent Updates Recommended
- List any agent files that should be updated based on the findings
- These are recommendations only — the PM decides whether to apply them

---

# Files Updated

knowledge/engineering-lessons.md
knowledge/product-lessons.md
knowledge/prompt-library.md

---

# Rules

Every rule written must be generalizable — it must apply to future projects, not just this one.

Do not write one-time fixes. Write system guardrails.

If the same root cause appears in multiple issues, write one consolidated rule.

Mark state update: after /learning, set stage to learning and status to completed in project-state.md.

The pipeline cycle is now complete.
