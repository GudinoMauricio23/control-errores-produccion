import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireSapiAdmin } from '@/lib/sapi-auth';
import { encryptSecret } from '@/lib/sapi-crypto';

export const dynamic = 'force-dynamic';

function toBoolean(value: unknown): boolean {
  return value === true || value === 'true' || value === 1 || value === '1';
}

function toDate(value: unknown): Date {
  if (!value) return new Date();
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

export async function GET(request: NextRequest) {
  const auth = await requireSapiAdmin();
  if (!auth.authorized) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get('page') || 1));
  const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') || 20)));
  const search = searchParams.get('search')?.trim() || '';
  const estado = searchParams.get('estado') || 'todos';
  const fechaDesde = searchParams.get('fechaDesde');
  const fechaHasta = searchParams.get('fechaHasta');

  const where: Prisma.SapiAccessWhereInput = {};

  if (search) {
    const nomina = Number(search);
    where.OR = [
      { nombreCompleto: { contains: search, mode: 'insensitive' } },
      { usuarioSapi: { contains: search, mode: 'insensitive' } },
      { departamento: { contains: search, mode: 'insensitive' } },
      ...(Number.isFinite(nomina) ? [{ noNomina: nomina }] : []),
    ];
  }

  if (estado === 'activos') where.activo = true;
  if (estado === 'inactivos') where.activo = false;

  if (fechaDesde || fechaHasta) {
    where.fechaEntrega = {};
    if (fechaDesde) where.fechaEntrega.gte = new Date(`${fechaDesde}T00:00:00`);
    if (fechaHasta) where.fechaEntrega.lte = new Date(`${fechaHasta}T23:59:59.999`);
  }

  const [records, total, activos, inactivos] = await Promise.all([
    prisma.sapiAccess.findMany({
      where,
      orderBy: [{ activo: 'desc' }, { nombreCompleto: 'asc' }],
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        personalId: true,
        noNomina: true,
        nombreCompleto: true,
        departamento: true,
        usuarioSapi: true,
        accesoAdministrativo: true,
        accesoProduccion: true,
        accesoWeb: true,
        activo: true,
        fechaEntrega: true,
        fechaBaja: true,
        observaciones: true,
        responsivaGenerada: true,
        responsivaFirmada: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.sapiAccess.count({ where }),
    prisma.sapiAccess.count({ where: { activo: true } }),
    prisma.sapiAccess.count({ where: { activo: false } }),
  ]);

  return NextResponse.json({
    records,
    pagination: {
      page,
      limit,
      total,
      pages: Math.max(1, Math.ceil(total / limit)),
    },
    summary: { activos, inactivos, totalGeneral: activos + inactivos },
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireSapiAdmin();
  if (!auth.authorized) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  try {
    const body = await request.json();

    const noNomina = Number(body.noNomina);
    const nombreCompleto = String(body.nombreCompleto || '').trim();
    const usuarioSapi = String(body.usuarioSapi || '').trim();

    if (!Number.isInteger(noNomina) || noNomina <= 0) {
      return NextResponse.json(
        { error: 'El número de nómina no es válido.' },
        { status: 400 }
      );
    }

    if (!nombreCompleto || !usuarioSapi) {
      return NextResponse.json(
        { error: 'Nombre completo y usuario SAPI son obligatorios.' },
        { status: 400 }
      );
    }

    const record = await prisma.sapiAccess.create({
      data: {
        personalId: body.personalId ? Number(body.personalId) : null,
        noNomina,
        nombreCompleto,
        departamento: String(body.departamento || '').trim() || null,
        usuarioSapi,
        passwordCifrado: encryptSecret(body.passwordSapi),
        nipCifrado: encryptSecret(body.nip),
        accesoAdministrativo: toBoolean(body.accesoAdministrativo),
        accesoProduccion: toBoolean(body.accesoProduccion),
        accesoWeb: toBoolean(body.accesoWeb),
        activo: body.activo === undefined ? true : toBoolean(body.activo),
        fechaEntrega: toDate(body.fechaEntrega),
        observaciones: String(body.observaciones || '').trim() || null,
        movimientos: {
          create: {
            tipoMovimiento: 'ALTA',
            descripcion: 'Se registró el acceso SAPI.',
            realizadoPor: auth.actor,
          },
        },
      },
      select: { id: true },
    });

    return NextResponse.json(
      { message: 'Usuario SAPI registrado correctamente.', id: record.id },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/accesos-sapi:', error);

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return NextResponse.json(
        { error: 'El usuario SAPI ya está registrado.' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'No fue posible registrar el acceso SAPI.' },
      { status: 500 }
    );
  }
}
