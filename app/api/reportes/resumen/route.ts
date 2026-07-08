/*export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { calcularCampos, formatFechaMX, getHoraCriticaPorFranja } from '@/lib/calculations';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const url = new URL(req.url);
  const fechaDesde = url.searchParams.get('fechaDesde');
  const fechaHasta = url.searchParams.get('fechaHasta');

  const where: any = {};
  if (fechaDesde || fechaHasta) {
    where.fecha = {};
    if (fechaDesde) where.fecha.gte = new Date(`${fechaDesde}T00:00:00.000Z`);
    if (fechaHasta) where.fecha.lte = new Date(`${fechaHasta}T23:59:59.999Z`);
  }

  const records = await prisma.errorRecord.findMany({ where, orderBy: { fechaHora: 'asc' } });

  const resumenMap = new Map<string, { fecha: string; nombre: string; etiquetasGeneradas: number; etiquetasEliminadas: number; errores: Array<{ horaDecimal: number; eliminacion: number }> }>();

  for (const r of records) {
    const campos = calcularCampos(r as any);
    const fecha = formatFechaMX(r.fechaHora);
    const key = `${fecha}|${r.nombre}`;
    if (!resumenMap.has(key)) {
      resumenMap.set(key, { fecha, nombre: r.nombre, etiquetasGeneradas: 0, etiquetasEliminadas: 0, errores: [] });
    }
    const entry = resumenMap.get(key)!;
    entry.etiquetasGeneradas++;
    if (r.eliminacion === 1) {
      entry.etiquetasEliminadas++;
      entry.errores.push({ horaDecimal: campos.horaDecimal, eliminacion: 1 });
    }
  }

  const resumen = Array.from(resumenMap.values()).map((entry) => ({
    fecha: entry.fecha,
    nombre: entry.nombre,
    etiquetasGeneradas: entry.etiquetasGeneradas,
    etiquetasEliminadas: entry.etiquetasEliminadas,
    horaCritica: getHoraCriticaPorFranja(entry.errores),
  })).sort((a, b) => a.fecha.localeCompare(b.fecha) || a.nombre.localeCompare(b.nombre));

  return NextResponse.json(resumen);
}*/
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { formatFechaMX, getHoraCriticaPorFranja } from '@/lib/calculations';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const url = new URL(req.url);
  const fechaDesde = url.searchParams.get('fechaDesde');
  const fechaHasta = url.searchParams.get('fechaHasta');

  const where: any = {};

  if (fechaDesde || fechaHasta) {
    where.fecha = {};
    if (fechaDesde) where.fecha.gte = new Date(`${fechaDesde}T00:00:00.000Z`);
    if (fechaHasta) where.fecha.lte = new Date(`${fechaHasta}T23:59:59.999Z`);
  }

  const generadas = await prisma.errorRecord.groupBy({
    by: ['fecha', 'nombre'],
    where,
    _count: {
      id: true,
    },
    orderBy: [
      { fecha: 'asc' },
      { nombre: 'asc' },
    ],
  });

  const eliminadas = await prisma.errorRecord.groupBy({
    by: ['fecha', 'nombre'],
    where: {
      ...where,
      eliminacion: 1,
    },
    _count: {
      id: true,
    },
  });

  const horasError = await prisma.errorRecord.findMany({
    where: {
      ...where,
      eliminacion: 1,
    },
    select: {
      fecha: true,
      nombre: true,
      horaDecimal: true,
      eliminacion: true,
    },
  });

  const eliminadasMap = new Map(
    eliminadas.map((e) => [
      `${e.fecha.toISOString()}|${e.nombre}`,
      e._count.id,
    ])
  );

  const horasMap = new Map<string, Array<{ horaDecimal: number; eliminacion: number }>>();

  for (const h of horasError) {
    const key = `${h.fecha.toISOString()}|${h.nombre}`;
    if (!horasMap.has(key)) horasMap.set(key, []);
    horasMap.get(key)!.push({
      horaDecimal: h.horaDecimal,
      eliminacion: h.eliminacion,
    });
  }

  const resumen = generadas.map((g) => {
    const key = `${g.fecha.toISOString()}|${g.nombre}`;
    const total = g._count.id;
    const totalEliminadas = eliminadasMap.get(key) ?? 0;

    return {
      fecha: formatFechaMX(g.fecha),
      nombre: g.nombre,
      etiquetasGeneradas: total,
      etiquetasEliminadas: totalEliminadas,
      horaCritica: getHoraCriticaPorFranja(horasMap.get(key) ?? []),
    };
  });

  return NextResponse.json(resumen);
}
