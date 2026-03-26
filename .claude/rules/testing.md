---
globs: ['apps/**/*.test.*', 'apps/**/*.spec.*', 'apps/**/tests/**']
---

# Testing Standards

## Current Approach

QA testing follows a manual checklist executed by the QA Agent during `/qa-test`:

- Happy path (valid input)
- Edge cases (empty strings, zero values, max lengths)
- Invalid inputs (wrong types, malformed JSON)
- Network failures (API timeouts, 500 errors)
- Concurrent operations (race conditions)

## Test File Conventions

- Test files must be colocated with source: `foo.ts` → `foo.test.ts`
- Use `.test.ts` suffix (preferred) or `.spec.ts`
- Test runner: Vitest (when configured)

## Future Direction

Vitest is now configured for all apps (clarity, finance-advisor, ozi-reorder, smb-bundler). Each app has a `vitest.config.ts` that extends the shared base config at `libs/shared/vitest.config.ts`.

Shared mock factories for Supabase, Neon, PostHog, and Google Gemini are available in `libs/shared/test-utils.ts`.

**Requirements for new code:**

- New API routes (`apps/*/src/app/api/`) must include a colocated `.test.ts` file with at least one happy-path test.
- New lib/utility functions (`apps/*/src/lib/`) must include a colocated `.test.ts` file.
- Existing files without tests are grandfathered in, but tests are encouraged when modifying them.
- Run `node scripts/lib/check-test-colocation.js` to verify new files have colocated tests.
