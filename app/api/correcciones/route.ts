export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const url = new URL(req.url);
  const page = parseInt(url.searchParams.get('page') ?? '1');
  const limit = parseInt(url.searchParams.get('limit') ?? '100');
  const search = url.searchParams.get('search') ?? '';
  const fechaDesde = url.searchParams.get('fechaDesde');
  const fechaHasta = url.searchParams.get('fechaHasta');

  const where: any = {};
  if (search) {
    where.OR = [
      { etiquetaErronea: { contains: search, mode: 'insensitive' } },
      { producto: { contains: search, mode: 'insensitive' } },
      { quienLoRealizo: { contains: search, mode: 'insensitive' } },
      { etiquetaNueva: { contains: search, mode: 'insensitive' } },
      { productoNuevo: { contains: search, mode: 'insensitive' } },
    ];
  }
  if (fechaDesde || fechaHasta) {
    where.fecha = {};
    if (fechaDesde) where.fecha.gte = new Date(fechaDesde);
    if (fechaHasta) where.fecha.lte = new Date(fechaHasta + 'T23:59:59.999Z');
  }

  const [records, total] = await Promise.all([
    prisma.correctionRecord.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.correctionRecord.count({ where }),
  ]);

  return NextResponse.json({ records, total, page, limit });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const body = await req.json();
    const userId = (session.user as any)?.id;

    const fecha = body.fecha ? new Date(body.fecha) : new Date();

    const record = await prisma.correctionRecord.create({
      data: {
        fecha,
        etiquetaErronea: String(body.etiquetaErronea ?? ''),
        producto: String(body.producto ?? ''),
        peso: parseFloat(String(body.peso)) || 0,
        lote: String(body.lote ?? ''),
        quienLoRealizo: String(body.quienLoRealizo ?? '').trim().toUpperCase(),
        motivo: String(body.motivo ?? ''),
        etiquetaNueva: String(body.etiquetaNueva ?? ''),
        productoNuevo: String(body.productoNuevo ?? ''),
        pesoNuevo: parseFloat(String(body.pesoNuevo)) || 0,
        diferencia: Math.round(((parseFloat(String(body.pesoNuevo)) || 0) - (parseFloat(String(body.peso)) || 0)) * 100) / 100,
        //createdById: userId,
      },
    });

    return NextResponse.json(record);
  } catch (error: any) {
    console.error('Error creating correction:', error);
    return NextResponse.json({ error: 'Error al crear registro' }, { status: 500 });
  }
}
