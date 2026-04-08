/**
 * Skeleton-first loading state that matches the final Overview layout
 * to prevent layout shift when Mirror + totals hydrate (issue-012 T0.2).
 */
export function DashboardLoadingSkeleton() {
  return (
    <div
      className="animate-fade-up"
      role="status"
      aria-busy="true"
      aria-label="Loading your dashboard"
      style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}
    >
      {/* Mirror heading placeholder */}
      <div>
        <div className="skeleton" style={{ width: '55%', height: '22px', borderRadius: '6px' }} />
        <div
          className="skeleton"
          style={{ width: '35%', height: '16px', borderRadius: '99px', marginTop: '10px' }}
        />
        <div
          className="skeleton"
          style={{ width: '80%', height: '12px', borderRadius: '4px', marginTop: '8px' }}
        />
      </div>

      {/* Perceived vs Actual mirror card */}
      <div className="skeleton" style={{ width: '100%', height: '110px', borderRadius: '18px' }} />

      {/* Total Spent / Total Income 2×1 grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div className="skeleton" style={{ height: '72px', borderRadius: '14px' }} />
        <div className="skeleton" style={{ height: '72px', borderRadius: '14px' }} />
      </div>

      {/* Previous period comparison card */}
      <div className="skeleton" style={{ width: '100%', height: '80px', borderRadius: '14px' }} />

      {/* Category breakdown rows */}
      <div>
        <div
          className="skeleton"
          style={{ width: '40%', height: '12px', borderRadius: '4px', marginBottom: '12px' }}
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="skeleton"
              style={{ height: '52px', borderRadius: '12px', opacity: 1 - i * 0.1 }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
