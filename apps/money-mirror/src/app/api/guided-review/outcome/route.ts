import * as Sentry from '@sentry/nextjs';
import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { getDb } from '@/lib/db';
import { captureServerEvent } from '@/lib/posthog';
import { isValidUuid } from '@/lib/scope';

const MAX_COMMITMENT_LENGTH = 500;

interface OutcomeBody {
  statement_id?: string | null;
  dismissed: boolean;
  commitment_text?: string | null;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: OutcomeBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (typeof body.dismissed !== 'boolean') {
    return NextResponse.json({ error: 'dismissed (boolean) is required' }, { status: 400 });
  }

  const statementId = body.statement_id ?? null;
  if (statementId && !isValidUuid(statementId)) {
    return NextResponse.json({ error: 'statement_id must be a valid UUID' }, { status: 400 });
  }

  // Privacy contract: when the user dismisses the review, never persist
  // commitment text — even if the client mistakenly (or maliciously) sends it.
  // The server is the source of truth for opt-in storage.
  const commitmentText = body.dismissed ? null : body.commitment_text?.trim() || null;
  if (commitmentText && commitmentText.length > MAX_COMMITMENT_LENGTH) {
    return NextResponse.json(
      { error: `commitment_text exceeds ${MAX_COMMITMENT_LENGTH} characters` },
      { status: 400 }
    );
  }

  try {
    const sql = getDb();

    if (statementId) {
      const ownedRows = await sql`
        SELECT 1 AS ok
        FROM statements
        WHERE id = ${statementId}::uuid
          AND user_id = ${user.id}
        LIMIT 1
      `;
      if ((ownedRows as { ok: number }[]).length === 0) {
        return NextResponse.json({ error: 'Statement not found' }, { status: 404 });
      }
    }

    await sql`
      INSERT INTO guided_review_outcomes (user_id, statement_id, dismissed, commitment_text)
      VALUES (${user.id}, ${statementId}, ${body.dismissed}, ${commitmentText})
    `;
    // Telemetry uses the server-derived value, never the raw client field.

    const eventName = body.dismissed ? 'guided_review_completed' : 'commitment_saved';
    void captureServerEvent(user.id, eventName, {
      dismissed: body.dismissed,
      has_commitment: Boolean(commitmentText),
      statement_id: statementId,
    }).catch(() => {});

    return NextResponse.json({ ok: true });
  } catch (err) {
    Sentry.captureException(err);
    console.error('[POST /api/guided-review/outcome]', err);
    return NextResponse.json({ error: 'Failed to save review outcome' }, { status: 500 });
  }
}
