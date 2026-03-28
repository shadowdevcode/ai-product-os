import { createHash } from 'crypto';
import { getCohort, upsertCohort, type ExperimentCohort } from '@/lib/db';

const EXPERIMENT_ID = 'personalisation-v1';

/**
 * Deterministic cohort assignment: SHA-256(userId + SALT) % 2 → 0=control, 1=test.
 * Stable across sessions. Result cached in experiment_cohorts table.
 */
export async function assignCohort(userId: string): Promise<ExperimentCohort> {
  const existing = await getCohort(userId, EXPERIMENT_ID);
  if (existing) return existing;

  const salt = process.env.AB_EXPERIMENT_SALT ?? 'default-salt';
  const hash = createHash('sha256')
    .update(userId + salt)
    .digest('hex');
  const bucket = parseInt(hash.slice(0, 8), 16) % 2;
  const cohort: 'control' | 'test' = bucket === 0 ? 'control' : 'test';

  return upsertCohort(userId, cohort, EXPERIMENT_ID);
}

export async function getUserCohort(userId: string): Promise<'control' | 'test'> {
  const result = await assignCohort(userId);
  return result.cohort;
}
