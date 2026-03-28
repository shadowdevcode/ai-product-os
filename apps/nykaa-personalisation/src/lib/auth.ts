import { NextResponse } from 'next/server';

/**
 * Extract userId from Authorization header.
 * For this MVP experiment, we use a simple base64-encoded JSON token:
 * Authorization: Bearer <base64({ userId: "xxx" })>
 *
 * In production this would verify a real JWT (e.g. from Nykaa's auth).
 */
export function getUserIdFromRequest(req: Request): { userId: string } | { error: NextResponse } {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      error: NextResponse.json({ error: 'Missing Authorization header' }, { status: 401 }),
    };
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || !parts[1]) {
    return {
      error: NextResponse.json({ error: 'Invalid token format from header' }, { status: 401 }),
    };
  }

  const token = parts[1];
  try {
    const decodedStr = atob(token);
    const decoded = JSON.parse(decodedStr);

    if (
      !decoded ||
      typeof decoded !== 'object' ||
      !decoded.userId ||
      typeof decoded.userId !== 'string'
    ) {
      return {
        error: NextResponse.json({ error: 'Invalid token: missing userId' }, { status: 401 }),
      };
    }
    return { userId: decoded.userId };
  } catch {
    return {
      error: NextResponse.json({ error: 'Invalid token format' }, { status: 401 }),
    };
  }
}

/**
 * Verify CRON_SECRET header for admin/cron endpoints.
 */
export function verifyCronSecret(req: Request): { ok: true } | { error: NextResponse } {
  const secret = req.headers.get('x-cron-secret');
  if (!secret || secret !== process.env.CRON_SECRET) {
    return {
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }
  return { ok: true };
}
