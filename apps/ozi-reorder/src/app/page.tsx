import {
  getCohortCounts,
  getReminderStats,
  getOrdersPlacedCounts,
  getEligibleOrdersForDashboard,
  getRecentCronRuns,
} from "@/lib/db";
import { neon } from "@neondatabase/serverless";
import ExperimentStats from "@/components/ExperimentStats";
import EligibleOrdersTable from "@/components/EligibleOrdersTable";
import CronRunsTable from "@/components/CronRunsTable";
import TriggerButton from "@/components/TriggerButton";
import ControlGroupSimulator from "@/components/ControlGroupSimulator";
import type { ExperimentCohort } from "@/lib/db";

// Force dynamic — data changes on every trigger run
export const dynamic = "force-dynamic";

async function getCohortRows(): Promise<ExperimentCohort[]> {
  const url = process.env.DATABASE_URL;
  if (!url) return [];
  const db = neon(url);
  const rows = await db`SELECT * FROM experiment_cohorts LIMIT 200`;
  return rows as ExperimentCohort[];
}

export default async function DashboardPage() {
  let cohortCounts = { test: 0, control: 0 };
  let reminderStats = { sent: 0, opened: 0 };
  let ordersPlaced = { test: 0, control: 0 };
  let eligibleOrders: Awaited<ReturnType<typeof getEligibleOrdersForDashboard>> = [];
  let cronRuns: Awaited<ReturnType<typeof getRecentCronRuns>> = [];
  let cohortRows: ExperimentCohort[] = [];
  let dbError = false;

  try {
    [cohortCounts, reminderStats, ordersPlaced, eligibleOrders, cronRuns, cohortRows] =
      await Promise.all([
        getCohortCounts(),
        getReminderStats(),
        getOrdersPlacedCounts(),
        getEligibleOrdersForDashboard(),
        getRecentCronRuns(5),
        getCohortRows(),
      ]);
  } catch {
    dbError = true;
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-xs font-semibold uppercase tracking-widest text-violet-500">
                Ozi · issue-006
              </span>
              <span className="text-xs bg-amber-50 text-amber-600 border border-amber-200 rounded-full px-2 py-0.5 font-medium">
                21-day experiment
              </span>
            </div>
            <h1 className="text-xl font-bold text-slate-900">
              Reorder Reminder Experiment
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Hypothesis: Day 18–20 push + one-tap repeat order → +10pp repeat
              purchase rate vs. control
            </p>
          </div>
          <TriggerButton />
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        {dbError && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 text-sm text-red-700">
            <strong>Database not connected.</strong> Set{" "}
            <code className="bg-red-100 px-1 rounded text-xs">DATABASE_URL</code> in{" "}
            <code className="bg-red-100 px-1 rounded text-xs">.env.local</code> and run{" "}
            <code className="bg-red-100 px-1 rounded text-xs">schema.sql</code> in Neon
            SQL Editor.
          </div>
        )}

        {/* Experiment Stats */}
        <section>
          <ExperimentStats
            testCount={cohortCounts.test}
            controlCount={cohortCounts.control}
            remindersSent={reminderStats.sent}
            remindersOpened={reminderStats.opened}
            testOrdersPlaced={ordersPlaced.test}
            controlOrdersPlaced={ordersPlaced.control}
          />
        </section>

        {/* Seed helper */}
        <section className="bg-violet-50 border border-violet-100 rounded-xl px-5 py-4 text-sm text-violet-700">
          <strong>First time setup:</strong> Run{" "}
          <code className="bg-violet-100 px-1.5 py-0.5 rounded text-xs font-mono">
            POST /api/seed
          </code>{" "}
          to insert 15 mock baby essential orders across 10 users. Then click{" "}
          <strong>"Run Trigger Now"</strong> to fire the Day 18–20 cron.
        </section>

        {/* Eligible Orders */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-slate-800">
              Eligible Orders
            </h2>
            <span className="text-xs text-slate-400">18–20 day window</span>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <EligibleOrdersTable
              orders={eligibleOrders}
              cohorts={cohortRows}
            />
          </div>
        </section>

        {/* Cron Runs */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-slate-800">
              Cron Run Log
            </h2>
            <span className="text-xs text-slate-400">Last 5 runs</span>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <CronRunsTable runs={cronRuns} />
          </div>
        </section>

        {/* Control group simulator */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-slate-800">
                Control Group — Simulate Organic Order
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                North Star requires measuring control conversions. In production this comes from the Ozi checkout webhook.
              </p>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <ControlGroupSimulator
              controlUserIds={cohortRows
                .filter((r) => r.group_name === "control")
                .map((r) => r.user_id)}
            />
          </div>
        </section>

        {/* Deep link demo */}
        <section className="bg-slate-800 rounded-xl px-5 py-4 text-sm">
          <p className="text-slate-300 mb-2 font-medium">Demo: Reorder Screen</p>
          <p className="text-slate-400 text-xs mb-3">
            Simulates the screen a test-group parent sees after tapping the push
            notification. Pass any userId from the eligible orders above.
          </p>
          <div className="flex flex-wrap gap-2">
            {["user_01", "user_02", "user_03"].map((uid) => (
              <a
                key={uid}
                href={`/reorder/2025610?userId=${uid}`}
                className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg px-3 py-1.5 font-mono transition-colors"
              >
                /reorder/2025610?userId={uid}
              </a>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
