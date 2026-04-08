/** P4-G: server + client — subscription tier stored on profiles.plan (default `free`). */
export type UserPlan = 'free' | 'pro';

export function normalizeUserPlan(raw: unknown): UserPlan {
  if (raw === 'pro') {
    return 'pro';
  }
  return 'free';
}
