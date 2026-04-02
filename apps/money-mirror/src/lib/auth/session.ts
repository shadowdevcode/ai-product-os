import { getAuthServer } from '@/lib/auth/server';

export interface SessionUser {
  id: string;
  email: string;
  name: string;
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const authServer = getAuthServer();
  const { data, error } = await authServer.getSession();

  if (error || !data?.user?.id || !data.user.email) {
    return null;
  }

  return {
    id: data.user.id,
    email: data.user.email,
    name: data.user.name,
  };
}
