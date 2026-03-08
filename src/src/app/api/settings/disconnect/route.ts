import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { decrypt } from '@/lib/crypto';
import { createOAuth2Client } from '@/lib/gmail';

/**
 * DELETE /api/settings/disconnect
 * Disconnect Gmail — revoke tokens, clear from DB, and deactivate digests
 */
export async function DELETE(req: NextRequest) {
    const user = getUserFromRequest(req);
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Read current tokens so we can revoke them
    const { data: userData } = await supabase
        .from('users')
        .select('google_access_token')
        .eq('id', user.userId)
        .single();

    // Best-effort revocation — don't block disconnect if revocation fails
    if (userData?.google_access_token) {
        try {
            const accessToken = decrypt(userData.google_access_token);
            const oauth2Client = createOAuth2Client();
            oauth2Client.setCredentials({ access_token: accessToken });
            await oauth2Client.revokeToken(accessToken);
        } catch (revokeError) {
            console.warn('Google token revocation failed (best-effort):', revokeError);
        }
    }

    const { error } = await supabase
        .from('users')
        .update({
            google_access_token: null,
            google_refresh_token: null,
            token_expires_at: null,
            is_active: false,
        })
        .eq('id', user.userId);

    if (error) {
        return NextResponse.json({ error: 'Failed to disconnect' }, { status: 500 });
    }

    // Clear the auth cookie
    const response = NextResponse.json({ success: true });
    response.cookies.set('token', '', { maxAge: 0, path: '/' });

    return response;
}
