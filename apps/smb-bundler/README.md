# SMB Bundle Builder

A single-page Next.js tool for B2B SaaS PMs to assemble custom feature bundles and generate AI-powered value-based pricing proposals for Indian SMB buyers.

**PM goes from landing to copied pitch in under 2 minutes.**

---

## What it does

1. PM selects 3–6 features from a 10-item catalogue
2. Clicks "Generate Bundle Proposal"
3. Gemini 2.5 Flash returns an INR pricing card + warm email pitch (~150 words) in <5s
4. PM copies the pitch directly into Gmail or WhatsApp

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, TypeScript, Tailwind CSS 4, Framer Motion |
| Backend | Next.js API Routes |
| AI | Google Gemini 2.5 Flash (Structured Output / JSON schema) |
| Database | Neon DB via `@neondatabase/serverless` |
| Analytics | PostHog (`posthog-js` + `posthog-node`) |
| Hosting | Vercel |

---

## Setup

### 1. Install dependencies

```bash
cd apps/smb-bundler
npm install
```

### 2. Configure environment variables

```bash
cp .env.local.example .env.local
# Fill in DATABASE_URL, GEMINI_API_KEY, NEXT_PUBLIC_POSTHOG_KEY
```

### 3. Apply database schema

Open your Neon DB SQL Editor and run `schema.sql`. Verify the `bundle_sessions` table exists before deploying.

### 4. Run locally

```bash
npm run dev
# → http://localhost:3000
```

---

## API

### `POST /api/generate-proposal`

**Body**: `{ selectedFeatures: string[] }` — labels from the feature catalogue (1–10 items)

**Returns**: `{ sessionId, pricing: { monthly_price_inr, price_range_label, estimated_monthly_savings_inr, roi_points }, emailPitch }`

**Validation**: whitelist check on all feature labels (prompt injection prevention), max 10, each ≤100 chars.

---

### `PATCH /api/bundle-sessions/:id/copied`

Marks a session's pitch as copied. Called client-side when the user clicks "Copy Email".

**Returns**: `{ ok: true }` on success.

---

## Analytics

| Event | Where | Properties |
|---|---|---|
| `bundle_generated` | Server (PostHog Node) | `session_id`, `features`, `feature_count`, `latency_ms` |
| `pitch_copied` | Client (PostHog JS) | `session_id` |

The `pitch_copied` flag is also persisted to `bundle_sessions.pitch_copied` in Neon DB for durable analytics.

---

## Key design decisions

- **No auth** — anonymous sessions; Neon DB selected over Supabase to avoid the auth/RLS setup overhead.
- **Whitelist validation** on feature names prevents prompt injection.
- **DB failure is non-blocking** — Gemini response returns to the user even if the Neon insert fails.
- **Telemetry during feature build** — PostHog events wired at implementation time, not post-QA.
