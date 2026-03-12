# Architecture Guide

This document defines the standard architecture patterns for building products in the AI Product OS.

All architecture and engineering agents must reference this guide when designing systems.

---

## System Architecture Principles

### 1. Monolith-First for MVPs
- Start with a **single Next.js application** containing frontend, backend API routes, and cron endpoints
- Avoid premature microservices - they add complexity without MVP-stage benefits
- Split services only when you have clear scalability requirements backed by metrics

### 2. Serverless-Native Design
- **Platform**: Default to Vercel for Next.js deployments (serverless functions + edge runtime)
- **Constraints**:
  - 10-second timeout for Hobby tier, 60s for Pro (design accordingly)
  - No persistent processes or long-running background jobs
  - Stateless functions only
- **Fan-Out Pattern**: Cron jobs should trigger, not process. Use worker invocations for per-entity operations.

### 3. Database-First Planning
- Define schema **before** writing application code
- Use relational databases (PostgreSQL via Supabase) for structured data
- Enable Row-Level Security (RLS) from day one, even in MVP
- Write schema.sql files that can be run idempotently

---

## Standard Tech Stack

### Frontend
- **Framework**: Next.js 16+ (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS 4+ (utility-first, responsive design)
- **UI Components**:
  - Framer Motion (animations)
  - Lucide React (icons)
  - Radix UI or Shadcn (accessible primitives)
- **State Management**: React hooks + optimistic UI patterns
- **Client-Side Routing**: Next.js App Router navigation

### Backend
- **API Layer**: Next.js API Routes (serverless functions)
- **Database**: Supabase (PostgreSQL + Auth + Storage)
- **ORM/Client**: `@supabase/supabase-js` (official client)
- **Authentication**: Supabase GoTrue (email/password, OAuth providers)
- **Cron Jobs**: Vercel Cron or external triggers (Upstash QStash)

### AI Integration
- **Primary**: Google Gemini (`@google/genai` SDK)
  - Use `gemini-2.5-flash` for speed-critical operations (<2s response)
  - Use `gemini-2.5-pro` for complex reasoning
  - Always use Structured Outputs (JSON Schema) to guarantee valid responses
- **Alternatives**: OpenAI GPT-4, Anthropic Claude
- **Prompt Engineering**: Store prompts in code, version control them

### Analytics & Monitoring
- **Product Analytics**: PostHog (web + server-side events)
- **Error Tracking**: Vercel Runtime Logs (MVP), Sentry (production)
- **Performance**: Built-in Next.js analytics, Web Vitals

---

## Architecture Patterns

### API Route Design

#### RESTful Endpoints
```typescript
// app/api/[resource]/route.ts
export async function GET(req: Request) {
    // List/Read operations
    // MUST include .limit() on queries
}

export async function POST(req: Request) {
    // Create operations
    // Validate input, call AI if needed, persist to DB
}

export async function PUT(req: Request) {
    // Update operations
    // Use query params for IDs: /api/tasks?id=123
}

export async function DELETE(req: Request) {
    // Delete operations (use soft deletes where possible)
}
```

#### Request Flow
1. **Validation**: Check auth, validate input shape/size
2. **External Calls**: AI APIs, third-party services (MUST await)
3. **Database Operation**: Single source of truth
4. **Response**: Return JSON with success/error structure
5. **Telemetry**: Log event to PostHog before returning

---

### Database Schema Patterns

#### Standard Table Structure
```sql
CREATE TABLE [entity_name] (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),  -- If user-scoped

    -- Business fields
    [field_name] TEXT NOT NULL,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

-- Enable RLS
ALTER TABLE [entity_name] ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Users can only access their own data"
    ON [entity_name]
    FOR ALL
    USING (auth.uid() = user_id);
```

#### Enums
Use PostgreSQL ENUMs for constrained string fields:
```sql
CREATE TYPE task_status AS ENUM ('todo', 'in_progress', 'done');
CREATE TYPE priority AS ENUM ('low', 'medium', 'high');
```

#### Indexes
```sql
-- Index frequently queried columns
CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_created_at ON tasks(created_at DESC);
```

---

### AI Integration Patterns

#### Structured Output Pattern
```typescript
const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.OBJECT,
            properties: {
                category: {
                    type: Type.STRING,
                    enum: ['option1', 'option2', 'option3']
                },
                confidence: { type: Type.NUMBER }
            },
            required: ["category"]
        }
    }
});
```

#### Fallback Handling
```typescript
let result: any = null;
let isFallback = false;

try {
    // Strip markdown codeblocks
    const cleanText = response.text
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

    result = JSON.parse(cleanText);

    // Validate shape
    if (!isValidResult(result)) {
        isFallback = true;
    }
} catch (e) {
    console.error("AI parsing failed:", e);
    isFallback = true;
}

if (isFallback) {
    // Apply safe default to prevent data loss
    result = { category: 'uncategorized', title: rawInput };
}
```

---

### Cron Job Architecture

#### Fan-Out Pattern (REQUIRED)
```typescript
// L ANTI-PATTERN: Master cron processes all users synchronously
export async function GET() {
    const users = await fetchAllUsers();
    for (const user of users) {
        await processUser(user); // Sequential, hits timeout
    }
}

//  CORRECT: Master cron triggers, workers process
export async function GET() {
    const users = await fetchAllUsers();

    // Fan out to individual worker invocations
    await Promise.allSettled(
        users.map(user =>
            fetch('/api/worker', {
                method: 'POST',
                body: JSON.stringify({ userId: user.id })
            })
        )
    );

    return new Response('Triggered');
}
```

#### Batch Database Queries
```typescript
// L ANTI-PATTERN: N+1 queries
for (const userId of userIds) {
    const data = await db.from('tasks').select().eq('user_id', userId);
}

//  CORRECT: Single batched query
const allData = await db
    .from('tasks')
    .select()
    .in('user_id', userIds);
```

---

### Authentication Flow

#### Supabase Auth
```typescript
// Client-side
import { supabase } from '@/lib/supabase';

const { data, error } = await supabase.auth.signUp({
    email,
    password
});

// Server-side (API route)
const token = req.headers.get('authorization')?.split(' ')[1];
const { data: user } = await supabase.auth.getUser(token);
```

#### RLS Policies
```sql
-- Read own data
CREATE POLICY "Users read own tasks"
    ON tasks FOR SELECT
    USING (auth.uid() = user_id);

-- Insert own data
CREATE POLICY "Users insert own tasks"
    ON tasks FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Update own data
CREATE POLICY "Users update own tasks"
    ON tasks FOR UPDATE
    USING (auth.uid() = user_id);
```

---

### Error Classification & Handling

#### Third-Party API Errors
```typescript
function classifyError(error: any): 'transient' | 'permanent' | 'unknown' {
    const status = error.response?.status;

    // Permanent errors (don't retry, may suspend user)
    if ([400, 401, 403, 404].includes(status)) return 'permanent';

    // Transient errors (safe to retry)
    if ([429, 500, 502, 503, 504].includes(status)) return 'transient';

    return 'unknown';
}

// Only apply account-level consequences for permanent errors
if (classifyError(twilioError) === 'permanent') {
    await db.from('users').update({ is_active: false }).eq('id', userId);
}
```

---

### Pagination & Limits

#### API Pagination
```typescript
// REQUIRED: Always enforce limits
export async function GET(req: Request) {
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = Math.min(
        parseInt(url.searchParams.get('limit') || '100'),
        100  // Hard cap
    );

    const { data } = await supabase
        .from('tasks')
        .select()
        .range((page - 1) * limit, page * limit - 1);

    return NextResponse.json({ data, page, limit });
}
```

#### External API Loops
```typescript
// REQUIRED: Both page limit AND temporal bound
let pageCount = 0;
const MAX_PAGES = 5;
const LOOKBACK_DAYS = 30;

while (pageToken && pageCount < MAX_PAGES) {
    const messages = await gmail.users.messages.list({
        userId: 'me',
        pageToken,
        q: `newer_than:${LOOKBACK_DAYS}d`  // Temporal bound
    });

    pageToken = messages.nextPageToken;
    pageCount++;
}
```

---

## Telemetry Architecture

### Event Taxonomy
Structure events by lifecycle stage:

#### User Onboarding
- `landing_page_viewed`
- `signup_started`
- `signup_completed`
- `first_action_completed`

#### Core Feature Usage
- `[feature]_submitted` (user initiates action)
- `[feature]_completed` (system confirms success)
- `[feature]_failed` (system encounters error)

#### System Health
- `ai_fallback_triggered` (AI processing failed)
- `api_timeout` (external service slow)
- `retry_exhausted` (permanent failure)

### Implementation
```typescript
// Frontend (posthog-js)
import { usePostHog } from 'posthog-js/react';

const posthog = usePostHog();
posthog.capture('task_submitted', {
    input_length: text.length,
    timestamp: Date.now()
});

// Backend (posthog-node)
import PostHog from 'posthog-node';

const client = new PostHog(process.env.POSTHOG_KEY);
client.capture({
    distinctId: userId,
    event: 'task_categorized',
    properties: {
        category,
        ai_latency_ms: latency
    }
});
await client.shutdown();
```

---

## Deployment Architecture

### Vercel Production Setup
```bash
# Environment Variables (set in Vercel dashboard)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx
SUPABASE_SERVICE_ROLE_KEY=eyJxxx  # Server-only
GEMINI_API_KEY=AIzxxx            # Server-only
NEXT_PUBLIC_POSTHOG_KEY=phc_xxx
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
```

### Build & Deploy Checklist
1. **Schema Applied**: Run `schema.sql` against Supabase before first deploy
2. **Env Vars Set**: All required secrets configured in platform
3. **Build Success**: `npm run build` completes without errors
4. **RLS Enabled**: Row-level security active on all tables
5. **Telemetry Wired**: PostHog events firing on critical paths
6. **Error Handling**: All API routes return proper 400/500 responses

---

## Anti-Patterns to Avoid

### L Don't Do This
1. **Fire-and-forget promises in serverless functions**
2. **Unbounded database queries without `.limit()`**
3. **Synchronous loops over async operations** (use `Promise.all()`)
4. **Processing all users in a single cron execution**
5. **Using AI snippets/previews instead of full payloads**
6. **Treating all third-party errors as permanent failures**
7. **Skipping RLS because "it's just an MVP"**
8. **Adding telemetry after QA instead of during implementation**

---

## Decision Framework

When designing architecture, answer these questions:

1. **Scalability**: Will this work with 10x users? 100x?
2. **Failure Modes**: What happens if the AI times out? If the DB is slow?
3. **Cost**: Does this architecture fit within platform free tiers?
4. **Observability**: Can I debug this in production with logs alone?
5. **Security**: Is user data properly isolated and encrypted?

---

## References

- Next.js App Router: https://nextjs.org/docs/app
- Supabase Docs: https://supabase.com/docs
- Vercel Limits: https://vercel.com/docs/limits
- PostHog Docs: https://posthog.com/docs

---

This guide is a living document. Update it when postmortems reveal new patterns or anti-patterns.
