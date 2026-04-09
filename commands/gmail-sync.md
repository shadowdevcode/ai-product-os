# Command: /gmail-sync

## Purpose

Pulls transaction emails from Gmail for the last N days, parses each with Gemini Flash,
and syncs new transactions into the Money Mirror database via the `/api/gmail/sync` endpoint.

This is a **data pipeline command** — not part of the 12-step product pipeline.
It validates the Gmail ingestion path and keeps the personal Money Mirror instance current.

---

## Prerequisites

Before running this command for the first time:

1. **Schema migration applied** — the following must exist in the Neon DB:
   - `dedup_hash` generated column + unique index on `transactions`
   - `gmail_sync_runs` table
   - `statement_type` CHECK includes `'gmail_sync'`
   - `ingestion_source` column on `statements`

   Apply from: `apps/money-mirror/schema.sql` (append the Gmail sync additions)

2. **Env vars set in `apps/money-mirror/.env.local`**:
   - `GMAIL_SYNC_SECRET` — a random secret string (e.g. `openssl rand -hex 32`)
   - `MONEY_MIRROR_USER_ID` — your Neon Auth user ID (find in `profiles` table)
   - `GEMINI_API_KEY` — already required for existing parse flow

3. **Money Mirror app running locally** — `cd apps/money-mirror && npm run dev`
   (or deployed on Vercel — set `MONEY_MIRROR_URL` accordingly)

---

## Input

Optional argument: `--days N` (default: 7)

Examples:

- `/gmail-sync` — syncs last 7 days
- `/gmail-sync --days 30` — syncs last 30 days

---

## Process

Follow this sequence exactly.

### Step 0 — Read env config

Read `apps/money-mirror/.env.local` to extract:

- `GMAIL_SYNC_SECRET` → used as `x-sync-secret` header
- `MONEY_MIRROR_USER_ID` → included in POST body
- `MONEY_MIRROR_URL` → base URL (default: `http://localhost:3000`)

If any of these are missing, stop and print:

```
⚠ Missing env var: <NAME>
Set it in apps/money-mirror/.env.local and retry.
```

### Step 1 — Search Gmail for transaction emails

Use the Gmail MCP tool to search for transaction alert emails.

Query to use (replace `<DAYS>` with the --days argument or 7):

```
subject:(debited OR credited OR "payment of" OR "transaction alert" OR "UPI transaction") newer_than:<DAYS>d -category:promotions -category:social
```

Call the Gmail search with `max_results: 50`.

Print: `📧 Found <N> emails matching transaction query`

If 0 emails found, print "No transaction emails found in the last <DAYS> days." and stop.

### Step 2 — Read each email body

For each email from Step 1 (up to 50):

- Call the Gmail read message tool with the message ID
- Extract the plain-text body (prefer `text/plain` over HTML)
- Build an object: `{ id: messageId, subject: emailSubject, body: plainTextBody }`

Print progress: `📨 Read <N> / <TOTAL> emails`

### Step 3 — POST to sync endpoint

POST to `<MONEY_MIRROR_URL>/api/gmail/sync` with:

Headers:

```
Content-Type: application/json
x-sync-secret: <GMAIL_SYNC_SECRET>
```

Body:

```json
{
  "emails": [
    /* array from Step 2 */
  ],
  "triggerMode": "command",
  "userId": "<MONEY_MIRROR_USER_ID>"
}
```

### Step 4 — Print summary

On success (HTTP 200):

```
✅ Gmail Sync Complete
────────────────────────────
📧 Emails scanned:    <emails_scanned>
🔍 Parsed as txns:    <parsed_count>
✨ New transactions:  <inserted_count>
⏭  Duplicates skipped: <skipped_count>
```

If `inserted_count > 0`, add:

```
🔔 Advisory engine re-triggered — check dashboard for new insights.
```

On failure (non-200):

```
❌ Sync failed: <error from response body>
Check: schema migration applied? App running? GMAIL_SYNC_SECRET matches?
```

---

## Notes

- The endpoint is idempotent — re-running over the same period is safe. Duplicates are silently skipped via the `dedup_hash` constraint.
- To sync a longer history, use `--days 90` for the first run.
- The command reads Gmail via Claude Code's Gmail MCP — no OAuth tokens stored in the app for Phase 1.
- Phase 2 will add a "Sync now" button in the dashboard and Google OAuth for multi-user support.
