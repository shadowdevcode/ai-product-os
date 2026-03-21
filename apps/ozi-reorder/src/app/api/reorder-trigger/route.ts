import { NextRequest, NextResponse } from "next/server";
import { getEligibleOrders, insertCronRun } from "@/lib/db";
import { getDaysSinceDelivery } from "@/lib/cohort";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authHeader = request.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Experiment end date guard: set EXPERIMENT_END_DATE (ISO string, e.g. "2026-04-10")
  // to prevent reminders firing past the 21-day window. Also disable the cron schedule.
  const endDateStr = process.env.EXPERIMENT_END_DATE;
  if (endDateStr) {
    const endDate = new Date(endDateStr);
    if (!isNaN(endDate.getTime()) && new Date() > endDate) {
      return NextResponse.json(
        { message: "Experiment window closed", evaluated: 0, sent: 0, errors: 0 }
      );
    }
  }

  let usersEvaluated = 0;
  let remindersSent = 0;
  let errors = 0;

  try {
    const eligible = await getEligibleOrders();
    usersEvaluated = eligible.length;

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin;

    // Fan-out: one worker invocation per eligible order
    const results = await Promise.allSettled(
      eligible.map((order) =>
        fetch(`${baseUrl}/api/reorder-worker`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.CRON_SECRET}`,
          },
          body: JSON.stringify({
            userId: order.user_id,
            orderId: order.order_id,
            skuCategory: order.sku_category,
            triggerDay: getDaysSinceDelivery(order.delivered_at),
          }),
        }).then((res) => {
          if (!res.ok) throw new Error(`Worker returned ${res.status}`);
          return res.json();
        })
      )
    );

    for (const result of results) {
      if (result.status === "fulfilled") {
        const data = result.value as { group?: string; skipped?: boolean };
        if (!data.skipped) remindersSent++;
      } else {
        errors++;
        console.error("[reorder-trigger] worker error:", result.reason);
      }
    }
  } catch (error) {
    console.error("[reorder-trigger] fatal error:", error);
    errors++;
  }

  try {
    await insertCronRun({ usersEvaluated, remindersSent, errors });
  } catch (logError) {
    console.error("[reorder-trigger] failed to log cron run:", logError);
  }

  return NextResponse.json({ evaluated: usersEvaluated, sent: remindersSent, errors });
}
