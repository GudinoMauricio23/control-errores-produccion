export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { FRANJAS_HORARIAS, calcularCampos, horaEnFranja, formatFechaMX } from '@/lib/calculations';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const url = new URL(req.url);
  const fechaDesde = url.searchParams.get('fechaDesde');
  const fechaHasta = url.searchParams.get('fechaHasta');

  const where: any = { eliminacion: 1 };
  if (fechaDesde || fechaHasta) {
    where.fecha = {};
    if (fechaDesde) where.fecha.gte = new Date(`${fechaDesde}T00:00:00.000Z`);
    if (fechaHasta) where.fecha.lte = new Date(`${fechaHasta}T23:59:59.999Z`);
  }

  const errors = await prisma.errorRecord.findMany({ where, orderBy: { fechaHora: 'asc' } });

  const matrizMap = new Map<string, { fecha: string; nombre: string; franjas: number[]; total: number }>();

  for (const r of errors) {
    // Se recalcula desde fechaHora con zona México para corregir registros importados con desfase UTC.
    const campos = calcularCampos(r as any);
    const fecha = formatFechaMX(r.fechaHora);
    const key = `${fecha}|${r.nombre}`;
    if (!matrizMap.has(key)) {
      matrizMap.set(key, { fecha, nombre: r.nombre, franjas: new Array(FRANJAS_HORARIAS.length).fill(0), total: 0 });
    }
    const entry = matrizMap.get(key)!;
    for (let i = 0; i < FRANJAS_HORARIAS.length; i++) {
      if (horaEnFranja(campos.horaDecimal, FRANJAS_HORARIAS[i])) {
        entry.franjas[i]++;
        entry.total++;
        break;
      }
    }
  }

  const matriz = Array.from(matrizMap.values()).sort((a, b) => a.fecha.localeCompare(b.fecha) || a.nombre.localeCompare(b.nombre));
  return NextResponse.json({ matriz, franjas: FRANJAS_HORARIAS.map((f: any) => f.label) });
}
