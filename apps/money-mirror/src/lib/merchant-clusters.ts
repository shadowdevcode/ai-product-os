/**
 * Deterministic merchant_key → cluster_id mapping (issue-012 T1).
 *
 * Clusters are curated, code-first — no DB table, no ML.
 * To add a merchant to a cluster:
 *   1. Add the merchant_key to the appropriate CLUSTER_MEMBERS entry.
 *   2. Add a test case in __tests__/merchant-clusters.test.ts.
 *   3. Re-run `npm test` to confirm.
 */

export interface ClusterDefinition {
  id: string;
  label: string;
  description: string;
}

export const CLUSTERS: ClusterDefinition[] = [
  {
    id: 'quick_commerce',
    label: 'Quick commerce',
    description: 'Instant grocery and essentials delivery',
  },
  {
    id: 'food_delivery',
    label: 'Food delivery',
    description: 'Restaurant and food ordering platforms',
  },
  {
    id: 'entertainment',
    label: 'Entertainment',
    description: 'Streaming, music, and video subscriptions',
  },
  {
    id: 'transport',
    label: 'Transport & rides',
    description: 'Cab, auto, and ride-hailing services',
  },
  {
    id: 'shopping',
    label: 'Online shopping',
    description: 'E-commerce and marketplace orders',
  },
];

const CLUSTER_MEMBERS: Record<string, string[]> = {
  quick_commerce: ['blinkit', 'instamart', 'zepto', 'bigbasket', 'dunzo'],
  food_delivery: ['zomato', 'swiggy'],
  entertainment: ['netflix', 'spotify', 'youtube', 'hotstar', 'prime_video', 'jiocinema'],
  transport: ['uber', 'ola', 'rapido'],
  shopping: ['amazon', 'flipkart', 'myntra', 'meesho', 'ajio'],
};

const keyToCluster = new Map<string, string>();
for (const [clusterId, keys] of Object.entries(CLUSTER_MEMBERS)) {
  for (const key of keys) {
    keyToCluster.set(key, clusterId);
  }
}

/**
 * Flat list of every merchant_key that belongs to any cluster.
 * Used by full-scope SQL aggregation in `fetchClusterMerchantAggregates`
 * so cluster rollups never depend on a LIMIT-capped top-N sample.
 */
export const ALL_CLUSTER_MERCHANT_KEYS: string[] = Object.values(CLUSTER_MEMBERS).flat();

export function getClusterForMerchant(merchantKey: string): string | null {
  return keyToCluster.get(merchantKey) ?? null;
}

export function getClusterDefinition(clusterId: string): ClusterDefinition | undefined {
  return CLUSTERS.find((c) => c.id === clusterId);
}

export interface ClusterRollup {
  cluster: ClusterDefinition;
  totalDebitPaisa: number;
  debitCount: number;
  merchantKeys: string[];
}

/**
 * Groups merchant rollup rows into cluster rollups.
 * Merchants not matching any cluster are excluded.
 */
export function buildClusterRollups(
  rows: { merchant_key: string; debit_paisa: number; debit_count: number }[]
): ClusterRollup[] {
  const accum = new Map<string, { totalDebitPaisa: number; debitCount: number; keys: string[] }>();

  for (const row of rows) {
    const clusterId = getClusterForMerchant(row.merchant_key);
    if (!clusterId) continue;
    const existing = accum.get(clusterId);
    if (existing) {
      existing.totalDebitPaisa += row.debit_paisa;
      existing.debitCount += row.debit_count;
      existing.keys.push(row.merchant_key);
    } else {
      accum.set(clusterId, {
        totalDebitPaisa: row.debit_paisa,
        debitCount: row.debit_count,
        keys: [row.merchant_key],
      });
    }
  }

  const result: ClusterRollup[] = [];
  for (const [clusterId, data] of accum) {
    const def = getClusterDefinition(clusterId);
    if (!def) continue;
    result.push({
      cluster: def,
      totalDebitPaisa: data.totalDebitPaisa,
      debitCount: data.debitCount,
      merchantKeys: data.keys,
    });
  }

  result.sort((a, b) => b.debitCount - a.debitCount);
  return result;
}
