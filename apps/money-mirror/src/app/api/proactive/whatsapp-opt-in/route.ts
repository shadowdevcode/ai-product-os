import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { captureServerEvent } from '@/lib/posthog';

interface WhatsAppOptInPayload {
  phone_e164?: string;
}

function isValidE164(raw: string): boolean {
  return /^\+[1-9]\d{7,14}$/.test(raw);
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as WhatsAppOptInPayload | null;
  const phone = body?.phone_e164?.trim() ?? '';
  if (!phone || !isValidE164(phone)) {
    return NextResponse.json(
      { error: 'phone_e164 must be a valid E.164 number.' },
      { status: 400 }
    );
  }

  const apiUrl = process.env.WHATSAPP_API_URL?.trim();
  const apiToken = process.env.WHATSAPP_API_TOKEN?.trim();

  // Single emission source: server-side in /api/proactive/whatsapp-opt-in
  captureServerEvent(user.id, 'whatsapp_opt_in_completed', {
    provider_configured: Boolean(apiUrl && apiToken),
    country_code: phone.slice(0, 3),
  }).catch(() => {});

  if (!apiUrl || !apiToken) {
    return NextResponse.json({
      ok: true,
      mode: 'stub',
      message: 'WhatsApp provider not configured. Opt-in captured for telemetry only.',
    });
  }

  const providerResp = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      user_id: user.id,
      phone_e164: phone,
      source: 'money_mirror_opt_in',
    }),
  }).catch((e: unknown) => {
    console.error('[whatsapp-opt-in] provider request failed:', e);
    return null;
  });

  if (!providerResp?.ok) {
    console.error('[whatsapp-opt-in] provider returned non-ok:', providerResp?.status);
    return NextResponse.json({ error: 'WhatsApp provider registration failed.' }, { status: 502 });
  }

  return NextResponse.json({ ok: true, mode: 'provider' });
}
