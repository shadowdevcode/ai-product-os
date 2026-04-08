import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mockGetSessionUser = vi.fn();
const mockSql = vi.fn();
const mockCheckRateLimit = vi.fn();
const mockCaptureServerEvent = vi.fn();

vi.mock('@/lib/auth/session', () => ({
  getSessionUser: mockGetSessionUser,
}));

vi.mock('@/lib/db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/db')>();
  return {
    ...actual,
    getDb: () => mockSql,
  };
});

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: mockCheckRateLimit,
}));

vi.mock('@/lib/posthog', () => ({
  captureServerEvent: mockCaptureServerEvent,
}));

async function getGet() {
  const mod = await import('@/app/api/insights/frequency-clusters/route');
  return mod.GET;
}

function makeRequest() {
  return new NextRequest(
    'http://localhost/api/insights/frequency-clusters?date_from=2026-04-01&date_to=2026-04-30'
  );
}

describe('GET /api/insights/frequency-clusters', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSessionUser.mockResolvedValue({
      id: 'user-1',
      email: 'u@example.com',
      name: 'U',
    });
    mockCheckRateLimit.mockReturnValue({ ok: true });
    mockCaptureServerEvent.mockResolvedValue(undefined);
  });

  it('cluster totals come from full-scope aggregate, not the LIMIT-30 top merchants', async () => {
    // Top-merchants query (LIMIT 30): only returns one clustered merchant.
    // Cluster aggregate query (no LIMIT, ANY(keys)): returns the *full* set of
    // clustered merchants, including ones that ranked outside the top 30.
    mockSql.mockImplementation(async (strings: TemplateStringsArray) => {
      const query = strings.join('');
      if (query.includes('merchant_key = ANY')) {
        // full-scope cluster aggregate
        return [
          { merchant_key: 'zomato', debit_count: '2', debit_paisa: '6000' },
          { merchant_key: 'swiggy', debit_count: '4', debit_paisa: '12000' },
          { merchant_key: 'blinkit', debit_count: '3', debit_paisa: '9000' },
        ];
      }
      // top merchants by frequency (LIMIT 30) — pretend only zomato made the cut
      return [{ merchant_key: 'zomato', debit_count: '2', debit_paisa: '6000' }];
    });

    const GET = await getGet();
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      top_merchants: Array<{ merchant_key: string }>;
      clusters: Array<{
        cluster: { id: string };
        debitCount: number;
        totalDebitPaisa: number;
      }>;
    };

    // Top merchants list reflects the LIMIT-capped sample.
    expect(body.top_merchants).toHaveLength(1);
    expect(body.top_merchants[0].merchant_key).toBe('zomato');

    // Food delivery cluster total must include BOTH zomato and swiggy
    // even though swiggy is not in top_merchants — proving cluster rollups
    // aggregate full scope, not the top-N sample.
    const food = body.clusters.find((c) => c.cluster.id === 'food_delivery');
    expect(food).toBeDefined();
    expect(food!.debitCount).toBe(6); // 2 + 4
    expect(food!.totalDebitPaisa).toBe(18000); // 6000 + 12000

    const quick = body.clusters.find((c) => c.cluster.id === 'quick_commerce');
    expect(quick).toBeDefined();
    expect(quick!.debitCount).toBe(3);
    expect(quick!.totalDebitPaisa).toBe(9000);
  });

  it('returns 401 when unauthenticated', async () => {
    mockGetSessionUser.mockResolvedValueOnce(null);
    const GET = await getGet();
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
  });
});
