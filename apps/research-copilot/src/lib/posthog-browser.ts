import type { PostHog } from 'posthog-js';

let posthogReady: Promise<PostHog | null> | null = null;

export function getPosthogBrowser(): Promise<PostHog | null> {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key || typeof window === 'undefined') {
    return Promise.resolve(null);
  }
  if (!posthogReady) {
    posthogReady = import('posthog-js').then(({ default: posthog }) => {
      posthog.init(key, {
        api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://app.posthog.com',
        capture_pageview: true,
      });
      return posthog;
    });
  }
  return posthogReady;
}

export async function captureClientEvent(
  event: string,
  properties?: Record<string, unknown>
): Promise<void> {
  const ph = await getPosthogBrowser();
  ph?.capture(event, properties);
}
