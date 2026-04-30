'use client';

import { useState } from 'react';
import { captureClientEvent } from '@/lib/posthog-browser';

export function SessionSurvey(props: { sessionId: string }) {
  const [score, setScore] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return <p className="text-center text-xs text-white/50">Thanks — feedback recorded.</p>;
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-sm text-[var(--text-secondary)]">
        Did you feel in control of depth and tools?
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setScore(n)}
            className={`h-9 w-9 rounded-lg text-sm ${
              score === n
                ? 'bg-indigo-500 text-white'
                : 'bg-white/10 text-white/80 hover:bg-white/15'
            }`}
          >
            {n}
          </button>
        ))}
      </div>
      <button
        type="button"
        disabled={score === null}
        className="mt-3 rounded-lg bg-white/10 px-4 py-2 text-xs text-white hover:bg-white/15 disabled:opacity-40"
        onClick={() => {
          if (score === null) {
            return;
          }
          void captureClientEvent('post_session_survey_submitted', {
            session_id: props.sessionId,
            control_score: score,
          });
          setSubmitted(true);
        }}
      >
        Submit
      </button>
    </div>
  );
}
