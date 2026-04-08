import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mockGetSessionUser = vi.fn();
const mockGetDb = vi.fn();
const mockCaptureServerEvent = vi.fn();
const mockCheckRateLimit = vi.fn();

vi.mock('@/lib/auth/session', () => ({ getSessionUser: mockGetSessionUser }));
vi.mock('@/lib/db', () => ({ getDb: mockGetDb, toNumber: (v: unknown) => Number(v) }));
vi.mock('@/lib/posthog', () => ({ captureServerEvent: mockCaptureServerEvent }));
vi.mock('@/lib/rate-limit', () => ({ checkRateLimit: mockCheckRateLimit }));
vi.mock('@sentry/nextjs', () => ({ captureException: vi.fn() }));

async function getGET() {
  const mod = await import('@/app/api/insights/frequency-clusters/route');
  return mod.GET;
}

function makeRequest(url: string) {
  return new NextRequest(url, { method: 'GET' });
}

describe('GET /api/insights/frequency-clusters', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSessionUser.mockResolvedValue({ id: 'u1', email: 'u@example.com', name: 'User' });
    mockCheckRateLimit.mockReturnValue({ ok: true, remaining: 39, resetAt: Date.now() + 1_000 });
    mockCaptureServerEvent.mockResolvedValue(undefined);
  });

  it('returns 401 when not authenticated', async () => {
    mockGetSessionUser.mockResolvedValue(null);
    const GET = await getGET();
    const res = await GET(
      makeRequest(
        'http://localhost/api/insights/frequency-clusters?date_from=2026-01-01&date_to=2026-01-31'
      )
    );
    expect(res.status).toBe(401);
  });

  it('returns 400 without unified scope params', async () => {
    const GET = await getGET();
    const res = await GET(makeRequest('http://localhost/api/insights/frequency-clusters'));
    expect(res.status).toBe(400);
  });

  it('returns 400 for legacy single-statement scope', async () => {
    const GET = await getGET();
    const res = await GET(
      makeRequest('http://localhost/api/insights/frequency-clusters?statement_id=abc')
    );
    expect(res.status).toBe(400);
  });

  it('returns 429 when rate limited', async () => {
    mockCheckRateLimit.mockReturnValue({
      ok: false,
      remaining: 0,
      retryAfterSec: 30,
      resetAt: Date.now() + 30_000,
    });
    const GET = await getGET();
    const res = await GET(
      makeRequest(
        'http://localhost/api/insights/frequency-clusters?date_from=2026-01-01&date_to=2026-01-31'
      )
    );
    expect(res.status).toBe(429);
  });

  it('returns top merchants and clusters on success', async () => {
    const mockSql = vi.fn().mockResolvedValue([
      { merchant_key: 'zomato', debit_count: '15', debit_paisa: '120000' },
      { merchant_key: 'blinkit', debit_count: '8', debit_paisa: '40000' },
      { merchant_key: 'uber', debit_count: '5', debit_paisa: '60000' },
      { merchant_key: 'random_shop', debit_count: '3', debit_paisa: '20000' },
    ]);
    mockGetDb.mockReturnValue(mockSql);

    const GET = await getGET();
    const res = await GET(
      makeRequest(
        'http://localhost/api/insights/frequency-clusters?date_from=2026-01-01&date_to=2026-01-31'
      )
    );
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.top_merchants).toHaveLength(4);
    expect(body.clusters).toBeDefined();
    expect(body.clusters.length).toBeGreaterThanOrEqual(2);

    const fdCluster = body.clusters.find(
      (c: { cluster: { id: string } }) => c.cluster.id === 'food_delivery'
    );
    expect(fdCluster).toBeDefined();
    expect(fdCluster.debitCount).toBe(15);
  });

  it('returns 500 on DB error', async () => {
    mockGetDb.mockReturnValue(vi.fn().mockRejectedValue(new Error('DB down')));
    const GET = await getGET();
    const res = await GET(
      makeRequest(
        'http://localhost/api/insights/frequency-clusters?date_from=2026-01-01&date_to=2026-01-31'
      )
    );
    expect(res.status).toBe(500);
  });
});
