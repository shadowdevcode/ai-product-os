import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mockGetSessionUser = vi.fn();
const mockFetchCompareMonthsData = vi.fn();
const mockCaptureException = vi.fn();

vi.mock('@/lib/auth/session', () => ({
  getSessionUser: mockGetSessionUser,
}));

vi.mock('@/lib/dashboard-compare', () => ({
  fetchCompareMonthsData: mockFetchCompareMonthsData,
}));

vi.mock('@sentry/nextjs', () => ({
  captureException: mockCaptureException,
}));

async function getGet() {
  const mod = await import('@/app/api/dashboard/compare-months/route');
  return mod.GET;
}

function makeRequest(url: string) {
  return new NextRequest(url);
}

describe('GET /api/dashboard/compare-months', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSessionUser.mockResolvedValue({
      id: 'user-123',
      email: 'u@example.com',
      name: 'User',
    });
    mockFetchCompareMonthsData.mockResolvedValue({
      current: { total_debits_paisa: 120000, total_credits_paisa: 200000 },
      previous: { total_debits_paisa: 100000, total_credits_paisa: 180000 },
      delta: {
        debits_paisa: 20000,
        credits_paisa: 20000,
        debits_pct: 20,
        credits_pct: 11.11,
      },
    });
  });

  it('returns 401 when unauthenticated', async () => {
    mockGetSessionUser.mockResolvedValueOnce(null);
    const GET = await getGet();
    const res = await GET(makeRequest('http://localhost/api/dashboard/compare-months'));
    expect(res.status).toBe(401);
  });

  it('returns 400 when date range query is incomplete', async () => {
    const GET = await getGet();
    const res = await GET(
      makeRequest('http://localhost/api/dashboard/compare-months?date_from=2026-03-01')
    );
    expect(res.status).toBe(400);
  });

  it('returns 200 for a valid compare request', async () => {
    const GET = await getGet();
    const res = await GET(
      makeRequest(
        'http://localhost/api/dashboard/compare-months?date_from=2026-03-01&date_to=2026-03-31'
      )
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.current.total_debits_paisa).toBe(120000);
    expect(mockFetchCompareMonthsData).toHaveBeenCalledOnce();
  });

  it('returns 404 when compare data is unavailable', async () => {
    mockFetchCompareMonthsData.mockResolvedValueOnce(null);
    const GET = await getGet();
    const res = await GET(
      makeRequest(
        'http://localhost/api/dashboard/compare-months?date_from=2026-03-01&date_to=2026-03-31'
      )
    );
    expect(res.status).toBe(404);
  });

  it('returns 500 when compare service fails', async () => {
    mockFetchCompareMonthsData.mockRejectedValueOnce(new Error('db down'));
    const GET = await getGet();
    const res = await GET(
      makeRequest(
        'http://localhost/api/dashboard/compare-months?date_from=2026-03-01&date_to=2026-03-31'
      )
    );
    expect(res.status).toBe(500);
    expect(mockCaptureException).toHaveBeenCalledOnce();
  });
});
