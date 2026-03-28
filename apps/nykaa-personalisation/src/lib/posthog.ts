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
    await client.flush();
  } catch (e) {
    console.error(`[PostHog] Failed to capture ${event}:`, e);
  }
}
