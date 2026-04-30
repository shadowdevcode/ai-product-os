import { Suspense } from 'react';
import { ResearchShell } from '@/components/ResearchShell';

export default function Page() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-white/60">Loading…</div>}>
      <ResearchShell />
    </Suspense>
  );
}
