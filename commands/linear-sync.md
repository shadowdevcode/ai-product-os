# Command: /linear-sync

## Required Knowledge

Load only these knowledge files before executing:

- knowledge/linear-operations.md

---

Purpose:
Sync repo workflow artifacts into Linear without changing the repo's canonical role.

This command mirrors the state already captured in repo files into the appropriate Linear project, issues, and comments.

---

# When to Run

Run `/linear-sync` after the repo artifact already exists.

Recommended checkpoints:

- After `/create-issue` -> `/linear-sync issue`
- After `/create-plan` -> `/linear-sync plan`
- After `/review`, `/peer-review`, `/qa-test` -> `/linear-sync status`
- After `/deploy-check` -> `/linear-sync release`

---

# Input

Run as:

```text
/linear-sync <issue|plan|status|release>
```

---

# Context Loading

1. Read `project-state.md`
2. Read `experiments/ideas/<active_issue>.md`
3. Read `experiments/exploration/exploration-<issue_number>.md` if it exists
4. Read `experiments/plans/plan-<issue_number>.md` if it exists
5. Read `experiments/plans/manifest-<issue_number>.json` if it exists
6. Read relevant result artifacts from `experiments/results/` based on sync mode
7. Read `experiments/linear-sync/issue-<NNN>.json` if it exists

If `linear_enabled` is not `true`, stop and raise an explicit error instructing the PM to run `/linear-bind` first.

---

# Agent Activated

Activate `agents/linear-agent.md`.

---

# Execution

## Step 1 — Validate Binding

Confirm the active issue has:

- `linear_enabled: true`
- `linear_team`
- `linear_project`
- `linear_sync_map_path`

Lookup order:

1. `experiments/linear-sync/issue-<NNN>.json`
2. `project-state.md`
3. live Linear query by exact team plus exact title

If any field is missing, fail explicitly.

## Step 2 — Resolve Sync Mode

Use these MCP tools as needed:

- `get_project`, `save_project`
- `get_issue`, `list_issues`, `save_issue`
- `list_comments`, `save_comment`
- `create_document`, `update_document`

### `issue`

Sync the opportunity brief into Linear.

Expected behavior:

- update the root Linear issue title and description from the repo issue brief
- include local repo artifact paths as plain text in the description
- ensure `AI Product OS/Discovery` is applied
- keep the root issue in `Backlog`

### `plan`

Sync planning artifacts.

Expected behavior:

- create or update the Linear project
- set the project state to `planned`
- create or update a Linear document snapshot titled `issue-<NNN> Plan Snapshot`
- include plan summary, manifest summary, and local repo paths for the plan and manifest
- create or update child issues from `manifest-<issue_number>.json`
- child issue title format: `[issue-<NNN>][<task_id>] <task name>`
- child issue description must include phase id, phase name, assigned agent, files to create, files to modify, verification command, and test file
- child issues default to status `Todo` and labels `Feature` plus `AI Product OS/Execution`
- use manifest task IDs plus the sync map as stable identifiers to avoid duplicates
- if the manifest file is missing, raise an explicit error

### `status`

Sync workflow status and blockers.

Expected behavior:

- map repo stage and status into Linear project status
- update the root issue stage label based on repo stage:
  - `create-issue`, `explore` -> `Discovery`
  - `create-plan` -> `Planning`
  - `execute-plan`, `deslop` -> `Execution`
  - `review`, `peer-review`, `qa-test` -> `Review`
- add `Blocked` if repo status is blocked
- add `Release Ready` after successful `deploy-check`
- add comments summarizing review, peer-review, or QA outcomes
- if blocked, include blocker details from `project-state.md` or the relevant result file
- keep child issues unchanged in v1

### `release`

Sync deployment readiness.

Expected behavior:

- attach PR URL and deployment links as real Linear links on the root issue
- add a release summary comment
- apply `AI Product OS/Release Ready`
- keep the root issue in `In Review` until `/linear-close`

## Step 3 — Update Sync Metadata

Write these fields back to `project-state.md`:

- `linear_last_sync`
- `linear_sync_status`

Also update `experiments/linear-sync/issue-<NNN>.json` with:

- last sync mode
- last sync timestamp
- document ids created or updated
- task issue mappings created or updated

Do not alter repo stage progression.

---

# State Mapping

- `create-issue` and `explore` -> `Backlog`
- `create-plan` -> planned
- `execute-plan` and `deslop` -> `In Progress`
- blocked review stages -> `In Review` plus `Blocked`
- successful `deploy-check` -> `In Review` plus `Release Ready`

---

# Failure Policy

- If a required repo artifact for the selected mode is missing, raise an explicit error
- If a Linear write fails, raise an explicit error with mode and target context
- If label or document creation conflicts, recover by lookup instead of duplicating objects
- Never create duplicates when an object with the same repo issue number or manifest task ID already exists

---

# Output Format

```text
Mode

Repo Context

Linear Target

Objects Created

Objects Updated

Updated Sync Map

Sync Result
```
