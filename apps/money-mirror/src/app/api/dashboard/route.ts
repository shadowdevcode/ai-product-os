import * as Sentry from '@sentry/nextjs';
import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { ensureProfile } from '@/lib/db';
import { attachCoachingFactsOnly } from '@/lib/coaching-enrich';
import { captureServerEvent } from '@/lib/posthog';
import { checkRateLimit } from '@/lib/rate-limit';
import { fetchDashboardData, type DashboardFetchInput } from '@/lib/dashboard';
import { parseDashboardScopeFromSearchParams } from '@/lib/scope';

const HEAVY_READ_LIMIT = { limit: 40, windowMs: 60_000 };

export async function GET(req: NextRequest): Promise<NextResponse> {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rate = checkRateLimit(`dashboard:get:${user.id}`, HEAVY_READ_LIMIT);
  if (!rate.ok) {
    void captureServerEvent(user.id, 'rate_limit_hit', {
      route: '/api/dashboard',
      retry_after_sec: rate.retryAfterSec,
    }).catch(() => {});
    return NextResponse.json(
      { error: 'Too many requests. Please wait before retrying.' },
      { status: 429, headers: { 'Retry-After': String(rate.retryAfterSec) } }
    );
  }

  const parsed = parseDashboardScopeFromSearchParams(req.nextUrl.searchParams);
  if ('error' in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  let input: DashboardFetchInput;
  if (parsed.variant === 'unified') {
    input = {
      variant: 'unified',
      dateFrom: parsed.scope.dateFrom,
      dateTo: parsed.scope.dateTo,
      statementIds: parsed.scope.statementIds,
    };
  } else {
    input = { variant: 'legacy', statementId: parsed.statementId };
  }

  try {
    await ensureProfile({ id: user.id, email: user.email });
    const dashboard = await fetchDashboardData(user.id, input);
    if (!dashboard) {
      return NextResponse.json({ error: 'Dashboard not found' }, { status: 404 });
    }

    const enriched = await attachCoachingFactsOnly(user.id, dashboard);
    return NextResponse.json(enriched);
  } catch (err) {
    Sentry.captureException(err);
    console.error('[GET /api/dashboard]', err);
    return NextResponse.json({ error: 'Failed to load dashboard data' }, { status: 500 });
  }
}
