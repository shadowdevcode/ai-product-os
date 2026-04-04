/**
 * AdvisoryFeed — Displays advisory cards from the advisory engine
 *
 * Each advisory is styled by severity (critical = red, warning = amber, info = teal).
 */

import type { Advisory } from '@/lib/advisory-engine';

interface AdvisoryFeedProps {
  advisories: Advisory[];
}

const SEVERITY_STYLES: Record<
  Advisory['severity'],
  { bg: string; border: string; color: string; icon: string }
> = {
  critical: {
    bg: 'var(--danger-dim)',
    border: 'rgba(255,77,109,0.25)',
    color: 'var(--danger)',
    icon: '🚨',
  },
  warning: {
    bg: 'var(--warning-dim)',
    border: 'rgba(255,181,71,0.25)',
    color: 'var(--warning)',
    icon: '⚠️',
  },
  info: {
    bg: 'var(--accent-dim)',
    border: 'rgba(0,229,195,0.25)',
    color: 'var(--accent)',
    icon: '💡',
  },
};

export function AdvisoryFeed({ advisories }: AdvisoryFeedProps) {
  if (advisories.length === 0) {
    return (
      <div
        className="card"
        style={{
          textAlign: 'center',
          padding: '32px 24px',
        }}
      >
        <span style={{ fontSize: '2rem' }}>✨</span>
        <p
          style={{
            color: 'var(--text-secondary)',
            fontSize: '0.9rem',
            margin: '12px 0 0',
          }}
        >
          No red flags found. Your spending looks healthy!
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {advisories.map((adv, i) => {
        const style = SEVERITY_STYLES[adv.severity];
        return (
          <div
            key={adv.id}
            className="animate-fade-up"
            style={{
              background: style.bg,
              border: `1px solid ${style.border}`,
              borderRadius: '14px',
              padding: '16px 18px',
              animationDelay: `${i * 0.1}s`,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '8px',
              }}
            >
              <span>{style.icon}</span>
              <span
                style={{
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  color: style.color,
                  fontFamily: 'Space Grotesk, sans-serif',
                }}
              >
                {adv.headline}
              </span>
            </div>
            <p
              style={{
                margin: 0,
                color: 'var(--text-secondary)',
                fontSize: '0.82rem',
                lineHeight: 1.55,
              }}
            >
              {adv.message}
            </p>
          </div>
        );
      })}
    </div>
  );
}
