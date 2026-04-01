# Linear Operations

Shared runtime rules for the Linear utility commands.

These rules define how the AI Product OS uses Linear as a PM-facing layer while keeping the repo as the source of truth.

---

## Source Of Truth

- The repo is canonical.
- `project-state.md` is the human-readable workflow state.
- `experiments/ideas/`, `experiments/exploration/`, `experiments/plans/`, and `experiments/results/` remain the authoritative artifacts.
- Linear mirrors repo state. It never overrides repo intent.

---

## Sync Map

Persist Linear identities in:

- `experiments/linear-sync/issue-<NNN>.json`

Use the sync map as the canonical external identity store for:

- team id and team name
- project id, name, and URL
- root issue id, identifier, and title
- created label ids
- created document ids
- manifest task id to Linear issue mapping
- last sync mode and timestamp

The sync map must be read before `project-state.md` for idempotent re-syncs.

Lookup order:

1. `experiments/linear-sync/issue-<NNN>.json`
2. `project-state.md`
3. Live Linear lookup by exact team plus exact title

---

## Naming Rules

Project title:

- `issue-<NNN> — <repo issue title>`

Root issue title:

- `issue-<NNN> — <repo issue title>`

Child issue title:

- `[issue-<NNN>][<task_id>] <task name>`

Document titles:

- `issue-<NNN> Plan Snapshot`
- `issue-<NNN> Closeout Snapshot`

---

## Default Workspace Rules

If `/linear-bind` is run without a team argument:

- If exactly one team exists, use that team
- If more than one team exists, fail explicitly

Current expected workspace shape:

- default team: `Vijaypmworkspace`
- issue statuses: `Backlog`, `Todo`, `In Progress`, `In Review`, `Done`
- no active cycles required for v1

---

## Label Taxonomy

Ensure the parent label group exists:

- `AI Product OS`

Ensure these child labels exist under that group:

- `Discovery`
- `Planning`
- `Execution`
- `Review`
- `Blocked`
- `Release Ready`
- `Completed`

Also use the workspace-level `Feature` label on root and child issues unless a different work type is explicitly required by the repo artifact.

---

## Status Mapping

Repo stage to root issue workflow status:

- `create-issue`, `explore` -> `Backlog`
- `create-plan` -> `Todo`
- `execute-plan`, `deslop` -> `In Progress`
- `review`, `peer-review`, `qa-test`, `deploy-check` -> `In Review`
- `learning` complete -> `Done`

Repo stage to AI Product OS stage label:

- `create-issue`, `explore` -> `Discovery`
- `create-plan` -> `Planning`
- `execute-plan`, `deslop` -> `Execution`
- `review`, `peer-review`, `qa-test` -> `Review`
- blocked state also applies `Blocked`
- successful `deploy-check` also applies `Release Ready`
- successful `learning` applies `Completed`

Only one active stage label should be present at a time, except:

- `Blocked`
- `Release Ready`
- `Completed`

These may coexist when appropriate.

---

## Document Snapshot Rules

Plan snapshot document must include:

- plan summary
- manifest summary
- repo file paths for the plan and manifest

Closeout snapshot document must include:

- postmortem summary
- learning summary
- repo file paths for postmortem and learning-related artifacts

Use update-in-place when the sync map already stores a document id.

---

## Child Issue Rules

Create child issues only from `manifest-<issue_number>.json`.

Each child issue description must include:

- phase id and phase name
- assigned agent
- files to create
- files to modify
- verification command
- test file

Child issues default to:

- issue status `Todo`
- labels `Feature` and `AI Product OS/Execution`

Do not auto-close child issues in v1.

---

## Failure Policy

Raise explicit errors for:

- missing `active_issue`
- missing bind before sync, brief, or close
- missing manifest for `plan` sync
- missing cycle when `cycle` brief is requested
- multiple teams when no team argument is provided
- failed Linear API operations

Linear write conflicts must recover by lookup rather than creating duplicates.

Never use silent fallback.
