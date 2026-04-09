'use client';

interface SyncResult {
  emails_scanned: number;
  inserted_count: number;
  skipped_count: number;
}

interface SyncRun {
  trigger_mode: string;
  status: string;
  emails_scanned: number;
  parsed_count: number;
  inserted_count: number;
  skipped_count: number;
  error_summary: string | null;
  created_at: string;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function SyncResultCard({ result }: { result: SyncResult }) {
  return (
    <div
      style={{
        padding: '16px',
        background: 'var(--bg-card)',
        borderRadius: '12px',
        border: '1px solid var(--border)',
      }}
    >
      <div
        style={{
          fontSize: '0.72rem',
          color: 'var(--text-muted)',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          marginBottom: '12px',
        }}
      >
        Sync complete
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
        {(
          [
            { label: 'Scanned', value: result.emails_scanned },
            { label: 'New', value: result.inserted_count },
            { label: 'Skipped', value: result.skipped_count },
          ] as const
        ).map(({ label, value }) => (
          <div
            key={label}
            style={{
              textAlign: 'center',
              padding: '10px',
              background: 'var(--bg-elevated)',
              borderRadius: '8px',
            }}
          >
            <div style={{ fontSize: '1.4rem', fontWeight: 800 }}>{value}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SyncRunHistoryList({ runs }: { runs: SyncRun[] }) {
  if (runs.length === 0) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div
        style={{
          fontSize: '0.72rem',
          color: 'var(--text-muted)',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
        }}
      >
        Recent syncs
      </div>
      {runs.slice(0, 3).map((run, i) => (
        <div
          key={i}
          style={{
            padding: '12px 14px',
            background: 'var(--bg-elevated)',
            borderRadius: '10px',
            border: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div>
            <div style={{ fontSize: '0.82rem', fontWeight: 600, marginBottom: '2px' }}>
              {run.inserted_count} new · {run.emails_scanned} scanned
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              {formatDate(run.created_at)}
            </div>
            {run.error_summary && (
              <div style={{ fontSize: '0.72rem', color: '#ef5350', marginTop: '2px' }}>
                {run.error_summary}
              </div>
            )}
          </div>
          <span
            style={{
              fontSize: '0.68rem',
              fontWeight: 700,
              padding: '3px 8px',
              borderRadius: '6px',
              background: run.status === 'ok' ? 'rgba(76,175,80,0.15)' : 'rgba(239,83,80,0.15)',
              color: run.status === 'ok' ? '#4caf50' : '#ef5350',
              flexShrink: 0,
            }}
          >
            {run.status.toUpperCase()}
          </span>
        </div>
      ))}
    </div>
  );
}
