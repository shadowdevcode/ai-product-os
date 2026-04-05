/**
 * GET /api/dashboard/advisories
 *
 * Same query parameters as GET /api/dashboard (legacy `statement_id` or unified
 * `date_from` + `date_to` + optional `statement_ids`).
 */

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
      return NextResponse.json({ error: 'Statement not found' }, { status: 404 });
    }

    const enriched = await attachCoachingLayer(user.id, dashboard);
    return NextResponse.json({
      advisories: enriched.advisories,
      coaching_facts: enriched.coaching_facts,
    });
  } catch (err) {
    Sentry.captureException(err);
    console.error('[GET /api/dashboard/advisories]', err);
    return NextResponse.json({ error: 'Failed to fetch advisories' }, { status: 500 });
  }
}
