# Schema drift (e.g. `merchant_key`) — RCA, fix, and verification

## Symptom

- **Transactions** tab or **Insights → Top merchants** shows an error, often including Postgres text like `column t.merchant_key does not exist`, or API `code: SCHEMA_DRIFT`.
- Automated tests can still pass (they do not assert your live Neon DDL).

## Root cause

1. **Phase 3 code** always queries optional columns such as `transactions.merchant_key` (merchant rollups, filters).
2. **Older Neon databases** were created before those columns existed, or only the initial `CREATE TABLE` ran and later **`ALTER TABLE … ADD COLUMN`** lines were never applied.
3. **`CREATE TABLE IF NOT EXISTS` does not add new columns** to an existing table — so “I ran schema.sql once” is not enough if the file gained new columns later unless the **idempotent `ALTER`s** at the end of `schema.sql` were executed.

Net: **application code and database schema were out of sync** (schema drift).

## Fixes implemented in the repo

| Mechanism                              | Purpose                                                                                                                                                                                        |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`schema.sql` (tail)**                | Idempotent `ALTER TABLE … ADD COLUMN IF NOT EXISTS` for `merchant_key` and statement label columns; partial index `idx_transactions_user_merchant`.                                            |
| **`npm run db:upgrade`**               | Runs `scripts/apply-schema-upgrades.ts` → `applyIdempotentSchemaUpgrades()` (same DDL as the tail of `schema.sql`) using `DATABASE_URL` from `.env.local`.                                     |
| **Server boot (`instrumentation.ts`)** | On **Node** runtime, `runAutoSchemaUpgradeOnBoot()` runs the same DDL when the server starts (unless `MONEYMIRROR_SKIP_AUTO_SCHEMA=1` or `DATABASE_URL` is unset).                             |
| **API + UI**                           | On Postgres undefined-column errors, APIs return `code: SCHEMA_DRIFT` with a single user-facing `detail` paragraph; Transactions / Merchant rollups show that text without duplicating titles. |

## What you should do locally (verification)

1. **`cd apps/money-mirror`**
2. Ensure **`.env.local`** has the same **`DATABASE_URL`** the app uses.
3. **Restart the dev server** (`Ctrl+C`, then `npm run dev`) so instrumentation runs and auto-upgrade can apply.
4. In the terminal, confirm either:
   - `[money-mirror] Database schema verified (idempotent upgrades applied if needed).`, or
   - an error line starting with `[money-mirror] Automatic schema upgrade on server start failed` — if so, run **`npm run db:upgrade`** once, or paste the tail of **`schema.sql`** into the Neon SQL Editor.
5. Hard-refresh **Dashboard → Transactions** and **Insights** (Top merchants).

Optional after columns exist: authenticated **`POST /api/transactions/backfill-merchant-keys`** to populate `merchant_key` for old rows (see README).

## Opt out

- **`MONEYMIRROR_SKIP_AUTO_SCHEMA=1`** — skip automatic DDL on server boot (e.g. restricted DB roles); use manual `npm run db:upgrade` or Neon SQL instead.
