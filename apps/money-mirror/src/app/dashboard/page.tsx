import { Suspense } from 'react';
import { DashboardClient } from './DashboardClient';

function DashboardFallback() {
  return (
    <main className="page-container" style={{ paddingTop: '24px', paddingBottom: '40px' }}>
      <div className="skeleton" style={{ width: '100%', height: '120px', borderRadius: '18px' }} />
    </main>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardFallback />}>
      <DashboardClient />
    </Suspense>
  );
}
