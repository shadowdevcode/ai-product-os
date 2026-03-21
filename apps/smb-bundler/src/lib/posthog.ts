import { PostHog } from "posthog-node";

// Lazy-initialise to avoid build failures without env vars
let _client: PostHog | null = null;

function getPostHogClient(): PostHog | null {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host =
    process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://app.posthog.com";

  if (!key) {
    console.warn("NEXT_PUBLIC_POSTHOG_KEY not set — server telemetry disabled");
    return null;
  }

  if (!_client) {
    _client = new PostHog(key, { host, flushAt: 1, flushInterval: 0 });
  }
  return _client;
}

export async function trackBundleGenerated(params: {
  sessionId: string;
  features: string[];
  latencyMs: number;
}): Promise<void> {
  const client = getPostHogClient();
  if (!client) return;

  client.capture({
    distinctId: params.sessionId,
    event: "bundle_generated",
    properties: {
      session_id: params.sessionId,
      features: params.features,
      feature_count: params.features.length,
      latency_ms: params.latencyMs,
    },
  });

  await client.flush();
}

export async function trackProposalFailed(params: {
  sessionId: string;
  features: string[];
  errorType: "ai_parse" | "api_key_missing" | "unknown";
}): Promise<void> {
  const client = getPostHogClient();
  if (!client) return;

  client.capture({
    distinctId: params.sessionId,
    event: "proposal_generation_failed",
    properties: {
      session_id: params.sessionId,
      error_type: params.errorType,
      selected_features: params.features,
    },
  });

  await client.flush();
}

export async function trackProposalTimeout(params: {
  sessionId: string;
  features: string[];
}): Promise<void> {
  const client = getPostHogClient();
  if (!client) return;

  client.capture({
    distinctId: params.sessionId,
    event: "proposal_generation_timeout",
    properties: {
      session_id: params.sessionId,
      selected_features: params.features,
      timeout_ms: 9000,
    },
  });

  await client.flush();
}

export async function trackRateLimited(): Promise<void> {
  const client = getPostHogClient();
  if (!client) return;

  client.capture({
    distinctId: "rate_limited",
    event: "proposal_generation_rate_limited",
    properties: {},
  });

  await client.flush();
}
