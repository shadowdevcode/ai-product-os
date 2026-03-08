import { NextRequest, NextResponse } from 'next/server';
import { runDigestCron } from '@/lib/digest-pipeline';
import { isValidFrequency } from '@/lib/validation';

export const maxDuration = 300; // 5 minutes max duration for Vercel

/**
 * GET /api/cron/digest
 * Cron endpoint — invoked by Vercel Cron or external scheduler
 * Query param: ?frequency=2h|3x_day|daily (optional, runs all if omitted)
 * Secured by CRON_SECRET header (mandatory)
 */
export async function GET(req: NextRequest) {
    // Verify cron secret — mandatory auth
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
        console.error('CRON_SECRET environment variable is not set — rejecting cron request');
        return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
    }

    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const frequency = req.nextUrl.searchParams.get('frequency') || undefined;

    if (frequency && !isValidFrequency(frequency)) {
        return NextResponse.json({ error: 'Invalid frequency value' }, { status: 400 });
    }

    try {
        const result = await runDigestCron(frequency);

        return NextResponse.json({
            success: true,
            ...result,
            timestamp: new Date().toISOString(),
        });
    } catch (err) {
        console.error('Cron run failed:', err);
        return NextResponse.json(
            { success: false, error: 'Internal cron error' },
            { status: 500 }
        );
    }
}
