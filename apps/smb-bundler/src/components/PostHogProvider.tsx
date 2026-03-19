"use client";

import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { useEffect } from "react";

export default function PostHogProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const host =
      process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://app.posthog.com";

    if (key && !posthog.__loaded) {
      posthog.init(key, {
        api_host: host,
        capture_pageview: false, // Disable automatic pageview capture — fire manually
        persistence: "localStorage",
      });
    }
  }, []);

  return <PHProvider client={posthog}>{children}</PHProvider>;
}
