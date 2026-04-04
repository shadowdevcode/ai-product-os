/**
 * T5a — [GREEN] Tests for pdf-parser.ts
 *
 * Mocks PDFParse class — we test OUR service contract.
 * Uses vi.hoisted() to avoid TDZ reference errors from vi.mock hoisting.
 */

// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Hoisted mock fns ─────────────────────────────────────────
const { mockGetText, mockDestroy, MockPDFParse } = vi.hoisted(() => {
  const mockGetText = vi.fn();
  const mockDestroy = vi.fn().mockResolvedValue(undefined);
  function MockPDFParse(opts: unknown) {
    void opts;
    return { getText: mockGetText, destroy: mockDestroy };
  }
  return { mockGetText, mockDestroy, MockPDFParse };
});

vi.mock('pdf-parse', () => ({
  PDFParse: MockPDFParse,
}));

import { extractPdfText, PdfExtractionError } from '@/lib/pdf-parser';

describe('extractPdfText', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDestroy.mockResolvedValue(undefined);
  });

  it('throws EMPTY_FILE when buffer is empty', async () => {
    await expect(extractPdfText(Buffer.alloc(0))).rejects.toMatchObject({
      code: 'EMPTY_FILE',
    });
  });

  it('throws PARSE_FAILED when getText throws', async () => {
    mockGetText.mockRejectedValue(new Error('Invalid PDF structure'));
    const garbage = Buffer.from('not a pdf', 'utf-8');
    await expect(extractPdfText(garbage)).rejects.toMatchObject({
      code: 'PARSE_FAILED',
    });
  });

  it('throws EMPTY_TEXT when PDF yields blank text', async () => {
    mockGetText.mockResolvedValue({ text: '   ', total: 1 });
    const fakeBuffer = Buffer.from('fake pdf content');
    await expect(extractPdfText(fakeBuffer)).rejects.toMatchObject({
      code: 'EMPTY_TEXT',
    });
  });

  it('returns text and pageCount on success', async () => {
    const fakeText = '01/03/26  SWIGGY  500.00  49500.00\n';
    mockGetText.mockResolvedValue({ text: fakeText, total: 3 });
    const fakeBuffer = Buffer.from('fake pdf content');

    const result = await extractPdfText(fakeBuffer);

    expect(result.text).toBe(fakeText.trim());
    expect(result.pageCount).toBe(3);
  });

  it('returns a PdfExtractionError instance on failure', async () => {
    try {
      await extractPdfText(Buffer.alloc(0));
    } catch (e) {
      expect(e).toBeInstanceOf(PdfExtractionError);
    }
  });
});
