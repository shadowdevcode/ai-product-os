/**
 * Google OAuth env vars — trim because dashboards often paste a trailing newline,
 * which becomes %0A in query/body and breaks client_id matching.
 */
export function getGoogleClientId(): string {
  return process.env.GOOGLE_CLIENT_ID?.trim() ?? '';
}

export function getGoogleClientSecret(): string {
  return process.env.GOOGLE_CLIENT_SECRET?.trim() ?? '';
}

export function getOAuthAppUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').trim();
}
