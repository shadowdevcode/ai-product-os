export function tabFromSearchParams(searchParams: { get: (key: string) => string | null }) {
  const t = searchParams.get('tab');
  if (t === 'insights' || t === 'upload' || t === 'transactions') {
    return t;
  }
  return 'overview' as const;
}
