import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { sendWhatsAppMessage } from '@/lib/whatsapp';

// The token you set in your WhatsApp app dashboard
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;

// GET method is used by WhatsApp to verify the webhook URL
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);

    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        console.log('WEBHOOK_VERIFIED');
        return new NextResponse(challenge, { status: 200 });
    } else {
        return new NextResponse('Forbidden', { status: 403 });
    }
}

// POST method is used to receive incoming messages from users
export async function POST(request: Request) {
    try {
        const body = await request.json();

        // Check if it's a WhatsApp status update or message
        if (body.object === 'whatsapp_business_account') {
            const entry = body.entry?.[0];
            const changes = entry?.changes?.[0];
            const value = changes?.value;

            const message = value?.messages?.[0];

            if (message) {
                const from = message.from; // User's phone number

                // Edge Case 1: Handle non-text messages gracefully
                if (message.type !== 'text') {
                    await sendWhatsAppMessage(from, "I'm just a simple text bot! 🤖 Please type out your expenses.");
                    return new NextResponse('EVENT_RECEIVED', { status: 200 });
                }

                const textBody = message.text.body;

                console.log(`Received message from ${from}: ${textBody}`);

                // 1. Parse the amount (basic regex for numbers)
                // Find the first sequence of digits
                const amountMatch = textBody.match(/\d+/);
                let amount: number | null = null;

                if (amountMatch) {
                    amount = parseInt(amountMatch[0], 10);
                }

                // 2. Find or create user
                let { data: user } = await supabase
                    .from('users')
                    .select('id')
                    .eq('phone_number', from)
                    .single();

                if (!user) {
                    // Create user if they don't exist
                    const { data: newUser, error } = await supabase
                        .from('users')
                        .insert([{
                            phone_number: from,
                            status: 'active',
                            weekly_goal: 10000 // Default goal
                        }])
                        .select()
                        .single();

                    if (error) {
                        console.error("Error creating user:", error);
                    }
                    user = newUser;
                }

                // 3. Log the expense summary
                // Edge Case 2: Handle 0 explicitly vs null
                if (user && amount !== null) {
                    const { error: logError } = await supabase
                        .from('logs')
                        .insert([{
                            user_id: user.id,
                            amount: amount,
                            raw_text: textBody
                        }]);

                    if (logError) {
                        console.error("Error inserting log:", logError);
                    }

                    // 4. Send distinct confirmations
                    if (amount === 0) {
                        await sendWhatsAppMessage(from, `Woohoo! 🎉 Zero non-essential spending today. I've logged it! 👑`);
                    } else {
                        await sendWhatsAppMessage(from, `Got it! Logged ₹${amount}. 📝`);
                    }
                } else if (user) {
                    // If no clear amount, still acknowledge playfully
                    await sendWhatsAppMessage(from, `I didn't catch an amount in that, but I'm keeping an eye on you! 👀`);
                }
            }

            return new NextResponse('EVENT_RECEIVED', { status: 200 });
        } else {
            return new NextResponse('Not a WhatsApp Event', { status: 404 });
        }

    } catch (error) {
        console.error('Error processing webhook:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
