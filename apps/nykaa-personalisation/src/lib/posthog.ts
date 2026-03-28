import { PostHog } from 'posthog-node';

let _client: PostHog | null = null;

function getPostHogServer(): PostHog | null {
  if (!process.env.POSTHOG_HOST || !process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    return null;
  }
  if (!_client) {
    _client = new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
      host: process.env.POSTHOG_HOST,
    });
  }
  return _client;
}

export async function captureServerEvent(
  distinctId: string,
  event: string,
  properties: Record<string, unknown> = {}
): Promise<void> {
  try {
    const client = getPostHogServer();
    if (!client) return;
    client.capture({ distinctId, event, properties });
    // FIRE-AND-FORGET: Do not await flush() in hot paths.
    // PostHog node SDK handles batching and flushing in the background.
    // client.flush() is only needed for short-lived processes (like Lambda termination).
    // In Vercel, we rely on the process surviving long enough for background flush or use .flush() in non-critical paths if needed.
    // For this experiment, we prioritize low latency.
  } catch (e) {
    console.error(`[PostHog] Failed to capture ${event}:`, e);
  }
}
