import * as Sentry from '@sentry/nextjs';
import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { ensureProfile } from '@/lib/db';
import { attachCoachingLayer } from '@/lib/coaching-enrich';
import { fetchDashboardData, type DashboardFetchInput } from '@/lib/dashboard';
import { parseDashboardScopeFromSearchParams } from '@/lib/scope';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

    const enriched = await attachCoachingLayer(user.id, dashboard);
    return NextResponse.json(enriched);
  } catch (err) {
    Sentry.captureException(err);
    console.error('[GET /api/dashboard]', err);
    return NextResponse.json({ error: 'Failed to load dashboard data' }, { status: 500 });
  }
}
