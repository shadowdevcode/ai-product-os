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
      flushAt: 1, // Flush immediately in serverless
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
  _posthogServer = null;
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
//
// Client-only (posthog-js): `bad_pattern_advisory_shown`, `bad_pattern_advisory_clicked`
// — emitted from `getPosthogBrowser()` in `posthog-browser.ts` / `AdvisoryFeed.tsx`.
