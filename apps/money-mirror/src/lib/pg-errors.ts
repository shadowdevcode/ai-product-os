/**
 * Helpers for interpreting Postgres / Neon client errors in API routes.
 */

export function isUndefinedColumnError(e: unknown): boolean {
  if (!e || typeof e !== 'object') {
    return false;
  }
  const o = e as Record<string, unknown>;
  if (o.code === '42703') {
    return true;
  }
  const msg = typeof o.message === 'string' ? o.message : '';
  return /column .* does not exist/i.test(msg);
}

/**
 * User-facing hint when Postgres reports a missing column (schema drift).
 * Keep in sync with README / `npm run db:upgrade`. Server also runs idempotent DDL on Node boot when possible.
 */
export const SCHEMA_UPGRADE_HINT =
  'Your MoneyMirror database is missing columns this app version needs (for example merchant rollups). The app tries to update the schema automatically when the server starts. If you still see this, run `npm run db:upgrade` from `apps/money-mirror` using the same `DATABASE_URL` as the app, or run the ALTER statements at the end of `schema.sql` in the Neon SQL Editor.';
