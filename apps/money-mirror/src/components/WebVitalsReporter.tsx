'use client';

import { useReportWebVitals } from 'next/web-vitals';
import type { PostHog } from 'posthog-js';

let posthogReady: Promise<PostHog> | null = null;

function getPosthogForVitals(): Promise<PostHog> | null {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) {
    return null;
  }
  if (!posthogReady) {
    posthogReady = import('posthog-js').then(({ default: posthog }) => {
      posthog.init(key, {
        api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://app.posthog.com',
        capture_pageview: false,
        persistence: 'memory',
      });
      return posthog;
    });
  }
  return posthogReady;
}

/**
 * Sends Core Web Vitals to PostHog when `NEXT_PUBLIC_POSTHOG_KEY` is set.
 * Does not capture pageviews; pair with a future PostHog provider if you add full client analytics.
 */
export function WebVitalsReporter() {
  useReportWebVitals((metric) => {
    if (process.env.NODE_ENV === 'development' && !process.env.NEXT_PUBLIC_POSTHOG_KEY) {
      console.debug('[web-vitals]', metric.name, metric.value, metric.rating);
      return;
    }

    const p = getPosthogForVitals();
    if (!p) {
      return;
    }

    void p.then((posthog) => {
      posthog.capture('web_vital', {
        name: metric.name,
        value: metric.value,
        rating: metric.rating,
        id: metric.id,
        navigation_type: metric.navigationType,
      });
    });
  });

  return null;
}
