import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mockGetSessionUser = vi.fn();
const mockEnsureProfile = vi.fn();

const mockSql = vi.fn();

vi.mock('@/lib/auth/session', () => ({
  getSessionUser: mockGetSessionUser,
}));

vi.mock('@/lib/db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/db')>();
  return {
    ...actual,
    ensureProfile: mockEnsureProfile,
    getDb: () => mockSql,
  };
});

async function getGet() {
  const mod = await import('@/app/api/insights/merchants/route');
  return mod.GET;
}

function makeRequest(url: string) {
  return new NextRequest(url);
}

describe('GET /api/insights/merchants', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSessionUser.mockResolvedValue({
      id: 'user-123',
      email: 'u@example.com',
      name: 'U',
    });
    mockEnsureProfile.mockResolvedValue(undefined);

    mockSql
      .mockResolvedValueOnce([{ ok: 1 }])
      .mockResolvedValueOnce([{ merchant_key: 'zomato', debit_paisa: '5000', txn_count: '2' }])
      .mockResolvedValueOnce([{ s: '10000' }])
      .mockResolvedValueOnce([{ s: '5000' }]);
  });

  it('returns 401 when unauthenticated', async () => {
    mockGetSessionUser.mockResolvedValueOnce(null);
    const GET = await getGet();
    const res = await GET(
      makeRequest(
        'http://localhost/api/insights/merchants?statement_id=00000000-0000-4000-8000-000000000001'
      )
    );
    expect(res.status).toBe(401);
  });

  it('returns merchants for legacy statement scope', async () => {
    const GET = await getGet();
    const res = await GET(
      makeRequest(
        'http://localhost/api/insights/merchants?statement_id=00000000-0000-4000-8000-000000000001'
      )
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      merchants: { merchant_key: string; debit_paisa: number }[];
    };
    expect(body.merchants[0]?.merchant_key).toBe('zomato');
  });
});
