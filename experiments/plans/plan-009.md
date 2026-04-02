# Plan 009 — MoneyMirror: AI-Powered Personal Finance Coach

**Issue:** 009
**Project:** MoneyMirror
**Stage:** plan
**Status:** active
**Date:** 2026-04-02

---

## 1. Plan Summary

MoneyMirror is a mobile-first PWA built for Gen Z Indians to solve the "perception gap" in personal finance. The MVP validates the core value proposition: **Can seeing the truth about your money (perceived vs. actual spend) drive a statement upload and behavioral change?**

We will build a high-trust, low-friction parsing engine for HDFC bank statements, a "Mirror Report" sharing hook, and a proactive AI advisory system delivering no-sugarcoating financial coaching.

---

## 2. Product Specification (Product Agent)

### Product Goal

Reveal the 60–75% "perception gap" in spending and drive a second-month statement upload rate of ≥60%.

### Target User

- **Primary:** Gen Z Indians (22–30), earning ₹20K–₹80K/month.
- **Behaviors:** UPI-native, Zomato/Swiggy frequenters, finance-aware but action-light.

### User Journey

1. **Onboarding:** Answer 5 questions -> Get instant "Money Health Score."
2. **Mirror Trigger:** See "Perceived Spend" baseline. High-friction barrier (PDF upload) is motivated by the score.
3. **The Mirror Moment:** Upload HDFC PDF -> AI generates actual spend list -> Side-by-side comparison.
4. **Coaching:** Receive 2–3 "no sugarcoating" advisory triggers (subscription leaks, convenience tax).
5. **Retention:** Weekly Monday morning email recap summarizing leaks.

### MVP Scope

- **Include:** Phone/OTP login, HDFC PDF parsing (last 3 months), Perceived vs. Actual dashboard, Top 5 advisory triggers, Resend email integration.
- **Exclude:** WhatsApp integration (Phase 2), Credit Card parsing (Phase 2), Gamification, Net Worth tracking.

### Success Metrics

- **North Star:** 2nd-month Statement Upload Rate (≥60%).
- **Activation:** Onboarding Score -> PDF Upload Conversion (≥40%).
- **Viral:** "Mirror Report" card shares (≥10% of active users).

---

## 3. UX Design (Design Agent)

### User Flow

- **Landing:** Minimalist, high-urgency headline -> "Find my score."
- **Progressive Onboarding:** One question per screen. Animated score reveal.
- **Upload Center:** Instructions for HDFC NetBanking PDF -> Drag & Drop -> "Cleaning the mirror..." (Processing).
- **Dashboard:** "The Truth" (side-by-side card), Scrollable Advisory Feed, Category "Leaks" list.

### UI Components (shadcn/ui + Tailwind 4)

- `MirrorCard`: 50/50 split showing "Perceived: ₹30k" vs "Actual: ₹48k."
- `LeakBadge`: Highlighted transaction with consequence text (e.g., "₹450 on Zomato convenience fees = 2 days of rent").
- `ScoreDial`: High-fidelity SVG dial (Red -> Green).

---

## 4. System Architecture (Backend Architect Agent)

### System Overview

- **Frontend/Backend:** Next.js 14 Monolith on Vercel.
- **AI Engine:** Gemini 1.5 Flash (Processing) + Gemini 1.5 Pro (Refining Advisory).
- **Notifications:** Resend (Transactional Email).
- **Telemetry:** PostHog (Event tracking).

### API Endpoints

- `POST /api/auth/otp`: Supabase Auth trigger.
- `POST /api/statement/parse`: Receives PDF -> AI Processing -> Returns structured JSON.
- `GET /api/dashboard`: Fetches mirror stats + advisory feed.
- `POST /api/cron/weekly-recap`: Triggers Resend email fan-out.

### Data Flow

1. User uploads PDF to `api/statement/parse`.
2. Serverless function extracts text (PDF.js) -> Sends to Gemini Flash with structured schema.
3. Raw PDF is **deleted immediately**.
4. Categorized transactions saved to Neon DB as **paisa integers (BigInt)**.
5. Advisory engine runs (Gemini Pro) to generate 3 highlights.

### Security Pre-Approval Gate

1. **RLS:** Enabled on `profiles`, `statements`, `transactions`, `advisory_feed`.
2. **Worker Auth:** `POST /api/cron/*` requires `CRON_SECRET` header.
3. **Rate Limiting:** `api/statement/parse` limited to 3 uploads/day per user.
4. **Env Vars:** `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, `RESEND_API_KEY`, `POSTHOG_KEY`, `CRON_SECRET`.

### Mandatory Pre-Approval (Serverless + AI)

- **AI Timeout:** `Promise.race` at **9s** for Gemini calls.
- **Paisa Storage:** Store ₹450.50 as `45050`.
- **Privacy:** `statements` table stores metadata, NOT the original file.

---

## 5. Database Schema (Database Architect Agent)

### Database: Neon (PostgreSQL)

```sql
-- Profiles: User financial context
CREATE TABLE profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    perceived_spend BIGINT NOT NULL, -- in paisa
    target_savings_rate INT DEFAULT 20,
    money_health_score INT,
    onboarded_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Statements: Metadata for uploads
CREATE TABLE statements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id),
    bank_name TEXT NOT NULL, -- 'HDFC'
    period_start DATE,
    period_end DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Transactions: The structured data
CREATE TABLE transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    statement_id UUID REFERENCES statements(id),
    user_id UUID REFERENCES profiles(id),
    amount BIGINT NOT NULL, -- in paisa
    merchant_name TEXT,
    category TEXT, -- 'Needs', 'Wants', 'Investment', 'Debt'
    transaction_date DATE,
    is_leak BOOLEAN DEFAULT false
);

-- Advisory Feed: Coaching messages
CREATE TABLE advisory_feed (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id),
    title TEXT,
    message TEXT,
    severity TEXT, -- 'info', 'warning', 'critical'
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

---

## 6. Implementation Tasks

### Phase 1: Foundation (3 days)

- [ ] T1: Initialize Next.js 14 project with Tailwind 4 + shadcn/ui.
- [ ] T2: Setup Supabase Auth (Phone/OTP) and Neon DB schema.
- [ ] T3: Implement 5-question onboarding flow + scoring algorithm.

### Phase 2: The Parsing Engine (4 days)

- [ ] T4: Implement PDF.js text extraction service.
- [ ] T5: Build Gemini 1.5 Flash parser with structured HDFC schema.
- [ ] T6: Implement transaction categorization logic (Needs/Wants/Leaks).
- [ ] T7: Add PDF secure deletion post-parse.

### Phase 3: The Mirror (3 days)

- [ ] T8: Build Dashboard UI with "Side-by-Side" Mirror Card.
- [ ] T9: Implement Advisory Engine (Top 5 triggers: Swiggy/Zomato, Subscriptions, BNPL).
- [ ] T10: Setup Shareable Mirror Report card generator (HTML-to-Canvas).

### Phase 4: Polish & Retention (2 days)

- [ ] T11: Integrate Resend for Weekly Email Recap.
- [ ] T12: Setup PostHog telemetry for Mirror Moment conversion.

---

## 7. Risks & Mitigation

| Risk             | Severity  | Mitigation                                                                         |
| ---------------- | --------- | ---------------------------------------------------------------------------------- |
| PDF Format Drift | 🔴 High   | Start with HDFC exclusively. Use LLM for structural flexibility rather than regex. |
| User Data Trust  | 🔴 High   | Explicit "Zero Retention" policy for raw PDFs displayed during upload.             |
| AI Latency       | 🟡 Medium | 9s timeout fallback. Use Optimistic UI for categorization.                         |
| CAC/Distribution | 🟡 Medium | Focus on shareable "Mirror Report" viral loop; align with Warikoo persona.         |
