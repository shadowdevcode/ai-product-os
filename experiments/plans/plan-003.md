# Plan: AI Personal Finance Advisor (Issue 003)

## Plan Summary
This plan outlines the "Wizard of Oz" MVP for the AI Personal Finance Advisor. The goal is to validate user engagement via WhatsApp without writing complex integrations. We will use a simple Node.js/Next.js backend connected to the WhatsApp Business API (via Twilio or Meta directly) to schedule daily nudges and process manual log inputs.

---

## Product Specification

**Product Goal**
Determine if young earners will actively engage with a daily financial accountability partner on WhatsApp and if the act of reporting alters their spending.

**Target User**
Young professionals (22-29) earning ₹30k-80k/month who struggle with month-end savings.

**User Journey**
1. User opts-in via a WhatsApp link.
2. Bot sends a daily scheduled message at 8:00 PM asking for non-essential spending.
3. User replies with the amount and/or category.
4. Bot acknowledges and logs the data.
5. On Sunday, bot sends a weekly summary of spending vs. their savings goal.

**MVP Scope**
- **Include**: WhatsApp messaging integration, daily automated nudges (Cron), simple text parsing (amount extraction), weekly summary generation, basic user database.
- **Exclude**: Bank account scraping, SMS parsing, AI financial advice generation, frontend dashboard, categorizing transactions automatically.

**Success Metrics**
- Daily response rate (> 50%)
- Day-14 retention (number of users still replying after 2 weeks > 40%)

**Acceptance Criteria**
- System successfully sends scheduled WhatsApp messages to all active users.
- System correctly parses and stores numerical replies from users.
- System generates an accurate weekly summary based on the logged numbers.

---

## UX Design

**User Flow**
Entirely text-based through WhatsApp.

**Interaction Logic**
- *System (8:00 PM)*: "Hey! Did you make any non-essential purchases today? Reply with the amount, or '0' if you didn't spend anything!"
- *User*: "450 on coffee and snacks"
- *System*: "Logged ₹450. Great job keeping track! 📝"

---

## System Architecture

**Overview**
Next.js API Routes (Serverless) -> WhatsApp Cloud API (or Twilio) -> Supabase (PostgreSQL)

**Services**
- **Webhook Receiver**: Handles incoming messages from WhatsApp.
- **Nudge Scheduler**: Cron job service (e.g., Vercel Cron or GitHub Actions) that triggers the daily outgoing messages.
- **Summary Generator**: Cron job that calculates weekly totals and sends them on Sundays.

**API Endpoints**
- `POST /api/webhook/whatsapp`: Receives incoming texts, extracts numbers/amounts using regex or simple LLM call, and saves to DB.
- `GET /api/webhook/whatsapp`: Verifies the webhook securely with Meta.
- `POST /api/cron/daily-nudge`: Triggered securely via cron to send the 8 PM message.
- `POST /api/cron/weekly-summary`: Triggered on Sundays to send weekly totals.

**Data Flow**
1. Cron triggers `/api/cron/daily-nudge`.
2. API calls WhatsApp to send messages to all `active` users in DB.
3. User replies on WhatsApp.
4. WhatsApp sends webhook to `/api/webhook/whatsapp`.
5. API parses the reply, logs the `amount` and `raw_text` in the DB.

**Infrastructure**
- Vercel (Hosting Core API & Cron)
- Supabase (PostgreSQL Database)
- Meta WhatsApp Cloud API (Messaging)

**Technical Risks**
- **WhatsApp API Limits/Approvals**: Getting the template temporarily blocked or needing an approved business account.
- **Parsing Variability**: Users replying with complex text ("I spent 400 on lunch but 200 was for my friend"). *Mitigation: Use a basic LLM call just for extraction if regex fails.*

---

## Database Schema

**Engine**: PostgreSQL (Supabase)

**Table: `users`**
- `id` (uuid, primary key)
- `phone_number` (string, unique)
- `name` (string)
- `status` (enum: active, opted_out)
- `weekly_goal` (integer)
- `created_at` (timestamp)

**Table: `logs`**
- `id` (uuid, primary key)
- `user_id` (foreign key -> users.id)
- `amount` (integer)
- `raw_text` (string)
- `logged_at` (timestamp)

---

## Implementation Tasks

- [ ] **Task 1**: Setup Next.js project and Supabase database with schema.
- [ ] **Task 2**: Configure WhatsApp Cloud API app and webhook verification.
- [ ] **Task 3**: Implement `/api/webhook/whatsapp` to receive and parse incoming messages.
- [ ] **Task 4**: Implement `/api/cron/daily-nudge` and configure Vercel Cron.
- [ ] **Task 5**: Implement `/api/cron/weekly-summary` for Sunday reports.
- [ ] **Task 6**: End-to-end testing with a test phone number.
