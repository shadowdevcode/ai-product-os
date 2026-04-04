/**
 * Statement dates are stored as DATE in Postgres and may serialize as ISO strings.
 * Parse as UTC calendar dates and format for display to avoid off-by-one in IST.
 */

export function parseDateInput(value: string | null): Date | null {
  if (!value) {
    return null;
  }
  const s = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d));
  }
  const t = Date.parse(s);
  if (Number.isNaN(t)) {
    return null;
  }
  return new Date(t);
}

export function formatStatementDate(value: string | null, locale = 'en-IN'): string {
  const d = parseDateInput(value);
  if (!d) {
    return '—';
  }
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(d);
}

export function formatPeriodRange(
  start: string | null,
  end: string | null,
  locale = 'en-IN'
): string {
  const a = formatStatementDate(start, locale);
  const b = formatStatementDate(end, locale);
  if (a === '—' && b === '—') {
    return 'Unknown period';
  }
  if (a === '—') {
    return b;
  }
  if (b === '—') {
    return a;
  }
  return `${a} – ${b}`;
}

/** e.g. "March 2026" for statement period label (uses period_end) */
export function statementMonthLabel(periodEnd: string | null, locale = 'en-IN'): string {
  const d = parseDateInput(periodEnd);
  if (!d) {
    return 'Unknown month';
  }
  return new Intl.DateTimeFormat(locale, {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(d);
}

/** YYYY-MM for filtering */
export function monthKeyFromPeriodEnd(periodEnd: string | null): string | null {
  const d = parseDateInput(periodEnd);
  if (!d) {
    return null;
  }
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function listMonthKeysFromPeriodEnds(periodEnds: (string | null)[]): string[] {
  const set = new Set<string>();
  for (const pe of periodEnds) {
    const k = monthKeyFromPeriodEnd(pe);
    if (k) {
      set.add(k);
    }
  }
  return Array.from(set).sort().reverse();
}

export function formatMonthKeyForDisplay(monthKey: string, locale = 'en-IN'): string {
  const [y, m] = monthKey.split('-').map(Number);
  if (!y || !m) {
    return monthKey;
  }
  const d = new Date(Date.UTC(y, m - 1, 1));
  return new Intl.DateTimeFormat(locale, {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(d);
}
