/**
 * GET /api/oauth/google/callback
 *
 * Handles the Google OAuth redirect. Validates CSRF state, exchanges
 * the authorization code for tokens, stores them in user_oauth_tokens,
 * then redirects to /dashboard?tab=sync.
 *
 * Required env vars: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, NEXT_PUBLIC_APP_URL
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { upsertOAuthToken } from '@/lib/db-oauth';
import { getGoogleClientId, getGoogleClientSecret, getOAuthAppUrl } from '@/lib/google-oauth-env';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const errorParam = searchParams.get('error');
  const cookieState = req.cookies.get('oauth_state')?.value;

  const dashboardSync = new URL('/dashboard?tab=sync', req.url);
  const dashboardError = new URL('/dashboard?tab=sync&oauth_error=true', req.url);

  // User declined consent
  if (errorParam) {
    return NextResponse.redirect(dashboardError);
  }

  // CSRF check
  if (!code || !state || !cookieState || state !== cookieState) {
    return NextResponse.redirect(dashboardError);
  }

  const appUrl = getOAuthAppUrl();
  const redirectUri = `${appUrl}/api/oauth/google/callback`;

  // Exchange code for tokens
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: getGoogleClientId(),
      client_secret: getGoogleClientSecret(),
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  if (!tokenRes.ok) {
    console.error(
      '[oauth/callback] token exchange failed:',
      tokenRes.status,
      await tokenRes.text()
    );
    const response = NextResponse.redirect(dashboardError);
    response.cookies.delete('oauth_state');
    return response;
  }

  const tokens = (await tokenRes.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    scope: string;
  };

  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

  await upsertOAuthToken(session.id, 'google', {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token ?? null,
    expires_at: expiresAt,
    scope: tokens.scope,
    status: 'active',
    last_sync_at: null,
    last_error: null,
  });

  const response = NextResponse.redirect(dashboardSync);
  response.cookies.delete('oauth_state');
  return response;
}
