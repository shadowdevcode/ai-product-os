---
globs: ['commands/**/*.md']
---

# Command Definition Rules

## Execution Protocol

When a command is triggered:

1. Locate the command file in `/commands/`
2. Read the full instructions defined in the command file
3. Identify which agents must be activated
4. Load agent instructions from `/agents/`
5. Apply system knowledge from `/knowledge/`
6. Execute the workflow defined in the command
7. Produce output in the specified format

## Required Context Loading

Before executing ANY command, the system must read:

- `project-state.md` — extract active_issue, current_stage, status
- `experiments/ideas/<active_issue>.md` — the active issue file
- Only the knowledge files listed in the command's `## Required Knowledge` section (top of each `commands/*.md` file)
- Related exploration and plan files if they exist

## State Management

After every command execution, update `project-state.md`:

- Set `last_command_run` to the executed command
- Update `stage` to the current pipeline stage
- Update `status` (in-progress, blocked, done, completed)
- Set quality gate status (pass/fail) for review stages
- Append key decisions to the Decisions Log

## Quality Gate Enforcement

Stages cannot progress unless the previous stage's quality gate passes. If blocked, set status to `blocked` and add the blocker to the Blockers section.
