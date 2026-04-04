import { createAuthServer } from '@neondatabase/auth/next/server';

type AuthServer = ReturnType<typeof createAuthServer>;

let authServer: AuthServer | null = null;

export function getAuthServer(): AuthServer {
  if (!authServer) {
    authServer = createAuthServer();
  }

  return authServer;
}
