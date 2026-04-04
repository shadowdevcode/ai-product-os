import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { ensureProfile } from '@/lib/db';
import { listProcessedStatements } from '@/lib/statements-list';

export async function GET(): Promise<NextResponse> {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await ensureProfile({ id: user.id, email: user.email });
    const statements = await listProcessedStatements(user.id);
    return NextResponse.json({ statements });
  } catch {
    return NextResponse.json({ error: 'Failed to list statements' }, { status: 500 });
  }
}
