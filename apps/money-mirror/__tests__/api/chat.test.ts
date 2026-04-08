import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mockGetSessionUser = vi.fn();
const mockEnsureProfile = vi.fn();
const mockFetchDashboardData = vi.fn();
const mockBuildLayerAFacts = vi.fn();
const mockFactIdsFromLayerA = vi.fn();
const mockSerializeFactsForPrompt = vi.fn();
const mockCaptureServerEvent = vi.fn();
const mockCheckRateLimit = vi.fn();
const mockGenerateContent = vi.fn();

vi.mock('@/lib/auth/session', () => ({ getSessionUser: mockGetSessionUser }));
vi.mock('@/lib/db', () => ({ ensureProfile: mockEnsureProfile, getDb: () => vi.fn() }));
vi.mock('@/lib/dashboard', () => ({ fetchDashboardData: mockFetchDashboardData }));
vi.mock('@/lib/coaching-facts', () => ({
  buildLayerAFacts: mockBuildLayerAFacts,
  factIdsFromLayerA: mockFactIdsFromLayerA,
  serializeFactsForPrompt: mockSerializeFactsForPrompt,
}));
vi.mock('@/lib/posthog', () => ({ captureServerEvent: mockCaptureServerEvent }));
vi.mock('@/lib/rate-limit', () => ({ checkRateLimit: mockCheckRateLimit }));
vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    models = { generateContent: mockGenerateContent };
  },
}));

async function getPost() {
  const mod = await import('@/app/api/chat/route');
  return mod.POST;
}

function makeRequest(url: string, body: unknown) {
  return new NextRequest(url, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

describe('POST /api/chat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSessionUser.mockResolvedValue({ id: 'u1', email: 'u@example.com', name: 'User' });
    mockEnsureProfile.mockResolvedValue(undefined);
    mockCheckRateLimit.mockReturnValue({ ok: true, remaining: 9, resetAt: Date.now() + 1_000 });
    mockFetchDashboardData.mockResolvedValue({
      scope: {
        kind: 'single_statement',
        included_statement_ids: ['11111111-1111-4111-8111-111111111111'],
      },
    });
    mockBuildLayerAFacts.mockReturnValue({ facts: [{ id: 'total_debits_paisa' }] });
    mockFactIdsFromLayerA.mockReturnValue(new Set(['total_debits_paisa']));
    mockSerializeFactsForPrompt.mockReturnValue('[]');
    mockCaptureServerEvent.mockResolvedValue(undefined);
    mockGenerateContent.mockResolvedValue({
      candidates: [
        {
          content: {
            parts: [
              {
                text: '{"answer":"You spent more on wants this period.","cited_fact_ids":["total_debits_paisa"]}',
              },
            ],
          },
        },
      ],
    });
  });

  it('returns 401 when unauthenticated', async () => {
    mockGetSessionUser.mockResolvedValueOnce(null);
    const POST = await getPost();
    const res = await POST(makeRequest('http://localhost/api/chat', { message: 'hello' }));
    expect(res.status).toBe(401);
  });

  it('returns 400 on missing message', async () => {
    const POST = await getPost();
    const res = await POST(makeRequest('http://localhost/api/chat', { message: '' }));
    expect(res.status).toBe(400);
  });

  it('returns 429 when chat rate limit is exceeded', async () => {
    mockCheckRateLimit.mockReturnValueOnce({
      ok: false,
      retryAfterSec: 120,
      resetAt: Date.now() + 120_000,
    });
    const POST = await getPost();
    const res = await POST(
      makeRequest('http://localhost/api/chat', { message: 'how much did I spend?' })
    );
    expect(res.status).toBe(429);
  });
});
