export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const [totalRegistros, totalErrores, totalCorrectos, operadores] = await Promise.all([
    prisma.errorRecord.count(),
    prisma.errorRecord.count({ where: { eliminacion: 1 } }),
    prisma.errorRecord.count({ where: { eliminacion: 0 } }),
    prisma.errorRecord.groupBy({
      by: ['nombre'],
      _count: { id: true },
    }),
  ]);

  // Errores por mes para gráfica
  const erroresPorMes = await prisma.errorRecord.groupBy({
    by: ['mes', 'anio'],
    where: { eliminacion: 1 },
    _count: { id: true },
    orderBy: [{ anio: 'asc' }, { mes: 'asc' }],
  });

  // Top operadores con más errores
  const erroresPorOperador = await prisma.errorRecord.groupBy({
    by: ['nombre'],
    where: { eliminacion: 1 },
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
  });

  const pctEfectividad = totalRegistros > 0 ? ((totalCorrectos / totalRegistros) * 100) : 100;

  return NextResponse.json({
    totalRegistros,
    totalErrores,
    totalCorrectos,
    porcentajeEfectividad: Math.round(pctEfectividad * 100) / 100,
    totalOperadores: operadores?.length ?? 0,
    erroresPorMes: (erroresPorMes ?? []).map((e: any) => ({
      mes: e?.mes,
      anio: e?.anio,
      errores: e?._count?.id ?? 0,
    })),
    erroresPorOperador: (erroresPorOperador ?? []).map((e: any) => ({
      nombre: e?.nombre,
      errores: e?._count?.id ?? 0,
    })),
  });
}
