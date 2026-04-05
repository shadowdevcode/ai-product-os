import { neon } from '@neondatabase/serverless';
import { applyIdempotentSchemaUpgrades } from '@/lib/schema-upgrades';

/**
 * Applies the same idempotent DDL as `npm run db:upgrade` when the Node server boots.
 * Eliminates manual migration for typical local/prod drift (e.g. missing `merchant_key`).
 *
 * Disable with `MONEYMIRROR_SKIP_AUTO_SCHEMA=1`. Skipped under Vitest.
 * Never throws — failures are logged; API routes still return SCHEMA_DRIFT if columns are missing.
 */
export async function runAutoSchemaUpgradeOnBoot(): Promise<void> {
  if (process.env.VITEST === 'true') {
    return;
  }
  if (process.env.MONEYMIRROR_SKIP_AUTO_SCHEMA === '1') {
    return;
  }
  const url = process.env.DATABASE_URL;
  if (!url) {
    return;
  }
  try {
    const sql = neon(url);
    await applyIdempotentSchemaUpgrades(sql);
    if (process.env.NODE_ENV === 'development') {
      console.info(
        '[money-mirror] Database schema verified (idempotent upgrades applied if needed).'
      );
    }
  } catch (e) {
    console.error(
      '[money-mirror] Automatic schema upgrade on server start failed (non-fatal). Run `npm run db:upgrade` or apply the tail of schema.sql in Neon:',
      e
    );
  }
}
