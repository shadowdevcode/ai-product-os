/**
 * Unified dashboard scope: date range + optional statement inclusion (shared client/server).
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type DatePresetId = 'last_30' | 'this_month' | 'last_month' | 'custom';

export interface UnifiedScopeInput {
  dateFrom: string;
  dateTo: string;
  /** `null` = all processed statements for the user */
  statementIds: string[] | null;
}

export type DashboardScopeInput =
  | { variant: 'legacy'; statementId: string | null }
  | { variant: 'unified'; scope: UnifiedScopeInput };

export function isValidIsoDate(raw: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return false;
  }
  const d = new Date(`${raw}T00:00:00Z`);
  return !Number.isNaN(d.getTime());
}

export function isValidUuid(raw: string): boolean {
  return UUID_RE.test(raw);
}

export function parseStatementIdsParam(
  raw: string | null
): { ok: true; value: string[] | null } | { ok: false; error: string } {
  if (raw == null || raw.trim() === '') {
    return { ok: true, value: null };
  }
  const parts = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length === 0) {
    return { ok: true, value: null };
  }
  for (const id of parts) {
    if (!isValidUuid(id)) {
      return { ok: false, error: 'statement_ids must be comma-separated UUIDs.' };
    }
  }
  return { ok: true, value: parts };
}

export function parseDashboardScopeFromSearchParams(
  sp: URLSearchParams
): DashboardScopeInput | { error: string } {
  const dateFrom = sp.get('date_from');
  const dateTo = sp.get('date_to');

  if (dateFrom || dateTo) {
    if (!dateFrom || !dateTo) {
      return { error: 'Both date_from and date_to are required for a date range.' };
    }
    if (!isValidIsoDate(dateFrom) || !isValidIsoDate(dateTo)) {
      return { error: 'date_from and date_to must be YYYY-MM-DD.' };
    }
    if (dateFrom > dateTo) {
      return { error: 'date_from must be on or before date_to.' };
    }
    const idsParsed = parseStatementIdsParam(sp.get('statement_ids'));
    if (!idsParsed.ok) {
      return { error: idsParsed.error };
    }
    return {
      variant: 'unified',
      scope: {
        dateFrom,
        dateTo,
        statementIds: idsParsed.value,
      },
    };
  }

  const statementId = sp.get('statement_id');
  if (statementId && !isValidUuid(statementId)) {
    return { error: 'Invalid statement_id.' };
  }

  return { variant: 'legacy', statementId: statementId || null };
}

/** Build `/api/dashboard` query string from current URL params (returns `?…` or ``). */
export function dashboardApiPathFromSearchParams(sp: URLSearchParams): string {
  const parsed = parseDashboardScopeFromSearchParams(sp);
  if ('error' in parsed) {
    return '';
  }
  if (parsed.variant === 'unified') {
    return buildDashboardQueryString(parsed);
  }
  if (parsed.statementId) {
    return `?statement_id=${encodeURIComponent(parsed.statementId)}`;
  }
  return '';
}

export function buildDashboardQueryString(input: DashboardScopeInput): string {
  if (input.variant === 'legacy') {
    if (!input.statementId) {
      return '';
    }
    const q = new URLSearchParams();
    q.set('statement_id', input.statementId);
    return `?${q.toString()}`;
  }
  const q = new URLSearchParams();
  q.set('date_from', input.scope.dateFrom);
  q.set('date_to', input.scope.dateTo);
  if (input.scope.statementIds && input.scope.statementIds.length > 0) {
    q.set('statement_ids', input.scope.statementIds.join(','));
  }
  return `?${q.toString()}`;
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** UTC calendar date YYYY-MM-DD */
export function isoDateUTC(d: Date): string {
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

export function presetToRange(
  preset: DatePresetId,
  now: Date = new Date()
): { dateFrom: string; dateTo: string; label: string } {
  const end = isoDateUTC(now);
  if (preset === 'last_30') {
    const startD = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    startD.setUTCDate(startD.getUTCDate() - 29);
    return { dateFrom: isoDateUTC(startD), dateTo: end, label: 'last_30' };
  }
  if (preset === 'this_month') {
    const start = `${now.getUTCFullYear()}-${pad2(now.getUTCMonth() + 1)}-01`;
    return { dateFrom: start, dateTo: end, label: 'this_month' };
  }
  if (preset === 'last_month') {
    const y = now.getUTCFullYear();
    const m = now.getUTCMonth();
    const firstThis = Date.UTC(y, m, 1);
    const lastPrev = new Date(firstThis - 86400000);
    const py = lastPrev.getUTCFullYear();
    const pm = lastPrev.getUTCMonth();
    const lastDay = new Date(Date.UTC(py, pm + 1, 0)).getUTCDate();
    return {
      dateFrom: `${py}-${pad2(pm + 1)}-01`,
      dateTo: `${py}-${pad2(pm + 1)}-${pad2(lastDay)}`,
      label: 'last_month',
    };
  }
  return { dateFrom: end, dateTo: end, label: 'custom' };
}
