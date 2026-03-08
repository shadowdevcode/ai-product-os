import { google } from 'googleapis';
import { supabase } from './supabase';
import { encrypt, decrypt } from './crypto';

const SCOPES = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile'
];
const GMAIL_BATCH_SIZE = 10;

/**
 * Split an array into chunks of a given size
 */
function batchArray<T>(arr: T[], size: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
        batches.push(arr.slice(i, i + size));
    }
    return batches;
}

/**
 * Create an OAuth2 client configured with app credentials
 */
export function createOAuth2Client() {
    return new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`
    );
}

/**
 * Generate the Google OAuth consent URL
 */
export function getAuthUrl(state: string): string {
    const oauth2Client = createOAuth2Client();
    return oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
        prompt: 'consent', // Force consent to always get refresh token
        state,
    });
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(code: string) {
    const oauth2Client = createOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);
    return tokens;
}

/**
 * Get a configured OAuth2 client for a specific user (with token refresh)
 */
async function getAuthenticatedClient(userId: string) {
    const { data: user, error } = await supabase
        .from('users')
        .select('google_access_token, google_refresh_token, token_expires_at')
        .eq('id', userId)
        .single();

    if (error || !user) {
        throw new Error('User not found or missing tokens');
    }

    // Decrypt tokens from storage
    const accessToken = user.google_access_token ? decrypt(user.google_access_token) : undefined;
    const refreshToken = user.google_refresh_token ? decrypt(user.google_refresh_token) : undefined;

    const oauth2Client = createOAuth2Client();
    oauth2Client.setCredentials({
        access_token: accessToken,
        refresh_token: refreshToken,
        expiry_date: user.token_expires_at ? new Date(user.token_expires_at).getTime() : undefined,
    });

    // Explicitly check for token expiration and refresh if needed (within 5 minutes)
    const expiryTime = user.token_expires_at ? new Date(user.token_expires_at).getTime() : 0;
    if (expiryTime > 0 && Date.now() > expiryTime - 5 * 60 * 1000) {
        if (refreshToken) {
            try {
                const { credentials } = await oauth2Client.refreshAccessToken();
                const updates: Record<string, unknown> = {};
                if (credentials.access_token) updates.google_access_token = encrypt(credentials.access_token);
                if (credentials.refresh_token) updates.google_refresh_token = encrypt(credentials.refresh_token);
                if (credentials.expiry_date) updates.token_expires_at = new Date(credentials.expiry_date).toISOString();

                // Await DB update synchronously
                await supabase.from('users').update(updates).eq('id', userId);
            } catch (err: unknown) {
                console.error('Failed to manually refresh token:', err);

                // If the user revoked access or token is permanently invalid, pause their cron
                const isInvalidGrant =
                    (typeof err === 'object' && err !== null && 'response' in err && (err as { response?: { data?: { error?: string } } }).response?.data?.error === 'invalid_grant') ||
                    (err instanceof Error && err.message.includes('invalid_grant'));

                if (isInvalidGrant) {
                    console.log(`Google token revoked or invalid for user ${userId}. Pausing their cron.`);
                    await supabase.from('users').update({ is_active: false }).eq('id', userId);
                    throw new Error('Google OAuth token has been revoked or is irreparably invalid.');
                }
            }
        }
    }

    return oauth2Client;
}

export interface EmailSummary {
    messageId: string;
    from: string;
    subject: string;
    snippet: string;
    date: string;
    body: string;
}

/**
 * Fetch unread emails from Gmail for a user
 * Uses paginated fetching until enough unprocessed emails are found,
 * then batched parallel requests to avoid N+1 sequential calls
 */
export async function fetchUnreadEmails(userId: string, processedIds: Set<string>): Promise<EmailSummary[]> {
    const auth = await getAuthenticatedClient(userId);
    const gmail = google.gmail({ version: 'v1', auth });

    const newMessages: { id: string }[] = [];
    let pageToken: string | undefined = undefined;
    let pagesFetched = 0;
    const MAX_PAGES = 5;

    // Paginate until we fetch up to 50 unprocessed emails, or run out of unread emails, or hit max pages
    while (newMessages.length < 50 && pagesFetched < MAX_PAGES) {
        pagesFetched++;
        const options: { userId: string; q: string; maxResults: number; pageToken?: string } = {
            userId: 'me',
            q: 'is:unread newer_than:30d',
            maxResults: 50,
        };
        if (pageToken) options.pageToken = pageToken;

        const listResponse = await gmail.users.messages.list(options);

        const messages = listResponse.data.messages || [];
        if (messages.length === 0) break;

        for (const msg of messages) {
            if (msg.id && !processedIds.has(msg.id)) {
                newMessages.push({ id: msg.id });
            }
        }

        pageToken = listResponse.data.nextPageToken || undefined;
        if (!pageToken) break;
    }

    // Cap at 50 to avoid over-fetching details in case there's a huge surge
    const messagesToFetch = newMessages.slice(0, 50);
    if (messagesToFetch.length === 0) return [];

    // Fetch details in parallel batches of GMAIL_BATCH_SIZE
    const emails: EmailSummary[] = [];
    const batches = batchArray(messagesToFetch, GMAIL_BATCH_SIZE);

    for (const batch of batches) {
        const batchResults = await Promise.all(
            batch
                .map(async (msg) => {
                    const detail = await gmail.users.messages.get({
                        userId: 'me',
                        id: msg.id!,
                        format: 'full',
                    });

                    const payload = detail.data.payload;
                    const headers = payload?.headers || [];
                    const getHeader = (name: string) =>
                        headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value || '';

                    // Recursive function to extract text/plain body from payload
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const extractBody = (part: any): string => {
                        if (!part) return '';
                        if (part.mimeType === 'text/plain' && part.body?.data) {
                            return Buffer.from(part.body.data, 'base64url').toString('utf8');
                        }
                        if (part.parts) {
                            for (const p of part.parts) {
                                const result = extractBody(p);
                                if (result) return result;
                            }
                        }
                        return '';
                    };

                    const rawBody = extractBody(payload);
                    const truncatedBody = rawBody.substring(0, 1000); // 1000 chars of context for AI

                    return {
                        messageId: msg.id!,
                        from: getHeader('From'),
                        subject: getHeader('Subject'),
                        snippet: detail.data.snippet || '',
                        date: getHeader('Date'),
                        body: truncatedBody,
                    };
                })
        );

        emails.push(...batchResults);
    }

    return emails;
}

export { batchArray };
