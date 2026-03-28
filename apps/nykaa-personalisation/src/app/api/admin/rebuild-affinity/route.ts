import { NextResponse } from 'next/server';
import { verifyCronSecret } from '@/lib/auth';
import { rebuildAffinityProfiles } from '@/lib/personalisation/AffinityBuilder';
import { cleanupExpiredEvents } from '@/lib/db';
import { captureServerEvent } from '@/lib/posthog';
import { EVENTS } from '@/lib/analytics/events';

export async function POST(req: Request) {
  const auth = verifyCronSecret(req);
  if ('error' in auth) return auth.error;

  try {
    const [usersProcessed, eventsCleanedUp] = await Promise.all([
      rebuildAffinityProfiles(),
      cleanupExpiredEvents(),
    ]);

    // Single emission source: server-side in /api/admin/rebuild-affinity
    await captureServerEvent('system', EVENTS.AFFINITY_REBUILD_COMPLETED, {
      usersProcessed,
      eventsCleanedUp,
    });

    return NextResponse.json({
      usersProcessed,
      eventsCleanedUp,
    });
  } catch (e) {
    console.error('[rebuild-affinity] Failed:', e);
    await captureServerEvent('system', EVENTS.AFFINITY_REBUILD_FAILED, {
      error_type: e instanceof Error ? e.message : 'unknown',
    }).catch(() => {});
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
