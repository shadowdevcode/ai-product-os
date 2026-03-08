# Development Plan: Gmail Summary → WhatsApp Notifier

**Date:** 2026-03-05
**Source:** [Exploration Report](file:///Users/vijaysehgal/Downloads/Portfolio/ai-product-os/experiments/exploration/gmail-whatsapp-summarizer.md)
**Agents:** Product Agent · Design Agent · Backend Architect Agent · Database Architect Agent

---

## Plan Summary

Build a lightweight service that connects to a user's Gmail, generates AI-powered email summaries on a schedule, and delivers prioritized digests to WhatsApp. The MVP is a simple web app for onboarding + a backend cron service — no mobile app needed.

**Timeline estimate:** 2–3 weeks
**Core bet:** Users will read email summaries on WhatsApp because it requires zero behavior change.

---

## 1 · Product Specification

*Agent: Product Agent*

### Product Goal

Enable busy professionals to stay on top of important emails without opening Gmail — by receiving AI-summarized digests directly on WhatsApp.

### Target User

| Attribute | Detail |
|---|---|
| **Who** | Busy professionals — founders, PMs, consultants, freelancers |
| **Volume** | 50–200+ emails/day |
| **Behavior** | Check WhatsApp 50+ times/day, check Gmail 5–10 times/day |
| **Context** | On-the-go, between meetings, during commutes |
| **Pain** | Fear of missing critical emails; inbox fatigue |

### Core User Journey

```
1. User visits landing page
2. User connects Gmail via Google OAuth (read-only)
3. User enters WhatsApp number
4. User selects digest frequency (every 2h / 3x day / daily)
5. System runs on schedule → reads unread emails → AI summarizes → sends WhatsApp digest
6. User receives digest on WhatsApp with prioritized email summaries
```

### MVP Scope

**✅ Included**

- Google OAuth for Gmail (read-only scope)
- AI-powered email summarization (Gemini / GPT-4o)
- WhatsApp delivery via Twilio
- Configurable digest frequency (2h / 3x day / daily)
- Priority classification (🔴 Urgent / 🟡 Important / 🟢 FYI)
- Simple onboarding web app

**❌ Excluded**

- Reply-from-WhatsApp
- Multiple email accounts
- Custom filters or rules
- Mobile app
- Team/enterprise features
- Authentication beyond Google OAuth
- Analytics dashboard

### Success Metrics

| Metric | Target |
|---|---|
| Beta sign-ups | 50 users in 2 weeks |
| Daily summary read rate | ≥ 60% |
| Day-14 retention | ≥ 40% |
| NPS score | ≥ 40 |
| Avg. self-reported email checks/day reduction | ≥ 30% |

### Acceptance Criteria

- [ ] User can connect Gmail via OAuth
- [ ] User can register WhatsApp number
- [ ] User can select digest frequency
- [ ] System sends AI-summarized digest on schedule
- [ ] Digest correctly classifies emails by priority
- [ ] User receives digest on WhatsApp within 2 minutes of scheduled time
- [ ] System handles OAuth token refresh without user intervention

---

## 2 · UX Design

*Agent: Design Agent*

### User Flow

```
Landing Page → Connect Gmail (OAuth) → Enter WhatsApp Number → Select Frequency → Confirmation → (Exit)
                                                                                        ↓
                                                                            WhatsApp Digest Arrives
                                                                                        ↓
                                                                            User reads summary
```

### Screens

| # | Screen | Purpose |
|---|---|---|
| 1 | **Landing Page** | Value proposition, CTA to get started |
| 2 | **Connect Gmail** | Google OAuth consent flow (Google-hosted) |
| 3 | **Setup** | Enter WhatsApp number + select digest frequency |
| 4 | **Confirmation** | Success state — "You're all set! First digest arriving soon." |
| 5 | **Settings** | Change frequency, disconnect Gmail, update WhatsApp number |

### UI Components

| Component | Location | Notes |
|---|---|---|
| Hero section with CTA | Landing Page | "Never miss an important email again" |
| Google Sign-In button | Connect Gmail | Standard Google OAuth button |
| Phone number input | Setup | With country code selector, WhatsApp validation |
| Frequency selector | Setup | 3 options: Every 2h / 3x day / Daily |
| Success animation | Confirmation | Lottie or CSS animation |
| Settings form | Settings | Editable frequency, phone, disconnect button |

### Interaction Logic

1. **Landing → OAuth**: Single CTA button triggers Google OAuth popup
2. **OAuth → Setup**: Auto-redirect after successful Gmail connection
3. **Setup → Confirm**: Form validates phone number format before submission
4. **Confirm**: Auto-sends first test digest within 1 minute as onboarding
5. **Settings**: Accessible via link in every WhatsApp digest ("⚙️ Manage settings")

### UX Risks

| Risk | Mitigation |
|---|---|
| Users hesitant to grant Gmail access | Show clear read-only scope explanation + privacy commitment |
| WhatsApp number validation failures | Use Twilio Lookup API to verify before saving |
| Users forget they signed up | Include "Powered by InboxPulse" footer in every digest |
| No way to give feedback | Add "👍 / 👎" quick reaction buttons in digest messages |

---

## 3 · System Architecture

*Agent: Backend Architect Agent*

### System Overview

```
┌──────────────┐     ┌──────────────────┐     ┌───────────────┐
│   Frontend   │────▶│   API Server     │────▶│   Database    │
│  (Next.js)   │     │   (Node.js)      │     │  (PostgreSQL) │
└──────────────┘     └──────┬───────────┘     └───────────────┘
                            │
                     ┌──────┴───────────┐
                     │   Cron Worker    │
                     │  (Node.js job)   │
                     └──────┬───────────┘
                            │
               ┌────────────┼────────────┐
               ▼            ▼            ▼
        ┌───────────┐ ┌──────────┐ ┌──────────┐
        │ Gmail API │ │ Gemini / │ │  Twilio  │
        │  (Google) │ │  OpenAI  │ │ WhatsApp │
        └───────────┘ └──────────┘ └──────────┘
```

**Architecture: Monolith + Cron Worker** (simple, MVP-appropriate — no microservices)

### Services

| Service | Responsibility | Runtime |
|---|---|---|
| **API Server** | Handles OAuth, user setup, settings CRUD | Node.js (Express/Fastify) on Vercel or Railway |
| **Cron Worker** | Polls Gmail, generates summaries, sends WhatsApp messages | Node.js cron job on Railway or Render |

### API Endpoints

| Method | Endpoint | Purpose | Input | Output |
|---|---|---|---|---|
| `GET` | `/auth/google` | Initiate Google OAuth | — | Redirect to Google |
| `GET` | `/auth/google/callback` | Handle OAuth callback | `code` | JWT + redirect |
| `POST` | `/api/setup` | Save WhatsApp number + frequency | `{ phone, frequency }` | `{ success }` |
| `GET` | `/api/settings` | Get user settings | JWT | `{ phone, frequency, connected }` |
| `PUT` | `/api/settings` | Update settings | `{ phone?, frequency? }` | `{ success }` |
| `DELETE` | `/api/settings/disconnect` | Disconnect Gmail | JWT | `{ success }` |
| `POST` | `/api/digest/test` | Trigger test digest | JWT | `{ sent: true }` |

### Data Flow

```
1. Cron job fires on schedule (per user's frequency)
2. Fetch user's Gmail OAuth tokens from DB
3. Call Gmail API → get unread emails (subject, sender, snippet, date)
4. Batch emails → send to Gemini/OpenAI for summarization + priority classification
5. Format digest message (markdown-style for WhatsApp)
6. Send via Twilio WhatsApp API
7. Log digest delivery in DB
8. Mark emails as "processed" to avoid duplicates
```

### Infrastructure

| Component | Choice | Rationale |
|---|---|---|
| **Frontend hosting** | Vercel | Free tier, Next.js native |
| **API + Worker** | Railway | Simple deploy, cron support, $5/mo |
| **Database** | Supabase (PostgreSQL) | Free tier, managed, built-in auth helpers |
| **AI Model** | Gemini 1.5 Flash | Fast, cheap, good summarization quality |
| **WhatsApp** | Twilio WhatsApp API | Reliable, sandbox available for testing |
| **Secrets management** | Environment variables | Standard for MVP |

### Technical Risks

| Risk | Severity | Mitigation |
|---|---|---|
| Gmail OAuth token expiry | High | Implement refresh token rotation; store refresh tokens encrypted |
| AI summarization hallucinations | Medium | Include "View in Gmail" link for every email; strict prompt engineering |
| Twilio WhatsApp sandbox limits | Medium | Apply for production WhatsApp Business API early |
| Cron job failures (silent) | Medium | Add health check endpoint + simple alerting (email/Slack) |
| Rate limits on Gmail API | Low | Batch requests; stay within 250 quota units/user/second |

---

## 4 · Database Schema

*Agent: Database Architect Agent*

### Database Choice

**PostgreSQL** (via Supabase)

**Why:** Relational data model fits perfectly (users → settings → digests). PostgreSQL is battle-tested, Supabase provides a free managed tier with built-in Row Level Security.

### Tables

#### `users`
| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `uuid` | PK, default `gen_random_uuid()` | |
| `email` | `varchar(255)` | UNIQUE, NOT NULL | Gmail address |
| `google_access_token` | `text` | ENCRYPTED | Short-lived access token |
| `google_refresh_token` | `text` | ENCRYPTED | Long-lived refresh token |
| `token_expires_at` | `timestamptz` | | When access token expires |
| `whatsapp_phone` | `varchar(20)` | | E.164 format |
| `digest_frequency` | `varchar(10)` | DEFAULT `'3x_day'` | `2h`, `3x_day`, `daily` |
| `is_active` | `boolean` | DEFAULT `true` | Pause/resume digests |
| `created_at` | `timestamptz` | DEFAULT `now()` | |
| `updated_at` | `timestamptz` | DEFAULT `now()` | |

#### `digests`
| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `uuid` | PK | |
| `user_id` | `uuid` | FK → `users.id` | |
| `summary_text` | `text` | | The generated digest content |
| `email_count` | `integer` | | Number of emails summarized |
| `priority_breakdown` | `jsonb` | | `{ urgent: 2, important: 5, fyi: 12 }` |
| `sent_at` | `timestamptz` | | When WhatsApp message was sent |
| `delivery_status` | `varchar(20)` | | `sent`, `delivered`, `read`, `failed` |
| `created_at` | `timestamptz` | DEFAULT `now()` | |

#### `processed_emails`
| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `uuid` | PK | |
| `user_id` | `uuid` | FK → `users.id` | |
| `gmail_message_id` | `varchar(255)` | | Gmail's unique message ID |
| `digest_id` | `uuid` | FK → `digests.id` | Which digest included this email |
| `processed_at` | `timestamptz` | DEFAULT `now()` | |

### Relationships

```
users (1) ──→ (many) digests
users (1) ──→ (many) processed_emails
digests (1) ──→ (many) processed_emails
```

### Indexes

| Index | Table | Column(s) | Rationale |
|---|---|---|---|
| `idx_users_email` | `users` | `email` | Fast lookup on login |
| `idx_digests_user_sent` | `digests` | `user_id, sent_at` | Query recent digests per user |
| `idx_processed_user_gmail` | `processed_emails` | `user_id, gmail_message_id` | Prevent duplicate processing (UNIQUE) |
| `idx_users_active_freq` | `users` | `is_active, digest_frequency` | Cron job queries active users by frequency |

### Data Risks

| Risk | Mitigation |
|---|---|
| Token storage security | Encrypt at rest; use Supabase Vault or application-level encryption |
| Processed emails table growth | Add TTL — auto-delete records older than 30 days |
| Digest text size | Cap summary at 1600 chars (WhatsApp message limit) |

---

## 5 · Implementation Tasks

| # | Task | Estimated Time | Dependencies |
|---|---|---|---|
| 1 | **Project setup** — Next.js frontend + Node.js API + Supabase DB | 0.5 day | — |
| 2 | **Database schema** — Create tables, indexes, RLS policies in Supabase | 0.5 day | Task 1 |
| 3 | **Google OAuth flow** — Implement `/auth/google` + callback + token storage | 1 day | Task 2 |
| 4 | **Onboarding UI** — Landing page, setup form, confirmation screen | 1 day | Task 3 |
| 5 | **Gmail integration** — Fetch unread emails via Gmail API | 1 day | Task 3 |
| 6 | **AI summarization** — Prompt engineering + Gemini integration for digest generation | 1 day | Task 5 |
| 7 | **WhatsApp delivery** — Twilio integration to send formatted digests | 1 day | Task 6 |
| 8 | **Cron worker** — Scheduled job that orchestrates fetch → summarize → send | 1 day | Tasks 5, 6, 7 |
| 9 | **Settings page** — UI for changing frequency, phone, disconnecting | 0.5 day | Task 4 |
| 10 | **Testing & polish** — End-to-end testing, error handling, edge cases | 1 day | All |
| 11 | **Deploy** — Production deploy to Vercel + Railway | 0.5 day | Task 10 |

**Total: ~9 days of focused work**

---

## 6 · Risks Summary

| Category | Risk | Severity | Status |
|---|---|---|---|
| 🔐 Trust | Users reluctant to grant Gmail access | High | Mitigate with transparency |
| 🤖 AI Quality | Bad summaries erode trust immediately | High | Strict prompts + "View original" links |
| 📱 Platform | WhatsApp Business API approval delays | Medium | Start with Twilio sandbox |
| 🔑 Technical | OAuth token refresh failures | Medium | Robust refresh logic + alerting |
| 📈 Growth | Difficult to grow without virality | Medium | Content marketing + Product Hunt launch |

---

*Next Step: Begin implementation starting with Task 1 (Project Setup).*
