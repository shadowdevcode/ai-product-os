import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { runDigestForUser } from '@/lib/digest-pipeline';

/**
 * POST /api/digest/test
 * Trigger a test digest immediately for the authenticated user
 */
export async function POST(req: NextRequest) {
    const user = getUserFromRequest(req);
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await runDigestForUser(user.userId);

    if (result.success) {
        return NextResponse.json({
            sent: true,
            emailCount: result.emailCount,
            message: result.emailCount > 0
                ? `Digest sent with ${result.emailCount} emails!`
                : 'No new emails to digest.',
        });
    }

    return NextResponse.json(
        { sent: false, error: result.error || 'Failed to send test digest' },
        { status: 500 }
    );
}
