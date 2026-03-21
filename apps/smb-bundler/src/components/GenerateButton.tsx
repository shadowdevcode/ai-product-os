"use client";

interface GenerateButtonProps {
  disabled: boolean;
  loading: boolean;
  onClick: () => void;
}

export default function GenerateButton({
  disabled,
  loading,
  onClick,
}: GenerateButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className={[
        "flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold transition-all",
        disabled || loading
          ? "cursor-not-allowed bg-indigo-900/40 text-indigo-400 opacity-50"
          : "bg-indigo-600 text-white hover:bg-indigo-500 active:scale-95",
      ].join(" ")}
    >
      {loading ? (
        <>
          <svg
            className="h-4 w-4 animate-spin"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
          </svg>
          Generating…
        </>
      ) : (
        <>
          Generate Bundle Proposal
          <span aria-hidden>→</span>
        </>
      )}
    </button>
  );
}
