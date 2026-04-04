import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mockListEligibleWeeklyRecapUsers = vi.fn();
const mockCaptureServerEvent = vi.fn();

vi.mock('@/lib/db', () => ({
  listEligibleWeeklyRecapUsers: mockListEligibleWeeklyRecapUsers,
}));

vi.mock('@/lib/posthog', () => ({
  captureServerEvent: mockCaptureServerEvent,
}));

async function getRoute() {
  const mod = await import('@/app/api/cron/weekly-recap/route');
  return { GET: mod.GET, POST: mod.POST };
}

function makeGetRequest(headers: Record<string, string> = {}) {
  return new NextRequest('http://localhost/api/cron/weekly-recap', {
    method: 'GET',
    headers,
  });
}

describe('/api/cron/weekly-recap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListEligibleWeeklyRecapUsers.mockReset();
    mockCaptureServerEvent.mockReset();
    vi.stubEnv('CRON_SECRET', 'test-secret');
    mockListEligibleWeeklyRecapUsers
      .mockResolvedValueOnce(['user-1', 'user-2'])
      .mockResolvedValueOnce([]);
    mockCaptureServerEvent.mockResolvedValue(undefined);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({ ok: true }),
      })
    );
  });

  it('returns 401 when the cron request is unauthorized', async () => {
    const { GET } = await getRoute();
    const res = await GET(makeGetRequest());

    expect(res.status).toBe(401);
  });

  it('accepts the Vercel cron GET contract with bearer auth', async () => {
    const { GET } = await getRoute();
    const res = await GET(makeGetRequest({ authorization: 'Bearer test-secret' }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ ok: true, total: 2, succeeded: 2, failed: 0 });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('counts worker failures correctly during fan-out', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: vi.fn().mockResolvedValue({ ok: true }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 502,
          json: vi.fn().mockResolvedValue({ ok: false }),
        })
    );

    const { POST } = await getRoute();
    const res = await POST(
      new NextRequest('http://localhost/api/cron/weekly-recap', {
        method: 'POST',
        headers: {
          'x-cron-secret': 'test-secret',
        },
      })
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ ok: true, total: 2, succeeded: 1, failed: 1 });
    expect(mockCaptureServerEvent).toHaveBeenLastCalledWith('system', 'weekly_recap_completed', {
      total: 2,
      succeeded: 1,
      failed: 1,
    });
  });
});
