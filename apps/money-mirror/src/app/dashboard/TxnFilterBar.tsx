const CATEGORIES = [
  { value: '', label: 'All categories' },
  { value: 'needs', label: 'Needs' },
  { value: 'wants', label: 'Wants' },
  { value: 'investment', label: 'Investment' },
  { value: 'debt', label: 'Debt' },
  { value: 'other', label: 'Other' },
];

const TYPES = [
  { value: '', label: 'Debit & credit' },
  { value: 'debit', label: 'Debit' },
  { value: 'credit', label: 'Credit' },
];

interface TxnFilterBarProps {
  search: string;
  onSearchChange: (v: string) => void;
  category: string;
  onCategoryChange: (v: string) => void;
  type: string;
  onTypeChange: (v: string) => void;
  merchantFromUrl: string;
  onClearMerchant: () => void;
}

export function TxnFilterBar({
  search,
  onSearchChange,
  category,
  onCategoryChange,
  type,
  onTypeChange,
  merchantFromUrl,
  onClearMerchant,
}: TxnFilterBarProps) {
  return (
    <div
      style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}
      className="txn-filters"
    >
      {merchantFromUrl ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
            flexWrap: 'wrap',
            padding: '10px 12px',
            borderRadius: '12px',
            border: '1px solid var(--border)',
            background: 'var(--bg-elevated)',
            fontSize: '0.82rem',
          }}
        >
          <span>
            Filtered by merchant:{' '}
            <strong style={{ textTransform: 'capitalize' }}>
              {merchantFromUrl.replace(/_/g, ' ')}
            </strong>
          </span>
          <button
            type="button"
            className="btn-ghost"
            style={{ fontSize: '0.78rem' }}
            onClick={onClearMerchant}
          >
            Clear
          </button>
        </div>
      ) : null}
      <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
        Search description
        <input
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="e.g. UPI, merchant"
          style={{ marginTop: '6px', width: '100%' }}
          aria-label="Search transactions by description"
        />
      </label>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
          Category
          <select
            value={category}
            onChange={(e) => onCategoryChange(e.target.value)}
            style={{ marginTop: '6px', width: '100%' }}
            aria-label="Filter by category"
          >
            {CATEGORIES.map((c) => (
              <option key={c.value || 'all'} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
          Type
          <select
            value={type}
            onChange={(e) => onTypeChange(e.target.value)}
            style={{ marginTop: '6px', width: '100%' }}
            aria-label="Filter by debit or credit"
          >
            {TYPES.map((c) => (
              <option key={c.value || 'all'} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
