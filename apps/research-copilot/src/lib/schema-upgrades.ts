import { neon } from '@neondatabase/serverless';

type Sql = ReturnType<typeof neon>;

/**
 * Idempotent DDL for existing DBs that predate new columns. Keep in sync with schema.sql tail.
 */
export async function applyIdempotentSchemaUpgrades(sql: Sql): Promise<void> {
  await sql`SELECT 1`;
}
