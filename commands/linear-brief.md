# Command: /linear-brief

## Required Knowledge

Load only these knowledge files before executing:

- knowledge/linear-operations.md

---

Purpose:
Read the current Linear view for the active repo issue and summarize it for the PM.

This command is read-only from the repo's perspective. It helps the PM understand the current Linear representation without manually opening the tool.

---

# When to Run

Run `/linear-brief` when:

- preparing for planning or status review
- checking child task progress against the manifest
- confirming blocker visibility before a release decision

This command can run anytime after `/linear-bind`.

---

# Input

Run as:

```text
/linear-brief [active|project|cycle]
```

Default mode: `active`

---

# Context Loading

1. Read `project-state.md`
2. Read the active issue file
3. Read the plan and manifest if they exist
4. Read Linear metadata from `project-state.md`
5. Read `experiments/linear-sync/issue-<NNN>.json` if it exists

If `linear_enabled` is not `true`, stop and raise an explicit error.

---

# Agent Activated

Activate `agents/linear-agent.md`.

---

# Execution

## Step 1 — Resolve View

- `active` -> summarize the bound project and the active repo issue
- `project` -> summarize the full Linear project view and child issues
- `cycle` -> summarize the current cycle only if `linear_cycle` exists

Resolve objects using this lookup order:

1. `experiments/linear-sync/issue-<NNN>.json`
2. `project-state.md`
3. live Linear query by exact team plus exact title

## Step 2 — Read Linear State

Use these MCP tools:

- `get_project`
- `get_issue`
- `list_issues`

Gather:

- project name
- project status
- current cycle
- child issue progress
- open blockers
- attached links for plan, PR, deployment, and postmortem if present

## Step 3 — Compare Against Repo State

Highlight any mismatch between:

- repo stage and Linear status
- manifest tasks and Linear child issues
- known blockers and Linear blocker visibility
- expected stage labels and current stage labels
- expected sync map identifiers and live Linear objects

Do not mutate repo state.

---

# Failure Policy

- If the project is not bound, raise an explicit error
- If the requested view requires `linear_cycle` and it is missing, raise an explicit error
- If Linear read operations fail, raise an explicit error with view context

---

# Output Format

```text
Linear Brief

Repo Stage

Linear Status

Child Task Summary

Open Blockers

Mismatches

Sync Map Health

Recommended Next PM Action
```
