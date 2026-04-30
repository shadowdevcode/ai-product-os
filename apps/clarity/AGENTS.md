# Clarity App Agent Context

## App Identity

- **Project**: Clarity
- **Tagline**: The AI task engine for Product Managers.
- **Runtime**: Bun (Next.js 16)

## Development Workflow

- **Validation**: Every commit must pass `bun run validate`.
- **Testing**: Co-locate unit tests in `__tests__` or use `.test.ts`. Use Vitest.
- **Env**: Always add new environment variables to `.env.local.example`.

## Architecture Highlights

- Uses **Supabase** for persistence.
- Uses **Google Gemini 2.5 Flash** for categorization.
- Uses **PostHog** for telemetry (Server-side events MUST be fire-and-forget).

Follow the root [AGENTS.md](../../AGENTS.md) for full system pipeline and role definitions.
