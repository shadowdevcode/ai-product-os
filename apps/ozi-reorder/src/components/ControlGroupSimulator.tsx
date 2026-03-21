"use client";

import { useState } from "react";

interface Props {
  controlUserIds: string[];
}

interface SimResult {
  userId: string;
  status: "idle" | "loading" | "done" | "error";
  newOrderId?: string;
  error?: string;
}

const LS_KEY = (userId: string) => `ozi_control_simulated_${userId}`;

export default function ControlGroupSimulator({ controlUserIds }: Props) {
  const [results, setResults] = useState<Record<string, SimResult>>(() =>
    Object.fromEntries(
      controlUserIds.map((id) => [
        id,
        {
          userId: id,
          status:
            typeof window !== "undefined" && localStorage.getItem(LS_KEY(id))
              ? "done"
              : "idle",
        },
      ])
    )
  );

  async function simulateOrganicOrder(userId: string) {
    setResults((prev) => ({ ...prev, [userId]: { userId, status: "loading" } }));

    try {
      // Fetch the user's last essential order to get a real orderId
      const orderRes = await fetch(
        `/api/order-history/${encodeURIComponent(userId)}/last-essential`
      );
      if (!orderRes.ok) throw new Error("No essential order found for this user");
      const order = (await orderRes.json()) as { orderId: string };

      // Submit control_order_placed event
      const eventRes = await fetch("/api/reorder-events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-demo-key": process.env.NEXT_PUBLIC_DEMO_SECRET ?? "",
        },
        body: JSON.stringify({
          eventType: "control_order_placed",
          userId,
          orderId: order.orderId,
        }),
      });
      if (!eventRes.ok) throw new Error("Event submission failed");
      const data = (await eventRes.json()) as { newOrderId: string };

      localStorage.setItem(LS_KEY(userId), "1");
      setResults((prev) => ({
        ...prev,
        [userId]: { userId, status: "done", newOrderId: data.newOrderId },
      }));
    } catch (err) {
      setResults((prev) => ({
        ...prev,
        [userId]: {
          userId,
          status: "error",
          error: err instanceof Error ? err.message : "Unknown error",
        },
      }));
    }
  }

  if (controlUserIds.length === 0) {
    return (
      <p className="text-sm text-slate-400 italic">
        No control-group users assigned yet. Run the cron trigger first.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-500 mb-3">
        Simulates an organic reorder by a control-group user — fires{" "}
        <code className="bg-slate-100 px-1 rounded">control_order_placed</code> to PostHog
        and inserts a DB row with <code className="bg-slate-100 px-1 rounded">source: &apos;organic&apos;</code>.
        In production this would come from the Ozi checkout webhook.
      </p>
      {controlUserIds.map((userId) => {
        const r = results[userId];
        return (
          <div
            key={userId}
            className="flex items-center justify-between gap-3 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5"
          >
            <span className="text-sm font-mono text-slate-700">{userId}</span>
            <div className="flex items-center gap-3">
              {r?.status === "done" && (
                <span className="text-xs text-green-600 font-medium">
                  Placed — {r.newOrderId}
                </span>
              )}
              {r?.status === "error" && (
                <span className="text-xs text-red-500">{r.error}</span>
              )}
              <button
                onClick={() => void simulateOrganicOrder(userId)}
                disabled={r?.status === "loading" || r?.status === "done"}
                className="text-xs bg-slate-700 hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg px-3 py-1.5 font-medium transition-colors"
              >
                {r?.status === "loading"
                  ? "Placing…"
                  : r?.status === "done"
                  ? "Done"
                  : "Simulate organic order"}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
