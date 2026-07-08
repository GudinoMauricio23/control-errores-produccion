import { withAuth } from 'next-auth/middleware';

export default withAuth({
  pages: { signIn: '/login' },
});

export const config = {
  matcher: ['/dashboard/:path*', '/captura/:path*', '/historial/:path*', '/reportes/:path*', '/api/errores/:path*', '/api/reportes/:path*'],
};
