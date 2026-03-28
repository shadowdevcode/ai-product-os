import { upsertAffinityProfile } from '@/lib/db';

/**
 * Mock order history interface — in production this would come from Nykaa's order API.
 */
interface OrderHistoryItem {
  userId: string;
  brandId: string;
  categoryId: string;
  orderedAt: string;
}

/**
 * Rebuild affinity profiles from order history.
 * For this MVP we use mock order history data.
 * In production this would query Nykaa's order history API.
 */
const BATCH_SIZE = 50;

export async function rebuildAffinityProfiles(): Promise<number> {
  const orders = getMockOrderHistory();

  const userOrders = new Map<string, OrderHistoryItem[]>();
  for (const order of orders) {
    const existing = userOrders.get(order.userId) ?? [];
    existing.push(order);
    userOrders.set(order.userId, existing);
  }

  // Build upsert params for each user (pure computation, no I/O)
  const upsertParams: Parameters<typeof upsertAffinityProfile>[0][] = [];

  for (const [userId, userOrderList] of userOrders) {
    const brandCounts = new Map<string, number>();
    const categoryCounts = new Map<string, number>();

    for (const order of userOrderList) {
      brandCounts.set(order.brandId, (brandCounts.get(order.brandId) ?? 0) + 1);
      categoryCounts.set(order.categoryId, (categoryCounts.get(order.categoryId) ?? 0) + 1);
    }

    const topBrands = [...brandCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id]) => id);

    const topCategories = [...categoryCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id]) => id);

    upsertParams.push({
      userId,
      topBrands,
      topCategories,
      orderCount: userOrderList.length,
      sessionCount: 0,
    });
  }

  // Process in parallel batches to stay within serverless timeout limits
  let usersProcessed = 0;
  for (let i = 0; i < upsertParams.length; i += BATCH_SIZE) {
    const batch = upsertParams.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(batch.map((params) => upsertAffinityProfile(params)));
    usersProcessed += results.filter((r) => r.status === 'fulfilled').length;
  }

  return usersProcessed;
}

function getMockOrderHistory(): OrderHistoryItem[] {
  return [
    {
      userId: 'user-001',
      brandId: 'brand-zara',
      categoryId: 'cat-dresses',
      orderedAt: '2026-03-01',
    },
    { userId: 'user-001', brandId: 'brand-hm', categoryId: 'cat-tops', orderedAt: '2026-03-05' },
    {
      userId: 'user-001',
      brandId: 'brand-zara',
      categoryId: 'cat-dresses',
      orderedAt: '2026-03-10',
    },
    {
      userId: 'user-001',
      brandId: 'brand-mango',
      categoryId: 'cat-dresses',
      orderedAt: '2026-03-15',
    },
    {
      userId: 'user-002',
      brandId: 'brand-nike',
      categoryId: 'cat-activewear',
      orderedAt: '2026-03-02',
    },
    {
      userId: 'user-002',
      brandId: 'brand-adidas',
      categoryId: 'cat-activewear',
      orderedAt: '2026-03-08',
    },
    {
      userId: 'user-002',
      brandId: 'brand-nike',
      categoryId: 'cat-sneakers',
      orderedAt: '2026-03-12',
    },
    {
      userId: 'user-003',
      brandId: 'brand-lakme',
      categoryId: 'cat-makeup',
      orderedAt: '2026-03-03',
    },
    {
      userId: 'user-003',
      brandId: 'brand-maybelline',
      categoryId: 'cat-makeup',
      orderedAt: '2026-03-07',
    },
    {
      userId: 'user-003',
      brandId: 'brand-lakme',
      categoryId: 'cat-skincare',
      orderedAt: '2026-03-14',
    },
    {
      userId: 'user-004',
      brandId: 'brand-levis',
      categoryId: 'cat-jeans',
      orderedAt: '2026-03-04',
    },
    {
      userId: 'user-004',
      brandId: 'brand-levis',
      categoryId: 'cat-jeans',
      orderedAt: '2026-03-11',
    },
    {
      userId: 'user-004',
      brandId: 'brand-wrangler',
      categoryId: 'cat-jeans',
      orderedAt: '2026-03-18',
    },
    {
      userId: 'user-005',
      brandId: 'brand-forever21',
      categoryId: 'cat-tops',
      orderedAt: '2026-03-06',
    },
    { userId: 'user-005', brandId: 'brand-hm', categoryId: 'cat-dresses', orderedAt: '2026-03-09' },
  ];
}
