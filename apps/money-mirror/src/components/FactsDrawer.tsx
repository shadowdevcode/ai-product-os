'use client';

import type { CoachingFactRow, LayerAFacts } from '@/lib/coaching-facts';

interface FactsDrawerProps {
  facts: LayerAFacts;
  citedIds: string[];
}

/**
 * Read-only Layer A facts for a coaching card (no raw JSON dump).
 */
export function FactsDrawer({ facts, citedIds }: FactsDrawerProps) {
  const byId = new Map(facts.facts.map((fact) => [fact.id, fact]));
  const rows = citedIds.map((id) => byId.get(id)).filter((fact): fact is CoachingFactRow => !!fact);

  if (rows.length === 0) {
    return (
      <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
        No linked figures for this card.
      </p>
    );
  }

  return (
    <ul
      style={{
        margin: 0,
        paddingLeft: '18px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        fontSize: '0.78rem',
        lineHeight: 1.45,
        color: 'var(--text-secondary)',
      }}
    >
      {rows.map((fact) => (
        <li key={fact.id}>
          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{fact.label}</span>
          {' — '}
          <span>{fact.display_inr}</span>
          {fact.detail ? (
            <span style={{ color: 'var(--text-muted)' }}> ({fact.detail})</span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
