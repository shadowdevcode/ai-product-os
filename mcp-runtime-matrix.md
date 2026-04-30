# MCP Runtime Matrix

This matrix defines the authoritative state of MCP integrations across the AI Product OS.

| Integration     | Codex | Claude | Cursor | VS Code | Scope          |
| --------------- | ----- | ------ | ------ | ------- | -------------- |
| Linear          | Read  | Full   | Read   | View    | Project Sync   |
| Neon            | -     | Full   | -      | Read    | Database Ops   |
| Vercel          | -     | Full   | -      | View    | Deployments    |
| Codebase-Memory | Full  | Full   | Full   | Full    | Search & Graph |
| Playwright      | -     | Full   | -      | -       | E2E Testing    |

## Integration Guidelines

### 1. Codex (OpenAI)

- **Primary Mode**: Read-only audit and planning.
- **Constraints**: Use root-level `.codex/config.toml` to restrict MCP tool write-access. Focus on structural integrity and best practices.

### 2. Claude (Anthropic)

- **Primary Mode**: Full Pipeline Execution.
- **Protocol**: Claude is the canonical orchestrator. All quality gates and sequential pipeline commands are optimized for Claude Code.

### 3. Cursor / VS Code

- **Primary Mode**: IDE-assisted implementation.
- **Protocol**: Use IDE context rules (`.cursor/rules` or `.vscode/settings.json`) to enforce local coding standards while remaining within the pipeline stage.

---

## Safety & Bounded Subagents

- **Bounded Exploration**: High-volume tasks (e.g., massive file reads, exhaustive searches) MUST be delegated to subagents.
- **Audit Logging**: All MCP write operations should be logged in `project-state.md` Decisions Log.
