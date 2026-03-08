import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens, createOAuth2Client } from '@/lib/gmail';
import { signToken } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { encrypt } from '@/lib/crypto';
import { google } from 'googleapis';

/**
 * GET /api/auth/google/callback
 * Handles Google OAuth callback — exchanges code for tokens, creates/updates user, sets JWT cookie
 */
export async function GET(req: NextRequest) {
    try {
        // Verify CSRF state parameter
        const storedState = req.cookies.get('oauth_state')?.value;
        const returnedState = req.nextUrl.searchParams.get('state');
        if (!storedState || !returnedState || storedState !== returnedState) {
            return NextResponse.redirect(
                `${process.env.NEXT_PUBLIC_APP_URL}/?error=csrf_failed`
            );
        }

        const oauthError = req.nextUrl.searchParams.get('error');
        if (oauthError) {
            return NextResponse.redirect(
                `${process.env.NEXT_PUBLIC_APP_URL}/?error=${oauthError}`
            );
        }

        const code = req.nextUrl.searchParams.get('code');

        if (!code) {
            return NextResponse.redirect(
                `${process.env.NEXT_PUBLIC_APP_URL}/?error=no_code`
            );
        }

        // Exchange auth code for tokens
        const tokens = await exchangeCodeForTokens(code);

        if (!tokens.access_token) {
            return NextResponse.redirect(
                `${process.env.NEXT_PUBLIC_APP_URL}/?error=token_exchange_failed`
            );
        }

        // Get user email from Google
        const oauth2Client = createOAuth2Client();
        oauth2Client.setCredentials(tokens);
        const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
        const { data: profile } = await oauth2.userinfo.get();

        if (!profile.email) {
            return NextResponse.redirect(
                `${process.env.NEXT_PUBLIC_APP_URL}/?error=no_email`
            );
        }

        // Encrypt tokens before storing
        const encryptedAccessToken = encrypt(tokens.access_token);

        // Build upsert payload — only include refresh token if Google issued a new one.
        // Google only sends refresh_token on first consent; re-auth omits it.
        // Sending undefined would overwrite the stored value with NULL, silently
        // breaking the user's digest pipeline.
        const upsertPayload: Record<string, unknown> = {
            email: profile.email,
            google_access_token: encryptedAccessToken,
            token_expires_at: tokens.expiry_date
                ? new Date(tokens.expiry_date).toISOString()
                : undefined,
        };

        if (tokens.refresh_token) {
            upsertPayload.google_refresh_token = encrypt(tokens.refresh_token);
        }

        // Upsert user in database (tokens stored encrypted)
        const { data: user, error } = await supabase
            .from('users')
            .upsert(upsertPayload, { onConflict: 'email' })
            .select('id, email, whatsapp_phone')
            .single();

        if (error || !user) {
            console.error('User upsert failed:', error);
            return NextResponse.redirect(
                `${process.env.NEXT_PUBLIC_APP_URL}/?error=db_error`
            );
        }

        // Sign JWT
        const token = signToken({ userId: user.id, email: user.email });

        // Redirect to setup or settings based on whether user has completed setup
        const redirectPath = user.whatsapp_phone ? '/settings' : '/setup';
        const response = NextResponse.redirect(
            `${process.env.NEXT_PUBLIC_APP_URL}${redirectPath}`
        );

        // Set JWT cookie
        response.cookies.set('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 30, // 30 days
            path: '/',
        });

        // Clear the CSRF state cookie (one-time use)
        response.cookies.set('oauth_state', '', { maxAge: 0, path: '/' });

        return response;
    } catch (error) {
        console.error('OAuth callback error:', error);
        return NextResponse.redirect(
            `${process.env.NEXT_PUBLIC_APP_URL}/?error=auth_failed`
        );
    }
}
