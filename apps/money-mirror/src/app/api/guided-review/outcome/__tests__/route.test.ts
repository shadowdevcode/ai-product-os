import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mockGetSessionUser = vi.fn();
const mockCaptureServerEvent = vi.fn();
const mockSql = vi.fn();

vi.mock('@/lib/auth/session', () => ({
  getSessionUser: mockGetSessionUser,
}));

vi.mock('@/lib/db', () => ({
  getDb: () => mockSql,
}));

vi.mock('@/lib/posthog', () => ({
  captureServerEvent: mockCaptureServerEvent,
}));

async function getHandlers() {
  const mod = await import('@/app/api/guided-review/outcome/route');
  return { POST: mod.POST };
}

function makeReq(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/guided-review/outcome', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

describe('/api/guided-review/outcome', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSessionUser.mockResolvedValue({
      id: 'user-1',
      email: 'u@example.com',
      name: 'U',
    });
    mockCaptureServerEvent.mockResolvedValue(undefined);
    mockSql.mockResolvedValue(undefined);
  });

  it('returns 401 when unauthenticated', async () => {
    mockGetSessionUser.mockResolvedValueOnce(null);
    const { POST } = await getHandlers();
    const res = await POST(makeReq({ dismissed: true }));
    expect(res.status).toBe(401);
  });

  it('returns 400 when dismissed flag is missing', async () => {
    const { POST } = await getHandlers();
    const res = await POST(makeReq({ commitment_text: 'x' }));
    expect(res.status).toBe(400);
  });

  it('persists commitment_text when not dismissed', async () => {
    const { POST } = await getHandlers();
    const res = await POST(
      makeReq({ dismissed: false, commitment_text: 'cut food delivery this month' })
    );
    expect(res.status).toBe(200);
    // The INSERT call is the only sql call (no statement_id provided, so no ownership check).
    const insertCall = mockSql.mock.calls.find((call) => {
      const strings = call[0] as readonly string[];
      return strings.some((s) => s.includes('INSERT INTO guided_review_outcomes'));
    });
    expect(insertCall).toBeDefined();
    // Tagged template arg order: [strings, user_id, statement_id, dismissed, commitment_text]
    expect(insertCall![4]).toBe('cut food delivery this month');
    expect(mockCaptureServerEvent).toHaveBeenCalledWith(
      'user-1',
      'commitment_saved',
      expect.objectContaining({ has_commitment: true })
    );
  });

  it('forces commitment_text to NULL when dismissed=true even if client sends text', async () => {
    const { POST } = await getHandlers();
    const res = await POST(makeReq({ dismissed: true, commitment_text: 'malicious leak attempt' }));
    expect(res.status).toBe(200);
    const insertCall = mockSql.mock.calls.find((call) => {
      const strings = call[0] as readonly string[];
      return strings.some((s) => s.includes('INSERT INTO guided_review_outcomes'));
    });
    expect(insertCall).toBeDefined();
    // commitment_text bind value must be null on the dismiss path.
    expect(insertCall![4]).toBeNull();
    expect(mockCaptureServerEvent).toHaveBeenCalledWith(
      'user-1',
      'guided_review_completed',
      expect.objectContaining({ has_commitment: false })
    );
  });
});
