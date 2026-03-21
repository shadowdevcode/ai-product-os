import { neon } from "@neondatabase/serverless";

function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  return neon(url);
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MockOrder {
  id: string;
  order_id: string;
  user_id: string;
  user_name: string;
  sku_category: "diapers" | "baby-essentials";
  product_name: string;
  brand: string;
  quantity: number;
  price_inr: number;
  image_url: string | null;
  delivered_at: string;
  reminder_sent: boolean;
}

export interface ExperimentCohort {
  id: string;
  user_id: string;
  group_name: "test" | "control";
  assigned_at: string;
}

export interface ReminderSent {
  id: string;
  user_id: string;
  order_id: string;
  sku_category: string;
  trigger_day: number;
  sent_at: string;
  delivered: boolean;
  opened: boolean;
}

export interface ReorderEvent {
  id: string;
  user_id: string;
  source: "reminder" | "organic";
  reminder_id: string | null;
  original_order_id: string;
  new_order_id: string | null;
  created_at: string;
}

export interface CronRun {
  id: string;
  run_at: string;
  users_evaluated: number;
  reminders_sent: number;
  errors: number;
}

// ─── mock_orders ──────────────────────────────────────────────────────────────

export async function insertMockOrders(
  orders: Omit<MockOrder, "id">[]
): Promise<number> {
  const db = getDb();
  for (const o of orders) {
    await db`
      INSERT INTO mock_orders
        (order_id, user_id, user_name, sku_category, product_name, brand,
         quantity, price_inr, image_url, delivered_at, reminder_sent)
      VALUES
        (${o.order_id}, ${o.user_id}, ${o.user_name}, ${o.sku_category},
         ${o.product_name}, ${o.brand}, ${o.quantity}, ${o.price_inr},
         ${o.image_url ?? null}, ${o.delivered_at}, ${o.reminder_sent})
      ON CONFLICT (order_id) DO NOTHING
    `;
  }
  return orders.length;
}

export async function truncateMockOrders(): Promise<void> {
  const db = getDb();
  await db`TRUNCATE mock_orders RESTART IDENTITY CASCADE`;
}

export async function getEligibleOrders(): Promise<MockOrder[]> {
  const db = getDb();
  // DISTINCT ON (user_id) ensures at most one reminder per user per cron run,
  // even if the user has multiple eligible essential orders in the 18-20 day window.
  // Picks the earliest eligible delivery per user.
  const rows = await db`
    SELECT DISTINCT ON (user_id) *
    FROM mock_orders
    WHERE sku_category IN ('diapers', 'baby-essentials')
      AND delivered_at BETWEEN NOW() - INTERVAL '20 days' AND NOW() - INTERVAL '18 days'
      AND reminder_sent = false
    ORDER BY user_id, delivered_at ASC
    LIMIT 500
  `;
  return rows as MockOrder[];
}

export async function getEligibleOrdersForDashboard(): Promise<MockOrder[]> {
  const db = getDb();
  const rows = await db`
    SELECT *
    FROM mock_orders
    WHERE sku_category IN ('diapers', 'baby-essentials')
      AND delivered_at BETWEEN NOW() - INTERVAL '20 days' AND NOW() - INTERVAL '18 days'
      AND reminder_sent = false
    ORDER BY delivered_at ASC
    LIMIT 50
  `;
  return rows as MockOrder[];
}

export async function markReminderSent(orderId: string): Promise<void> {
  const db = getDb();
  await db`
    UPDATE mock_orders SET reminder_sent = true WHERE order_id = ${orderId}
  `;
}

export async function getLastEssentialOrder(
  userId: string
): Promise<MockOrder | null> {
  const db = getDb();
  const rows = await db`
    SELECT *
    FROM mock_orders
    WHERE user_id = ${userId}
      AND sku_category IN ('diapers', 'baby-essentials')
    ORDER BY delivered_at DESC
    LIMIT 1
  `;
  return (rows[0] as MockOrder) ?? null;
}

export async function getOrderByOrderId(
  orderId: string
): Promise<MockOrder | null> {
  const db = getDb();
  const rows = await db`
    SELECT * FROM mock_orders WHERE order_id = ${orderId} LIMIT 1
  `;
  return (rows[0] as MockOrder) ?? null;
}

// ─── experiment_cohorts ───────────────────────────────────────────────────────

export async function upsertCohort(
  userId: string,
  groupName: "test" | "control"
): Promise<ExperimentCohort> {
  const db = getDb();
  // DO NOTHING enforces write-once: first assignment wins, group_name never changes mid-experiment.
  // Do NOT change to DO UPDATE SET group_name = ... — that would re-randomize users.
  const inserted = await db`
    INSERT INTO experiment_cohorts (user_id, group_name)
    VALUES (${userId}, ${groupName})
    ON CONFLICT (user_id) DO NOTHING
    RETURNING *
  `;
  if (inserted[0]) return inserted[0] as ExperimentCohort;
  // Row already existed — return the existing assignment
  const existing = await db`
    SELECT * FROM experiment_cohorts WHERE user_id = ${userId} LIMIT 1
  `;
  return existing[0] as ExperimentCohort;
}

export async function getCohortCounts(): Promise<{
  test: number;
  control: number;
}> {
  const db = getDb();
  const rows = await db`
    SELECT group_name, COUNT(*)::int AS count
    FROM experiment_cohorts
    GROUP BY group_name
  `;
  const result = { test: 0, control: 0 };
  for (const row of rows) {
    if (row.group_name === "test") result.test = row.count as number;
    if (row.group_name === "control") result.control = row.count as number;
  }
  return result;
}

export async function getCohortForUser(
  userId: string
): Promise<ExperimentCohort | null> {
  const db = getDb();
  const rows = await db`
    SELECT * FROM experiment_cohorts WHERE user_id = ${userId} LIMIT 1
  `;
  return (rows[0] as ExperimentCohort) ?? null;
}

// ─── reminders_sent ───────────────────────────────────────────────────────────

export async function insertReminder(reminder: {
  id: string;
  userId: string;
  orderId: string;
  skuCategory: string;
  triggerDay: number;
}): Promise<ReminderSent> {
  const db = getDb();
  const rows = await db`
    INSERT INTO reminders_sent (id, user_id, order_id, sku_category, trigger_day, delivered)
    VALUES (${reminder.id}, ${reminder.userId}, ${reminder.orderId},
            ${reminder.skuCategory}, ${reminder.triggerDay}, true)
    RETURNING *
  `;
  return rows[0] as ReminderSent;
}

export async function markReminderOpened(reminderId: string): Promise<void> {
  const db = getDb();
  await db`
    UPDATE reminders_sent SET opened = true WHERE id = ${reminderId}
  `;
}

export async function getReminderStats(): Promise<{
  sent: number;
  opened: number;
}> {
  const db = getDb();
  const rows = await db`
    SELECT
      COUNT(*)::int AS sent,
      COUNT(*) FILTER (WHERE opened = true)::int AS opened
    FROM reminders_sent
  `;
  const row = rows[0] as { sent: number; opened: number };
  return { sent: row.sent ?? 0, opened: row.opened ?? 0 };
}

export async function getReminderForOrder(
  orderId: string
): Promise<ReminderSent | null> {
  const db = getDb();
  const rows = await db`
    SELECT * FROM reminders_sent WHERE order_id = ${orderId}
    ORDER BY sent_at DESC LIMIT 1
  `;
  return (rows[0] as ReminderSent) ?? null;
}

// ─── reorder_events ───────────────────────────────────────────────────────────

export async function insertReorderEvent(event: {
  id: string;
  userId: string;
  source: "reminder" | "organic";
  reminderId: string | null;
  originalOrderId: string;
  newOrderId: string | null;
}): Promise<ReorderEvent> {
  const db = getDb();
  const rows = await db`
    INSERT INTO reorder_events
      (id, user_id, source, reminder_id, original_order_id, new_order_id)
    VALUES
      (${event.id}, ${event.userId}, ${event.source},
       ${event.reminderId ?? null}, ${event.originalOrderId}, ${event.newOrderId ?? null})
    RETURNING *
  `;
  return rows[0] as ReorderEvent;
}

export async function getOrdersPlacedCounts(): Promise<{
  test: number;
  control: number;
}> {
  const db = getDb();
  const rows = await db`
    SELECT source, COUNT(*)::int AS count
    FROM reorder_events
    WHERE source IN ('reminder', 'organic')
    GROUP BY source
  `;
  const result = { test: 0, control: 0 };
  for (const row of rows) {
    if (row.source === "reminder") result.test = row.count as number;
    if (row.source === "organic") result.control = row.count as number;
  }
  return result;
}

// ─── cron_runs ────────────────────────────────────────────────────────────────

export async function insertCronRun(run: {
  usersEvaluated: number;
  remindersSent: number;
  errors: number;
}): Promise<CronRun> {
  const db = getDb();
  const rows = await db`
    INSERT INTO cron_runs (users_evaluated, reminders_sent, errors)
    VALUES (${run.usersEvaluated}, ${run.remindersSent}, ${run.errors})
    RETURNING *
  `;
  return rows[0] as CronRun;
}

export async function getRecentCronRuns(limit = 5): Promise<CronRun[]> {
  const db = getDb();
  const rows = await db`
    SELECT * FROM cron_runs ORDER BY run_at DESC LIMIT ${limit}
  `;
  return rows as CronRun[];
}
