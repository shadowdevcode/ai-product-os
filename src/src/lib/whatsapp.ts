import twilio from 'twilio';
import type { Twilio } from 'twilio';

let _client: Twilio | null = null;
let _fromNumber: string | null = null;

function getTwilioClient(): { client: Twilio; fromNumber: string } {
    if (!_client) {
        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        if (!accountSid || !authToken) {
            throw new Error('Missing TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN environment variables');
        }
        _client = twilio(accountSid, authToken);
        _fromNumber = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886';
    }
    return { client: _client, fromNumber: _fromNumber! };
}

export async function sendWhatsAppMessage(
    to: string,
    body: string
): Promise<{ success: boolean; sid?: string; error?: string; isPermanent?: boolean }> {
    try {
        const { client, fromNumber } = getTwilioClient();

        // Hard truncate payload to 1550 characters to avoid Twilio rejections
        let finalBody = body;
        if (finalBody.length > 1550) {
            finalBody = finalBody.substring(0, 1530) + "\n\n...[Truncated]";
        }

        // Ensure the phone number is in WhatsApp format
        const whatsappTo = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;

        const message = await client.messages.create({
            body: finalBody,
            from: fromNumber,
            to: whatsappTo,
        });

        return { success: true, sid: message.sid };
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('WhatsApp send failed:', errorMessage);

        // Define permanent Twilio error codes (e.g. invalid number, unsubscribed, unverified number in sandbox)
        let isPermanent = false;
        if (error && typeof error === 'object' && 'code' in error) {
            const code = (error as { code: number }).code;
            if ([21211, 21614, 21610, 63015].includes(code)) {
                isPermanent = true;
            }
        }

        return { success: false, error: errorMessage, isPermanent };
    }
}
