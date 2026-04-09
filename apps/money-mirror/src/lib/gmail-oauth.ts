/**
 * Gmail OAuth utilities: token refresh + Gmail API message fetching.
 * Used by /api/gmail/trigger-sync and /api/cron/gmail-sync/worker.
 */

import { getOAuthTokenRow, upsertOAuthToken, updateOAuthTokenStatus } from '@/lib/db-oauth';

export interface GmailEmail {
  id: string; // Gmail message ID
  subject: string;
  body: string; // plain-text (or HTML-stripped) body
}

// ─── Token management ────────────────────────────────────────────────────────

/**
 * Returns a valid access token for `userId`, auto-refreshing if < 5 min remain.
 * Returns null if the user has no token, the token is revoked, or refresh fails.
 */
export async function getValidAccessToken(userId: string): Promise<string | null> {
  const row = await getOAuthTokenRow(userId, 'google');
  if (!row || row.status === 'revoked') return null;

  // Token still valid — return as-is
  if (new Date(row.expires_at).getTime() > Date.now() + 5 * 60 * 1000) {
    return row.access_token;
  }

  // Needs refresh
  if (!row.refresh_token) {
    await updateOAuthTokenStatus(userId, 'google', 'refresh_failed', 'No refresh token available');
    return null;
  }

  return refreshToken(userId, row.refresh_token);
}

async function refreshToken(userId: string, refreshToken: string): Promise<string | null> {
  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      }),
    });

    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as {
        error?: string;
        error_description?: string;
      };
      const newStatus = err.error === 'invalid_grant' ? 'revoked' : 'refresh_failed';
      await updateOAuthTokenStatus(
        userId,
        'google',
        newStatus,
        err.error_description ?? err.error ?? 'Refresh failed'
      );
      return null;
    }

    const data = (await res.json()) as { access_token: string; expires_in: number };
    const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();

    await upsertOAuthToken(userId, 'google', {
      access_token: data.access_token,
      refresh_token: refreshToken, // keep existing refresh token
      expires_at: expiresAt,
      scope: null, // preserved via COALESCE in upsert
      status: 'active',
      last_sync_at: null,
      last_error: null,
    });

    return data.access_token;
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    await updateOAuthTokenStatus(userId, 'google', 'refresh_failed', msg);
    return null;
  }
}

// ─── Gmail API fetching ───────────────────────────────────────────────────────

const GMAIL_TX_QUERY =
  'subject:(debited OR credited OR "payment of" OR "transaction alert" OR "UPI transaction") -category:promotions -category:social';

/**
 * Fetches up to `maxMessages` transaction alert emails from Gmail
 * within the last `daysBack` days using the given access token.
 */
export async function fetchGmailTransactionEmails(
  accessToken: string,
  daysBack: number,
  maxMessages: number = 100
): Promise<GmailEmail[]> {
  const query = `${GMAIL_TX_QUERY} newer_than:${daysBack}d`;
  const searchUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=${maxMessages}`;

  const searchRes = await fetch(searchUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!searchRes.ok) {
    throw new Error(`Gmail search failed: ${searchRes.status} ${await searchRes.text()}`);
  }

  const searchData = (await searchRes.json()) as { messages?: { id: string }[] };
  const messageIds = searchData.messages ?? [];

  if (messageIds.length === 0) return [];

  // Fetch each message in parallel; silently drop failures
  const results = await Promise.allSettled(
    messageIds.map(({ id }) => fetchGmailMessage(accessToken, id))
  );

  return results
    .filter((r): r is PromiseFulfilledResult<GmailEmail> => r.status === 'fulfilled')
    .map((r) => r.value);
}

interface GmailPayload {
  mimeType?: string;
  body?: { data?: string };
  parts?: GmailPayload[];
  headers?: { name: string; value: string }[];
}

async function fetchGmailMessage(accessToken: string, messageId: string): Promise<GmailEmail> {
  const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });

  if (!res.ok) throw new Error(`Gmail message fetch failed: ${res.status}`);

  const msg = (await res.json()) as { payload?: GmailPayload };
  const headers = msg.payload?.headers ?? [];
  const subject = headers.find((h) => h.name.toLowerCase() === 'subject')?.value ?? '';
  const body = extractBody(msg.payload);

  return { id: messageId, subject, body };
}

function extractBody(payload: GmailPayload | undefined): string {
  if (!payload) return '';

  if (payload.mimeType === 'text/plain' && payload.body?.data) {
    return Buffer.from(payload.body.data, 'base64url').toString('utf8');
  }

  if (payload.mimeType === 'text/html' && payload.body?.data) {
    const html = Buffer.from(payload.body.data, 'base64url').toString('utf8');
    return html
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  if (payload.parts && payload.parts.length > 0) {
    // Prefer plain text
    const textPart = payload.parts.find((p) => p.mimeType === 'text/plain');
    if (textPart) return extractBody(textPart);

    const htmlPart = payload.parts.find((p) => p.mimeType === 'text/html');
    if (htmlPart) return extractBody(htmlPart);

    // Recurse into nested multipart
    for (const part of payload.parts) {
      const text = extractBody(part);
      if (text) return text;
    }
  }

  return '';
}
