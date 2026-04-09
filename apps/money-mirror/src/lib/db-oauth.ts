import { getDb } from './db';

export interface OAuthTokenRow {
  user_id: string;
  provider: string;
  access_token: string;
  refresh_token: string | null;
  expires_at: string;
  scope: string | null;
  status: 'active' | 'revoked' | 'refresh_failed';
  last_sync_at: string | null;
  last_error: string | null;
}

export async function getOAuthTokenRow(
  userId: string,
  provider: string = 'google'
): Promise<OAuthTokenRow | null> {
  const sql = getDb();
  const rows = (await sql`
    SELECT user_id, provider, access_token, refresh_token,
           expires_at, scope, status, last_sync_at, last_error
    FROM user_oauth_tokens
    WHERE user_id = ${userId} AND provider = ${provider}
    LIMIT 1
  `) as OAuthTokenRow[];
  return rows[0] ?? null;
}

export async function upsertOAuthToken(
  userId: string,
  provider: string,
  data: Omit<OAuthTokenRow, 'user_id' | 'provider'>
): Promise<void> {
  const sql = getDb();
  await sql`
    INSERT INTO user_oauth_tokens (
      user_id, provider, access_token, refresh_token,
      expires_at, scope, status, last_sync_at, last_error, updated_at
    ) VALUES (
      ${userId}, ${provider}, ${data.access_token}, ${data.refresh_token},
      ${data.expires_at}::timestamptz, ${data.scope}, ${data.status},
      ${data.last_sync_at ? `${data.last_sync_at}::timestamptz` : null},
      ${data.last_error}, now()
    )
    ON CONFLICT (user_id, provider) DO UPDATE SET
      access_token  = EXCLUDED.access_token,
      refresh_token = COALESCE(EXCLUDED.refresh_token, user_oauth_tokens.refresh_token),
      expires_at    = EXCLUDED.expires_at,
      scope         = COALESCE(EXCLUDED.scope, user_oauth_tokens.scope),
      status        = EXCLUDED.status,
      last_error    = EXCLUDED.last_error,
      updated_at    = now()
  `;
}

export async function updateOAuthTokenStatus(
  userId: string,
  provider: string,
  status: 'active' | 'revoked' | 'refresh_failed',
  lastError: string | null = null
): Promise<void> {
  const sql = getDb();
  await sql`
    UPDATE user_oauth_tokens
    SET status = ${status}, last_error = ${lastError}, updated_at = now()
    WHERE user_id = ${userId} AND provider = ${provider}
  `;
}

export async function markGmailSyncAt(userId: string): Promise<void> {
  const sql = getDb();
  await sql`
    UPDATE user_oauth_tokens
    SET last_sync_at = now(), updated_at = now()
    WHERE user_id = ${userId} AND provider = 'google'
  `;
}

export async function listUsersWithGmailTokens(): Promise<string[]> {
  const sql = getDb();
  const rows = (await sql`
    SELECT user_id
    FROM user_oauth_tokens
    WHERE provider = 'google' AND status = 'active'
    ORDER BY last_sync_at ASC NULLS FIRST
  `) as { user_id: string }[];
  return rows.map((r) => r.user_id);
}
