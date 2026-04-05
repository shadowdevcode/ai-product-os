'use client';

export type DashboardTab = 'overview' | 'insights' | 'transactions' | 'upload';

interface DashboardNavProps {
  active: DashboardTab;
  onChange: (tab: DashboardTab) => void;
}

const TABS: { id: DashboardTab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'insights', label: 'Insights' },
  { id: 'transactions', label: 'Transactions' },
  { id: 'upload', label: 'Upload' },
];

export function DashboardNav({ active, onChange }: DashboardNavProps) {
  return (
    <nav
      role="tablist"
      aria-label="Dashboard sections"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
        gap: '8px',
        marginBottom: '22px',
      }}
    >
      {TABS.map((tab) => {
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={isActive ? 'btn-primary' : 'btn-ghost'}
            onClick={() => onChange(tab.id)}
            style={{
              width: '100%',
              padding: '10px 8px',
              fontSize: '0.78rem',
              fontWeight: isActive ? 800 : 600,
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}
