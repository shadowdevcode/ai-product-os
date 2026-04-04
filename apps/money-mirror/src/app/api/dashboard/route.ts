import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { ensureProfile } from '@/lib/db';
import { fetchDashboardData } from '@/lib/dashboard';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const statementId = req.nextUrl.searchParams.get('statement_id');
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await ensureProfile({ id: user.id, email: user.email });
    const dashboard = await fetchDashboardData(user.id, statementId);
    if (!dashboard) {
      return NextResponse.json({ error: 'Dashboard not found' }, { status: 404 });
    }

    return NextResponse.json(dashboard);
  } catch {
    return NextResponse.json({ error: 'Failed to load dashboard data' }, { status: 500 });
  }
}
