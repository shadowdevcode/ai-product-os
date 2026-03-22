/**
 * Shared Supabase database client template for AI Product OS apps.
 *
 * Copy this file to apps/[project]/src/lib/db.ts and it will work
 * without modification as long as env vars are set.
 *
 * Required env vars:
 *   NEXT_PUBLIC_SUPABASE_URL    — your Supabase project URL
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY — public anon key (client-side)
 *   SUPABASE_SERVICE_ROLE_KEY  — service role key (server-side only, never expose to client)
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * Client-side Supabase client.
 * Use in React Server Components and Client Components for user-scoped queries.
 * Respects RLS policies via the anon key.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Server-side Supabase client with service role.
 * Use ONLY in API routes and cron workers — never import in client components.
 * Bypasses RLS — use only when you explicitly need admin access.
 */
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// ─── Query Helpers ────────────────────────────────────────────────────────

/**
 * Safe fetch with hard limit. Never call .select() without .limit().
 * Default: 100 rows. Max: 1000 rows.
 *
 * @example
 * const { data } = await fetchList(supabase, 'orders', { userId: '123' }, 50);
 */
export async function fetchList<T>(
  client: ReturnType<typeof createClient>,
  table: string,
  filters: Record<string, unknown>,
  limit = 100
) {
  if (limit > 1000) throw new Error('fetchList: limit cannot exceed 1000');

  let query = client.from(table).select('*').limit(limit);

  for (const [key, value] of Object.entries(filters)) {
    query = query.eq(key, value);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as T[];
}

/**
 * Batch fetch by IDs. Prefer over N individual queries.
 *
 * @example
 * const orders = await fetchByIds(supabase, 'orders', 'order_id', ['id1', 'id2']);
 */
export async function fetchByIds<T>(
  client: ReturnType<typeof createClient>,
  table: string,
  idColumn: string,
  ids: string[]
) {
  const { data, error } = await client
    .from(table)
    .select('*')
    .in(idColumn, ids)
    .limit(1000);

  if (error) throw error;
  return data as T[];
}

// ─── RLS Reminder ─────────────────────────────────────────────────────────
//
// Every user-scoped table MUST have RLS enabled. Add to schema.sql:
//
//   ALTER TABLE your_table ENABLE ROW LEVEL SECURITY;
//
//   CREATE POLICY "Users can only see own rows"
//   ON your_table FOR SELECT
//   USING (auth.uid() = user_id);
//
// Use supabaseAdmin only for cron workers and server-only operations.
// Never use supabaseAdmin in client components.
