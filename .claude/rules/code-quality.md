---
globs: ['apps/**/*.ts', 'apps/**/*.tsx', 'src/**/*.ts', 'src/**/*.tsx']
---

# Code Quality Rules

These rules are derived from production postmortems and must be followed in all implementations.

## 1. Serverless Environment Constraints

**Never fire-and-forget promises in API routes.** Vercel/AWS Lambda suspend execution immediately after HTTP response.

```typescript
// BAD - Promise will be dropped
sendNotification(userId, message);
return NextResponse.json({ success: true });

// GOOD - Await all async operations
await sendNotification(userId, message);
return NextResponse.json({ success: true });
```

## 2. Cron Job Architecture (Fan-Out Pattern)

**Never process all users synchronously in a single cron function.** Use fan-out architecture.

```typescript
// GOOD - Master cron triggers, workers process
export async function GET() {
  const users = await fetchAllUsers();
  await Promise.allSettled(
    users.map((user) =>
      fetch('/api/worker', {
        method: 'POST',
        body: JSON.stringify({ userId: user.id }),
      })
    )
  );
  return new Response('Triggered');
}
```

## 3. Database Queries

- **Always use `.limit()`** - Never fetch unbounded lists
- **Use batch operations** - Prefer `.in()` over N individual queries
- **Enable RLS from day one** - All user-scoped tables must have Row-Level Security policies

## 4. External API Loops

**MUST have both page limit AND temporal bound** to prevent infinite loops.

```typescript
let pageCount = 0;
const MAX_PAGES = 5;
while (pageToken && pageCount < MAX_PAGES) {
  const messages = await api.list({ pageToken, q: `newer_than:30d` });
  pageCount++;
}
```

## 5. AI Response Parsing

**Always sanitize LLM outputs before parsing:**

````typescript
const cleanText = aiResponse.text
  .replace(/```json\n?/g, '')
  .replace(/```\n?/g, '')
  .trim();

try {
  const result = JSON.parse(cleanText);
  if (!isValid(result)) {
    result = { category: 'uncategorized', title: rawInput };
  }
} catch (e) {
  console.error('AI parsing failed:', e);
}
````

## 6. Telemetry Integration

**Implement telemetry during feature development, not post-QA.** PostHog events must be wired during `/execute-plan`, not during `/metric-plan`.

## 7. Database Schema Deployment

**Verify schema exists in remote database during `/deploy-check`** before running builds. Supabase/Neon requires explicit SQL execution via CLI or editor.

## Quality Limits (Mechanical Enforcement)

| Entity              | Limit        | Rationale                    |
| ------------------- | ------------ | ---------------------------- |
| File length         | 300 lines    | Forces modularity            |
| Function length     | 50 lines     | Single concern per function  |
| Nested conditionals | 5+ levels    | Extract to named functions   |
| Import statements   | 10+ per file | Module doing too much; split |
