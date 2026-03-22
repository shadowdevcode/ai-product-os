/**
 * Shared PostHog utility template for AI Product OS apps.
 *
 * Copy this file to apps/[project]/src/lib/posthog.ts and update
 * the POSTHOG_KEY and POSTHOG_HOST values for your project.
 *
 * Usage:
 *   import { posthogServer } from '@/lib/posthog';
 *   posthogServer.capture({ distinctId: userId, event: 'event_name', properties: { ... } });
 *   await posthogServer.shutdown(); // Required at end of serverless function
 */

// ─── Client-side (Browser) ────────────────────────────────────────────────

// In: src/app/layout.tsx (or _app.tsx equivalent)
// Required packages: posthog-js

export const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY!;
export const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://app.posthog.com';

// PostHog provider wrapper for Next.js App Router
// Place in src/components/PostHogProvider.tsx
export const posthogProviderTemplate = `
'use client';
import posthog from 'posthog-js';
import { PostHogProvider } from 'posthog-js/react';
import { useEffect } from 'react';

export function PHProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://app.posthog.com',
      capture_pageview: false, // Disable auto pageview — fire manually with posthog.capture('page_viewed')
      capture_pageleave: true,
    });
  }, []);
  return <PostHogProvider client={posthog}>{children}</PostHogProvider>;
}
`;

// ─── Server-side (API Routes / Cron) ──────────────────────────────────────

// Required packages: posthog-node

import { PostHog } from 'posthog-node';

let _posthogServer: PostHog | null = null;

/**
 * Returns a singleton PostHog server client.
 * Always call posthogServer.shutdown() at the end of serverless functions.
 */
export function getPostHogServer(): PostHog {
  if (!_posthogServer) {
    _posthogServer = new PostHog(process.env.POSTHOG_KEY!, {
      host: process.env.POSTHOG_HOST ?? 'https://app.posthog.com',
      flushAt: 1,    // Flush immediately in serverless
      flushInterval: 0,
    });
  }
  return _posthogServer;
}

/**
 * Convenience wrapper: capture a server-side event and flush.
 * Use this in API routes and cron workers.
 *
 * Single emission source rule: if this event is captured server-side,
 * do NOT also capture it client-side via useEffect.
 */
export async function captureServerEvent(
  distinctId: string,
  event: string,
  properties?: Record<string, unknown>
): Promise<void> {
  const client = getPostHogServer();
  client.capture({ distinctId, event, properties });
  await client.shutdown();
}

// ─── Telemetry Verification Checklist ─────────────────────────────────────
//
// Before marking execute-plan complete, verify every event from metric-plan
// is present in the codebase. Run:
//
//   grep -r "posthog.capture\|captureServerEvent" apps/[project]/src --include="*.ts" --include="*.tsx"
//
// All events listed in experiments/plans/manifest-NNN.json["posthog_events"]
// must appear in the grep output.
