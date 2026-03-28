import { NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/auth';
import { searchProducts } from '@/lib/catalog/NykaaCatalogClient';
import { rerankProducts } from '@/lib/personalisation/RerankEngine';
import { getUserCohort } from '@/lib/personalisation/CohortService';
import { captureServerEvent } from '@/lib/posthog';
import { EVENTS } from '@/lib/analytics/events';
import { isRateLimited } from '@/lib/rate-limit';

export async function GET(req: Request) {
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown';
  // Rate limit rerank calls (30 per min)
  if (isRateLimited(ip, 30)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const auth = getUserIdFromRequest(req);
  if ('error' in auth) return auth.error;
  const { userId } = auth;

  const url = new URL(req.url);
  const query = url.searchParams.get('q') ?? '';

  if (!query.trim()) {
    return NextResponse.json({ error: 'Query parameter q is required' }, { status: 400 });
  }

  try {
    // Fetch candidate products and cohort in parallel to reduce latency
    const [cohort, candidates] = await Promise.all([
      getUserCohort(userId),
      searchProducts(query), // mock catalog, in production: Nykaa Catalog API with AbortController 8s timeout
    ]);

    let results = candidates;
    if (cohort === 'test') {
      results = await rerankProducts(userId, candidates);
    } else {
      results = results.slice(0, 20);
    }

    // Single emission source: server-side in /api/personalisation/rerank
    // Fire-and-forget: telemetry must not block user-facing response latency
    captureServerEvent(userId, EVENTS.SEARCH_RERANK_IMPRESSION, {
      cohort,
      query,
      resultCount: results.length,
      reranked: cohort === 'test',
    }).catch(() => {});

    return NextResponse.json({
      cohort: cohort === 'control' ? 'default' : cohort,
      results,
      query,
      reranked: cohort === 'test',
    });
  } catch (e) {
    console.error('[rerank] Failed:', e);
    await captureServerEvent(userId, EVENTS.RERANK_FAILED, {
      error_type: e instanceof Error ? e.message : 'unknown',
      query,
    }).catch(() => {});

    // Fallback: return unsorted catalog results
    const fallbackResults = await searchProducts(query).catch(() => []);
    return NextResponse.json({
      cohort: 'unknown',
      results: fallbackResults,
      query,
      reranked: false,
      fallback: true,
    });
  }
}
