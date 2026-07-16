import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

export async function requireSapiAdmin() {
  const session = await getServerSession(authOptions);
  const user = session?.user as
    | { name?: string | null; email?: string | null; role?: string }
    | undefined;

  if (!session || user?.role !== 'admin') {
    return {
      authorized: false as const,
      session: null,
      actor: null,
    };
  }

  return {
    authorized: true as const,
    session,
    actor: user.email || user.name || 'Administrador',
  };
}
