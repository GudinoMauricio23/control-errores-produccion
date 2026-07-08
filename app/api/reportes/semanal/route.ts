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

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const url = new URL(req.url);

  const mes = parseInt(
    url.searchParams.get('mes') ?? String(new Date().getMonth() + 1)
  );

  const anio = parseInt(
    url.searchParams.get('anio') ?? String(new Date().getFullYear())
  );

  const semanaParam = url.searchParams.get('semana');

  const where: any = {
    mes,
    anio,
  };

  if (semanaParam) {
    where.semana = parseInt(semanaParam);
  }

  // Total de etiquetas
  const generadas = await prisma.errorRecord.groupBy({
    by: ['semana', 'nombre'],
    where,
    _count: {
      id: true,
    },
    orderBy: [
      { semana: 'asc' },
      { nombre: 'asc' },
    ],
  });

  // Solo errores
  const errores = await prisma.errorRecord.groupBy({
    by: ['semana', 'nombre'],
    where: {
      ...where,
      eliminacion: 1,
    },
    _count: {
      id: true,
    },
  });

  const erroresMap = new Map(
    errores.map((e) => [`${e.semana}|${e.nombre}`, e._count.id])
  );

  const semanal = generadas.map((g) => {
    const total = g._count.id;
    const erroresTotal = erroresMap.get(`${g.semana}|${g.nombre}`) ?? 0;
    const correctas = total - erroresTotal;

    return {
      semana: g.semana,
      nombre: g.nombre,
      errores: erroresTotal,
      etiquetasGeneradas: total,
      etiquetasCorrectas: correctas,
      porcentajeError:
        total > 0
          ? Number(((erroresTotal / total) * 100).toFixed(2))
          : 0,
      porcentajeEfectividad:
        total > 0
          ? Number(((correctas / total) * 100).toFixed(2))
          : 0,
      horaCritica: erroresTotal > 0 ? "-" : "SIN ERRORES",
    };
  });

  // Obtener todos los usuarios del mes
  const nombres = [...new Set(semanal.map((x) => x.nombre))].sort();

  // Siempre mostrar S1-S5
  const resultado: any[] = [];

  for (let semana = 1; semana <= 5; semana++) {
    for (const nombre of nombres) {
      const registro = semanal.find(
        (x) => x.semana === semana && x.nombre === nombre
      );

      resultado.push(
        registro ?? {
          semana,
          nombre,
          errores: 0,
          etiquetasGeneradas: 0,
          etiquetasCorrectas: 0,
          porcentajeError: 0,
          porcentajeEfectividad: 0,
          horaCritica: "SIN DATOS",
        }
      );
    }
  }

  return NextResponse.json(resultado);
}