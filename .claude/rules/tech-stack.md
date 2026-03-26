---
globs: ['apps/**/*.ts', 'apps/**/*.tsx', 'src/**/*.ts', 'src/**/*.tsx']
---

# Tech Stack Standards

## Frontend

- Next.js 16+ (App Router, not Pages Router)
- TypeScript strict mode (no `any` types)
- Tailwind CSS 4+
- React Server Components by default, Client Components only when needed (`"use client"`)

## Backend

- Next.js API Routes (`app/api/[resource]/route.ts`)
- Supabase (PostgreSQL + Auth + Storage) or Neon DB (`@neondatabase/serverless`)
- `@supabase/supabase-js` client

## AI Integration

- Google Gemini (`@google/genai`)
- Use `gemini-2.5-flash` for speed (<2s), `gemini-2.5-pro` for reasoning
- Always use Structured Outputs (JSON Schema) to guarantee valid responses

## Analytics

- PostHog (`posthog-js` for web, `posthog-node` for server-side)

## File Structure Standard

```
apps/[project-name]/
  src/
    app/              # Next.js App Router
      api/            # API routes
      [feature]/      # Feature-based pages
      layout.tsx      # Root layout
    components/       # Reusable UI components
    lib/              # Utilities, clients, helpers
  public/             # Static assets
  schema.sql          # Database schema (must be idempotent)
  package.json
  README.md
```

## Building Apps

Each app in `/apps` is an independent Next.js project:

```bash
cd apps/[project-name]
npm install
npm run dev      # Start dev server (http://localhost:3000)
npm run build    # Production build
npm run lint     # ESLint check
```

## Applying Database Schema

Supabase/Neon schemas must be manually applied:

1. Open SQL Editor (Supabase dashboard or Neon console)
2. Run `schema.sql` from the project directory
3. Verify tables exist before deploying
