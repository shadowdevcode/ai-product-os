"use client";

import { FEATURES } from "@/lib/features";
import FeatureCard from "./FeatureCard";

interface FeatureBoardProps {
  selectedIds: string[];
  disabled: boolean;
  onToggle: (id: string) => void;
}

export default function FeatureBoard({
  selectedIds,
  disabled,
  onToggle,
}: FeatureBoardProps) {
  const selectedSet = new Set(selectedIds);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-widest text-neutral-500">
          Select Features
        </p>
        {selectedIds.length > 0 && (
          <span className="rounded-full bg-indigo-600 px-2.5 py-0.5 text-xs font-semibold text-white">
            {selectedIds.length} selected
          </span>
        )}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f) => (
          <FeatureCard
            key={f.id}
            id={f.id}
            label={f.label}
            description={f.description}
            selected={selectedSet.has(f.id)}
            disabled={disabled}
            onToggle={onToggle}
          />
        ))}
      </div>
    </div>
  );
}
