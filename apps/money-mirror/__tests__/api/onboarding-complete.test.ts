import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mockGetSessionUser = vi.fn();
const mockUpsertProfileOnboarding = vi.fn();
const mockCaptureServerEvent = vi.fn();

vi.mock('@/lib/auth/session', () => ({
  getSessionUser: mockGetSessionUser,
}));

vi.mock('@/lib/db', () => ({
  upsertProfileOnboarding: mockUpsertProfileOnboarding,
}));

vi.mock('@/lib/posthog', () => ({
  captureServerEvent: mockCaptureServerEvent,
}));

async function getRoute() {
  const mod = await import('@/app/api/onboarding/complete/route');
  return mod.POST;
}

function makeRequest(body: Record<string, number>) {
  return new NextRequest('http://localhost/api/onboarding/complete', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'content-type': 'application/json',
    },
  });
}

describe('POST /api/onboarding/complete', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSessionUser.mockResolvedValue({
      id: 'user-123',
      email: 'vijay@example.com',
      name: 'Vijay',
    });
    mockUpsertProfileOnboarding.mockResolvedValue(undefined);
    mockCaptureServerEvent.mockResolvedValue(undefined);
  });

  it('returns 200 and emits telemetry after a successful profile write', async () => {
    const POST = await getRoute();
    const res = await POST(
      makeRequest({
        monthly_income_paisa: 6000000,
        money_health_score: 62,
        perceived_spend_paisa: 2500000,
      })
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ ok: true });
    expect(mockUpsertProfileOnboarding).toHaveBeenCalledOnce();
    expect(mockCaptureServerEvent).toHaveBeenCalledWith('user-123', 'onboarding_completed', {
      monthly_income_paisa: 6000000,
      money_health_score: 62,
      perceived_spend_paisa: 2500000,
    });
  });

  it('returns 500 and does not emit success telemetry when persistence fails', async () => {
    mockUpsertProfileOnboarding.mockRejectedValueOnce(new Error('db down'));

    const POST = await getRoute();
    const res = await POST(
      makeRequest({
        monthly_income_paisa: 5000000,
        money_health_score: 55,
        perceived_spend_paisa: 1800000,
      })
    );
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body).toEqual({ error: 'Failed to save onboarding progress.' });
    expect(mockCaptureServerEvent).not.toHaveBeenCalled();
  });

  it('returns 401 when the user is not authenticated', async () => {
    mockGetSessionUser.mockResolvedValueOnce(null);

    const POST = await getRoute();
    const res = await POST(
      makeRequest({
        monthly_income_paisa: 5000000,
        money_health_score: 55,
        perceived_spend_paisa: 0,
      })
    );

    expect(res.status).toBe(401);
    expect(mockUpsertProfileOnboarding).not.toHaveBeenCalled();
  });
});
