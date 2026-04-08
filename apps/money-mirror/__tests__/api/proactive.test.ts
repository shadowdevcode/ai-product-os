import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mockGetSessionUser = vi.fn();
const mockCaptureServerEvent = vi.fn();

vi.mock('@/lib/auth/session', () => ({ getSessionUser: mockGetSessionUser }));
vi.mock('@/lib/posthog', () => ({
  captureServerEvent: (...args: unknown[]) => mockCaptureServerEvent(...args),
}));

describe('POST /api/proactive/whatsapp-opt-in', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCaptureServerEvent.mockImplementation(() => Promise.resolve());
    process.env.WHATSAPP_API_URL = '';
    process.env.WHATSAPP_API_TOKEN = '';
  });

  it('returns 401 when unauthenticated', async () => {
    mockGetSessionUser.mockResolvedValue(null);
    const { POST } = await import('@/app/api/proactive/whatsapp-opt-in/route');
    const req = new NextRequest('http://localhost/api/proactive/whatsapp-opt-in', {
      method: 'POST',
      body: JSON.stringify({ phone_e164: '+919876543210' }),
      headers: { 'content-type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('returns 400 for invalid E.164', async () => {
    mockGetSessionUser.mockResolvedValue({ id: 'u1', email: 'u@example.com', name: 'User' });
    const { POST } = await import('@/app/api/proactive/whatsapp-opt-in/route');
    const req = new NextRequest('http://localhost/api/proactive/whatsapp-opt-in', {
      method: 'POST',
      body: JSON.stringify({ phone_e164: 'invalid' }),
      headers: { 'content-type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns stub ok when provider env is unset (telemetry-only)', async () => {
    mockGetSessionUser.mockResolvedValue({ id: 'u1', email: 'u@example.com', name: 'User' });
    const { POST } = await import('@/app/api/proactive/whatsapp-opt-in/route');
    const req = new NextRequest('http://localhost/api/proactive/whatsapp-opt-in', {
      method: 'POST',
      body: JSON.stringify({ phone_e164: '+919876543210' }),
      headers: { 'content-type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok?: boolean; mode?: string };
    expect(body.ok).toBe(true);
    expect(body.mode).toBe('stub');
    expect(mockCaptureServerEvent).toHaveBeenCalled();
  });
});

describe('POST /api/proactive/push-subscription', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCaptureServerEvent.mockImplementation(() => Promise.resolve());
  });

  it('returns 401 when unauthenticated', async () => {
    mockGetSessionUser.mockResolvedValue(null);
    const { POST } = await import('@/app/api/proactive/push-subscription/route');
    const req = new NextRequest('http://localhost/api/proactive/push-subscription', {
      method: 'POST',
      body: JSON.stringify({ endpoint: 'https://push.example/ep' }),
      headers: { 'content-type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('returns 400 when endpoint missing', async () => {
    mockGetSessionUser.mockResolvedValue({ id: 'u1', email: 'u@example.com', name: 'User' });
    const { POST } = await import('@/app/api/proactive/push-subscription/route');
    const req = new NextRequest('http://localhost/api/proactive/push-subscription', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'content-type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns ok and fires telemetry when endpoint present', async () => {
    mockGetSessionUser.mockResolvedValue({ id: 'u1', email: 'u@example.com', name: 'User' });
    const { POST } = await import('@/app/api/proactive/push-subscription/route');
    const req = new NextRequest('http://localhost/api/proactive/push-subscription', {
      method: 'POST',
      body: JSON.stringify({
        endpoint: 'https://fcm.googleapis.com/fake-endpoint-here',
        user_agent: 'Mozilla/5.0',
      }),
      headers: { 'content-type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok?: boolean };
    expect(body.ok).toBe(true);
    expect(mockCaptureServerEvent).toHaveBeenCalled();
  });
});
