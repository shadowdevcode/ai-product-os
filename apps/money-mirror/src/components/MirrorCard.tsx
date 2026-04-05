/**
 * MirrorCard — A breakdown card showing spending by category
 *
 * Displays: category name, amount in ₹, percentage of total,
 * and a visual bar chart indicator.
 */

interface MirrorCardProps {
  label: string;
  amount_paisa: number;
  total_paisa: number;
  color: string;
  icon: string;
}

export function MirrorCard({ label, amount_paisa, total_paisa, color, icon }: MirrorCardProps) {
  const rupees = Math.round(amount_paisa / 100);
  const pct = total_paisa > 0 ? Math.round((amount_paisa / total_paisa) * 100) : 0;

  return (
    <div className="card" style={{ padding: '16px 20px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '1.2rem' }}>{icon}</span>
          <span
            style={{
              fontSize: '0.85rem',
              fontWeight: 600,
              color: 'var(--text-primary)',
            }}
          >
            {label}
          </span>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span
            style={{
              fontSize: '1rem',
              fontWeight: 700,
              fontFamily: 'var(--font-space), sans-serif',
              color: 'var(--text-primary)',
            }}
          >
            ₹{rupees.toLocaleString('en-IN')}
          </span>
          <span
            style={{
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
              marginLeft: '8px',
            }}
          >
            {pct}%
          </span>
        </div>
      </div>
      <div
        style={{
          height: '6px',
          background: 'var(--bg-subtle)',
          borderRadius: '99px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${Math.min(pct, 100)}%`,
            background: color,
            borderRadius: '99px',
            transition: 'width 0.8s cubic-bezier(0.4,0,0.2,1)',
          }}
        />
      </div>
    </div>
  );
}
