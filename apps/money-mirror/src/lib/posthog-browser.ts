import type { PostHog } from 'posthog-js';

let browserClient: Promise<PostHog | null> | null = null;

/** Single emission source: client `AdvisoryFeed` (bad-pattern CTA + shown). */
export const BAD_PATTERN_ADVISORY_SHOWN = 'bad_pattern_advisory_shown';
export const BAD_PATTERN_ADVISORY_CLICKED = 'bad_pattern_advisory_clicked';

/** Single emission source: client `PaywallPrompt` after Money Mirror section enters viewport. */
export const PAYWALL_PROMPT_SEEN = 'paywall_prompt_seen';
/** Single emission source: client primary CTA on `PaywallPrompt`. */
export const UPGRADE_INTENT_TAPPED = 'upgrade_intent_tapped';

/**
 * Performance-to-insight timing events (issue-012 T0).
 *
 * Timing boundaries:
 *   dashboard_ready_ms — from DashboardClient mount to Mirror + primary summary
 *     rendered for current scope (isLoadingDashboard→false, result non-null).
 *   time_to_first_advisory_ms — from mount to advisory feed data available for
 *     rendering (same API response as dashboard; advisory_count may be 0 for
 *     empty-state-shown case). Targets are p75 budgets for /metric-plan.
 */
export const DASHBOARD_READY_MS = 'dashboard_ready_ms';
export const TIME_TO_FIRST_ADVISORY_MS = 'time_to_first_advisory_ms';

/** Single emission source: client InsightsPanel when user expands/opens frequency module. */
export const FREQUENCY_INSIGHT_OPENED = 'frequency_insight_opened';
/** Single emission source: client InsightsPanel when user taps a cluster row to drill through. */
export const MERCHANT_CLUSTER_CLICKED = 'merchant_cluster_clicked';

/** Single emission source: client GuidedReviewSheet when user opens the review flow. */
export const GUIDED_REVIEW_STARTED = 'guided_review_started';

/**
 * Lazy posthog-js singleton (NEXT_PUBLIC_POSTHOG_KEY). Returns null when key unset.
 */
export function getPosthogBrowser(): Promise<PostHog | null> {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) {
    return Promise.resolve(null);
  }
  if (!browserClient) {
    browserClient = import('posthog-js').then(({ default: posthog }) => {
      posthog.init(key, {
        api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://app.posthog.com',
        capture_pageview: false,
        persistence: 'memory',
      });
      return posthog;
    });
  }
  return browserClient;
}
