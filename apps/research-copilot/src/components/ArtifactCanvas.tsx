'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/cn';

export function ArtifactCanvas(props: { brief: string; findings: string; emphasize: boolean }) {
  const [tab, setTab] = useState<'brief' | 'findings'>('findings');
  const body = tab === 'findings' ? props.findings : props.brief;
  return (
    <div
      className={cn(
        'flex h-full min-h-[240px] flex-col rounded-xl border border-white/10 bg-[var(--bg-card)] transition-all duration-300',
        props.emphasize && 'shadow-lg shadow-indigo-500/10'
      )}
      aria-live="polite"
    >
      <div className="flex gap-1 border-b border-white/5 p-2">
        {(['brief', 'findings'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              'rounded-md px-3 py-1 text-xs font-medium capitalize',
              tab === t ? 'bg-white/10 text-white' : 'text-white/50 hover:bg-white/5'
            )}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="prose prose-invert max-w-none flex-1 overflow-auto p-4 prose-p:text-sm prose-li:text-sm">
        {body ? (
          <ReactMarkdown>{body}</ReactMarkdown>
        ) : (
          <p className="text-sm text-white/40">
            Artifact will appear after the run produces output.
          </p>
        )}
      </div>
    </div>
  );
}
