import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mockGetSessionUser = vi.fn();
const mockGetDb = vi.fn();
const mockCaptureServerEvent = vi.fn();

vi.mock('@/lib/auth/session', () => ({ getSessionUser: mockGetSessionUser }));
vi.mock('@/lib/db', () => ({ getDb: mockGetDb }));
vi.mock('@/lib/posthog', () => ({ captureServerEvent: mockCaptureServerEvent }));
vi.mock('@sentry/nextjs', () => ({ captureException: vi.fn() }));

async function getPOST() {
  const mod = await import('@/app/api/guided-review/outcome/route');
  return mod.POST;
}

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/guided-review/outcome', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

describe('POST /api/guided-review/outcome', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSessionUser.mockResolvedValue({ id: 'u1', email: 'u@example.com', name: 'User' });
    mockCaptureServerEvent.mockResolvedValue(undefined);
  });

  it('returns 401 when not authenticated', async () => {
    mockGetSessionUser.mockResolvedValue(null);
    const POST = await getPOST();
    const res = await POST(makeRequest({ dismissed: true }));
    expect(res.status).toBe(401);
  });

  it('returns 400 when dismissed is missing', async () => {
    const POST = await getPOST();
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('dismissed');
  });

  it('returns 400 when statement_id is invalid UUID', async () => {
    const POST = await getPOST();
    const res = await POST(makeRequest({ dismissed: true, statement_id: 'not-a-uuid' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('UUID');
  });

  it('returns 400 when commitment_text exceeds max length', async () => {
    const POST = await getPOST();
    const longText = 'a'.repeat(501);
    const res = await POST(makeRequest({ dismissed: false, commitment_text: longText }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('500');
  });

  it('saves dismissed outcome successfully', async () => {
    const mockSql = vi.fn().mockResolvedValue([]);
    mockGetDb.mockReturnValue(mockSql);
    const POST = await getPOST();

    const res = await POST(makeRequest({ dismissed: true }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(mockSql).toHaveBeenCalledTimes(1);
  });

  it('saves commitment with text successfully', async () => {
    const mockSql = vi
      .fn()
      .mockResolvedValueOnce([{ ok: 1 }])
      .mockResolvedValueOnce([]);
    mockGetDb.mockReturnValue(mockSql);
    const POST = await getPOST();

    const res = await POST(
      makeRequest({
        dismissed: false,
        commitment_text: 'Audit one recurring charge',
        statement_id: '550e8400-e29b-41d4-a716-446655440000',
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(mockSql).toHaveBeenCalledTimes(2);
  });

  it('returns 404 when statement is not owned by the user', async () => {
    const mockSql = vi.fn().mockResolvedValueOnce([]);
    mockGetDb.mockReturnValue(mockSql);
    const POST = await getPOST();

    const res = await POST(
      makeRequest({
        dismissed: false,
        statement_id: '550e8400-e29b-41d4-a716-446655440000',
        commitment_text: 'Audit one recurring charge',
      })
    );

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe('Statement not found');
    expect(mockSql).toHaveBeenCalledTimes(1);
  });

  it('fires guided_review_completed for dismissed', async () => {
    mockGetDb.mockReturnValue(vi.fn().mockResolvedValue([]));
    const POST = await getPOST();
    await POST(makeRequest({ dismissed: true }));
    expect(mockCaptureServerEvent).toHaveBeenCalledWith(
      'u1',
      'guided_review_completed',
      expect.objectContaining({ dismissed: true })
    );
  });

  it('fires commitment_saved for non-dismissed', async () => {
    mockGetDb.mockReturnValue(vi.fn().mockResolvedValue([]));
    const POST = await getPOST();
    await POST(makeRequest({ dismissed: false, commitment_text: 'Save 10%' }));
    expect(mockCaptureServerEvent).toHaveBeenCalledWith(
      'u1',
      'commitment_saved',
      expect.objectContaining({ dismissed: false, has_commitment: true })
    );
  });

  it('returns 500 on DB error', async () => {
    mockGetDb.mockReturnValue(vi.fn().mockRejectedValue(new Error('DB down')));
    const POST = await getPOST();
    const res = await POST(makeRequest({ dismissed: true }));
    expect(res.status).toBe(500);
  });
});
