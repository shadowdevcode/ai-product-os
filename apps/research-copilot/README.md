# PM Research Copilot

Chat-first PM research workspace: clarify → pick sources/depth → **approve** → run specialized tools with citations, Markdown artifact, and export.

## User journey

1. Open the app — centered composer and suggestion chips.
2. Start a session — left sessions rail appears; optional layout emphasis on the artifact panel when findings exist.
3. Chat with the lead agent — planning tools only until you **Approve plan** (server sets `plan_approved_at`).
4. After approval — execution tools (stubs in T0) can run; **Stop** / **Skip** are wired with telemetry.
5. Refresh or export Markdown from the artifact panel.

## Stack

| Layer     | Choice                                        |
| --------- | --------------------------------------------- |
| Framework | Next.js 16 App Router                         |
| UI        | React 19, Tailwind CSS 4                      |
| AI        | Vercel AI SDK + OpenRouter (`@ai-sdk/openai`) |
| Database  | Neon Postgres (`@neondatabase/serverless`)    |
| Analytics | PostHog (browser + optional server)           |
| Tests     | Vitest                                        |

## Environment variables

See [`.env.local.example`](./.env.local.example). Mandatory for full local flow:

- `DATABASE_URL`
- `RESEARCH_DEV_USER_ID`
- `OPENROUTER_API_KEY`

Verify keys referenced in code:

```bash
grep -r 'process\.env\.' src/ | sed 's/.*process\.env\.\([A-Z0-9_]*\).*/\1/' | sort -u
```

## Database schema

- Authoritative DDL: [`schema.sql`](./schema.sql) — run in the Neon SQL editor (or your migration tool) to create tables.
- Optional idempotent follow-up: `bun run db:upgrade` (uses `src/lib/schema-upgrades.ts`).

## Commands

```bash
cd apps/research-copilot
bun install
cp .env.local.example .env.local   # then fill secrets
bun run dev
```

Success: dev server starts and `http://localhost:3000` loads the centered composer.

```bash
bun run build
bun run lint
bun run test
```

## HTTP API

| Method | Path                                       | Body                                          | Response                                          |
| ------ | ------------------------------------------ | --------------------------------------------- | ------------------------------------------------- |
| `GET`  | `/api/research/sessions`                   | —                                             | `{ sessions }`                                    |
| `POST` | `/api/research/sessions`                   | `{ title? }`                                  | `{ session }`                                     |
| `GET`  | `/api/research/sessions/[id]`              | —                                             | `{ session, messages }`                           |
| `POST` | `/api/research/sessions/[id]/chat`         | `{ messages: UIMessage[] }`                   | UI message stream                                 |
| `POST` | `/api/research/sessions/[id]/plan/confirm` | `{ plan_json? }`                              | `{ session }`                                     |
| `POST` | `/api/research/sessions/[id]/stop`         | —                                             | `{ session }`                                     |
| `POST` | `/api/research/sessions/[id]/skip`         | `{ source_id }`                               | `{ ok }`                                          |
| `GET`  | `/api/research/sessions/[id]/artifact`     | —                                             | `{ brief_markdown, findings_markdown, coverage }` |
| `POST` | `/api/research/sessions/[id]/export`       | `{ which?: 'brief' \| 'findings' \| 'both' }` | Markdown file                                     |

## PostHog events (T0)

| Event                                            | Where                                     |
| ------------------------------------------------ | ----------------------------------------- |
| `research_session_started`                       | `POST /api/research/sessions`             |
| `center_composer_first_message_sent`             | Client bootstrap send                     |
| `project_rail_revealed`                          | Client after session create               |
| `research_plan_edited`                           | Plan option chips                         |
| `research_plan_proposed`                         | `propose_plan` tool                       |
| `research_plan_approved`                         | `POST .../plan/confirm` (single emission) |
| `research_run_started`                           | First execution tool creating a run       |
| `ai_tool_call_*` / `research_run_step_completed` | Tool execute                              |
| `first_cited_finding_rendered`                   | NLP stub inserts evidence                 |
| `research_steer_issued`                          | Client send while executing               |
| `research_run_stopped`                           | `POST .../stop`                           |
| `research_source_skipped`                        | `POST .../skip`                           |
| `artifact_exported_markdown`                     | `POST .../export`                         |
| `post_session_survey_submitted`                  | Session survey                            |

T2-only: `artifact_exported_gdoc` (not emitted in T0).

## Design notes

- **Tool gating:** Execution tools check `plan_approved_at` server-side; planning tools are always available.
- **Active tools:** Until approval, only `ask_clarification` and `propose_plan` are active in `streamText` to reduce accidental tool calls.
