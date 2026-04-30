'use client';

import { cn } from '@/lib/cn';

export function ToolStepRow(props: {
  name: string;
  status: 'queued' | 'running' | 'done' | 'skipped' | 'failed';
}) {
  return (
    <div
      className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2 text-sm"
      aria-live="polite"
    >
      <span className="text-[var(--text-secondary)]">{props.name}</span>
      <span
        className={cn(
          'text-xs font-medium uppercase',
          props.status === 'running' && 'text-amber-300',
          props.status === 'done' && 'text-emerald-400',
          props.status === 'failed' && 'text-red-400',
          (props.status === 'queued' || props.status === 'skipped') && 'text-white/40'
        )}
      >
        {props.status}
      </span>
    </div>
  );
}
