import { supabase } from './supabase';
import { fetchUnreadEmails, batchArray } from './gmail';
import { summarizeEmails } from './summarizer';
import { sendWhatsAppMessage } from './whatsapp';
import { PostHog } from 'posthog-node';

const client = new PostHog(
    process.env.NEXT_PUBLIC_POSTHOG_KEY || 'phc_dummy',
    { host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com' }
);

const CRON_USER_BATCH_SIZE = 5;
const PROCESSED_EMAILS_TTL_DAYS = 30;

/**
 * Delete processed_emails older than PROCESSED_EMAILS_TTL_DAYS.
 * Belt-and-suspenders cleanup — complements the pg_cron job in schema.sql.
 */
async function cleanupOldProcessedEmails(): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - PROCESSED_EMAILS_TTL_DAYS);

    const { count, error } = await supabase
        .from('processed_emails')
        .delete({ count: 'exact' })
        .lt('processed_at', cutoff.toISOString());

    if (error) {
        console.error('Cleanup of old processed_emails failed:', error.message);
        return 0;
    }

    return count ?? 0;
}

/**
 * Run the full digest pipeline for a single user:
 * 1. Fetch unread emails from Gmail
 * 2. Filter out already-processed emails
 * 3. Summarize with AI
 * 4. Send via WhatsApp
 * 5. Log the digest and mark emails as processed
 */
export async function runDigestForUser(userId: string): Promise<{
    success: boolean;
    emailCount: number;
    error?: string;
}> {
    try {
        // 1. Fetch user info
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('whatsapp_phone')
            .eq('id', userId)
            .single();

        if (userError || !user?.whatsapp_phone) {
            return { success: false, emailCount: 0, error: 'User or phone not found' };
        }

        // 2. Filter out already-processed emails (bounded to last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - PROCESSED_EMAILS_TTL_DAYS);

        const { data: processed } = await supabase
            .from('processed_emails')
            .select('gmail_message_id')
            .eq('user_id', userId)
            .gte('processed_at', thirtyDaysAgo.toISOString());

        const processedIds = new Set((processed || []).map((p) => p.gmail_message_id));

        // 3. Fetch unread emails, passing processedIds to paginate past them
        const newEmails = await fetchUnreadEmails(userId, processedIds);

        if (newEmails.length === 0) {
            return { success: true, emailCount: 0 };
        }

        // 4. Summarize with AI
        let digest;
        try {
            digest = await summarizeEmails(newEmails);
        } catch (summaryError) {
            console.error(`Failed to summarize emails for user ${userId}:`, summaryError);
            // Fallback digest to prevent infinite retry loops on problematic emails
            digest = {
                summaryText: `📬 *Fallback Alert* — You have ${newEmails.length} new unread emails, but AI summarization failed. Please check your Gmail.\n—\n⚙️ Manage settings: ${process.env.NEXT_PUBLIC_APP_URL}/settings`,
                priorityBreakdown: { urgent: 0, important: 0, fyi: 0 }
            };
        }

        // 5. Send via WhatsApp
        const sendResult = await sendWhatsAppMessage(user.whatsapp_phone, digest.summaryText);

        // 6. Log the digest
        const { data: digestRecord } = await supabase
            .from('digests')
            .insert({
                user_id: userId,
                summary_text: digest.summaryText,
                email_count: newEmails.length,
                priority_breakdown: digest.priorityBreakdown,
                sent_at: new Date().toISOString(),
                delivery_status: sendResult.success ? 'sent' : 'failed',
            })
            .select('id')
            .single();

        // 7. Mark emails as processed ONLY if send was successful, or if we used the fallback
        // If it's a transient Twilio error we don't mark as processed so it retries next time!
        if (digestRecord && sendResult.success) {
            const processedRows = newEmails.map((e) => ({
                user_id: userId,
                gmail_message_id: e.messageId,
                digest_id: digestRecord.id,
            }));

            await supabase.from('processed_emails').insert(processedRows);

            // --- PostHog Tracking ---
            client.capture({
                distinctId: userId,
                event: 'digest_sent',
                properties: {
                    email_count: newEmails.length,
                    priority_urgent: digest.priorityBreakdown.urgent,
                    priority_important: digest.priorityBreakdown.important,
                    priority_fyi: digest.priorityBreakdown.fyi,
                }
            });
            await client.shutdown();

        } else if (!sendResult.success) {
            // Delivery failed.
            if (sendResult.isPermanent) {
                console.log(`WhatsApp delivery failed permanently for user ${userId}. Pausing their cron.`);
                await supabase.from('users').update({ is_active: false }).eq('id', userId);

                // We should also mark as processed so we don't loop if they ever reactivate? 
                // Actually if they reactivate they might want the old emails, but let's just mark them so it's clean
                const processedRows = newEmails.map((e) => ({
                    user_id: userId,
                    gmail_message_id: e.messageId,
                    digest_id: digestRecord?.id,
                }));
                await supabase.from('processed_emails').insert(processedRows);
            } else {
                console.log(`WhatsApp delivery failed transiently for user ${userId}. Will retry next cron.`);
            }
        }

        return {
            success: sendResult.success,
            emailCount: newEmails.length,
            error: sendResult.error,
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Pipeline error';
        console.error(`Digest pipeline error for user ${userId}:`, errorMessage);
        return { success: false, emailCount: 0, error: errorMessage };
    }
}

/**
 * Run the digest pipeline for all active users that are due for a digest.
 * Processes users in parallel batches of CRON_USER_BATCH_SIZE.
 */
export async function runDigestCron(frequency?: string): Promise<{
    processed: number;
    succeeded: number;
    failed: number;
}> {
    // Build query for active users
    let query = supabase
        .from('users')
        .select('id')
        .eq('is_active', true)
        .not('whatsapp_phone', 'is', null);

    if (frequency) {
        query = query.eq('digest_frequency', frequency);
    }

    const { data: users, error } = await query;

    if (error || !users) {
        throw new Error(`Failed to fetch users for cron: ${error?.message ?? 'unknown error'}`);
    }

    let succeeded = 0;
    let failed = 0;

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const cronSecret = process.env.CRON_SECRET;

    // Trigger all users completely in parallel instead of batches.
    // Each fetch hits a separate Vercel serverless function, decoupling execution
    // from the master cron's timeout limit.
    const results = await Promise.allSettled(
        users.map(async (user) => {
            const res = await fetch(`${baseUrl}/api/worker/digest`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${cronSecret}`
                },
                body: JSON.stringify({ userId: user.id })
            });

            if (!res.ok) {
                throw new Error(`HTTP ${res.status}`);
            }
            const data = await res.json();
            return data;
        })
    );

    for (const result of results) {
        if (result.status === 'fulfilled' && result.value.success) {
            succeeded++;
        } else {
            failed++;
        }
    }

    // Cleanup old processed_emails (TTL enforcement)
    const cleaned = await cleanupOldProcessedEmails();
    if (cleaned > 0) {
        console.log(`TTL cleanup: removed ${cleaned} processed_email records older than ${PROCESSED_EMAILS_TTL_DAYS} days`);
    }

    return { processed: users.length, succeeded, failed };
}
