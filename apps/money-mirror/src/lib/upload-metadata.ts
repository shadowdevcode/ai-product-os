export type AccountPurpose = 'spending' | 'savings_goals' | 'unspecified';

export function parseAccountPurpose(raw: unknown): AccountPurpose | null {
  if (typeof raw !== 'string') {
    return null;
  }
  if (raw === 'spending' || raw === 'savings_goals' || raw === 'unspecified') {
    return raw;
  }
  return null;
}

export function sanitizeNickname(raw: unknown): string | null {
  if (typeof raw !== 'string') {
    return null;
  }
  const t = raw.trim().slice(0, 80);
  return t.length ? t : null;
}

export function sanitizeCardNetwork(raw: unknown): string | null {
  if (typeof raw !== 'string') {
    return null;
  }
  const t = raw.trim().slice(0, 40);
  return t.length ? t : null;
}
