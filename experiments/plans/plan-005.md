# Plan: Issue-005 — SMB Feature Bundling Engine

**Command**: /create-plan
**Date**: 2026-03-19
**Agents**: Product Agent, Design Agent, Backend Architect Agent, Database Architect Agent

---

## Plan Summary

Build a single-page Next.js tool that lets B2B SaaS PMs assemble a custom feature bundle from a pre-loaded catalogue and instantly receive a Gemini-generated value-based pricing proposal (INR) and a warm email pitch for Indian SMB buyers.

No auth. Neon DB (serverless PostgreSQL) persists every bundle session and tracks whether the pitch was copied — enabling real product analytics beyond PostHog events.

Target: PM goes from landing to copied pitch in under 2 minutes.

---

## Product Specification

### Product Goal

Enable B2B SaaS PMs selling to Indian SMBs to assemble a custom feature bundle and receive an AI-generated pricing proposal and email pitch — on demand, in under 2 minutes, without engineering or finance involvement.

### Target User

PM or Sales Lead at an Indian SaaS company (₹50L–5Cr ARR), running 3–10 SMB deals per week. Currently using WhatsApp + Google Sheets for ad hoc deal negotiations.

### User Journey

1. PM opens the tool during or before a sales call
2. Scans the feature catalogue, selects 3–6 features relevant to the prospect
3. Clicks "Generate Bundle Proposal" — waits <5 seconds
4. Reviews pricing card (INR range + 3 ROI bullet points) and email pitch (~150 words)
5. Copies pitch → pastes into Gmail or WhatsApp → sends

### MVP Scope

- 10 pre-loaded SaaS features (no custom entries)
- Single Gemini 2.5 Flash call with structured output (JSON schema)
- Pricing: INR monthly range + 3 ROI bullet points + estimated monthly savings
- Email pitch: ~150-word warm, direct tone for Indian SMB owner
- Copy-to-clipboard on both outputs
- Neon DB persists each session (features selected, price generated, pitch copied flag)
- No auth, no team features

### Success Metrics

| Metric | Target |
|---|---|
| Pitch copied with <20% edits | >50% of sessions |
| Time from landing to first copy | <2 minutes |
| Generation latency | <5 seconds (p95) |
| Gemini parse failure rate | <2% |

### Acceptance Criteria

- PM can select any combination of 1–10 features
- "Generate" button is disabled when 0 features selected
- Valid Gemini response renders pricing + pitch within 5s
- Copy buttons copy correct content to clipboard with "Copied!" feedback
- Graceful error state if Gemini call fails (no crash, retry encouraged)
- Each generation persists a row in `bundle_sessions` (Neon DB)
- `pitch_copied` flag updates in DB when copy button is clicked
- PostHog events fire on `bundle_generated` and `pitch_copied`

---

## UX Design

### Layout

Single-page app. Dark mode (`bg-[#0a0a0a]`). Two-zone layout on desktop: feature board (top) + proposal output (below, animated in on generation).

### Screens

#### Screen 1 — Feature Selection Board (initial state)

```
┌─────────────────────────────────────────────────────────┐
│  SMB Bundle Builder                                     │
│  Assemble the right product for every deal.             │
├─────────────────────────────────────────────────────────┤
│  SELECT FEATURES                                        │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐    │
│  │ ☐ Automated  │ │ ☐ GST-ready  │ │ ☐ WhatsApp   │    │
│  │   Invoicing  │ │   Reports    │ │   Notifs     │    │
│  └──────────────┘ └──────────────┘ └──────────────┘    │
│  [... 7 more feature cards ...]                         │
│                                                         │
│     3 selected  [ Generate Bundle Proposal → ]          │
└─────────────────────────────────────────────────────────┘
```

#### Screen 2 — Generating (loading state)

Button shows spinner + "Generating…". Feature cards dim to 50% opacity.

#### Screen 3 — Proposal Output (success state)

```
┌─────────────────────────────────────────────────────────┐
│  [feature board, selections preserved]                  │
├─────────────────────────────────────────────────────────┤
│  BUNDLE PROPOSAL                                        │
│  ┌────────────────────────────────────────────────┐    │
│  │ Pricing                                        │    │
│  │  ₹2,499 – ₹3,499 / month                      │    │
│  │  Est. savings: ₹12,000/month                   │    │
│  │  • ROI point 1                                 │    │
│  │  • ROI point 2                                 │    │
│  │  • ROI point 3                  [Copy Pricing] │    │
│  └────────────────────────────────────────────────┘    │
│  ┌────────────────────────────────────────────────┐    │
│  │ Email Pitch                                    │    │
│  │  Hi [Name], ...                                │    │
│  │  [~150 words]                     [Copy Email] │    │
│  └────────────────────────────────────────────────┘    │
│  [ ← Rebuild Bundle ]                                   │
└─────────────────────────────────────────────────────────┘
```

#### Screen 4 — Error State

Inline red error banner below the generate button. Feature board stays active, user can retry.

### UI Components

| Component | Type | Description |
|---|---|---|
| `FeatureCard` | Client | Toggleable card. Indigo ring + checkmark when selected |
| `FeatureBoard` | Client | 3-col responsive grid of FeatureCards + selected count badge |
| `GenerateButton` | Client | Disabled + spinner states |
| `PricingCard` | Client | Price range, savings, 3 ROI bullets, copy button |
| `EmailPitchCard` | Client | Pitch text (read-only), copy button with "Copied!" state |
| `ProposalOutput` | Client | Wraps PricingCard + EmailPitchCard. Framer Motion fade-in |
| `ErrorBanner` | Client | Red inline banner with retry message |
| `PostHogProvider` | Client | Wraps app layout for posthog-js initialization |

### Interaction Logic

- Feature cards toggle on click — indigo ring on select, plain border when deselected
- Selected count badge updates in real time
- Generate button: disabled (opacity-50, cursor-not-allowed) if 0 features selected
- On click: spinner appears, features dim, button text → "Generating…"
- On success: ProposalOutput fades + slides up (Framer Motion)
- Copy buttons: "Copied!" for 2s then revert to "Copy Email" / "Copy Pricing"
- "Rebuild Bundle" clears proposal state, returns to full selection view

### Feature Catalogue (10 items)

| ID | Label | Description |
|---|---|---|
| `automated-invoicing` | Automated Invoicing | Auto-generate and send GST-compliant invoices |
| `gst-reports` | GST-ready Reports | One-click GST filing reports and reconciliation |
| `whatsapp-notifications` | WhatsApp Notifications | Automated customer alerts via WhatsApp |
| `role-based-access` | Role-based Access | Control what each team member can see and do |
| `bulk-data-import` | Bulk Data Import | Import customers, products, or records via CSV |
| `api-access` | API Access | Connect to other tools via REST API |
| `custom-branding` | Custom Branding | Add your logo and brand colors to the interface |
| `offline-mode` | Offline Mode | Continue working without internet; syncs on reconnect |
| `multi-currency` | Multi-currency Support | Bill and report in INR, USD, or other currencies |
| `priority-support` | Priority Support | Dedicated support SLA with <4 hour response time |

---

## System Architecture

### Architecture Decision

**Single Next.js monolith, Neon DB, no auth.**

Neon DB (serverless PostgreSQL) is the right fit here: it connects via a standard `DATABASE_URL` connection string, the `@neondatabase/serverless` driver works natively in Vercel serverless functions (HTTP-based, no connection pool needed), and it gives us durable session-level analytics (which features were picked, whether the pitch was actually copied) that PostHog events alone cannot provide.

### Service Map

```
Browser (Client Component)
    │
    │ POST /api/generate-proposal
    │ { selectedFeatures: string[] }
    ▼
Next.js API Route
    │
    ├── Validates input (non-empty array, whitelist check, max 10)
    ├── Builds Gemini prompt with selected features
    ├── Calls Gemini 2.5 Flash (Structured Output, JSON schema)
    ├── Parses + validates response
    ├── Inserts row into bundle_sessions (Neon DB) → returns sessionId
    ├── Fires PostHog server event: bundle_generated (+ latency_ms)
    ▼
Browser ← { sessionId, pricing: {...}, emailPitch: string }
    │
    │ On copy click:
    │ PATCH /api/bundle-sessions/[id]/copied
    ├── Updates bundle_sessions SET pitch_copied = true
    └── PostHog client event: pitch_copied
```

### API Endpoint

#### `POST /api/generate-proposal`

**Request body**:
```json
{
  "selectedFeatures": ["Automated Invoicing", "GST-ready Reports", "WhatsApp Notifications"]
}
```

**Validation rules**:
- `selectedFeatures` must be a non-empty array
- Max 10 items
- Each item must be ≤ 100 chars
- Items must be from the `FEATURES` whitelist (prevent prompt injection)

**Gemini structured output JSON schema**:
```typescript
{
  type: Type.OBJECT,
  properties: {
    pricing: {
      type: Type.OBJECT,
      properties: {
        monthly_price_inr: { type: Type.NUMBER },
        price_range_label: { type: Type.STRING },
        estimated_monthly_savings_inr: { type: Type.NUMBER },
        roi_points: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      },
      required: ["monthly_price_inr", "price_range_label", "estimated_monthly_savings_inr", "roi_points"]
    },
    email_pitch: { type: Type.STRING }
  },
  required: ["pricing", "email_pitch"]
}
```

**Prompt requirements**:
1. List selected features by name
2. Anchor price in ₹999–₹9,999/month range
3. Exactly 3 ROI bullet points referencing Indian SMB operational savings (time saved in hours, CA fees avoided in INR, staff efficiency gains)
4. Email pitch: warm, direct, relationship-first tone. "Hi [First Name]" opener. No "Dear Sir/Madam". 140–160 words
5. No hallucinated company names or personal details in pitch

**Success response**:
```json
{
  "sessionId": "uuid-v4",
  "pricing": {
    "monthly_price_inr": 2999,
    "price_range_label": "₹2,499 – ₹3,499/month",
    "estimated_monthly_savings_inr": 12000,
    "roi_points": [
      "Automated invoicing saves 8 hours/week of manual billing work",
      "GST-ready reports eliminate ₹5,000/month in CA filing fees",
      "WhatsApp notifications reduce customer follow-up calls by ~40%"
    ]
  },
  "emailPitch": "Hi [Name], ..."
}
```

**Error response** (Gemini failure):
```json
{ "error": "Generation failed. Please try again." }
```

**DB failure handling**: If the Neon insert fails, log the error but still return the Gemini response to the user — generation must not be blocked by a DB write failure.

---

#### `PATCH /api/bundle-sessions/[id]/copied`

Marks a session's pitch as copied. Called client-side when the user clicks "Copy Email".

**No request body needed** — the session ID is in the URL.

**Success response**: `{ "ok": true }`

**Validation**: `id` must be a valid UUID. Return 400 if malformed, 404 if session not found.

### File Structure

```
apps/smb-bundler/
  src/
    app/
      page.tsx                         # Main page — Client Component (state root)
      layout.tsx                       # Root layout with PostHog provider
      api/
        generate-proposal/
          route.ts                     # POST handler — Gemini + Neon insert
        bundle-sessions/
          [id]/
            copied/
              route.ts                 # PATCH handler — mark pitch_copied = true
    components/
      FeatureCard.tsx
      FeatureBoard.tsx
      GenerateButton.tsx
      PricingCard.tsx
      EmailPitchCard.tsx
      ProposalOutput.tsx
      ErrorBanner.tsx
      PostHogProvider.tsx
    lib/
      features.ts                      # FEATURES constant (10 items)
      gemini.ts                        # Gemini client + prompt builder
      db.ts                            # Neon serverless client
      posthog.ts                       # PostHog server-side client
  public/
  schema.sql                           # Live schema — run against Neon DB before first deploy
  package.json
  .env.local.example
  README.md
```

### Infrastructure

| Concern | Solution |
|---|---|
| Hosting | Vercel (free tier) |
| Database | Neon DB — serverless PostgreSQL via `@neondatabase/serverless` |
| AI | Gemini 2.5 Flash via `@google/genai` |
| Analytics | PostHog (`posthog-js` + `posthog-node`) |
| Timeout risk | Single Gemini call <3s p95 + Neon HTTP query <100ms — well under 10s Vercel limit |

### Why `@neondatabase/serverless`

Neon's serverless driver uses HTTP (not TCP) to connect, which means it works in Vercel serverless functions without a connection pool. Standard `pg` or Prisma would require connection pooling setup (PgBouncer or Prisma Accelerate) — unnecessary complexity for MVP. The driver exposes a standard `sql` tagged-template interface identical to `pg`.

### Environment Variables

```
DATABASE_URL=postgresql://...      # Neon DB connection string (server-only)
GEMINI_API_KEY=                    # Server-only
NEXT_PUBLIC_POSTHOG_KEY=           # Client-safe
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
```

---

## Database Schema

**Database**: Neon DB (serverless PostgreSQL)
**Client**: `@neondatabase/serverless`
**Schema file**: `schema.sql` — must be run against the Neon DB before first deploy (verified in `/deploy-check`)

### Tables

#### `bundle_sessions`

Stores every generation event. Primary analytics table for validating the hypothesis (do PMs copy pitches?).

```sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS bundle_sessions (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    selected_features   TEXT[]      NOT NULL,
    price_range_label   TEXT        NOT NULL,
    generated_price_inr INTEGER     NOT NULL,
    estimated_monthly_savings_inr INTEGER NOT NULL,
    roi_points      TEXT[]      NOT NULL,
    email_pitch     TEXT        NOT NULL,
    pitch_copied    BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Analytics queries will filter by date range
CREATE INDEX IF NOT EXISTS idx_bundle_sessions_created_at
    ON bundle_sessions (created_at DESC);

-- Check which features are most selected
CREATE INDEX IF NOT EXISTS idx_bundle_sessions_features
    ON bundle_sessions USING GIN (selected_features);
```

### Schema Notes

- **No `user_id`** — anonymous sessions, no auth
- **`selected_features TEXT[]`** — PostgreSQL native array; query with `&& ARRAY['GST-ready Reports']` to find all sessions that included a given feature
- **`pitch_copied`** — updated via `PATCH /api/bundle-sessions/[id]/copied`; this is the primary validation signal
- **No RLS** — no auth, no user isolation needed
- **GIN index on `selected_features`** — enables fast analytics queries like "which features appear most in copied sessions"

---

## Implementation Tasks

| # | Task | Files |
|---|---|---|
| 1 | Bootstrap Next.js app with TS + Tailwind + App Router | `apps/smb-bundler/` |
| 2 | Define feature catalogue constant | `lib/features.ts` |
| 3 | Implement Neon DB client | `lib/db.ts` |
| 4 | Write `schema.sql` and apply to Neon DB | `schema.sql` |
| 5 | Build `FeatureCard` component | `components/FeatureCard.tsx` |
| 6 | Build `FeatureBoard` component | `components/FeatureBoard.tsx` |
| 7 | Build `GenerateButton` component | `components/GenerateButton.tsx` |
| 8 | Build `PricingCard` component | `components/PricingCard.tsx` |
| 9 | Build `EmailPitchCard` component | `components/EmailPitchCard.tsx` |
| 10 | Build `ProposalOutput` component (accepts `sessionId`) | `components/ProposalOutput.tsx` |
| 11 | Build `ErrorBanner` component | `components/ErrorBanner.tsx` |
| 12 | Implement Gemini client + prompt builder | `lib/gemini.ts` |
| 13 | Implement `POST /api/generate-proposal` (validate → Gemini → Neon insert → respond) | `app/api/generate-proposal/route.ts` |
| 14 | Implement `PATCH /api/bundle-sessions/[id]/copied` | `app/api/bundle-sessions/[id]/copied/route.ts` |
| 15 | Wire main page state (`selectedFeatures`, `sessionId`, `proposal`, `loading`, `error`) | `app/page.tsx` |
| 16 | Add PostHog client provider | `components/PostHogProvider.tsx`, `app/layout.tsx` |
| 17 | Add PostHog server event (`bundle_generated` + `latency_ms` + `features`) | `lib/posthog.ts`, API route |
| 18 | Add `pitch_copied` client event + PATCH call on copy click | `EmailPitchCard.tsx` |
| 19 | Write `.env.local.example` | `.env.local.example` |
| 20 | Write `README.md` | `README.md` |

---

## Risks

### Technical

| Risk | Severity | Mitigation |
|---|---|---|
| Gemini INR pricing hallucination (out-of-range values) | Medium | JSON schema constrains types; prompt anchors price to ₹999–₹9,999/month; validate `monthly_price_inr` range server-side before returning |
| Gemini structured output parse failure | Low | `responseMimeType: application/json` + schema enforces valid JSON; fallback returns 500 with user-friendly error |
| Prompt injection via feature names | Low | Whitelist validation — only pre-approved feature strings pass to Gemini prompt |
| Neon DB write failure blocks generation | Low | DB insert wrapped in try/catch — failure is logged but does not block the Gemini response returning to the user |
| `pitch_copied` PATCH drops silently | Low | Client-side fire-and-forget is acceptable here (analytics signal, not business logic); PostHog event provides a redundant signal |

### Market

| Risk | Severity | Note |
|---|---|---|
| PMs don't trust AI-generated INR pricing | High | Central hypothesis to validate. Accept criteria: >50% copy with <20% edits |
| Pitch tone feels too generic / corporate | Medium | Prompt explicitly forbids corporate boilerplate; enforce warm, operational, relationship-first tone |
| "Good enough" WhatsApp + Sheets workaround | Medium | Tool must produce better output in less time. <2 min from landing to copied pitch is the bar |
