export const dynamic = 'force-dynamic';
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
