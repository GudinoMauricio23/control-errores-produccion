/*import { NextRequest, NextResponse } from 'next/server';
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
    usuarioIdSapi: body.usuarioIdSapi
      ? Number(body.usuarioIdSapi)
      : null,

    personalId: body.personalId
      ? Number(body.personalId)
      : null,

    noNomina: Number(body.noNomina),

    nombreCompleto: String(
      body.nombreCompleto || ''
    ).trim(),

    departamento:
      String(body.departamento || '').trim() || null,

    userName: String(
      body.userName || body.usuarioSapi || ''
    ).trim(),

    passwordCifrado: encryptSecret(
      body.passwordSapi
    ),

    nipCifrado: encryptSecret(
      body.nip
    ),

    accesoTotal: Boolean(
      body.accesoTotal ||
      body.accesoAdministrativo
    ),

    noPerfil: body.noPerfil
      ? Number(body.noPerfil)
      : null,

    estaActivo:
      body.estaActivo === undefined
        ? true
        : Boolean(body.estaActivo),

    inicioEmpresaId: body.inicioEmpresaId
      ? Number(body.inicioEmpresaId)
      : null,

    estaActivoProd: Boolean(
      body.estaActivoProd ||
      body.accesoProduccion
    ),

    accesoWeb: Boolean(body.accesoWeb),

    fechaEntrega: body.fechaEntrega
      ? new Date(`${body.fechaEntrega}T12:00:00`)
      : new Date(),

    observaciones:
      String(body.observaciones || '').trim() || null,

    movimientos: {
      create: {
        tipoMovimiento: 'ALTA',
        descripcion: 'Se registró el usuario SAPI.',
        realizadoPor: auth.actor,
      },
    },
  },
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
*/
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
      const nomina = Number(search);
      const usuarioId = Number(search);
      const personalId = Number(search);

      where.OR = [
        {
          nombreCompleto: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          userName: {
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
        ...(Number.isFinite(nomina)
          ? [{ noNomina: nomina }]
          : []),
        ...(Number.isFinite(usuarioId)
          ? [{ usuarioIdSapi: usuarioId }]
          : []),
        ...(Number.isFinite(personalId)
          ? [{ personalId }]
          : []),
      ];
    }

    if (estado === 'activos') {
      where.estaActivo = true;
    }

    if (estado === 'inactivos') {
      where.estaActivo = false;
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
          { estaActivo: 'desc' },
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
          userName: true,
          accesoTotal: true,
          noPerfil: true,
          estaActivo: true,
          inicioEmpresaId: true,
          estaActivoProd: true,
          accesoWeb: true,
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
          estaActivo: true,
        },
      }),

      prisma.sapiAccess.count({
        where: {
          estaActivo: false,
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
          'No fue posible consultar los usuarios SAPI.',
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

    const userName = String(
      body.userName ||
      body.usuarioSapi ||
      ''
    ).trim();

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

    if (!userName) {
      return NextResponse.json(
        {
          error:
            'El usuario SAPI es obligatorio.',
        },
        { status: 400 }
      );
    }

    const record =
      await prisma.sapiAccess.create({
        data: {
          usuarioIdSapi:
            body.usuarioIdSapi !== undefined &&
            body.usuarioIdSapi !== ''
              ? Number(body.usuarioIdSapi)
              : null,

          personalId:
            body.personalId !== undefined &&
            body.personalId !== ''
              ? Number(body.personalId)
              : null,

          noNomina,

          nombreCompleto,

          departamento:
            String(
              body.departamento || ''
            ).trim() || null,

          userName,

          passwordCifrado:
            encryptSecret(
              body.passwordSapi
            ),

          nipCifrado:
            encryptSecret(body.nip),

          accesoTotal:
            toBoolean(
              body.accesoTotal
            ) ||
            toBoolean(
              body.accesoAdministrativo
            ),

          noPerfil:
            body.noPerfil !== undefined &&
            body.noPerfil !== ''
              ? Number(body.noPerfil)
              : null,

          estaActivo:
            body.estaActivo === undefined
              ? true
              : toBoolean(
                  body.estaActivo
                ),

          inicioEmpresaId:
            body.inicioEmpresaId !== undefined &&
            body.inicioEmpresaId !== ''
              ? Number(
                  body.inicioEmpresaId
                )
              : null,

          estaActivoProd:
            toBoolean(
              body.estaActivoProd
            ) ||
            toBoolean(
              body.accesoProduccion
            ),

          accesoWeb:
            toBoolean(
              body.accesoWeb
            ),

          fechaEntrega:
            toDate(
              body.fechaEntrega
            ),

          observaciones:
            String(
              body.observaciones || ''
            ).trim() || null,

          movimientos: {
            create: {
              tipoMovimiento: 'ALTA',
              descripcion:
                'Se registró el usuario SAPI.',
              realizadoPor:
                auth.actor,
            },
          },
        },
      });

    return NextResponse.json(
      {
        message:
          'Usuario SAPI registrado correctamente.',
        id: record.id,
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
            'El usuario SAPI o el UsuarioID ya está registrado.',
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        error:
          'No fue posible registrar el acceso SAPI.',
      },
      { status: 500 }
    );
  }
}