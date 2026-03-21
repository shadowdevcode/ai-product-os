# Clarity

An AI-powered task engine for Product Managers. Drop a raw thought ("Need to sync with Sarah on Q3 roadmap before the board meeting") and Gemini categorizes it, assigns a priority, and cleans up the title — then drops it into the right column on a Kanban board.

**PM goes from messy brain-dump to organized task in under 3 seconds.**

---

## What it does

1. PM types any raw task or thought into the input box
2. Clicks "Add Task"
3. Gemini 2.5 Flash returns a structured task with category + priority + clean title
4. Task appears in the Kanban board under the correct column
5. PM can mark tasks done or revert them to todo

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, TypeScript, Tailwind CSS 4, Lucide Icons |
| Backend | Next.js API Routes |
| AI | Google Gemini 2.5 Flash (Structured Output / JSON schema) |
| Database | Supabase (PostgreSQL) |
| Analytics | PostHog (`posthog-js` + `posthog-node`) |
| Hosting | Vercel |

---

## Setup

### 1. Install dependencies

```bash
cd apps/clarity
npm install
```

### 2. Configure environment variables

```bash
cp .env.local.example .env.local
```

Fill in these values:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
GEMINI_API_KEY=your-gemini-api-key
NEXT_PUBLIC_POSTHOG_KEY=your-posthog-key
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
```

### 3. Apply database schema

Open your Supabase SQL Editor and run `schema.sql`. Verify the `tasks` table and enums exist before running the app.

```sql
-- schema.sql creates:
-- task_category ENUM: unblock | strategy | stakeholders | ops
-- task_priority ENUM: high | medium | low
-- task_status ENUM: todo | done
-- tasks table: id, raw_input, title, category, priority, status, created_at, updated_at
```

### 4. Run locally

```bash
npm run dev
# → http://localhost:3000
```

**What you should see**: A dark-themed Kanban board with four columns (Unblock, Strategy, Stakeholders, Ops) and an input field at the top. Add a task — it should appear in the correct column within 2-3 seconds.

**First error to expect**: If Supabase env vars are missing, the app loads but tasks fail silently (check browser console for DB errors).

---

## API

### `POST /api/tasks`

Creates a task. Gemini categorizes it, then it's saved to Supabase.

**Body**: `{ taskText: string }` — raw PM thought, max 500 chars

**Returns**: `{ success: true, task: { id, title, category, priority, status, raw_input, created_at } }`

**Fallback**: If Gemini fails or returns invalid JSON, task is saved as `category: ops, priority: medium` with title `[Review Needed] <first 30 chars>...`

---

### `GET /api/tasks`

Fetches all tasks, ordered newest-first, max 100.

**Returns**: `{ tasks: Task[] }`

---

### `PUT /api/tasks?id=<uuid>`

Updates a task's status.

**Body**: `{ status: "done" | "todo" }`

**Returns**: `{ success: true, task: Task }`

---

## Analytics

| Event | Where | Properties |
|---|---|---|
| `task_categorized` | Server (PostHog Node) | `category`, `priority`, `ai_latency_ms`, `task_id` |
| `ai_fallback_triggered` | Server (PostHog Node) | `input_length` |

---

## Key design decisions

- **No auth** — anonymous single-user MVP; all tasks are shared in one Supabase table.
- **Gemini Structured Output** — JSON schema enforced at the API level, not parsed from free text. Eliminates markdown stripping issues.
- **Fallback on AI failure** — task is never lost; fallback category prevents data loss.
- **Telemetry at build time** — PostHog events wired during implementation, not added post-QA.
