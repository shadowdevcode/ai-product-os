export type TxRow = {
  id: string;
  statement_id: string;
  date: string;
  description: string;
  amount_paisa: number;
  type: 'debit' | 'credit';
  category: string;
  is_recurring: boolean;
  merchant_key: string | null;
  statement_nickname: string | null;
  statement_institution_name: string;
};

function formatInr(paisa: number): string {
  const rupees = Math.abs(paisa) / 100;
  return rupees.toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

export function TxnRow({ tx }: { tx: TxRow }) {
  const sign = tx.type === 'debit' ? '−' : '+';
  const badge = tx.statement_nickname ?? tx.statement_institution_name;
  return (
    <li
      style={{
        borderRadius: '14px',
        border: '1px solid var(--border)',
        padding: '12px 14px',
        background: 'var(--bg-secondary)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            {tx.date} · <span style={{ textTransform: 'capitalize' }}>{tx.category}</span>
            {tx.merchant_key ? (
              <span style={{ marginLeft: '6px', opacity: 0.85 }}>· {tx.merchant_key}</span>
            ) : null}
          </div>
          <div style={{ fontWeight: 600, marginTop: '4px', wordBreak: 'break-word' }}>
            {tx.description}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '6px' }}>
            {badge}
          </div>
        </div>
        <div
          style={{
            fontWeight: 800,
            fontSize: '0.95rem',
            color: tx.type === 'debit' ? 'var(--danger)' : 'var(--success)',
            flexShrink: 0,
          }}
        >
          {sign}₹{formatInr(tx.amount_paisa)}
        </div>
      </div>
    </li>
  );
}
