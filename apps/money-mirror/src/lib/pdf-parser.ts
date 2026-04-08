/**
 * T4 — PDF Text Extraction Service
 *
 * Accepts a raw PDF Buffer, extracts plain text, and returns it.
 * The buffer is consumed in-memory and never written to disk (Option A).
 *
 * Privacy guarantee: the caller is responsible for immediately nulling
 * the buffer reference after calling extractPdfText() so it becomes
 * eligible for GC. See /api/statement/parse/route.ts.
 */

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
  PDFParse: new (opts: { data: Uint8Array; verbosity: number }) => {
    getText: () => Promise<{ text?: string; total?: number }>;
    destroy: () => Promise<void>;
  };
}

interface DomMatrixLike {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
}

class MinimalDOMMatrix implements DomMatrixLike {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;

  constructor(init?: Iterable<number> | ArrayLike<number>) {
    const values = init ? Array.from(init).slice(0, 6) : [];
    this.a = values[0] ?? 1;
    this.b = values[1] ?? 0;
    this.c = values[2] ?? 0;
    this.d = values[3] ?? 1;
    this.e = values[4] ?? 0;
    this.f = values[5] ?? 0;
  }

  multiplySelf(): MinimalDOMMatrix {
    return this;
  }

  preMultiplySelf(): MinimalDOMMatrix {
    return this;
  }

  translate(tx?: number, ty?: number): MinimalDOMMatrix {
    this.e += tx ?? 0;
    this.f += ty ?? 0;
    return this;
  }

  scale(scaleX?: number, scaleY?: number): MinimalDOMMatrix {
    this.a *= scaleX ?? 1;
    this.d *= scaleY ?? scaleX ?? 1;
    return this;
  }

  invertSelf(): MinimalDOMMatrix {
    return this;
  }
}

class MinimalImageData {
  data: Uint8ClampedArray;
  width: number;
  height: number;

  constructor(data: Uint8ClampedArray, width: number, height: number) {
    this.data = data;
    this.width = width;
    this.height = height;
  }
}

class MinimalPath2D {
  addPath(): void {}
}

let pdfParseModulePromise: Promise<PdfParseModule> | null = null;

function ensurePdfJsServerPolyfills(): void {
  const globalRecord = globalThis as Record<string, unknown>;

  if (!globalRecord.DOMMatrix) {
    globalRecord.DOMMatrix = MinimalDOMMatrix;
  }
  if (!globalRecord.ImageData) {
    globalRecord.ImageData = MinimalImageData;
  }
  if (!globalRecord.Path2D) {
    globalRecord.Path2D = MinimalPath2D;
  }
}

async function loadPdfParseModule(): Promise<PdfParseModule> {
  if (!pdfParseModulePromise) {
    ensurePdfJsServerPolyfills();
    pdfParseModulePromise = import('pdf-parse') as Promise<PdfParseModule>;
  }
  return pdfParseModulePromise;
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
    const { PDFParse } = await loadPdfParseModule();
    const parser = new PDFParse({ data: buffer, verbosity: 0 });
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
