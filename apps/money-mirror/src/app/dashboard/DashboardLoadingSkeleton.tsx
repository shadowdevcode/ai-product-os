export function DashboardLoadingSkeleton() {
  return (
    <div
      className="animate-fade-up"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px',
        minHeight: '240px',
      }}
    >
      <div className="skeleton" style={{ width: '100%', height: '120px', borderRadius: '18px' }} />
      <div className="skeleton" style={{ width: '100%', height: '120px', borderRadius: '18px' }} />
    </div>
  );
}
