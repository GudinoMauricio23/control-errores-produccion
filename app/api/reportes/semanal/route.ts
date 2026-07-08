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
  const mes = parseInt(url.searchParams.get('mes') ?? String(new Date().getMonth() + 1));
  const anio = parseInt(url.searchParams.get('anio') ?? String(new Date().getFullYear()));

  // Se consulta por año y se filtra recalculando mes/semana desde fechaHora para evitar campos viejos mal importados.
  const records = await prisma.errorRecord.findMany({
    where: { anio },
    orderBy: { fechaHora: 'asc' },
  });

  const semanalMap = new Map<string, {
    semana: number;
    nombre: string;
    errores: number;
    etiquetasGeneradas: number;
    erroresHora: Array<{ horaDecimal: number; eliminacion: number }>;
  }>();

  for (const r of records) {
    const campos = calcularCampos(r as any);
    if (campos.mes !== mes || campos.anio !== anio) continue;

    const key = `${campos.semana}|${r.nombre}`;
    if (!semanalMap.has(key)) {
      semanalMap.set(key, { semana: campos.semana, nombre: r.nombre, errores: 0, etiquetasGeneradas: 0, erroresHora: [] });
    }
    const entry = semanalMap.get(key)!;
    entry.etiquetasGeneradas++;
    if (r.eliminacion === 1) {
      entry.errores++;
      entry.erroresHora.push({ horaDecimal: campos.horaDecimal, eliminacion: 1 });
    }
  }

  const semanal = Array.from(semanalMap.values()).map((entry) => {
    const correctas = entry.etiquetasGeneradas - entry.errores;
    const pctError = entry.etiquetasGeneradas > 0 ? (entry.errores / entry.etiquetasGeneradas) * 100 : 0;
    const pctEfectividad = entry.etiquetasGeneradas > 0 ? (correctas / entry.etiquetasGeneradas) * 100 : 0;
    return {
      semana: entry.semana,
      nombre: entry.nombre,
      errores: entry.errores,
      etiquetasGeneradas: entry.etiquetasGeneradas,
      etiquetasCorrectas: correctas,
      porcentajeError: Math.round(pctError * 100) / 100,
      porcentajeEfectividad: Math.round(pctEfectividad * 100) / 100,
      horaCritica: getHoraCriticaPorFranja(entry.erroresHora),
    };
  }).sort((a, b) => a.semana - b.semana || a.nombre.localeCompare(b.nombre));

  return NextResponse.json(semanal);
}
*/
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
  const mes = parseInt(url.searchParams.get('mes') ?? String(new Date().getMonth() + 1));
  const anio = parseInt(url.searchParams.get('anio') ?? String(new Date().getFullYear()));

  const desde = new Date(anio, mes - 1, 1, 0, 0, 0);
  const hasta = new Date(anio, mes, 0, 23, 59, 59);

  const records = await prisma.errorRecord.findMany({
    where: {
      fechaHora: {
        gte: desde,
        lte: hasta,
      },
    },
    orderBy: { fechaHora: 'asc' },
  });

  const semanalMap = new Map();

  for (const r of records) {
    const campos = calcularCampos(r as any);
    const key = `${campos.semana}|${r.nombre}`;

    if (!semanalMap.has(key)) {
      semanalMap.set(key, {
        semana: campos.semana,
        nombre: r.nombre,
        errores: 0,
        etiquetasGeneradas: 0,
        erroresHora: [],
      });
    }

    const entry = semanalMap.get(key);
    entry.etiquetasGeneradas++;

    if (r.eliminacion === 1) {
      entry.errores++;
      entry.erroresHora.push({
        horaDecimal: campos.horaDecimal,
        eliminacion: 1,
      });
    }
  }

  const semanal = Array.from(semanalMap.values())
    .map((entry: any) => {
      const correctas = entry.etiquetasGeneradas - entry.errores;
      const pctError = entry.etiquetasGeneradas > 0 ? (entry.errores / entry.etiquetasGeneradas) * 100 : 0;
      const pctEfectividad = entry.etiquetasGeneradas > 0 ? (correctas / entry.etiquetasGeneradas) * 100 : 0;

      return {
        semana: entry.semana,
        nombre: entry.nombre,
        errores: entry.errores,
        etiquetasGeneradas: entry.etiquetasGeneradas,
        etiquetasCorrectas: correctas,
        porcentajeError: Math.round(pctError * 100) / 100,
        porcentajeEfectividad: Math.round(pctEfectividad * 100) / 100,
        horaCritica: getHoraCriticaPorFranja(entry.erroresHora),
      };
    })
    .sort((a, b) => a.semana - b.semana || a.nombre.localeCompare(b.nombre));

  return NextResponse.json(semanal);
}*/
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

  const mes = parseInt(url.searchParams.get('mes') ?? String(new Date().getMonth() + 1));
  const anio = parseInt(url.searchParams.get('anio') ?? String(new Date().getFullYear()));
  const semanaFiltro = url.searchParams.get('semana');

  const desdeMes = new Date(anio, mes - 1, 1, 0, 0, 0);
  const hastaMes = new Date(anio, mes, 0, 23, 59, 59);

  const records = await prisma.errorRecord.findMany({
    where: {
      fechaHora: {
        gte: desdeMes,
        lte: hastaMes,
      },
    },
    select: {
      nombre: true,
      fechaHora: true,
      eliminacion: true,
    },
    orderBy: [
      { fechaHora: 'asc' },
      { nombre: 'asc' },
    ],
  });

  const semanalMap = new Map();

  for (const r of records) {
    const campos = calcularCampos(r as any);

    if (semanaFiltro && String(campos.semana) !== String(semanaFiltro)) {
      continue;
    }

    const key = `${campos.semana}|${r.nombre}`;

    if (!semanalMap.has(key)) {
      semanalMap.set(key, {
        semana: campos.semana,
        nombre: r.nombre,
        errores: 0,
        etiquetasGeneradas: 0,
        erroresHora: [],
      });
    }

    const entry = semanalMap.get(key);
    entry.etiquetasGeneradas++;

    if (r.eliminacion === 1) {
      entry.errores++;
      entry.erroresHora.push({
        horaDecimal: campos.horaDecimal,
        eliminacion: 1,
      });
    }
  }

  const semanal = Array.from(semanalMap.values())
    .map((entry: any) => {
      const correctas = entry.etiquetasGeneradas - entry.errores;
      const pctError = entry.etiquetasGeneradas > 0 ? (entry.errores / entry.etiquetasGeneradas) * 100 : 0;
      const pctEfectividad = entry.etiquetasGeneradas > 0 ? (correctas / entry.etiquetasGeneradas) * 100 : 0;

      return {
        semana: entry.semana,
        nombre: entry.nombre,
        errores: entry.errores,
        etiquetasGeneradas: entry.etiquetasGeneradas,
        etiquetasCorrectas: correctas,
        porcentajeError: Math.round(pctError * 100) / 100,
        porcentajeEfectividad: Math.round(pctEfectividad * 100) / 100,
        horaCritica: getHoraCriticaPorFranja(entry.erroresHora),
      };
    })
    .sort((a, b) => a.semana - b.semana || a.nombre.localeCompare(b.nombre));

  return NextResponse.json(semanal);
}