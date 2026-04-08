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

async function getHandlers() {
  const mod = await import('@/app/api/merchants/alias/route');
  return { GET: mod.GET, POST: mod.POST, DELETE: mod.DELETE };
}

describe('/api/merchants/alias', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSessionUser.mockResolvedValue({
      id: 'user-1',
      email: 'u@example.com',
      name: 'U',
    });
    mockEnsureProfile.mockResolvedValue(undefined);
    mockCaptureServerEvent.mockResolvedValue(undefined);
    mockSql.mockResolvedValue([]);
  });

  it('GET returns 401 when unauthenticated', async () => {
    mockGetSessionUser.mockResolvedValueOnce(null);
    const { GET } = await getHandlers();
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('POST returns 400 for empty display_label', async () => {
    const { POST } = await getHandlers();
    const req = new NextRequest('http://localhost/api/merchants/alias', {
      method: 'POST',
      body: JSON.stringify({ merchant_key: 'zomato', display_label: '   ' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('POST upserts alias and fires telemetry', async () => {
    mockSql.mockResolvedValue(undefined);
    const { POST } = await getHandlers();
    const req = new NextRequest('http://localhost/api/merchants/alias', {
      method: 'POST',
      body: JSON.stringify({ merchant_key: 'zomato', display_label: 'Zomato' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mockCaptureServerEvent).toHaveBeenCalledWith(
      'user-1',
      'merchant_alias_saved',
      expect.objectContaining({ merchant_key_bucket: expect.any(String) })
    );
  });

  it('DELETE returns 400 without merchant_key', async () => {
    const { DELETE } = await getHandlers();
    const res = await DELETE(new NextRequest('http://localhost/api/merchants/alias'));
    expect(res.status).toBe(400);
  });
});
