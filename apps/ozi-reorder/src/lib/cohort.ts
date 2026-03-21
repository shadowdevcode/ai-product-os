// Deterministic cohort assignment: hash(userId) % 2
// 0 → test, 1 → control
// Write-once: once persisted to experiment_cohorts, the stored value is used.

export function assignCohort(userId: string): "test" | "control" {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) >>> 0;
  }
  return hash % 2 === 0 ? "test" : "control";
}

export function getDaysSinceDelivery(deliveredAt: string): number {
  const delivered = new Date(deliveredAt).getTime();
  const now = Date.now();
  return Math.floor((now - delivered) / (1000 * 60 * 60 * 24));
}
