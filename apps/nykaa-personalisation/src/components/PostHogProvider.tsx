'use client';

import { useEffect } from 'react';
import posthog from 'posthog-js';

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    posthog: any;
  }
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com';
    if (!key) return;

    posthog.init(key, {
      api_host: host,
      capture_pageview: false,
      loaded: (ph) => {
        window.posthog = ph;
      },
    });
  }, []);

  return <>{children}</>;
}
