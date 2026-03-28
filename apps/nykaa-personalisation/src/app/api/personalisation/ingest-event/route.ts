import { NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/auth';
import { ingestSessionEvent } from '@/lib/personalisation/EventIngestionService';
import { captureServerEvent } from '@/lib/posthog';
import { EVENTS } from '@/lib/analytics/events';
import { isRateLimited } from '@/lib/rate-limit';

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown';
  // Strict rate limit for events to prevent noise/spam (10 per min)
  if (isRateLimited(ip, 10)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const auth = getUserIdFromRequest(req);
  if ('error' in auth) return auth.error;
  const { userId } = auth;

  try {
    const body = await req.json();

    if (!body.productId || typeof body.productId !== 'string') {
      return NextResponse.json({ error: 'productId is required' }, { status: 400 });
    }

    const sessionId =
      body.sessionId && typeof body.sessionId === 'string' ? body.sessionId : crypto.randomUUID();

    const eventType = body.eventType === 'add_to_cart' ? EVENTS.ADD_TO_CART : EVENTS.SHELF_CLICK;

    await ingestSessionEvent({
      userId,
      sessionId,
      productId: body.productId,
      brandId: body.brandId ?? null,
      categoryId: body.categoryId ?? null,
      eventType: eventType === EVENTS.ADD_TO_CART ? 'add_to_cart' : 'click',
    });

    // Single emission source: server-side in /api/personalisation/ingest-event
    // Fire-and-forget: telemetry must not block user-facing response latency
    captureServerEvent(userId, eventType as string, {
      productId: body.productId,
      brandId: body.brandId ?? null,
      categoryId: body.categoryId ?? null,
      sessionId,
    }).catch(() => {});

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[ingest-event] Failed:', e);
    // Single emission source: server-side in /api/personalisation/ingest-event
    await captureServerEvent(userId, EVENTS.INGEST_EVENT_FAILED, {
      error_type: e instanceof Error ? e.message : 'unknown',
    }).catch(() => {});
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
