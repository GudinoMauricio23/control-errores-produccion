/*export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import * as XLSX from 'xlsx';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const url = new URL(req.url);
  const tipo = url.searchParams.get('tipo') ?? 'datos';
  const fechaDesde = url.searchParams.get('fechaDesde');
  const fechaHasta = url.searchParams.get('fechaHasta');

  const where: any = {};
  if (fechaDesde || fechaHasta) {
    where.fecha = {};
    if (fechaDesde) where.fecha.gte = new Date(fechaDesde);
    if (fechaHasta) where.fecha.lte = new Date(fechaHasta);
  }

  const records = await prisma.errorRecord.findMany({ where, orderBy: { fechaHora: 'asc' } });

  const wb = XLSX.utils.book_new();

  if (tipo === 'datos' || tipo === 'completo') {
    const datosSheet = (records ?? []).map((r: any) => ({
      'NO.NOMINA': r?.noNomina ?? 0,
      'NOMBRE': r?.nombre ?? '',
      'ETIQUETA': r?.etiqueta ?? '',
      'FECHA Y HORA': r?.fechaHora ? new Date(r.fechaHora).toLocaleString('es-MX', { timeZone: 'America/Mexico_City' }) : '',
      'LOTE': r?.lote ?? '',
      'CODIGO': r?.codigoMaterial ?? '',
      'MATERIAL': r?.materialNombre ?? '',
      'CANTIDAD': r?.cantidad ?? 0,
      'DUEÑO': r?.dueno ?? '',
      'ELIMINACION': r?.eliminacion ?? 0,
      'FECHA': r?.fecha ? new Date(r.fecha).toLocaleDateString('es-MX', { timeZone: 'UTC' }) : '',
      'HORA': r?.hora ?? '',
      'MES': r?.mes ?? 0,
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(datosSheet), 'DATOS');
  }

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="errores_produccion_${new Date().toISOString().split('T')[0]}.xlsx"`,
    },
  });
}*/

export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import * as XLSX from 'xlsx';


const fechaMX = (value: any) => {
  if (!value) return '';
  const d = new Date(value);
  return d.toLocaleDateString('es-MX', { timeZone: 'America/Mexico_City' });
};

const horaMX = (value: any) => {
  if (!value) return '';
  const d = new Date(value);
  return d.toLocaleTimeString('es-MX', {
    timeZone: 'America/Mexico_City',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const url = new URL(req.url);
  const tipo = url.searchParams.get('tipo') ?? 'datos';
  const fechaDesde = url.searchParams.get('fechaDesde');
  const fechaHasta = url.searchParams.get('fechaHasta');

  const where: any = {};

  if (fechaDesde || fechaHasta) {
    where.fecha = {};
    if (fechaDesde) where.fecha.gte = new Date(`${fechaDesde}T00:00:00`);
    if (fechaHasta) where.fecha.lte = new Date(`${fechaHasta}T23:59:59`);
  }

  const records = await prisma.errorRecord.findMany({
    where,
    orderBy: { fechaHora: 'asc' },
  });

  const wb = XLSX.utils.book_new();

  if (tipo === 'datos' || tipo === 'completo') {
    const datosSheet = records.map((r: any) => ({
      'NO.NOMINA': r.noNomina ?? 0,
      'NOMBRE': r.nombre ?? '',
      'ETIQUETA': r.etiqueta ?? '',
      'FECHA': fechaMX(r.fechaHora),
      'HORA': r.hora || horaMX(r.fechaHora),
      'LOTE': r.lote ?? '',
      'CODIGO': r.codigoMaterial ?? '',
      'MATERIAL': r.materialNombre ?? '',
      'CANTIDAD': r.cantidad ?? 0,
      'DUEÑO': r.dueno ?? '',
      'ELIMINACION': r.eliminacion ?? 0,
      'FECHA Y HORA': r.fechaHora
        ? `${fechaMX(r.fechaHora)} ${r.hora || horaMX(r.fechaHora)}`
        : '',
      'MES': r.mes ?? 0,
    }));

    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(datosSheet), 'DATOS');
  }

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="errores_produccion_${new Date().toISOString().split('T')[0]}.xlsx"`,
    },
  });
}
