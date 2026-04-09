export function tabFromSearchParams(searchParams: { get: (key: string) => string | null }) {
  const t = searchParams.get('tab');
  if (t === 'insights' || t === 'sync' || t === 'transactions') {
    return t;
  }
  return 'overview' as const;
}
