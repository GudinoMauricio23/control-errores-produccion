export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { calcularCampos, parseFechaHoraForDb } from '@/lib/calculations';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const url = new URL(req.url);
  const page = parseInt(url.searchParams.get('page') ?? '1');
  const limit = parseInt(url.searchParams.get('limit') ?? '50');
  const nombre = url.searchParams.get('nombre') ?? undefined;
  const fechaDesde = url.searchParams.get('fechaDesde') ?? undefined;
  const fechaHasta = url.searchParams.get('fechaHasta') ?? undefined;
  const eliminacion = url.searchParams.get('eliminacion');
  const search = url.searchParams.get('search') ?? undefined;

  const where: any = {};
  if (nombre) where.nombre = nombre;
  if (eliminacion !== null && eliminacion !== undefined && eliminacion !== '') {
    where.eliminacion = parseInt(eliminacion);
  }
  if (fechaDesde || fechaHasta) {
    where.fecha = {};
    if (fechaDesde) where.fecha.gte = new Date(fechaDesde);
    if (fechaHasta) where.fecha.lte = new Date(fechaHasta);
  }
  if (search) {
    where.OR = [
      { etiqueta: { contains: search } },
      { lote: { contains: search } },
      { materialNombre: { contains: search } },
      { dueno: { contains: search } },
    ];
  }

  const [records, total] = await Promise.all([
    prisma.errorRecord.findMany({
      where,
      orderBy: { fechaHora: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.errorRecord.count({ where }),
  ]);

  return NextResponse.json({ records, total, page, totalPages: Math.ceil(total / limit) });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const body = await req.json();
    const { noNomina, nombre, etiqueta, fechaHora, lote, codigoMaterial, materialNombre, cantidad, dueno, eliminacion } = body;

    if (!nombre || !fechaHora) {
      return NextResponse.json({ error: 'Nombre y Fecha/Hora son requeridos' }, { status: 400 });
    }

    const campos = calcularCampos(body);
    const userId = (session.user as any)?.id;

    const record = await prisma.errorRecord.create({
      data: {
        noNomina: parseInt(String(noNomina)) || 0,
        nombre: String(nombre).trim().toUpperCase(),
        etiqueta: String(etiqueta ?? ''),
        fechaHora: parseFechaHoraForDb(fechaHora),
        lote: String(lote ?? ''),
        codigoMaterial: String(codigoMaterial ?? ''),
        materialNombre: String(materialNombre ?? ''),
        cantidad: parseFloat(String(cantidad)) || 0,
        dueno: String(dueno ?? '').trim().toUpperCase(),
        eliminacion: parseInt(String(eliminacion)) || 0,
        ...campos,
        //createdById: null,
      },
    });

    return NextResponse.json(record);
  } catch (error: any) {
    console.error('Error al crear registro:', error);
    return NextResponse.json({ error: 'Error al crear registro' }, { status: 500 });
  }
}
