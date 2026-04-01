# Command: /linear-close

## Required Knowledge

Load only these knowledge files before executing:

- knowledge/linear-operations.md

---

Purpose:
Close the Linear project for the active issue after the repo workflow is complete.

This command finalizes the PM-facing tracking layer after `/learning` has finished in the repo.

---

# When to Run

Run `/linear-close` after `/learning` succeeds.

This command should not be used to bypass unfinished repo stages.

---

# Context Loading

1. Read `project-state.md`
2. Read `experiments/results/postmortem-<issue_number>.md` if it exists
3. Read the most recent learning outputs if they exist
4. Read Linear metadata from `project-state.md`
5. Read `experiments/linear-sync/issue-<NNN>.json` if it exists

If the active issue is not bound to Linear, stop and raise an explicit error.

---

# Agent Activated

Activate `agents/linear-agent.md`.

---

# Execution

## Step 1 — Verify Repo Completion

Confirm:

- `last_command_run` is `/learning` or equivalent completion is recorded
- repo status is `completed`, `done`, or otherwise clearly closed

If the repo workflow is still active, raise an explicit error.

## Step 2 — Finalize Linear Project

Use these MCP tools:

- `get_project`, `save_project`
- `get_issue`, `save_issue`
- `list_comments`, `save_comment`
- `create_document`, `update_document`

Expected behavior:

- set the project state to `completed`
- set the root issue status to `Done`
- remove active stage labels and apply `AI Product OS/Completed`
- create or update a closeout snapshot document titled `issue-<NNN> Closeout Snapshot`
- include postmortem summary, learning summary, and local repo artifact paths
- add a final closeout comment on the root issue

## Step 3 — Update Repo Metadata

Write these fields to `project-state.md`:

- `linear_last_sync`
- `linear_sync_status`

Also update `experiments/linear-sync/issue-<NNN>.json` with:

- closeout document id
- last sync mode `close`
- last sync timestamp

Do not modify historical pipeline records.

---

# Failure Policy

- If the repo workflow is not complete, raise an explicit error
- If closing the Linear project fails, raise an explicit error with target context

---

# Output Format

```text
Operation

Repo Completion Check

Linear Target

Closeout Actions

Final Sync Result
```
