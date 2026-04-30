import { PostHog } from 'posthog-node';

let serverClient: PostHog | null = null;

function getPosthogKey(): string | undefined {
  return process.env.NEXT_PUBLIC_POSTHOG_KEY ?? process.env.POSTHOG_KEY;
}

function getPosthogHost(): string {
  return (
    process.env.NEXT_PUBLIC_POSTHOG_HOST ?? process.env.POSTHOG_HOST ?? 'https://app.posthog.com'
  );
}

export async function captureServerEvent(
  distinctId: string,
  event: string,
  properties?: Record<string, unknown>
): Promise<void> {
  const key = getPosthogKey();
  if (!key) {
    return;
  }
  serverClient = new PostHog(key, {
    host: getPosthogHost(),
    flushAt: 1,
    flushInterval: 0,
  });
  serverClient.capture({ distinctId, event, properties });
  await serverClient.shutdown();
  serverClient = null;
}
