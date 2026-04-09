/**
 * GET /api/oauth/google/start
 *
 * Redirects the authenticated user to Google's OAuth consent page
 * requesting gmail.readonly scope. Stores a CSRF state in a short-lived cookie.
 *
 * Required env vars: GOOGLE_CLIENT_ID, NEXT_PUBLIC_APP_URL
 */

import { randomBytes } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json(
      { error: 'Google OAuth is not configured (GOOGLE_CLIENT_ID missing)' },
      { status: 503 }
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? `http://localhost:3000`;
  const redirectUri = `${appUrl}/api/oauth/google/callback`;
  const state = randomBytes(16).toString('hex');

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/gmail.readonly',
    access_type: 'offline',
    prompt: 'consent', // ensures refresh_token is returned
    state,
  });

  const response = NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  );

  response.cookies.set('oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600, // 10 minutes
    path: '/',
  });

  return response;
}
