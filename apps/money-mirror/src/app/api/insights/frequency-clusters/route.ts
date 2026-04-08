import * as Sentry from '@sentry/nextjs';
import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { getDb } from '@/lib/db';
import { checkRateLimit } from '@/lib/rate-limit';
import { captureServerEvent } from '@/lib/posthog';
import { parseDashboardScopeFromSearchParams } from '@/lib/scope';
import {
  fetchClusterMerchantAggregates,
  fetchTopMerchantsByFrequency,
  type FrequencyMerchantRow,
} from '@/lib/dashboard-helpers';
import {
  ALL_CLUSTER_MERCHANT_KEYS,
  buildClusterRollups,
  type ClusterRollup,
} from '@/lib/merchant-clusters';

const HEAVY_READ_LIMIT = { limit: 40, windowMs: 60_000 };

export interface FrequencyClustersResponse {
  top_merchants: FrequencyMerchantRow[];
  clusters: ClusterRollup[];
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rate = checkRateLimit(`freq-clusters:get:${user.id}`, HEAVY_READ_LIMIT);
  if (!rate.ok) {
    void captureServerEvent(user.id, 'rate_limit_hit', {
      route: '/api/insights/frequency-clusters',
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

  let dateFrom: string;
  let dateTo: string;
  let statementIds: string[] | null;

  if (parsed.variant === 'unified') {
    dateFrom = parsed.scope.dateFrom;
    dateTo = parsed.scope.dateTo;
    statementIds = parsed.scope.statementIds;
  } else {
    return NextResponse.json(
      { error: 'Frequency clusters require unified scope (date_from + date_to).' },
      { status: 400 }
    );
  }

  try {
    const sql = getDb();
    // top_merchants powers the UI preview list, so a LIMIT is fine here.
    // Cluster rollups, however, must reflect full scope — they are derived
    // from a separate query bounded by the static cluster key set, never
    // from the LIMIT-capped top-N sample.
    const [topMerchants, clusterMerchantRows] = await Promise.all([
      fetchTopMerchantsByFrequency(sql, user.id, dateFrom, dateTo, statementIds),
      fetchClusterMerchantAggregates(
        sql,
        user.id,
        dateFrom,
        dateTo,
        statementIds,
        ALL_CLUSTER_MERCHANT_KEYS
      ),
    ]);

    const clusters = buildClusterRollups(clusterMerchantRows);

    const body: FrequencyClustersResponse = {
      top_merchants: topMerchants.slice(0, 10),
      clusters,
    };

    return NextResponse.json(body);
  } catch (err) {
    Sentry.captureException(err);
    console.error('[GET /api/insights/frequency-clusters]', err);
    return NextResponse.json({ error: 'Failed to load frequency data' }, { status: 500 });
  }
}
