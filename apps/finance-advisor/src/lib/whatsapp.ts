/**
 * Helper to send WhatsApp messages using the Meta Cloud API.
 */
export async function sendWhatsAppMessage(to: string, text: string) {
    const token = process.env.WHATSAPP_TOKEN;
    const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

    if (!token || !phoneId) {
        console.warn("WhatsApp credentials missing. Skipping send.");
        return;
    }

    try {
        const response = await fetch(`https://graph.facebook.com/v17.0/${phoneId}/messages`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                messaging_product: "whatsapp",
                recipient_type: "individual",
                to: to,
                type: "text",
                text: { preview_url: false, body: text }
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error(`WhatsApp API error for ${to}:`, errorData);
        }
    } catch (e) {
        console.error(`Failed to send message to ${to}:`, e);
    }
}
