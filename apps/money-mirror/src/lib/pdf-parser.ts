/**
 * T4 — PDF Text Extraction Service
 *
 * Accepts a raw PDF Buffer, extracts plain text, and returns it.
 * The buffer is consumed in-memory and never written to disk (Option A).
 *
 * Uses `pdf-parse/worker` + `CanvasFactory` from `@napi-rs/canvas` (via worker)
 * so parsing works on Vercel serverless, not only local dev. See pdf-parse
 * troubleshooting: import worker before `pdf-parse` and pass `CanvasFactory`.
 *
 * Privacy guarantee: the caller is responsible for immediately nulling
 * the buffer reference after calling extractPdfText() so it becomes
 * eligible for GC. See /api/statement/parse/route.ts.
 */

import type { CanvasFactory as CanvasFactoryCtor } from 'pdf-parse/worker';

export interface PdfExtractionResult {
  text: string;
  pageCount: number;
}

export class PdfExtractionError extends Error {
  constructor(
    message: string,
    public readonly code: 'EMPTY_FILE' | 'PARSE_FAILED' | 'EMPTY_TEXT' | 'PASSWORD_PROTECTED'
  ) {
    super(message);
    this.name = 'PdfExtractionError';
  }
}

interface PdfParseModule {
  PDFParse: new (opts: {
    data: Uint8Array;
    verbosity: number;
    CanvasFactory: typeof CanvasFactoryCtor;
  }) => {
    getText: () => Promise<{ text?: string; total?: number }>;
    destroy: () => Promise<void>;
  };
}

interface PdfToolkit {
  PDFParse: PdfParseModule['PDFParse'];
  CanvasFactory: typeof CanvasFactoryCtor;
}

let pdfToolkitPromise: Promise<PdfToolkit> | null = null;

async function loadPdfToolkit(): Promise<PdfToolkit> {
  if (!pdfToolkitPromise) {
    pdfToolkitPromise = (async () => {
      const workerMod = await import('pdf-parse/worker');
      const pdfMod = (await import('pdf-parse')) as PdfParseModule;
      return {
        CanvasFactory: workerMod.CanvasFactory,
        PDFParse: pdfMod.PDFParse,
      };
    })();
  }
  return pdfToolkitPromise;
}

/**
 * Extract plain text from a PDF buffer.
 *
 * @param buffer - Raw PDF file bytes. Must be >0 bytes.
 * @returns Extracted text and page count.
 * @throws PdfExtractionError on empty input or parse failure.
 */
export async function extractPdfText(buffer: Buffer): Promise<PdfExtractionResult> {
  if (!buffer || buffer.length === 0) {
    throw new PdfExtractionError('PDF buffer is empty', 'EMPTY_FILE');
  }

  let text: string;
  let pageCount: number;

  try {
    const { PDFParse, CanvasFactory } = await loadPdfToolkit();
    const parser = new PDFParse({ data: buffer, verbosity: 0, CanvasFactory });
    const result = await parser.getText();
    text = result.text ?? '';
    pageCount = result.total ?? 1;
    await parser.destroy();
  } catch (err) {
    if (err instanceof PdfExtractionError) throw err;
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('No password') || msg.includes('PasswordException')) {
      throw new PdfExtractionError('PDF is password-protected', 'PASSWORD_PROTECTED');
    }
    throw new PdfExtractionError(`Failed to parse PDF: ${msg}`, 'PARSE_FAILED');
  }

  const trimmed = text.trim();

  if (!trimmed) {
    throw new PdfExtractionError(
      'PDF appears to be a scanned image or has no extractable text',
      'EMPTY_TEXT'
    );
  }

  return {
    text: trimmed,
    pageCount,
  };
}
