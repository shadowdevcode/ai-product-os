import type { DashboardData } from '@/lib/dashboard';
import { buildLayerAFacts, type LayerAFacts } from '@/lib/coaching-facts';
import { runGeminiCoachingNarratives } from '@/lib/gemini-coaching-narrative';
import { captureServerEvent } from '@/lib/posthog';

export type DashboardWithCoaching = DashboardData & { coaching_facts: LayerAFacts };

/**
 * Layer A facts only (no Gemini). Use for fast `/api/dashboard` responses.
 * AI narratives are loaded lazily via `/api/dashboard/advisories` when the Insights tab opens.
 */
export async function attachCoachingFactsOnly(
  _userId: string,
  dashboard: DashboardData
): Promise<DashboardWithCoaching> {
  const coaching_facts = buildLayerAFacts(dashboard);
  return { ...dashboard, coaching_facts };
}

/**
 * Layer A facts + optional Gemini narratives (T4). Safe fallback: rule `message` stays when AI fails.
 * Prefer `attachCoachingFactsOnly` on hot paths; call this from `/api/dashboard/advisories` only.
 */
export async function attachCoachingLayer(
  userId: string,
  dashboard: DashboardData
): Promise<DashboardWithCoaching> {
  const coaching_facts = buildLayerAFacts(dashboard);
  const narrativeResult = await runGeminiCoachingNarratives(dashboard.advisories, coaching_facts);

  if (narrativeResult.ok) {
    if (narrativeResult.latency_ms > 0) {
      // Single emission source: server-side coaching narrative telemetry
      void captureServerEvent(userId, 'coaching_narrative_completed', {
        latency_ms: narrativeResult.latency_ms,
        advisory_count: dashboard.advisories.length,
      }).catch(() => {});
    }
    return {
      ...dashboard,
      advisories: narrativeResult.advisories,
      coaching_facts,
    };
  }

  if (narrativeResult.code === 'timeout') {
    void captureServerEvent(userId, 'coaching_narrative_timeout', { timeout_ms: 9_000 }).catch(
      () => {}
    );
  } else {
    void captureServerEvent(userId, 'coaching_narrative_failed', {
      error_type: narrativeResult.code,
      detail: narrativeResult.detail,
    }).catch(() => {});
  }

  return { ...dashboard, coaching_facts };
}
