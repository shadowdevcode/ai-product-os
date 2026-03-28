import { NextResponse } from 'next/server';
import { verifyCronSecret } from '@/lib/auth';
import { seedTestCohorts, seedAffinityProfiles } from '@/lib/db';

export async function POST(req: Request) {
  const auth = verifyCronSecret(req);
  if ('error' in auth) return auth.error;

  try {
    const cohortCount = await seedTestCohorts([
      { userId: 'user-001', cohort: 'test' },
      { userId: 'user-002', cohort: 'test' },
      { userId: 'user-003', cohort: 'test' },
      { userId: 'user-004', cohort: 'control' },
      { userId: 'user-005', cohort: 'control' },
    ]);

    const affinityCount = await seedAffinityProfiles([
      {
        userId: 'user-001',
        topBrands: ['brand-zara', 'brand-hm', 'brand-mango'],
        topCategories: ['cat-dresses', 'cat-tops'],
        orderCount: 4,
        sessionCount: 12,
      },
      {
        userId: 'user-002',
        topBrands: ['brand-nike', 'brand-adidas'],
        topCategories: ['cat-activewear', 'cat-sneakers'],
        orderCount: 3,
        sessionCount: 8,
      },
      {
        userId: 'user-003',
        topBrands: ['brand-lakme', 'brand-maybelline'],
        topCategories: ['cat-makeup', 'cat-skincare'],
        orderCount: 3,
        sessionCount: 6,
      },
      {
        userId: 'user-004',
        topBrands: ['brand-levis', 'brand-wrangler'],
        topCategories: ['cat-jeans'],
        orderCount: 3,
        sessionCount: 9,
      },
      {
        userId: 'user-005',
        topBrands: ['brand-forever21', 'brand-hm'],
        topCategories: ['cat-tops', 'cat-dresses'],
        orderCount: 2,
        sessionCount: 5,
      },
    ]);

    return NextResponse.json({
      cohortsSeeded: cohortCount,
      affinityProfilesSeeded: affinityCount,
    });
  } catch (e) {
    console.error('[seed] Failed:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
