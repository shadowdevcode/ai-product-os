import { NextRequest, NextResponse } from "next/server";
import { FEATURE_LABELS_WHITELIST } from "@/lib/features";
import { generateProposal } from "@/lib/gemini";
import { insertBundleSession } from "@/lib/db";
import { trackBundleGenerated, trackProposalFailed, trackProposalTimeout, trackRateLimited } from "@/lib/posthog";

// Simple in-memory rate limiter: max 5 requests per 60s per IP
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60_000;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  if (entry.count >= RATE_LIMIT_MAX) return true;

  entry.count += 1;
  return false;
}

export async function POST(request: NextRequest) {
  // S1 — Rate limiting
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  if (isRateLimited(ip)) {
    trackRateLimited().catch(() => {});
    return NextResponse.json(
      { error: "Too many requests. Please wait a minute before trying again." },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (
    !body ||
    typeof body !== "object" ||
    !("selectedFeatures" in body) ||
    !Array.isArray((body as Record<string, unknown>).selectedFeatures)
  ) {
    return NextResponse.json(
      { error: "selectedFeatures must be a non-empty array" },
      { status: 400 }
    );
  }

  const { selectedFeatures } = body as { selectedFeatures: unknown[] };

  if (selectedFeatures.length === 0) {
    return NextResponse.json(
      { error: "At least one feature must be selected" },
      { status: 400 }
    );
  }

  if (selectedFeatures.length > 10) {
    return NextResponse.json(
      { error: "Maximum 10 features allowed" },
      { status: 400 }
    );
  }

  for (const feature of selectedFeatures) {
    if (typeof feature !== "string") {
      return NextResponse.json(
        { error: "All features must be strings" },
        { status: 400 }
      );
    }
    if (feature.length > 100) {
      return NextResponse.json(
        { error: `Feature label too long: "${feature.slice(0, 30)}..."` },
        { status: 400 }
      );
    }
    if (!FEATURE_LABELS_WHITELIST.has(feature)) {
      return NextResponse.json(
        { error: `Unknown feature: "${feature}"` },
        { status: 400 }
      );
    }
  }

  const features = selectedFeatures as string[];

  // RR1 — Pre-generate sessionId so analytics are never tied to DB success
  const sessionId = crypto.randomUUID();
  const startMs = Date.now();

  let proposal;
  try {
    proposal = await generateProposal(features);
  } catch (err) {
    const isTimeout = err instanceof Error && err.message === "GEMINI_TIMEOUT";
    console.error("Gemini generation failed:", err);
    if (isTimeout) {
      trackProposalTimeout({ sessionId, features }).catch(() => {});
      return NextResponse.json(
        { error: "Generation is taking too long. Please try again." },
        { status: 504 }
      );
    }
    const errorType =
      err instanceof Error && err.message.includes("GEMINI_API_KEY")
        ? "api_key_missing"
        : "ai_parse";
    trackProposalFailed({ sessionId, features, errorType }).catch(() => {});
    return NextResponse.json(
      { error: "Generation failed. Please try again." },
      { status: 500 }
    );
  }

  const latencyMs = Date.now() - startMs;

  // Insert session into Neon DB — failure must not block the response
  try {
    await insertBundleSession({
      id: sessionId,
      selectedFeatures: features,
      priceRangeLabel: proposal.pricing.price_range_label,
      generatedPriceInr: proposal.pricing.monthly_price_inr,
      estimatedMonthlySavingsInr: proposal.pricing.estimated_monthly_savings_inr,
      roiPoints: proposal.pricing.roi_points,
      emailPitch: proposal.email_pitch,
    });
  } catch (err) {
    console.error("Neon DB insert failed (non-critical):", err);
  }

  // Fire PostHog server event — await so it doesn't get dropped in serverless
  try {
    await trackBundleGenerated({ sessionId, features, latencyMs });
  } catch (err) {
    console.warn("PostHog tracking failed (non-critical):", err);
  }

  return NextResponse.json({
    sessionId,
    pricing: proposal.pricing,
    emailPitch: proposal.email_pitch,
  });
}
