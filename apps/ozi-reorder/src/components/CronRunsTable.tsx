import type { CronRun } from "@/lib/db";

interface Props {
  runs: CronRun[];
}

export default function CronRunsTable({ runs }: Props) {
  if (runs.length === 0) {
    return (
      <p className="text-sm text-slate-400 text-center py-6">
        No cron runs yet. Click{" "}
        <span className="font-medium text-slate-600">"Run Trigger Now"</span> to
        start the experiment.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-100">
            <th className="pb-3 pr-6">Run Time</th>
            <th className="pb-3 pr-6">Evaluated</th>
            <th className="pb-3 pr-6">Reminders Sent</th>
            <th className="pb-3">Errors</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {runs.map((run) => (
            <tr key={run.id} className="hover:bg-slate-50 transition-colors">
              <td className="py-3 pr-6 text-slate-600 font-mono text-xs">
                {new Date(run.run_at).toLocaleString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true,
                })}
              </td>
              <td className="py-3 pr-6 text-slate-700">{run.users_evaluated}</td>
              <td className="py-3 pr-6">
                <span className="text-emerald-600 font-medium">
                  {run.reminders_sent}
                </span>
              </td>
              <td className="py-3">
                {run.errors > 0 ? (
                  <span className="text-red-500 font-medium">{run.errors}</span>
                ) : (
                  <span className="text-slate-300">0</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
