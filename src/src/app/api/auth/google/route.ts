import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { getAuthUrl } from '@/lib/gmail';

/**
 * GET /api/auth/google
 * Redirects user to Google OAuth consent screen (Gmail read-only)
 * Generates a CSRF state token and stores it in a short-lived cookie
 */
export async function GET() {
    try {
        const state = crypto.randomUUID();
        const authUrl = getAuthUrl(state);
        const response = NextResponse.redirect(authUrl);

        // Store state in a short-lived httpOnly cookie for CSRF verification
        response.cookies.set('oauth_state', state, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 600, // 10 minutes — enough for OAuth flow
            path: '/',
        });

        return response;
    } catch (error) {
        console.error('OAuth URL generation failed:', error);
        return NextResponse.json({ error: 'Failed to initiate OAuth' }, { status: 500 });
    }
}
