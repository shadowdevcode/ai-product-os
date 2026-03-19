"use client";

import { useState, useEffect } from "react";
import { usePostHog } from "posthog-js/react";
import { FEATURES } from "@/lib/features";
import FeatureBoard from "@/components/FeatureBoard";
import GenerateButton from "@/components/GenerateButton";
import ProposalOutput, { type ProposalData } from "@/components/ProposalOutput";
import ErrorBanner from "@/components/ErrorBanner";

export default function Home() {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [proposal, setProposal] = useState<ProposalData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const posthog = usePostHog();

  useEffect(() => {
    posthog?.capture("landing_page_viewed");
  }, [posthog]);

  function handleToggle(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
    setError(null);
  }

  function handleRebuild() {
    setProposal(null);
    setError(null);
  }

  async function handleGenerate() {
    if (selectedIds.length === 0) return;

    setLoading(true);
    setError(null);
    setProposal(null);

    const selectedLabels = FEATURES.filter((f) =>
      selectedIds.includes(f.id)
    ).map((f) => f.label);

    try {
      const res = await fetch("/api/generate-proposal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedFeatures: selectedLabels }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? "Something went wrong");
        return;
      }

      const data = (await res.json()) as {
        sessionId: string;
        pricing: ProposalData["pricing"];
        emailPitch: string;
      };

      setProposal({
        sessionId: data.sessionId,
        pricing: data.pricing,
        emailPitch: data.emailPitch,
      });
    } catch {
      setError("Network error. Please check your connection");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-12">
      <div className="mb-10">
        <h1 className="text-2xl font-bold tracking-tight text-white">
          SMB Bundle Builder
        </h1>
        <p className="mt-1 text-sm text-neutral-400">
          Assemble the right product for every deal.
        </p>
      </div>

      <FeatureBoard
        selectedIds={selectedIds}
        disabled={loading}
        onToggle={handleToggle}
      />

      <div className="mt-6 flex items-center gap-4">
        <GenerateButton
          disabled={selectedIds.length === 0}
          loading={loading}
          onClick={handleGenerate}
        />
        {selectedIds.length > 0 && !loading && !proposal && (
          <span className="text-xs text-neutral-500">
            {selectedIds.length} feature{selectedIds.length !== 1 ? "s" : ""} selected
          </span>
        )}
      </div>

      {error && (
        <div className="mt-4">
          <ErrorBanner message={error} />
        </div>
      )}

      {proposal && (
        <div className="mt-8">
          <ProposalOutput proposal={proposal} onRebuild={handleRebuild} />
        </div>
      )}
    </main>
  );
}
