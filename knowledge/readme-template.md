# README Template

Standard README structure for all apps in `/apps`. Every app must have a README that allows any developer (or AI agent) to understand the app, set it up, and run it without asking anyone.

Use `smb-bundler/README.md` as the reference implementation.

---

## Required Sections

### 1. Title + One-liner

```
# App Name

One sentence: what it does and who it's for.

**The core value prop in one sentence (e.g., "PM goes from idea to pitch in 2 minutes.").**
```

### 2. What it does

Numbered steps describing the user journey end-to-end. Max 5-6 steps. No jargon.

```markdown
## What it does

1. User does X
2. System does Y (with which AI/service)
3. User receives Z
```

### 3. Stack

A table. Always include: Frontend, Backend, AI, Database, Analytics, Hosting.

```markdown
## Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, TypeScript, Tailwind CSS 4 |
| Backend | Next.js API Routes |
| AI | Google Gemini 2.5 Flash (Structured Output) |
| Database | Supabase (PostgreSQL) |
| Analytics | PostHog |
| Hosting | Vercel |
```

### 4. Setup

Must cover all four steps. No skipping.

```markdown
## Setup

### 1. Install dependencies
### 2. Configure environment variables
  - List every env var by name
  - Include cp .env.local.example .env.local instruction
### 3. Apply database schema
  - Where to run it (Supabase SQL Editor, Neon editor, etc.)
  - What tables/enums are created
### 4. Run locally
  - npm run dev command
  - What URL to open
  - What you should see on success
  - What the first error looks like if setup is wrong
```

### 5. API

Document every HTTP endpoint the app exposes. At minimum:

```markdown
## API

### `METHOD /api/path`

What it does (one line).

**Body / Query params**: types and constraints

**Returns**: shape of the response

**Edge cases / fallbacks** (if any)
```

### 6. Analytics (if PostHog is used)

```markdown
## Analytics

| Event | Where | Properties |
|---|---|---|
| `event_name` | Server/Client | `prop1`, `prop2` |
```

### 7. Key design decisions

3-5 bullets explaining the "why" behind non-obvious choices. Especially: auth decisions, DB choice, error handling strategy, telemetry timing.

```markdown
## Key design decisions

- **No auth** — reason
- **DB choice** — why Supabase vs Neon vs other
- **Fallback behavior** — what happens when AI fails
```

---

## Quality Gate Checklist

Before marking deploy-check as approved, verify the app README has:

- [ ] One-liner describing what the app does and who it's for
- [ ] Numbered user journey (What it does)
- [ ] Stack table with all layers
- [ ] All env vars listed by name
- [ ] Schema apply step with what tables are created
- [ ] `npm run dev` step + what success looks like
- [ ] Every HTTP endpoint documented (method, body, response)
- [ ] Analytics events table (if PostHog is used)
- [ ] Key design decisions section

---

## What NOT to include

- Next.js boilerplate links ("Learn More about Next.js...")
- Generic deployment instructions ("Deploy on Vercel")
- Filler text or marketing copy
- Internal pipeline details (experiments/, issue numbers, etc.)
