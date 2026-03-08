import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { PostHog } from 'posthog-node';

const client = new PostHog(
    process.env.NEXT_PUBLIC_POSTHOG_KEY || 'phc_dummy',
    { host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com' }
);

/**
 * POST /api/webhooks/twilio
 * Twilio callback URL to handle message status updates (e.g., delivered, read, failed).
 */
export async function POST(req: NextRequest) {
    try {
        const contentType = req.headers.get('content-type') || '';
        let body: Record<string, string> = {};

        // Twilio webhooks are sent as x-www-form-urlencoded
        if (contentType.includes('application/x-www-form-urlencoded')) {
            const formData = await req.formData();
            formData.forEach((value, key) => {
                body[key] = value.toString();
            });
        } else {
            return NextResponse.json({ error: 'Unsupported Content-Type' }, { status: 415 });
        }

        const messageStatus = body.MessageStatus;
        const toPhone = body.To;

        if (!messageStatus || !toPhone) {
            return NextResponse.json({ error: 'Missing required Twilio fields' }, { status: 400 });
        }

        // Map the Twilio phone number back to the user to log the metric properly
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('id')
            .eq('whatsapp_phone', toPhone)
            .single();

        if (userError || !user) {
            console.error(`Twilio Webhook: User not found for phone ${toPhone}`);
            return NextResponse.json({ success: true }); // Still return 200 so Twilio doesn't retry
        }

        // Track the "read" event via PostHog
        if (messageStatus === 'read') {
            client.capture({
                distinctId: user.id,
                event: 'digest_read'
            });
            await client.shutdown();
        }

        // Return a successful response to acknowledge receipt
        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Twilio Webhook Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
