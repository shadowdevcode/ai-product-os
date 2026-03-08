import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { isValidPhone, isValidFrequency } from '@/lib/validation';
import { PostHog } from 'posthog-node';

const client = new PostHog(
    process.env.NEXT_PUBLIC_POSTHOG_KEY || 'phc_dummy',
    { host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com' }
);

/**
 * POST /api/setup
 * Save WhatsApp phone number and digest frequency during onboarding
 */
export async function POST(req: NextRequest) {
    const user = getUserFromRequest(req);
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { phone, frequency } = body;

        // Validate phone (E.164 format)
        if (!phone || !isValidPhone(phone)) {
            return NextResponse.json(
                { error: 'Invalid phone number. Use E.164 format (e.g. +14155551234)' },
                { status: 400 }
            );
        }

        // Validate frequency
        if (!frequency || !isValidFrequency(frequency)) {
            return NextResponse.json(
                { error: 'Invalid frequency. Use: 2h, 3x_day, or daily' },
                { status: 400 }
            );
        }

        // Update user
        const { error } = await supabase
            .from('users')
            .update({
                whatsapp_phone: phone,
                digest_frequency: frequency,
                is_active: true,
            })
            .eq('id', user.userId);

        if (error) {
            return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
        }

        // --- PostHog Tracking ---
        client.capture({
            distinctId: user.userId,
            event: 'setup_completed',
            properties: { frequency_choice: frequency }
        });
        await client.shutdown();

        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
}
