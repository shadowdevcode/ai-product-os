'use client';

export function ResearchPlanCard(props: {
  onApprove: () => void;
  disabled?: boolean;
  approved?: boolean;
}) {
  return (
    <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-4">
      <p className="text-sm font-medium text-indigo-200">Research plan</p>
      <p className="mt-1 text-xs text-[var(--text-secondary)]">
        Approve to unlock execution tools (web, Reddit, app reviews, synthesis). Server enforces
        gating.
      </p>
      <button
        type="button"
        disabled={props.disabled || props.approved}
        onClick={props.onApprove}
        className="mt-3 w-full rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400 disabled:opacity-40"
      >
        {props.approved ? 'Plan approved' : 'Approve plan'}
      </button>
    </div>
  );
}
