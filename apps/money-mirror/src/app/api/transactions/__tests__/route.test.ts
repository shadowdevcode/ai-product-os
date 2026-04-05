import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mockGetSessionUser = vi.fn();
const mockEnsureProfile = vi.fn();
const mockCaptureServerEvent = vi.fn();

const mockSql = vi.fn();

vi.mock('@/lib/auth/session', () => ({
  getSessionUser: mockGetSessionUser,
}));

vi.mock('@/lib/db', () => ({
  ensureProfile: mockEnsureProfile,
  getDb: () => mockSql,
}));

vi.mock('@/lib/posthog', () => ({
  captureServerEvent: mockCaptureServerEvent,
}));

async function getGet() {
  const mod = await import('@/app/api/transactions/route');
  return mod.GET;
}

function makeRequest(url: string) {
  return new NextRequest(url);
}

describe('GET /api/transactions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSessionUser.mockResolvedValue({
      id: 'user-123',
      email: 'u@example.com',
      name: 'U',
    });
    mockEnsureProfile.mockResolvedValue(undefined);
    mockCaptureServerEvent.mockResolvedValue(undefined);

    let call = 0;
    mockSql.mockImplementation(() => {
      call += 1;
      // ownership check for statement_id
      if (call === 1) {
        return Promise.resolve([{ ok: 1 }]);
      }
      // count
      if (call === 2) {
        return Promise.resolve([{ c: '2' }]);
      }
      // list
      return Promise.resolve([
        {
          id: 't1',
          statement_id: 's1',
          date: '2026-01-15',
          description: 'Test',
          amount_paisa: 100,
          type: 'debit',
          category: 'wants',
          is_recurring: false,
          merchant_key: 'zomato',
          statement_nickname: 'Main',
          statement_institution_name: 'HDFC',
        },
      ]);
    });
  });

  it('returns 401 when unauthenticated', async () => {
    mockGetSessionUser.mockResolvedValueOnce(null);
    const GET = await getGet();
    const res = await GET(makeRequest('http://localhost/api/transactions'));
    expect(res.status).toBe(401);
  });

  it('returns 400 for invalid category', async () => {
    const GET = await getGet();
    const res = await GET(makeRequest('http://localhost/api/transactions?category=invalid'));
    expect(res.status).toBe(400);
  });

  it('returns transactions for authenticated user', async () => {
    mockSql.mockImplementation((strings: TemplateStringsArray) => {
      const q = strings[0]?.slice(0, 80) ?? '';
      if (q.includes('COUNT(*)')) {
        return Promise.resolve([{ c: '1' }]);
      }
      return Promise.resolve([
        {
          id: 't1',
          statement_id: 's1',
          date: '2026-01-15',
          description: 'Test',
          amount_paisa: 100,
          type: 'debit',
          category: 'wants',
          is_recurring: false,
          merchant_key: null,
          statement_nickname: null,
          statement_institution_name: 'HDFC',
        },
      ]);
    });

    const GET = await getGet();
    const res = await GET(makeRequest('http://localhost/api/transactions?limit=10'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.transactions).toHaveLength(1);
    expect(body.total).toBe(1);
  });

  it('returns 404 when statement_id is not owned', async () => {
    mockSql.mockImplementationOnce(() => Promise.resolve([]));

    const GET = await getGet();
    const res = await GET(
      makeRequest(
        'http://localhost/api/transactions?statement_id=00000000-0000-4000-8000-000000000001'
      )
    );
    expect(res.status).toBe(404);
  });
});
