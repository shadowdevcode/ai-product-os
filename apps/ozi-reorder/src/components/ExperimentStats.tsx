interface Props {
  testCount: number;
  controlCount: number;
  remindersSent: number;
  remindersOpened: number;
  testOrdersPlaced: number;
  controlOrdersPlaced: number;
}

export default function ExperimentStats({
  testCount,
  controlCount,
  remindersSent,
  remindersOpened,
  testOrdersPlaced,
  controlOrdersPlaced,
}: Props) {
  const total = testCount + controlCount;
  const openRate =
    remindersSent > 0 ? Math.round((remindersOpened / remindersSent) * 100) : 0;
  const testConversionRate =
    remindersOpened > 0 ? Math.round((testOrdersPlaced / remindersOpened) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Cohort split */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">
          Cohort Assignment
        </p>
        <div className="grid grid-cols-3 gap-4">
          <StatCard label="Total Users" value={total} />
          <StatCard label="Test Group" value={testCount} accent="green" />
          <StatCard label="Control Group" value={controlCount} accent="slate" />
        </div>
      </div>

      {/* Funnel */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">
          Experiment Funnel
        </p>
        <div className="grid grid-cols-3 gap-4">
          <FunnelStep
            label="Reminders Sent"
            value={remindersSent}
            sub="of test group"
          />
          <FunnelStep
            label="Notifications Opened"
            value={remindersOpened}
            sub={`${openRate}% open rate`}
            arrow
          />
          <FunnelStep
            label="Test Orders Placed"
            value={testOrdersPlaced}
            sub={`${testConversionRate}% conversion`}
            arrow
            accent="green"
          />
        </div>
      </div>

      {/* North Star comparison */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">
          North Star — 21-Day Repeat Rate
        </p>
        <div className="grid grid-cols-2 gap-4">
          <StatCard label="Test Group Orders" value={testOrdersPlaced} accent="green" />
          <StatCard label="Control Group Orders" value={controlOrdersPlaced} accent="slate" />
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: "green" | "slate";
}) {
  const accentClass =
    accent === "green"
      ? "text-emerald-600"
      : accent === "slate"
      ? "text-slate-500"
      : "text-slate-800";

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <p className={`text-3xl font-bold ${accentClass}`}>{value}</p>
      <p className="text-xs text-slate-500 mt-1">{label}</p>
    </div>
  );
}

function FunnelStep({
  label,
  value,
  sub,
  arrow,
  accent,
}: {
  label: string;
  value: number;
  sub: string;
  arrow?: boolean;
  accent?: "green";
}) {
  return (
    <div className="relative bg-white border border-slate-200 rounded-xl p-4">
      {arrow && (
        <span className="absolute -left-3 top-1/2 -translate-y-1/2 text-slate-300 text-lg">
          →
        </span>
      )}
      <p
        className={`text-3xl font-bold ${
          accent === "green" ? "text-emerald-600" : "text-slate-800"
        }`}
      >
        {value}
      </p>
      <p className="text-sm font-medium text-slate-700 mt-1">{label}</p>
      <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
    </div>
  );
}
