import { getSessionById, type ResearchSessionRow } from '@/lib/db';

export type GateResult =
  | { ok: true; session: ResearchSessionRow }
  | { ok: false; code: 'NOT_FOUND' | 'PLAN_NOT_APPROVED' | 'SESSION_STOPPED' };

export async function gateExecutionTool(sessionId: string, userId: string): Promise<GateResult> {
  const session = await getSessionById(sessionId, userId);
  if (!session) {
    return { ok: false, code: 'NOT_FOUND' };
  }
  if (session.phase === 'stopped' || session.stopped_at) {
    return { ok: false, code: 'SESSION_STOPPED' };
  }
  if (!session.plan_approved_at) {
    return { ok: false, code: 'PLAN_NOT_APPROVED' };
  }
  return { ok: true, session };
}
