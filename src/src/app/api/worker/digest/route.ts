import { NextRequest, NextResponse } from 'next/server';
import { runDigestForUser } from '@/lib/digest-pipeline';

export const maxDuration = 300; // 5 minutes max duration for Vercel

/**
 * POST /api/worker/digest
 * Internal worker endpoint — invoked by the master cron to process a single user.
 * Body: { userId: string }
 * Secured by CRON_SECRET header (mandatory)
 */
export async function POST(req: NextRequest) {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
        return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
    }

    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { userId } = body;

        if (!userId) {
            return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
        }

        const result = await runDigestForUser(userId);

        return NextResponse.json({
            ...result,
            timestamp: new Date().toISOString(),
        });
    } catch (err) {
        console.error('Worker run failed:', err);
        return NextResponse.json(
            { success: false, error: 'Internal worker error' },
            { status: 500 }
        );
    }
}
