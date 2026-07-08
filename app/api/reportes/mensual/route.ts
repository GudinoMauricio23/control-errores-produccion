/*export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { calcularCampos, getHoraCriticaPorFranja } from '@/lib/calculations';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const url = new URL(req.url);
  const anio = parseInt(url.searchParams.get('anio') ?? String(new Date().getFullYear()));

  const records = await prisma.errorRecord.findMany({
    where: { anio },
    orderBy: { fechaHora: 'asc' },
  });

  const mensualMap = new Map<string, {
    mes: number;
    nombre: string;
    errores: number;
    etiquetasGeneradas: number;
    erroresHora: Array<{ horaDecimal: number; eliminacion: number }>;
  }>();

  for (const r of records) {
    const campos = calcularCampos(r as any);
    if (campos.anio !== anio) continue;

    const key = `${campos.mes}|${r.nombre}`;
    if (!mensualMap.has(key)) {
      mensualMap.set(key, { mes: campos.mes, nombre: r.nombre, errores: 0, etiquetasGeneradas: 0, erroresHora: [] });
    }
    const entry = mensualMap.get(key)!;
    entry.etiquetasGeneradas++;
    if (r.eliminacion === 1) {
      entry.errores++;
      entry.erroresHora.push({ horaDecimal: campos.horaDecimal, eliminacion: 1 });
    }
  }

  const mensual = Array.from(mensualMap.values()).map((entry) => {
    const correctas = entry.etiquetasGeneradas - entry.errores;
    const pctError = entry.etiquetasGeneradas > 0 ? (entry.errores / entry.etiquetasGeneradas) * 100 : 0;
    const pctEfectividad = entry.etiquetasGeneradas > 0 ? (correctas / entry.etiquetasGeneradas) * 100 : 0;
    return {
      mes: entry.mes,
      nombre: entry.nombre,
      errores: entry.errores,
      etiquetasGeneradas: entry.etiquetasGeneradas,
      etiquetasCorrectas: correctas,
      porcentajeError: Math.round(pctError * 100) / 100,
      porcentajeEfectividad: Math.round(pctEfectividad * 100) / 100,
      horaCritica: getHoraCriticaPorFranja(entry.erroresHora),
    };
  }).sort((a, b) => a.mes - b.mes || a.nombre.localeCompare(b.nombre));

  return NextResponse.json(mensual);
}
*/
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { getHoraCriticaPorFranja } from '@/lib/calculations';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const url = new URL(req.url);
  const anio = parseInt(url.searchParams.get('anio') ?? String(new Date().getFullYear()));

  const where: any = { anio };

  const generadas = await prisma.errorRecord.groupBy({
    by: ['mes', 'nombre'],
    where,
    _count: { id: true },
    orderBy: [
      { mes: 'asc' },
      { nombre: 'asc' },
    ],
  });

  const errores = await prisma.errorRecord.groupBy({
    by: ['mes', 'nombre'],
    where: {
      ...where,
      eliminacion: 1,
    },
    _count: { id: true },
  });

  const horasError = await prisma.errorRecord.findMany({
    where: {
      ...where,
      eliminacion: 1,
    },
    select: {
      mes: true,
      nombre: true,
      horaDecimal: true,
      eliminacion: true,
    },
  });

  const erroresMap = new Map(
    errores.map((e) => [`${e.mes}|${e.nombre}`, e._count.id])
  );

  const horasMap = new Map<string, Array<{ horaDecimal: number; eliminacion: number }>>();

  for (const h of horasError) {
    const key = `${h.mes}|${h.nombre}`;
    if (!horasMap.has(key)) horasMap.set(key, []);
    horasMap.get(key)!.push({
      horaDecimal: h.horaDecimal,
      eliminacion: h.eliminacion,
    });
  }

  const mensual = generadas.map((g) => {
    const total = g._count.id;
    const erroresTotal = erroresMap.get(`${g.mes}|${g.nombre}`) ?? 0;
    const correctas = total - erroresTotal;

    return {
      mes: g.mes,
      nombre: g.nombre,
      errores: erroresTotal,
      etiquetasGeneradas: total,
      etiquetasCorrectas: correctas,
      porcentajeError: total > 0 ? Number(((erroresTotal / total) * 100).toFixed(2)) : 0,
      porcentajeEfectividad: total > 0 ? Number(((correctas / total) * 100).toFixed(2)) : 0,
      horaCritica: getHoraCriticaPorFranja(horasMap.get(`${g.mes}|${g.nombre}`) ?? []),
    };
  });

  return NextResponse.json(mensual);
}