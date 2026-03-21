"use client";

interface FeatureCardProps {
  id: string;
  label: string;
  description: string;
  selected: boolean;
  disabled: boolean;
  onToggle: (id: string) => void;
}

export default function FeatureCard({
  id,
  label,
  description,
  selected,
  disabled,
  onToggle,
}: FeatureCardProps) {
  return (
    <button
      type="button"
      onClick={() => onToggle(id)}
      disabled={disabled}
      aria-pressed={selected}
      className={[
        "relative flex flex-col items-start gap-1 rounded-xl border p-4 text-left transition-all",
        selected
          ? "border-indigo-500 bg-indigo-950/40 ring-1 ring-indigo-500"
          : "border-neutral-800 bg-neutral-900/60 hover:border-neutral-600",
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
      ].join(" ")}
    >
      {selected && (
        <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500">
          <svg
            className="h-3 w-3 text-white"
            viewBox="0 0 12 12"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M2 6l3 3 5-5" />
          </svg>
        </span>
      )}
      <span className="text-sm font-semibold text-neutral-100">{label}</span>
      <span className="text-xs text-neutral-400">{description}</span>
    </button>
  );
}
