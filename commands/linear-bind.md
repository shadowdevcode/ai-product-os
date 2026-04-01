# Command: /linear-bind

## Required Knowledge

Load only these knowledge files before executing:

- knowledge/linear-operations.md

---

Purpose:
Bind the active repo workflow to a Linear team and project.

This command establishes the durable relationship between the current `active_issue` and its Linear representation. It does not change the 12-step pipeline. It only creates or updates the PM-facing tracking layer.

---

# When to Run

Run `/linear-bind` when:

- a new active issue should be tracked in Linear
- the active issue already exists in the repo but has no Linear binding
- the Linear team or project name needs to be corrected

Recommended checkpoint:

- Immediately after `/create-issue`

---

# Input

Run as:

```text
/linear-bind [team] [project-name]
```

If `team` is omitted and exactly one Linear team exists, use that team. If more than one team exists, raise an explicit error.

If `project-name` is omitted, derive it from the repo issue title.

---

# Context Loading

1. Read `project-state.md`
2. Read `experiments/ideas/<active_issue>.md`
3. Read `experiments/exploration/exploration-<issue_number>.md` if it exists
4. Read `experiments/linear-sync/issue-<NNN>.json` if it exists

Required fields:

- `active_issue`
- project name
- current stage

If `active_issue` is `none`, stop and raise an explicit error.

---

# Agent Activated

Activate `agents/linear-agent.md`.

---

# Execution

## Step 1 — Resolve Binding Context

Extract:

- repo issue number
- repo issue title
- current stage
- existing Linear metadata from `project-state.md`
- existing sync map metadata from `experiments/linear-sync/issue-<NNN>.json`

## Step 2 — Resolve Linear Destination

Using the provided team and optional project name, use these MCP tools:

- `list_teams`, `get_team`
- `list_issue_labels`, `create_issue_label`
- `list_projects`, `save_project`
- `list_issues`, `save_issue`

Rules:

- resolve the team by explicit argument, or default to the sole team if exactly one exists
- ensure the parent label group `AI Product OS` exists
- ensure child labels exist: `Discovery`, `Planning`, `Execution`, `Review`, `Blocked`, `Release Ready`, `Completed`
- ensure one Linear project exists for the repo issue
- ensure one root Linear issue exists under that project

Default object shape:

- project title: `issue-<NNN> — <repo issue title>`
- root issue title: `issue-<NNN> — <repo issue title>`
- root issue labels: `Feature` and `AI Product OS/Discovery`
- root issue status: `Backlog`

## Step 3 — Persist Binding Metadata

Write the following fields to `project-state.md`:

- `linear_enabled: true`
- `linear_team_id`
- `linear_team`
- `linear_project_id`
- `linear_project`
- `linear_project_url`
- `linear_root_issue_id`
- `linear_root_issue_identifier`
- `linear_sync_map_path`
- `linear_last_sync`
- `linear_sync_status`

Also write `experiments/linear-sync/issue-<NNN>.json` with:

- team id and name
- project id, name, and URL
- root issue id, identifier, and title
- label ids
- empty `documents` object
- empty `tasks` object
- last sync mode `bind`

Do not modify any pipeline stage fields.

## Step 4 — Confirm Idempotency

Lookup order:

1. `experiments/linear-sync/issue-<NNN>.json`
2. `project-state.md`
3. live Linear query by exact team plus exact title

Re-running `/linear-bind` must update existing objects rather than create duplicates.

---

# Failure Policy

- If the Linear team cannot be resolved, raise an explicit error
- If no team argument is provided and multiple teams exist, raise an explicit error
- If the active issue is missing, raise an explicit error
- If Linear write operations fail, raise an explicit error with operation context
- Never silently continue without a binding

---

# Output Format

```text
Operation

Repo Context

Linear Team

Linear Project

Root Linear Issue

Binding Result

Updated State Fields
```
