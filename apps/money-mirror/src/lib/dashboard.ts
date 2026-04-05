import { fetchDashboardLegacy } from '@/lib/dashboard-legacy';
import { fetchDashboardUnified } from '@/lib/dashboard-unified';
import type { DashboardData, DashboardFetchInput } from '@/lib/dashboard-types';

export type {
  DashboardData,
  DashboardFetchInput,
  DashboardScopeMeta,
  DashboardSignals,
  DashboardSummary,
} from '@/lib/dashboard-types';

export async function fetchDashboardData(
  userId: string,
  input: DashboardFetchInput
): Promise<DashboardData | null> {
  if (input.variant === 'unified') {
    return fetchDashboardUnified(userId, input.dateFrom, input.dateTo, input.statementIds);
  }
  return fetchDashboardLegacy(userId, input.statementId);
}
