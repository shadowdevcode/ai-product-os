import { fetchDashboardLegacy } from '@/lib/dashboard-legacy';
import { fetchCompareMonthsData } from '@/lib/dashboard-compare';
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
  const dashboard =
    input.variant === 'unified'
      ? await fetchDashboardUnified(userId, input.dateFrom, input.dateTo, input.statementIds)
      : await fetchDashboardLegacy(userId, input.statementId);
  if (!dashboard) {
    return null;
  }
  const monthCompare = await fetchCompareMonthsData(userId, input);
  return {
    ...dashboard,
    month_compare: monthCompare,
  };
}
