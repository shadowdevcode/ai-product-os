import type { MockOrder } from "@/lib/db";
import type { ExperimentCohort } from "@/lib/db";

interface Props {
  orders: MockOrder[];
  cohorts: ExperimentCohort[];
}

export default function EligibleOrdersTable({ orders, cohorts }: Props) {
  const cohortMap = new Map(cohorts.map((c) => [c.user_id, c.group_name]));

  if (orders.length === 0) {
    return (
      <div className="text-center py-10 text-slate-400 text-sm">
        No orders in the 18–20 day window. Run{" "}
        <code className="bg-slate-100 px-1 rounded text-xs">POST /api/seed</code>{" "}
        to insert mock data.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-100">
            <th className="pb-3 pr-4">Order ID</th>
            <th className="pb-3 pr-4">User</th>
            <th className="pb-3 pr-4">Product</th>
            <th className="pb-3 pr-4">Category</th>
            <th className="pb-3 pr-4">Day</th>
            <th className="pb-3 pr-4">Cohort</th>
            <th className="pb-3">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {orders.map((order) => {
            const daysSince = Math.floor(
              (Date.now() - new Date(order.delivered_at).getTime()) /
                (1000 * 60 * 60 * 24)
            );
            const group = cohortMap.get(order.user_id);

            return (
              <tr key={order.order_id} className="hover:bg-slate-50 transition-colors">
                <td className="py-3 pr-4 font-mono text-slate-600">
                  #{order.order_id}
                </td>
                <td className="py-3 pr-4 text-slate-700">{order.user_name}</td>
                <td className="py-3 pr-4 text-slate-700 max-w-[200px]">
                  <span className="font-medium">{order.brand}</span>
                  <span className="text-slate-400 block text-xs truncate">
                    {order.product_name}
                  </span>
                </td>
                <td className="py-3 pr-4">
                  <span className="text-xs bg-violet-50 text-violet-700 rounded-full px-2 py-0.5 font-medium">
                    {order.sku_category}
                  </span>
                </td>
                <td className="py-3 pr-4 text-slate-600">Day {daysSince}</td>
                <td className="py-3 pr-4">
                  {group ? (
                    <CohortBadge group={group} />
                  ) : (
                    <span className="text-xs text-slate-300">—</span>
                  )}
                </td>
                <td className="py-3">
                  {order.reminder_sent ? (
                    <span className="text-xs text-emerald-600 font-medium">
                      Sent ✓
                    </span>
                  ) : (
                    <span className="text-xs text-amber-500 font-medium">
                      Pending
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function CohortBadge({ group }: { group: string }) {
  if (group === "test") {
    return (
      <span className="text-xs bg-emerald-50 text-emerald-700 rounded-full px-2 py-0.5 font-semibold">
        TEST
      </span>
    );
  }
  return (
    <span className="text-xs bg-slate-100 text-slate-500 rounded-full px-2 py-0.5 font-semibold">
      CTRL
    </span>
  );
}
