'use client';

import { useState } from 'react';
import { cn } from '@/lib/cn';

const SUGGESTIONS = [
  'Notion iOS pain points for freelancers',
  'Slack positioning for SMB in the last 6 months',
  'Compare Notion vs Coda — UX complaints and pricing signals',
];

export function CenteredComposer(props: {
  onSubmit: (text: string) => void | Promise<void>;
  disabled?: boolean;
}) {
  const [value, setValue] = useState('');
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-12">
      <h1 className="text-center text-3xl font-semibold tracking-tight text-white">
        PM Research Copilot
      </h1>
      <p className="mt-2 max-w-lg text-center text-sm text-[var(--text-secondary)]">
        Chat-first research: clarify → choose sources → approve → run specialized agents with
        citations.
      </p>
      <div className="mt-8 w-full max-w-xl">
        <textarea
          value={value}
          disabled={props.disabled}
          onChange={(e) => setValue(e.target.value)}
          placeholder="What do you want to research?"
          rows={3}
          className="w-full resize-none rounded-xl border border-white/10 bg-[var(--bg-card)] px-4 py-3 text-sm text-white outline-none ring-indigo-500/40 placeholder:text-white/30 focus:ring-2"
        />
        <button
          type="button"
          disabled={props.disabled || !value.trim()}
          onClick={() => {
            void props.onSubmit(value.trim());
            setValue('');
          }}
          className="mt-3 w-full rounded-xl bg-indigo-500 py-3 text-sm font-semibold text-white hover:bg-indigo-400 disabled:opacity-40"
        >
          Start research
        </button>
      </div>
      <div className="mt-6 flex max-w-xl flex-wrap justify-center gap-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            disabled={props.disabled}
            onClick={() => setValue(s)}
            className={cn(
              'rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:border-indigo-500/40 hover:text-white'
            )}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
