export function DashboardBrandBar() {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
      }}
    >
      <span
        style={{
          fontSize: '1.1rem',
          fontWeight: 800,
          color: 'var(--accent)',
          fontFamily: 'var(--font-space), sans-serif',
          letterSpacing: '-0.02em',
        }}
      >
        MoneyMirror
      </span>
    </div>
  );
}
