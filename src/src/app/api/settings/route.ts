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
 * GET /api/settings
 * Get current user settings
 */
export async function GET(req: NextRequest) {
    const user = getUserFromRequest(req);
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
        .from('users')
        .select('email, whatsapp_phone, digest_frequency, is_active, created_at')
        .eq('id', user.userId)
        .single();

    if (error || !data) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
        email: data.email,
        phone: data.whatsapp_phone,
        frequency: data.digest_frequency,
        isActive: data.is_active,
        connected: true,
        createdAt: data.created_at,
    });
}

/**
 * PUT /api/settings
 * Update user settings
 */
export async function PUT(req: NextRequest) {
    const user = getUserFromRequest(req);
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const updates: Record<string, unknown> = {};

        // Validate and apply phone update
        if (body.phone !== undefined) {
            if (!isValidPhone(body.phone)) {
                return NextResponse.json({ error: 'Invalid phone number format' }, { status: 400 });
            }
            updates.whatsapp_phone = body.phone;
        }

        // Validate and apply frequency update
        if (body.frequency !== undefined) {
            if (!isValidFrequency(body.frequency)) {
                return NextResponse.json({ error: 'Invalid frequency' }, { status: 400 });
            }
            updates.digest_frequency = body.frequency;
        }

        // Apply active toggle
        if (body.isActive !== undefined) {
            updates.is_active = Boolean(body.isActive);
        }

        if (Object.keys(updates).length === 0) {
            return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
        }

        const { error } = await supabase
            .from('users')
            .update(updates)
            .eq('id', user.userId);

        if (error) {
            return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
        }

        // --- PostHog Tracking ---
        if (body.frequency !== undefined || body.phone !== undefined) {
            client.capture({
                distinctId: user.userId,
                event: 'settings_updated',
                properties: {
                    new_frequency: updates.digest_frequency,
                }
            });
        }

        if (body.isActive === false) {
            client.capture({
                distinctId: user.userId,
                event: 'service_paused',
                properties: { reason: "Settings toggle disable" }
            });
        }
        await client.shutdown();

        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
}
