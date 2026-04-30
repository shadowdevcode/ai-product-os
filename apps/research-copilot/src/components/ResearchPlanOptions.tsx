'use client';

import { captureClientEvent } from '@/lib/posthog-browser';
import { cn } from '@/lib/cn';

const SOURCES = ['app_store', 'play_store', 'reddit', 'web', 'quora'] as const;
const DEPTHS = ['shallow', 'standard', 'deep'] as const;

export type PlanOptionsState = {
  sources: string[];
  depth: (typeof DEPTHS)[number];
};

export function ResearchPlanOptions(props: {
  value: PlanOptionsState;
  onChange: (next: PlanOptionsState) => void;
  disabled?: boolean;
}) {
  const toggle = (s: string) => {
    const set = new Set(props.value.sources);
    if (set.has(s)) {
      set.delete(s);
    } else {
      set.add(s);
    }
    const next = { ...props.value, sources: [...set] };
    void captureClientEvent('research_plan_edited', { sources: next.sources, depth: next.depth });
    props.onChange(next);
  };

  return (
    <div className="space-y-3 rounded-xl border border-white/10 bg-[var(--bg-card)] p-4">
      <p className="text-sm text-[var(--text-secondary)]">Sources</p>
      <div className="flex flex-wrap gap-2">
        {SOURCES.map((s) => (
          <button
            key={s}
            type="button"
            disabled={props.disabled}
            onClick={() => toggle(s)}
            className={cn(
              'rounded-full px-3 py-1 text-xs font-medium transition',
              props.value.sources.includes(s)
                ? 'bg-indigo-500/90 text-white'
                : 'bg-white/5 text-[var(--text-secondary)] hover:bg-white/10'
            )}
          >
            {s.replace('_', ' ')}
          </button>
        ))}
      </div>
      <p className="text-sm text-[var(--text-secondary)]">Depth</p>
      <div className="flex flex-wrap gap-2">
        {DEPTHS.map((d) => (
          <button
            key={d}
            type="button"
            disabled={props.disabled}
            onClick={() => {
              const next = { ...props.value, depth: d };
              void captureClientEvent('research_plan_edited', { depth: d });
              props.onChange(next);
            }}
            className={cn(
              'rounded-full px-3 py-1 text-xs font-medium capitalize transition',
              props.value.depth === d
                ? 'bg-violet-500/90 text-white'
                : 'bg-white/5 text-[var(--text-secondary)] hover:bg-white/10'
            )}
          >
            {d}
          </button>
        ))}
      </div>
    </div>
  );
}
