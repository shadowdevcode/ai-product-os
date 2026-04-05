/**
 * Applies idempotent DDL from `src/lib/schema-upgrades.ts` (matches tail of schema.sql).
 * Run after pulling Phase 2+ / Phase 3 code if your Neon DB predates new columns.
 *
 * Usage: npm run db:upgrade
 * Requires DATABASE_URL in the environment or in `.env.local` (loaded automatically).
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { neon } from '@neondatabase/serverless';
import { applyIdempotentSchemaUpgrades } from '../src/lib/schema-upgrades';

function loadEnvLocal(): void {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..');
  const p = join(root, '.env.local');
  if (!existsSync(p)) {
    return;
  }
  const raw = readFileSync(p, 'utf8');
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    const eq = trimmed.indexOf('=');
    if (eq <= 0) {
      continue;
    }
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = val;
    }
  }
}

loadEnvLocal();

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL is not set. Add it to .env.local or export it.');
    process.exit(1);
  }

  const sql = neon(databaseUrl);
  await applyIdempotentSchemaUpgrades(sql);
  console.log('MoneyMirror schema upgrades applied successfully.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
