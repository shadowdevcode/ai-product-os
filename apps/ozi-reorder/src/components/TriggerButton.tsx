"use client";

import { useState } from "react";

export default function TriggerButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    evaluated: number;
    sent: number;
    errors: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runTrigger() {
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const res = await fetch("/api/reorder-trigger", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET ?? "dev-secret"}`,
        },
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }

      const data = (await res.json()) as {
        evaluated: number;
        sent: number;
        errors: number;
      };
      setResult(data);

      // Refresh to show updated table data
      setTimeout(() => window.location.reload(), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      <button
        onClick={runTrigger}
        disabled={loading}
        className={[
          "px-5 py-2.5 rounded-xl text-sm font-semibold transition-all",
          loading
            ? "bg-slate-100 text-slate-400 cursor-not-allowed"
            : "bg-violet-600 hover:bg-violet-700 active:scale-95 text-white shadow-sm",
        ].join(" ")}
      >
        {loading ? "Running…" : "Run Trigger Now"}
      </button>

      {result && (
        <span className="text-sm text-emerald-600 font-medium">
          ✓ Evaluated {result.evaluated} · Sent {result.sent} · Errors{" "}
          {result.errors}
        </span>
      )}

      {error && (
        <span className="text-sm text-red-500">
          Failed: {error}
        </span>
      )}
    </div>
  );
}
