'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { MoneyHealthScore } from '@/lib/scoring';

/**
 * T10 — Score Reveal Page
 *
 * The "mirror moment" — shows their Money Health Score with a dramatic
 * reveal animation. This is the payoff after the 5-question onboarding.
 * The CTA pushes them to upload their bank statement for the real truth.
 */

const GRADE_CONFIG: Record<
  MoneyHealthScore['grade'],
  { color: string; emoji: string; message: string }
> = {
  A: {
    color: 'var(--success)',
    emoji: '🪞',
    message: "Your perception is pretty close to reality. Let's verify.",
  },
  B: {
    color: 'var(--accent)',
    emoji: '🪞',
    message: "Not bad — but there's probably a gap. Want to see it?",
  },
  C: {
    color: 'var(--warning)',
    emoji: '⚠️',
    message: "Most people in your bracket spend 30–40% more than they think. Let's find out.",
  },
  D: {
    color: 'var(--danger)',
    emoji: '🔥',
    message: "You're likely bleeding money you don't know about.",
  },
  F: {
    color: 'var(--danger)',
    emoji: '🚨',
    message: 'Financial blind spot detected. You need to see your bank statement — now.',
  },
};

export default function ScoreRevealPage() {
  const router = useRouter();
  const [score] = useState<MoneyHealthScore | null>(() => {
    if (typeof window === 'undefined') {
      return null;
    }

    try {
      const raw = sessionStorage.getItem('mm_score');
      if (!raw) {
        return null;
      }

      return JSON.parse(raw) as MoneyHealthScore;
    } catch {
      return null;
    }
  });
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (!score) {
      router.replace('/onboarding');
      return;
    }

    const timer = setTimeout(() => setRevealed(true), 600);
    return () => clearTimeout(timer);
  }, [router, score]);

  if (!score) {
    return (
      <main className="page-container">
        <div className="content-center">
          <div className="skeleton" style={{ height: 200, width: '100%' }} />
        </div>
      </main>
    );
  }

  const config = GRADE_CONFIG[score.grade];

  return (
    <main className="page-container">
      <div className="content-center" style={{ gap: '32px' }}>
        {/* Logo */}
        <span
          style={{
            fontSize: '1.25rem',
            fontWeight: 800,
            color: 'var(--accent)',
            fontFamily: 'Space Grotesk, sans-serif',
            letterSpacing: '-0.02em',
          }}
        >
          MoneyMirror
        </span>

        {/* Score Circle */}
        <div
          className={revealed ? 'animate-fade-up' : ''}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
            opacity: revealed ? 1 : 0,
            transition: 'opacity 0.6s ease',
          }}
        >
          <div
            style={{
              width: 160,
              height: 160,
              borderRadius: '50%',
              border: `4px solid ${config.color}`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              animation: revealed ? 'pulse-glow 2s ease-in-out infinite' : 'none',
              boxShadow: `0 0 60px ${config.color}33`,
            }}
          >
            <span
              style={{
                fontSize: '3rem',
                fontWeight: 800,
                fontFamily: 'Space Grotesk, sans-serif',
                color: config.color,
                lineHeight: 1,
              }}
            >
              {score.score}
            </span>
            <span
              style={{
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
                marginTop: '4px',
              }}
            >
              out of 100
            </span>
          </div>

          {/* Grade Badge */}
          <div
            style={{
              background: `${config.color}1a`,
              border: `1px solid ${config.color}33`,
              borderRadius: '99px',
              padding: '6px 20px',
              fontSize: '0.85rem',
              fontWeight: 700,
              color: config.color,
              letterSpacing: '0.02em',
            }}
          >
            {config.emoji} {score.label}
          </div>
        </div>

        {/* Message */}
        <div
          className={revealed ? 'animate-fade-up' : ''}
          style={{
            opacity: revealed ? 1 : 0,
            transition: 'opacity 0.8s ease 0.3s',
            textAlign: 'center',
          }}
        >
          <p
            style={{
              color: 'var(--text-secondary)',
              fontSize: '1rem',
              lineHeight: 1.6,
              maxWidth: '340px',
              margin: '0 auto',
            }}
          >
            {config.message}
          </p>

          {score.perceived_gap_pct > 0 && (
            <p
              style={{
                color: 'var(--danger)',
                fontSize: '0.85rem',
                fontWeight: 600,
                marginTop: '12px',
              }}
            >
              Estimated perception gap: ~{score.perceived_gap_pct}%
            </p>
          )}
        </div>

        {/* CTA */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            width: '100%',
            marginTop: '8px',
            opacity: revealed ? 1 : 0,
            transition: 'opacity 1s ease 0.6s',
          }}
        >
          <button
            id="upload-statement-cta"
            className="btn-primary"
            onClick={() => router.push('/dashboard')}
          >
            Upload Bank Statement →
          </button>
          <button className="btn-ghost" onClick={() => router.push('/')}>
            Maybe later
          </button>
        </div>
      </div>
    </main>
  );
}
