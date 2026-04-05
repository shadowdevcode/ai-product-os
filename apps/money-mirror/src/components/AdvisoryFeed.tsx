'use client';

import { useState } from 'react';
import type { Advisory } from '@/lib/advisory-engine';
import type { LayerAFacts } from '@/lib/coaching-facts';
import { FactsDrawer } from '@/components/FactsDrawer';

interface AdvisoryFeedProps {
  advisories: Advisory[];
  coachingFacts: LayerAFacts | null;
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

interface AdvisoryCardProps {
  adv: Advisory;
  index: number;
  coachingFacts: LayerAFacts | null;
  openSourcesId: string | null;
  onToggleSources: (id: string | null) => void;
}

function AdvisoryCard({
  adv,
  index,
  coachingFacts,
  openSourcesId,
  onToggleSources,
}: AdvisoryCardProps) {
  const style = SEVERITY_STYLES[adv.severity];
  const cited = adv.cited_fact_ids ?? [];
  const showSources = coachingFacts && cited.length > 0;
  const sourcesOpen = openSourcesId === adv.id;

  return (
    <div
      className="animate-fade-up"
      style={{
        background: style.bg,
        border: `1px solid ${style.border}`,
        borderRadius: '14px',
        padding: '16px 18px',
        animationDelay: `${index * 0.1}s`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <span>{style.icon}</span>
        <span
          style={{
            fontSize: '0.9rem',
            fontWeight: 700,
            color: style.color,
            fontFamily: 'var(--font-space), sans-serif',
          }}
        >
          {adv.headline}
        </span>
      </div>
      <p
        style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.82rem', lineHeight: 1.55 }}
      >
        {adv.narrative ?? adv.message}
      </p>
      {showSources ? (
        <div style={{ marginTop: '12px' }}>
          <button
            type="button"
            onClick={() => {
              const next = sourcesOpen ? null : adv.id;
              onToggleSources(next);
              if (!sourcesOpen && cited.length > 0) {
                void fetch('/api/dashboard/coaching-facts-expanded', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ advisory_id: adv.id }),
                }).catch(() => {});
              }
            }}
            style={{
              fontSize: '0.72rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'var(--accent)',
              background: 'transparent',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
            }}
          >
            {sourcesOpen ? 'Hide sources' : 'Sources'}
          </button>
          {sourcesOpen ? (
            <div style={{ marginTop: '10px' }}>
              <FactsDrawer facts={coachingFacts} citedIds={cited} />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function AdvisoryFeed({ advisories, coachingFacts }: AdvisoryFeedProps) {
  const [openSourcesId, setOpenSourcesId] = useState<string | null>(null);

  if (advisories.length === 0) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '32px 24px' }}>
        <span style={{ fontSize: '2rem' }}>✨</span>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '12px 0 0' }}>
          No red flags found. Your spending looks healthy!
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {advisories.map((adv, i) => (
        <AdvisoryCard
          key={adv.id}
          adv={adv}
          index={i}
          coachingFacts={coachingFacts}
          openSourcesId={openSourcesId}
          onToggleSources={setOpenSourcesId}
        />
      ))}
    </div>
  );
}
