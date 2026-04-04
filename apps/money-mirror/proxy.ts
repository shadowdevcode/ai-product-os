import { neonAuthMiddleware } from '@neondatabase/auth/next/server';

export default neonAuthMiddleware({
  loginUrl: '/login',
});

export const config = {
  matcher: ['/dashboard/:path*', '/onboarding/:path*', '/score/:path*'],
};
