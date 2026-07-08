export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const operadores = await prisma.errorRecord.groupBy({
    by: ['nombre'],
    _count: { id: true },
    orderBy: { nombre: 'asc' },
  });

  return NextResponse.json(
    (operadores ?? []).map((o: any) => ({ nombre: o?.nombre ?? '', registros: o?._count?.id ?? 0 }))
  );
}
