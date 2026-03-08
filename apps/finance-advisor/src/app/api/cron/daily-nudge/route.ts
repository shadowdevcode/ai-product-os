import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { sendWhatsAppMessage } from '@/lib/whatsapp';

export async function GET(request: Request) {
    // 1. Basic security check (e.g., verifying a Vercel cron secret)
    const authHeader = request.headers.get('authorization');
    if (
        process.env.CRON_SECRET &&
        authHeader !== `Bearer ${process.env.CRON_SECRET}`
    ) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    console.log("Triggering Daily Nudges...");

    try {
        // 2. Fetch all active users
        const { data: users, error } = await supabase
            .from('users')
            .select('*')
            .eq('status', 'active');

        if (error) throw error;
        if (!users || users.length === 0) {
            return new NextResponse('No active users to nudge.', { status: 200 });
        }

        // 3. Send out messages
        const message = "Hey! 🌙 Did you make any non-essential purchases today? Reply with the amount, or '0' if you held strong! 💪";

        const sendPromises = users.map(user =>
            sendWhatsAppMessage(user.phone_number, message)
        );

        await Promise.allSettled(sendPromises);

        return NextResponse.json({ success: true, nudgedCount: users.length });
    } catch (e) {
        console.error("Daily cron error:", e);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
