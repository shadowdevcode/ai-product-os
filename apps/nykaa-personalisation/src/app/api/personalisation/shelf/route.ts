import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { getUserIdFromRequest } from '@/lib/auth';
import { getUserCohort } from '@/lib/personalisation/CohortService';
import { getShelfProducts } from '@/lib/personalisation/PersonalisationService';
import { EDITORIAL_PRODUCTS } from '@/lib/catalog/NykaaCatalogClient';
import { captureServerEvent } from '@/lib/posthog';
import { EVENTS } from '@/lib/analytics/events';
import { isRateLimited } from '@/lib/rate-limit';

export async function GET(req: Request) {
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown';
  // Rate limit shelf loads (20 per min)
  if (isRateLimited(ip, 20)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const auth = getUserIdFromRequest(req);
  if ('error' in auth) return auth.error;
  const { userId } = auth;

  try {
    const cohort = await getUserCohort(userId);

    if (cohort === 'control') {
      return NextResponse.json({
        cohort: 'default',
        products: EDITORIAL_PRODUCTS,
        fallback: false,
      });
    }

    const products = await getShelfProducts(userId, 12);

    if (products.length < 6) {
      // Single emission source: server-side in /api/personalisation/shelf
      // Fire-and-forget: telemetry must not block user-facing response latency
      captureServerEvent(userId, EVENTS.SHELF_LOAD_FAILED, {
        reason: 'insufficient_products',
        productCount: products.length,
      }).catch(() => {});
      return NextResponse.json({
        cohort: 'test',
        products: EDITORIAL_PRODUCTS,
        fallback: true,
      });
    }

    // Single emission source: server-side in /api/personalisation/shelf
    // Fire-and-forget: telemetry must not block user-facing response latency
    captureServerEvent(userId, EVENTS.SHELF_IMPRESSION, {
      cohort,
      productCount: products.length,
      productIds: products.map((p) => p.id),
    }).catch(() => {});

    return NextResponse.json({
      cohort: 'test',
      products,
      fallback: false,
    });
  } catch (e) {
    console.error('[shelf] Failed:', e);
    Sentry.captureException(e);
    await captureServerEvent(userId, EVENTS.SHELF_LOAD_FAILED, {
      error_type: e instanceof Error ? e.message : 'unknown',
    }).catch(() => {});
    return NextResponse.json({
      cohort: 'unknown',
      products: EDITORIAL_PRODUCTS,
      fallback: true,
    });
  }
}
