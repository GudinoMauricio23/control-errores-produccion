import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';

import { prisma } from '@/lib/prisma';
import { requireSapiAdmin } from '@/lib/sapi-auth';
import { encryptSecret } from '@/lib/sapi-crypto';

export const dynamic = 'force-dynamic';

function toBoolean(value: unknown): boolean {
  return (
    value === true ||
    value === 'true' ||
    value === 1 ||
    value === '1'
  );
}

function toDate(value: unknown): Date {
  if (!value) return new Date();

  const date = new Date(`${String(value)}T12:00:00`);

  return Number.isNaN(date.getTime())
    ? new Date()
    : date;
}

function optionalNumber(value: unknown): number | null {
  if (
    value === undefined ||
    value === null ||
    value === ''
  ) {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : null;
}

function optionalText(value: unknown): string | null {
  const text = String(value || '').trim();
  return text || null;
}

export async function GET(request: NextRequest) {
  const auth = await requireSapiAdmin();

  if (!auth.authorized) {
    return NextResponse.json(
      { error: 'No autorizado' },
      { status: 403 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);

    const page = Math.max(
      1,
      Number(searchParams.get('page') || 1)
    );

    const limit = Math.min(
      100,
      Math.max(
        1,
        Number(searchParams.get('limit') || 20)
      )
    );

    const search =
      searchParams.get('search')?.trim() || '';

    const estado =
      searchParams.get('estado') || 'todos';

    const fechaDesde =
      searchParams.get('fechaDesde');

    const fechaHasta =
      searchParams.get('fechaHasta');

    const where: Prisma.SapiAccessWhereInput = {};

    if (search) {
      const numericSearch = Number(search);

      const orConditions: Prisma.SapiAccessWhereInput[] = [
        {
          nombreCompleto: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          departamento: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          usuarioAdministrativo: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          usuarioProduccion: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          usuarioWeb: {
            contains: search,
            mode: 'insensitive',
          },
        },
      ];

      if (Number.isFinite(numericSearch)) {
        orConditions.push(
          { noNomina: numericSearch },
          { usuarioIdSapi: numericSearch },
          { personalId: numericSearch }
        );
      }

      where.OR = orConditions;
    }

    if (estado === 'activos') {
      where.activo = true;
    }

    if (estado === 'inactivos') {
      where.activo = false;
    }

    if (fechaDesde || fechaHasta) {
      where.fechaEntrega = {};

      if (fechaDesde) {
        where.fechaEntrega.gte =
          new Date(`${fechaDesde}T00:00:00`);
      }

      if (fechaHasta) {
        where.fechaEntrega.lte =
          new Date(`${fechaHasta}T23:59:59.999`);
      }
    }

    const [
      records,
      total,
      activos,
      inactivos,
    ] = await Promise.all([
      prisma.sapiAccess.findMany({
        where,

        orderBy: [
          { activo: 'desc' },
          { nombreCompleto: 'asc' },
        ],

        skip: (page - 1) * limit,
        take: limit,

        select: {
          id: true,
          usuarioIdSapi: true,
          personalId: true,
          noNomina: true,
          nombreCompleto: true,
          departamento: true,

          usuarioAdministrativo: true,
          usuarioProduccion: true,
          usuarioWeb: true,

          accesoAdministrativo: true,
          accesoProduccion: true,
          accesoWeb: true,

          activo: true,
          noPerfil: true,
          inicioEmpresaId: true,

          fechaEntrega: true,
          fechaBaja: true,
          observaciones: true,

          responsivaGenerada: true,
          responsivaFirmada: true,

          createdAt: true,
          updatedAt: true,
        },
      }),

      prisma.sapiAccess.count({
        where,
      }),

      prisma.sapiAccess.count({
        where: {
          activo: true,
        },
      }),

      prisma.sapiAccess.count({
        where: {
          activo: false,
        },
      }),
    ]);

    return NextResponse.json({
      records,

      pagination: {
        page,
        limit,
        total,
        pages: Math.max(
          1,
          Math.ceil(total / limit)
        ),
      },

      summary: {
        activos,
        inactivos,
        totalGeneral: activos + inactivos,
      },
    });
  } catch (error) {
    console.error(
      'GET /api/accesos-sapi:',
      error
    );

    return NextResponse.json(
      {
        error:
          'No fue posible consultar los accesos SAPI.',

        detalle:
          error instanceof Error
            ? error.message
            : 'Error desconocido',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireSapiAdmin();

  if (!auth.authorized) {
    return NextResponse.json(
      { error: 'No autorizado' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();

    const noNomina = Number(body.noNomina);

    const nombreCompleto = String(
      body.nombreCompleto || ''
    ).trim();

    const accesoAdministrativo =
      toBoolean(body.accesoAdministrativo);

    const accesoProduccion =
      toBoolean(body.accesoProduccion);

    const accesoWeb =
      toBoolean(body.accesoWeb);

    const usuarioAdministrativo =
      optionalText(body.usuarioAdministrativo);

    const usuarioProduccion =
      optionalText(body.usuarioProduccion);

    const usuarioWeb =
      optionalText(body.usuarioWeb);

    if (
      !Number.isInteger(noNomina) ||
      noNomina <= 0
    ) {
      return NextResponse.json(
        {
          error:
            'El número de nómina no es válido.',
        },
        { status: 400 }
      );
    }

    if (!nombreCompleto) {
      return NextResponse.json(
        {
          error:
            'El nombre completo es obligatorio.',
        },
        { status: 400 }
      );
    }

    if (
      !accesoAdministrativo &&
      !accesoProduccion &&
      !accesoWeb
    ) {
      return NextResponse.json(
        {
          error:
            'Selecciona por lo menos un acceso.',
        },
        { status: 400 }
      );
    }

    if (
      accesoAdministrativo &&
      (!usuarioAdministrativo ||
        !body.passwordAdministrativo)
    ) {
      return NextResponse.json(
        {
          error:
            'Captura usuario y contraseña del acceso Administrativo.',
        },
        { status: 400 }
      );
    }

    if (
      accesoProduccion &&
      (!usuarioProduccion ||
        !body.passwordProduccion)
    ) {
      return NextResponse.json(
        {
          error:
            'Captura usuario y contraseña del acceso de Producción.',
        },
        { status: 400 }
      );
    }

    if (
      accesoWeb &&
      (!usuarioWeb ||
        !body.passwordWeb)
    ) {
      return NextResponse.json(
        {
          error:
            'Captura usuario y contraseña del acceso SAPI Web.',
        },
        { status: 400 }
      );
    }

    const record =
      await prisma.sapiAccess.create({
        data: {
          usuarioIdSapi:
            optionalNumber(
              body.usuarioIdSapi
            ),

          personalId:
            optionalNumber(
              body.personalId
            ),

          noNomina,
          nombreCompleto,

          departamento:
            optionalText(
              body.departamento
            ),

          usuarioAdministrativo:
            accesoAdministrativo
              ? usuarioAdministrativo
              : null,

          passwordAdministrativoCifrado:
            accesoAdministrativo
              ? encryptSecret(
                  body.passwordAdministrativo
                )
              : null,

          usuarioProduccion:
            accesoProduccion
              ? usuarioProduccion
              : null,

          passwordProduccionCifrado:
            accesoProduccion
              ? encryptSecret(
                  body.passwordProduccion
                )
              : null,

          usuarioWeb:
            accesoWeb
              ? usuarioWeb
              : null,

          passwordWebCifrado:
            accesoWeb
              ? encryptSecret(
                  body.passwordWeb
                )
              : null,

          nipCifrado:
            encryptSecret(body.nip),

          accesoAdministrativo,
          accesoProduccion,
          accesoWeb,

          activo:
            body.activo === undefined
              ? true
              : toBoolean(body.activo),

          noPerfil:
            optionalNumber(
              body.noPerfil
            ),

          inicioEmpresaId:
            optionalNumber(
              body.inicioEmpresaId
            ),

          fechaEntrega:
            toDate(
              body.fechaEntrega
            ),

          observaciones:
            optionalText(
              body.observaciones
            ),

          movimientos: {
            create: {
              tipoMovimiento: 'ALTA',

              descripcion:
                'Se registraron los accesos SAPI.',

              realizadoPor:
                auth.actor,
            },
          },
        },
      });

    return NextResponse.json(
      {
        message:
          'Accesos SAPI registrados correctamente.',

        id:
          record.id,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      'POST /api/accesos-sapi:',
      error
    );

    if (
      error instanceof
        Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return NextResponse.json(
        {
          error:
            'El UsuarioID ya está registrado.',

          detalle:
            error.message,
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        error:
          'No fue posible registrar los accesos SAPI.',

        detalle:
          error instanceof Error
            ? error.message
            : 'Error desconocido',
      },
      { status: 500 }
    );
  }
}