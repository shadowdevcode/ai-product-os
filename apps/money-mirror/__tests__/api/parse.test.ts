/**
 * Tests for POST /api/statement/parse
 *
 * Strategy: mock Neon auth session, Neon DB helpers, Gemini, pdf-parser, and PostHog.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/pdf-parser', () => ({
  extractPdfText: vi.fn().mockResolvedValue({
    text: '01/03/2026 SWIGGY 450.00 Dr\n02/03/2026 SALARY 50000.00 Cr',
    pageCount: 1,
  }),
  PdfExtractionError: class PdfExtractionError extends Error {
    code: string;
    constructor(message: string, code: string) {
      super(message);
      this.code = code;
    }
  },
}));

vi.mock('@/lib/posthog', () => ({
  captureServerEvent: vi.fn().mockResolvedValue(undefined),
}));

const mockGetSessionUser = vi.fn();
vi.mock('@/lib/auth/session', () => ({
  getSessionUser: mockGetSessionUser,
}));

const mockCountUserStatementsSince = vi.fn();
const mockEnsureProfile = vi.fn();
vi.mock('@/lib/db', () => ({
  countUserStatementsSince: mockCountUserStatementsSince,
  ensureProfile: mockEnsureProfile,
}));

const mockPersistStatement = vi.fn();
vi.mock('@/app/api/statement/parse/persist-statement', () => ({
  persistStatement: mockPersistStatement,
}));

const mockGenerateContent = vi.fn();
vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn(function () {
    return {
      models: {
        generateContent: mockGenerateContent,
      },
    };
  }),
}));

async function getRoute() {
  const mod = await import('@/app/api/statement/parse/route');
  return mod.POST;
}

function makeRequest(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  return new NextRequest('http://localhost/api/statement/parse', {
    method: 'POST',
    body: formData,
  });
}

function makePdfFile(name: string, size: number) {
  return new File([new Uint8Array(size)], name, { type: 'application/pdf' });
}

describe('POST /api/statement/parse', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockGetSessionUser.mockResolvedValue({
      id: 'user-123',
      email: 'vijay@example.com',
      name: 'Vijay',
    });
    mockEnsureProfile.mockResolvedValue(undefined);
    mockCountUserStatementsSince.mockResolvedValue(0);
    mockPersistStatement.mockResolvedValue({
      statement_id: 'stmt-abc',
    });
    mockGenerateContent.mockResolvedValue({
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify({
                  transactions: [
                    { date: '2026-03-01', description: 'SWIGGY', amount: 450.0, type: 'debit' },
                    {
                      date: '2026-03-01',
                      description: 'SALARY CREDIT',
                      amount: 50000.0,
                      type: 'credit',
                    },
                  ],
                  period_start: '2026-03-01',
                  period_end: '2026-03-31',
                }),
              },
            ],
          },
        },
      ],
    });
  });

  it('returns 200 with summary on valid PDF upload', async () => {
    const POST = await getRoute();
    const req = makeRequest(makePdfFile('statement.pdf', 1024));
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toMatchObject({
      statement_id: 'stmt-abc',
      period_start: '2026-03-01',
      period_end: '2026-03-31',
      transaction_count: 2,
      summary: expect.objectContaining({
        total_debits_paisa: expect.any(Number),
        total_credits_paisa: expect.any(Number),
      }),
    });
  });

  it('returns 401 when there is no authenticated Neon session', async () => {
    mockGetSessionUser.mockResolvedValueOnce(null);

    const POST = await getRoute();
    const res = await POST(makeRequest(makePdfFile('statement.pdf', 1024)));

    expect(res.status).toBe(401);
  });

  it('returns 400 for non-PDF MIME type', async () => {
    const POST = await getRoute();
    const txtFile = new File(['hello'], 'statement.txt', { type: 'text/plain' });
    const res = await POST(makeRequest(txtFile));
    expect(res.status).toBe(400);
  });

  it('returns 504 when Gemini times out', async () => {
    const POST = await getRoute();
    mockGenerateContent.mockRejectedValueOnce(new Error('GEMINI_TIMEOUT'));
    const res = await POST(makeRequest(makePdfFile('statement.pdf', 1024)));
    expect(res.status).toBe(504);
  });

  it('returns 500 when persistence fails', async () => {
    mockPersistStatement.mockResolvedValueOnce({
      statement_id: '',
      error: 'Failed to save statement data.',
    });

    const POST = await getRoute();
    const res = await POST(makeRequest(makePdfFile('statement.pdf', 1024)));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body).toMatchObject({
      error: 'Failed to save statement data.',
    });
  });
});
