/**
 * POST /api/onboarding/complete
 *
 * Called at the end of the onboarding flow.
 * Persists the money health score to the user's profile and fires
 * the onboarding_completed PostHog event (single emission source: server).
 *
 * Body: { monthly_income_paisa: number, money_health_score: number, perceived_spend_paisa: number }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { upsertProfileOnboarding } from '@/lib/db';
import { captureServerEvent } from '@/lib/posthog';

export async function POST(req: NextRequest): Promise<NextResponse> {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (
    !body ||
    typeof body.monthly_income_paisa !== 'number' ||
    typeof body.money_health_score !== 'number'
  ) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { monthly_income_paisa, money_health_score, perceived_spend_paisa = 0 } = body;

  try {
    await upsertProfileOnboarding(
      { id: user.id, email: user.email },
      monthly_income_paisa,
      money_health_score,
      perceived_spend_paisa,
      new Date().toISOString()
    );
  } catch (error) {
    console.error('[onboarding/complete] upsert failed:', error);
    return NextResponse.json({ error: 'Failed to save onboarding progress.' }, { status: 500 });
  }

  // Single emission source: server-side only
  await captureServerEvent(user.id, 'onboarding_completed', {
    monthly_income_paisa,
    money_health_score,
    perceived_spend_paisa,
  }).catch((e) => console.error('[onboarding/complete] posthog failed:', e));

  return NextResponse.json({ ok: true });
}
