import * as Sentry from '@sentry/nextjs';
import { NextResponse } from 'next/server';

// ─── API Error Responses ──────────────────────────────────────────────────

export function apiError(message: string, status: number, context?: Record<string, unknown>) {
  if (status >= 500) {
    // Log server errors with context for debugging
    console.error(`[API Error ${status}]`, message, context ?? {});
  }
  return NextResponse.json({ error: message }, { status });
}

export const API_ERRORS = {
  BAD_REQUEST: (msg: string) => apiError(msg, 400),
  UNAUTHORIZED: () => apiError('Unauthorized', 401),
  NOT_FOUND: (resource: string) => apiError(`${resource} not found`, 404),
  RATE_LIMITED: () => apiError('Too many requests', 429),
  SERVER_ERROR: (e: unknown, context?: Record<string, unknown>) => {
    Sentry.captureException(e, { extra: context });
    return apiError('Internal server error', 500, context);
  },
  TIMEOUT: (timeoutMs: number) => apiError(`Request timed out after ${timeoutMs}ms`, 504),
} as const;

// ─── AI Response Parsing ──────────────────────────────────────────────────

/**
 * Safely parse an LLM response that may be wrapped in markdown codeblocks.
 * Returns the parsed object or a fallback if parsing fails.
 *
 * @example
 * const result = parseAIResponse<{ category: string }>(
 *   aiResponse.text,
 *   { category: 'uncategorized' },
 *   'categorize-task'
 * );
 */
export function parseAIResponse<T>(rawText: string, fallback: T, context: string): T {
  const cleanText = rawText
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim();

  try {
    const parsed = JSON.parse(cleanText);
    return parsed as T;
  } catch (e) {
    console.error(`[${context}] AI response parse failed:`, cleanText.substring(0, 200));
    Sentry.captureException(e, { extra: { context, rawText: cleanText.substring(0, 500) } });
    return fallback;
  }
}

// ─── Error Classification ─────────────────────────────────────────────────

/**
 * Determine if an error from a third-party API is transient (retry-able)
 * or permanent (fail fast).
 *
 * Transient: 429, 503, 504, network timeouts
 * Permanent: 400, 401, 403, 404
 */
export function isTransientError(statusCode: number): boolean {
  return [429, 500, 502, 503, 504].includes(statusCode);
}

// ─── Auth Header Validation ───────────────────────────────────────────────

/**
 * Validate a shared secret header on worker/cron routes.
 * Use for routes that are "internal" but externally reachable.
 *
 * @example
 * const authError = validateWorkerAuth(request, process.env.CRON_SECRET!);
 * if (authError) return authError;
 */
export function validateWorkerAuth(
  request: Request,
  expectedSecret: string,
  headerName = 'x-worker-key'
): NextResponse | null {
  const provided = request.headers.get(headerName);
  if (!provided || provided !== expectedSecret) {
    return API_ERRORS.UNAUTHORIZED();
  }
  return null;
}

// ─── Timeout Wrapper ──────────────────────────────────────────────────────

/**
 * Wrap an async operation with a timeout using AbortController.
 * Required for all AI model calls on Vercel (stay under 9s).
 *
 * @example
 * const result = await withTimeout(
 *   (signal) => gemini.generateContent({ ..., signal }),
 *   8500,
 *   'gemini-categorize'
 * );
 */
export async function withTimeout<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number,
  context: string
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const result = await fn(controller.signal);
    clearTimeout(timer);
    return result;
  } catch (e) {
    clearTimeout(timer);
    if (controller.signal.aborted) {
      throw new Error(`[${context}] Timed out after ${timeoutMs}ms`);
    }
    throw e;
  }
}
