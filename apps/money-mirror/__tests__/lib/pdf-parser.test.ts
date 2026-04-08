/**
 * T5a — [GREEN] Tests for pdf-parser.ts
 *
 * Mocks PDFParse class — we test OUR service contract.
 * Uses vi.hoisted() to avoid TDZ reference errors from vi.mock hoisting.
 */

// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

type PdfParserModule = typeof import('@/lib/pdf-parser');

const mockGetText = vi.fn();
const mockDestroy = vi.fn();
const mockPdfParseConstructor = vi.fn(function MockPDFParse(opts: unknown) {
  void opts;
  return { getText: mockGetText, destroy: mockDestroy };
});
const mockPdfParseFactory = vi.fn(async () => {
  return {
    PDFParse: mockPdfParseConstructor,
  };
});

const MockCanvasFactory = class {};

const mockWorkerFactory = vi.fn(async () => ({
  CanvasFactory: MockCanvasFactory,
}));

async function loadPdfParserModule(): Promise<PdfParserModule> {
  vi.resetModules();
  vi.doMock('pdf-parse/worker', mockWorkerFactory);
  vi.doMock('pdf-parse', mockPdfParseFactory);
  return import('@/lib/pdf-parser');
}

describe('extractPdfText', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDestroy.mockResolvedValue(undefined);
  });

  it('throws EMPTY_FILE when buffer is empty', async () => {
    const { extractPdfText } = await loadPdfParserModule();

    await expect(extractPdfText(Buffer.alloc(0))).rejects.toMatchObject({
      code: 'EMPTY_FILE',
    });
    expect(mockPdfParseFactory).not.toHaveBeenCalled();
    expect(mockWorkerFactory).not.toHaveBeenCalled();
  });

  it('throws PARSE_FAILED when getText throws', async () => {
    const { extractPdfText } = await loadPdfParserModule();

    mockGetText.mockRejectedValue(new Error('Invalid PDF structure'));
    const garbage = Buffer.from('not a pdf', 'utf-8');
    await expect(extractPdfText(garbage)).rejects.toMatchObject({
      code: 'PARSE_FAILED',
    });
  });

  it('throws EMPTY_TEXT when PDF yields blank text', async () => {
    const { extractPdfText } = await loadPdfParserModule();

    mockGetText.mockResolvedValue({ text: '   ', total: 1 });
    const fakeBuffer = Buffer.from('fake pdf content');
    await expect(extractPdfText(fakeBuffer)).rejects.toMatchObject({
      code: 'EMPTY_TEXT',
    });
  });

  it('returns text and pageCount on success', async () => {
    const { extractPdfText } = await loadPdfParserModule();

    const fakeText = '01/03/26  SWIGGY  500.00  49500.00\n';
    mockGetText.mockResolvedValue({ text: fakeText, total: 3 });
    const fakeBuffer = Buffer.from('fake pdf content');

    const result = await extractPdfText(fakeBuffer);

    expect(result.text).toBe(fakeText.trim());
    expect(result.pageCount).toBe(3);
  });

  it('returns a PdfExtractionError instance on failure', async () => {
    const { extractPdfText, PdfExtractionError } = await loadPdfParserModule();

    try {
      await extractPdfText(Buffer.alloc(0));
    } catch (e) {
      expect(e).toBeInstanceOf(PdfExtractionError);
    }
  });

  it('loads pdf-parse/worker before pdf-parse and passes CanvasFactory to PDFParse', async () => {
    const { extractPdfText } = await loadPdfParserModule();
    mockGetText.mockResolvedValue({ text: 'statement text', total: 2 });

    await expect(extractPdfText(Buffer.from('fake pdf content'))).resolves.toMatchObject({
      text: 'statement text',
      pageCount: 2,
    });

    expect(mockWorkerFactory).toHaveBeenCalledBefore(
      mockPdfParseFactory as unknown as typeof mockWorkerFactory
    );
    expect(mockPdfParseConstructor).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.any(Buffer),
        verbosity: 0,
        CanvasFactory: MockCanvasFactory,
      })
    );
  });

  it('maps parser initialization failures to PARSE_FAILED', async () => {
    mockPdfParseConstructor.mockImplementation(function MockPDFParseFailure() {
      throw new Error('DOMMatrix is not defined');
    });

    const { extractPdfText } = await loadPdfParserModule();

    await expect(extractPdfText(Buffer.from('fake pdf content'))).rejects.toMatchObject({
      code: 'PARSE_FAILED',
      message: 'Failed to parse PDF: DOMMatrix is not defined',
    });
  });
});
