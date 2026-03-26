/**
 * Shared test utilities — mock factories for AI Product OS tech stack.
 *
 * Copy or import into your app's test files:
 *   import { mockSupabase, mockNeonDB, mockPostHog, mockGemini } from "../../libs/shared/test-utils";
 */

import { vi } from "vitest";

// ---------------------------------------------------------------------------
// Supabase mock factory
// ---------------------------------------------------------------------------

/** Creates a chainable Supabase client mock (select, insert, update, delete, eq, single, etc.) */
export function mockSupabase() {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};

  const methods = [
    "select",
    "insert",
    "update",
    "delete",
    "upsert",
    "eq",
    "neq",
    "gt",
    "lt",
    "gte",
    "lte",
    "in",
    "order",
    "limit",
    "single",
    "maybeSingle",
    "range",
    "filter",
  ];

  // Each method returns the chain so calls can be composed
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnThis();
  }

  // Terminal — resolves with { data, error }
  chain["then"] = undefined as unknown as ReturnType<typeof vi.fn>; // stripped; we override below

  const from = vi.fn().mockReturnValue(chain);
  const rpc = vi.fn().mockResolvedValue({ data: null, error: null });
  const auth = {
    getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    signInWithPassword: vi.fn().mockResolvedValue({ data: {}, error: null }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
  };

  const client = { from, rpc, auth };

  /** Helper: make the next `from(...).select(...)` resolve with given data */
  function resolvesWith(data: unknown) {
    chain["single"].mockResolvedValueOnce({ data, error: null });
    chain["select"].mockReturnValueOnce({
      ...chain,
      single: chain["single"],
      then: (cb: (v: { data: unknown; error: null }) => void) =>
        Promise.resolve(cb({ data, error: null })),
    });
  }

  return { client, from, chain, auth, rpc, resolvesWith };
}

// ---------------------------------------------------------------------------
// Neon (serverless Postgres) mock factory
// ---------------------------------------------------------------------------

export function mockNeonDB() {
  const rows: unknown[] = [];
  const sql = vi.fn().mockResolvedValue(rows);

  /** Pre-load rows the next sql`` call will return */
  function resolvesWith(data: unknown[]) {
    sql.mockResolvedValueOnce(data);
  }

  return { sql, resolvesWith };
}

// ---------------------------------------------------------------------------
// PostHog mock factory
// ---------------------------------------------------------------------------

export function mockPostHog() {
  return {
    capture: vi.fn(),
    identify: vi.fn(),
    shutdown: vi.fn().mockResolvedValue(undefined),
    flush: vi.fn().mockResolvedValue(undefined),
  };
}

// ---------------------------------------------------------------------------
// Google Gemini AI mock factory
// ---------------------------------------------------------------------------

export function mockGemini() {
  const generateContent = vi.fn().mockResolvedValue({
    response: {
      text: () => '{"result": "mock"}',
      candidates: [{ content: { parts: [{ text: '{"result": "mock"}' }] } }],
    },
  });

  const getGenerativeModel = vi.fn().mockReturnValue({
    generateContent,
  });

  const models = {
    generateContent,
  };

  const client = {
    getGenerativeModel,
    models,
  };

  /** Set the text the next generateContent call returns */
  function resolvesWith(text: string) {
    generateContent.mockResolvedValueOnce({
      response: {
        text: () => text,
        candidates: [{ content: { parts: [{ text }] } }],
      },
    });
  }

  return { client, getGenerativeModel, generateContent, models, resolvesWith };
}
