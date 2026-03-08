# AI Personal Finance Advisor 💰🤖

A "Zero-UI" proactive behavioral guide designed for young earners (22-29) in India's growing middle class. This agent automates financial tracking through WhatsApp to combat lifestyle inflation and improve savings habits.

## 🚀 The Mission

**Problem**: Managing money is a high-friction chore. Existing dashboards are reactive; they tell you what you *did*, not what you *should do*.
**Hypothesis**: A WhatsApp-based proactive nudge system will bypass the friction of traditional apps, resulting in a 20% increase in monthly savings.

## 🛠️ Technology Stack

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router)
- **Database**: [Supabase](https://supabase.com/) (PostgreSQL)
- **Messaging**: [Meta WhatsApp Cloud API](https://developers.facebook.com/docs/whatsapp/cloud-api)
- **Deployment**: [Vercel](https://vercel.com/) (Serverless & Cron)

## 🏗️ System Architecture

- **Webhook Receiver**: A secure endpoint (`/api/webhook/whatsapp`) that parses incoming user messages using regex and handles distinct payload types (text, media, etc.).
- **Nudge Engine**: A scheduled Vercel Cron (`/api/cron/daily-nudge`) that dispatches reminders every evening at 8:00 PM.
- **Weekly Summarizer**: A Sunday cron job (`/api/cron/weekly-summary`) that aggregates spending vs. goals and delivers a behavioral report card.

## 🧠 Key Learnings & Engineering Standards

Extracted from the [AI Product OS Knowledge Layer](../../knowledge/engineering-lessons.md):

1. **Serverless Execution Safety**: All async dispatches (WhatsApp messages) must be explicitly `await`ed. "Fire-and-forget" patterns result in suspended execution in serverless contexts.
2. **Cron Scalability**: Replaced N+1 query loops with batched database reads and concurrent `Promise.allSettled` dispatches to prevent execution timeouts.
3. **Conversational UX Fallbacks**: Implemented explicit handlers for "Zero Spend" cases (rewards vs. errors) and non-text payloads (receipts/audio) to maintain user trust.

## 🏁 Getting Started

### Prerequisites
- A Meta Developer Account with WhatsApp Cloud API enabled.
- A Supabase project with `users` and `logs` tables.

### Setup
1. Clone the repository and navigate to `apps/finance-advisor`.
2. Copy `.env.example` to `.env.local` and fill in your keys.
3. Install dependencies:
   ```bash
   npm install
   ```
4. Run the development server:
   ```bash
   npm run dev
   ```

### Local Webhook Testing
To test WhatsApp webhooks locally, we recommend using **ngrok**:
```bash
ngrok http 3000
```
Update your Meta Callback URL to `your-ngrok-url/api/webhook/whatsapp`.

## 📜 Database Schema
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  phone_number TEXT UNIQUE,
  status TEXT, -- 'active' or 'opted_out'
  weekly_goal INTEGER
);

CREATE TABLE logs (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  amount INTEGER,
  raw_text TEXT,
  logged_at TIMESTAMPTZ
);
```

---
Built with ❤️ by the AI Product Operating System.
