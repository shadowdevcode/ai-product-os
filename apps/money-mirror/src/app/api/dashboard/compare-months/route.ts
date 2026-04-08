import * as Sentry from '@sentry/nextjs';
import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { parseDashboardScopeFromSearchParams } from '@/lib/scope';
import { fetchCompareMonthsData } from '@/lib/dashboard-compare';
import type { DashboardFetchInput } from '@/lib/dashboard-types';

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
    input = {
      variant: 'legacy',
      statementId: parsed.statementId,
    };
  }

  try {
    const compare = await fetchCompareMonthsData(user.id, input);
    if (!compare) {
      return NextResponse.json(
        { error: 'Comparison unavailable for active scope.' },
        { status: 404 }
      );
    }
    return NextResponse.json(compare);
  } catch (err) {
    Sentry.captureException(err);
    console.error('[GET /api/dashboard/compare-months]', err);
    return NextResponse.json({ error: 'Failed to load month comparison.' }, { status: 500 });
  }
}
