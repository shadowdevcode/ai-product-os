import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { sendWhatsAppMessage } from '@/lib/whatsapp';

export async function GET(request: Request) {
    // 1. Basic security check
    const authHeader = request.headers.get('authorization');
    if (
        process.env.CRON_SECRET &&
        authHeader !== `Bearer ${process.env.CRON_SECRET}`
    ) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    console.log("Triggering Weekly Summaries...");

    try {
        // 2. Fetch all active users
        const { data: users, error } = await supabase
            .from('users')
            .select('*')
            .eq('status', 'active');

        if (error) throw error;
        if (!users || users.length === 0) {
            return new NextResponse('No active users to summarize.', { status: 200 });
        }

        // 3. Calculate date range for the past week (e.g. last 7 days)
        const ONE_WEEK_AGO = new Date();
        ONE_WEEK_AGO.setDate(ONE_WEEK_AGO.getDate() - 7);

        // Fetch ALL logs for active users in the last week in one query
        const userIds = users.map(u => u.id);
        const { data: allLogs, error: logsError } = await supabase
            .from('logs')
            .select('user_id, amount')
            .in('user_id', userIds)
            .gte('logged_at', ONE_WEEK_AGO.toISOString());

        if (logsError) throw logsError;

        // 4. Generate summaries
        const sendPromises = users.map(user => {
            const userLogs = allLogs?.filter(log => log.user_id === user.id) || [];
            const totalSpent = userLogs.reduce((sum, log) => sum + (log.amount || 0), 0) || 0;
            const goal = user.weekly_goal || 10000;
            const isUnderBudget = totalSpent <= goal;

            let message = `*Weekly Wrap-up!* 📊\n\n`;
            message += `You spent: ₹${totalSpent} on non-essentials this week.\n`;
            message += `Your Target: ₹${goal}\n\n`;

            if (isUnderBudget) {
                message += `Awesome job! You stayed under budget! 🎉 Keep this up!`;
            } else {
                message += `You went over budget. Let's aim to cut back a little next week. You can do this! 💪`;
            }

            return sendWhatsAppMessage(user.phone_number, message);
        });

        await Promise.allSettled(sendPromises);

        return NextResponse.json({ success: true, summarizedCount: users.length });
    } catch (e) {
        console.error("Weekly cron error:", e);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
