import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';

import { prisma } from '@/lib/prisma';
import { requireSapiAdmin } from '@/lib/sapi-auth';
import {
  decryptSecret,
  encryptSecret,
} from '@/lib/sapi-crypto';

export const dynamic = 'force-dynamic';

type Context = {
  params: {
    id: string;
  };
};

function toBoolean(value: unknown): boolean {
  return (
    value === true ||
    value === 'true' ||
    value === 1 ||
    value === '1'
  );
}

function optionalNumber(
  value: unknown,
  current: number | null
): number | null {
  if (value === undefined) {
    return current;
  }

  if (
    value === null ||
    value === ''
  ) {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : current;
}

function optionalText(
  value: unknown,
  current: string | null
): string | null {
  if (value === undefined) {
    return current;
  }

  const text = String(value || '').trim();

  return text || null;
}

export async function GET(
  _: NextRequest,
  { params }: Context
) {
  const auth = await requireSapiAdmin();

  if (!auth.authorized) {
    return NextResponse.json(
      { error: 'No autorizado' },
      { status: 403 }
    );
  }

  try {
    const record =
      await prisma.sapiAccess.findUnique({
        where: {
          id: params.id,
        },
        include: {
          movimientos: {
            orderBy: {
              fecha: 'desc',
            },
          },
        },
      });

    if (!record) {
      return NextResponse.json(
        {
          error: 'Registro no encontrado.',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: record.id,

      usuarioIdSapi:
        record.usuarioIdSapi,

      personalId:
        record.personalId,

      noNomina:
        record.noNomina,

      nombreCompleto:
        record.nombreCompleto,

      departamento:
        record.departamento,

      usuarioAdministrativo:
        record.usuarioAdministrativo,

      passwordAdministrativo:
        decryptSecret(
          record.passwordAdministrativoCifrado
        ),

      usuarioProduccion:
        record.usuarioProduccion,

      passwordProduccion:
        decryptSecret(
          record.passwordProduccionCifrado
        ),

      usuarioWeb:
        record.usuarioWeb,

      passwordWeb:
        decryptSecret(
          record.passwordWebCifrado
        ),

      nip:
        decryptSecret(
          record.nipCifrado
        ),

      accesoAdministrativo:
        record.accesoAdministrativo,

      accesoProduccion:
        record.accesoProduccion,

      accesoWeb:
        record.accesoWeb,

      activo:
        record.activo,

      noPerfil:
        record.noPerfil,

      inicioEmpresaId:
        record.inicioEmpresaId,

      fechaEntrega:
        record.fechaEntrega,

      fechaBaja:
        record.fechaBaja,

      observaciones:
        record.observaciones,

      responsivaGenerada:
        record.responsivaGenerada,

      responsivaFirmada:
        record.responsivaFirmada,

      createdAt:
        record.createdAt,

      updatedAt:
        record.updatedAt,

      movimientos:
        record.movimientos,
    });
  } catch (error) {
    console.error(
      'GET /api/accesos-sapi/[id]:',
      error
    );

    return NextResponse.json(
      {
        error:
          'No fue posible consultar el registro.',
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: Context
) {
  const auth = await requireSapiAdmin();

  if (!auth.authorized) {
    return NextResponse.json(
      { error: 'No autorizado' },
      { status: 403 }
    );
  }

  try {
    const current =
      await prisma.sapiAccess.findUnique({
        where: {
          id: params.id,
        },
      });

    if (!current) {
      return NextResponse.json(
        {
          error: 'Registro no encontrado.',
        },
        { status: 404 }
      );
    }

    const body = await request.json();

    const nuevoActivo =
      body.activo === undefined
        ? current.activo
        : toBoolean(body.activo);

    let tipoMovimiento = 'ACTUALIZACIÓN';

    if (
      current.activo &&
      !nuevoActivo
    ) {
      tipoMovimiento = 'BAJA';
    }

    if (
      !current.activo &&
      nuevoActivo
    ) {
      tipoMovimiento = 'ACTIVACIÓN';
    }

    if (
      body.passwordAdministrativo ||
      body.passwordProduccion ||
      body.passwordWeb
    ) {
      tipoMovimiento =
        'CAMBIO DE CONTRASEÑA';
    }

    if (body.nip) {
      tipoMovimiento =
        'CAMBIO DE NIP';
    }

    await prisma.sapiAccess.update({
      where: {
        id: params.id,
      },

      data: {
        usuarioIdSapi:
          optionalNumber(
            body.usuarioIdSapi,
            current.usuarioIdSapi
          ),

        personalId:
          optionalNumber(
            body.personalId,
            current.personalId
          ),

        noNomina:
          body.noNomina === undefined
            ? current.noNomina
            : Number(body.noNomina),

        nombreCompleto:
          body.nombreCompleto === undefined
            ? current.nombreCompleto
            : String(
                body.nombreCompleto
              ).trim(),

        departamento:
          optionalText(
            body.departamento,
            current.departamento
          ),

        usuarioAdministrativo:
          optionalText(
            body.usuarioAdministrativo,
            current.usuarioAdministrativo
          ),

        passwordAdministrativoCifrado:
          body.passwordAdministrativo
            ? encryptSecret(
                body.passwordAdministrativo
              )
            : current
                .passwordAdministrativoCifrado,

        usuarioProduccion:
          optionalText(
            body.usuarioProduccion,
            current.usuarioProduccion
          ),

        passwordProduccionCifrado:
          body.passwordProduccion
            ? encryptSecret(
                body.passwordProduccion
              )
            : current
                .passwordProduccionCifrado,

        usuarioWeb:
          optionalText(
            body.usuarioWeb,
            current.usuarioWeb
          ),

        passwordWebCifrado:
          body.passwordWeb
            ? encryptSecret(
                body.passwordWeb
              )
            : current.passwordWebCifrado,

        nipCifrado:
          body.nip
            ? encryptSecret(body.nip)
            : current.nipCifrado,

        accesoAdministrativo:
          body.accesoAdministrativo ===
          undefined
            ? current.accesoAdministrativo
            : toBoolean(
                body.accesoAdministrativo
              ),

        accesoProduccion:
          body.accesoProduccion ===
          undefined
            ? current.accesoProduccion
            : toBoolean(
                body.accesoProduccion
              ),

        accesoWeb:
          body.accesoWeb === undefined
            ? current.accesoWeb
            : toBoolean(body.accesoWeb),

        activo:
          nuevoActivo,

        noPerfil:
          optionalNumber(
            body.noPerfil,
            current.noPerfil
          ),

        inicioEmpresaId:
          optionalNumber(
            body.inicioEmpresaId,
            current.inicioEmpresaId
          ),

        fechaBaja:
          current.activo &&
          !nuevoActivo
            ? new Date()
            : nuevoActivo
              ? null
              : current.fechaBaja,

        fechaEntrega:
          body.fechaEntrega
            ? new Date(
                `${body.fechaEntrega}T12:00:00`
              )
            : current.fechaEntrega,

        observaciones:
          optionalText(
            body.observaciones,
            current.observaciones
          ),

        responsivaGenerada:
          body.responsivaGenerada ===
          undefined
            ? current.responsivaGenerada
            : toBoolean(
                body.responsivaGenerada
              ),

        responsivaFirmada:
          body.responsivaFirmada ===
          undefined
            ? current.responsivaFirmada
            : toBoolean(
                body.responsivaFirmada
              ),

        movimientos: {
          create: {
            tipoMovimiento,

            descripcion:
              String(
                body.descripcionMovimiento ||
                  ''
              ).trim() ||
              'Se actualizaron los accesos SAPI.',

            realizadoPor:
              auth.actor,
          },
        },
      },
    });

    return NextResponse.json({
      message:
        'Registro actualizado correctamente.',
    });
  } catch (error) {
    console.error(
      'PUT /api/accesos-sapi/[id]:',
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
            'Uno de los usuarios ya pertenece a otro registro.',
          detalle:
            error.message,
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        error:
          'No fue posible actualizar el registro.',
        detalle:
          error instanceof Error
            ? error.message
            : 'Error desconocido',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _: NextRequest,
  { params }: Context
) {
  const auth = await requireSapiAdmin();

  if (!auth.authorized) {
    return NextResponse.json(
      { error: 'No autorizado' },
      { status: 403 }
    );
  }

  try {
    const current =
      await prisma.sapiAccess.findUnique({
        where: {
          id: params.id,
        },
      });

    if (!current) {
      return NextResponse.json(
        {
          error: 'Registro no encontrado.',
        },
        { status: 404 }
      );
    }

    await prisma.sapiAccess.update({
      where: {
        id: params.id,
      },

      data: {
        activo: false,
        fechaBaja: new Date(),

        movimientos: {
          create: {
            tipoMovimiento: 'BAJA',
            descripcion:
              'Los accesos fueron dados de baja.',
            realizadoPor:
              auth.actor,
          },
        },
      },
    });

    return NextResponse.json({
      message:
        'Accesos dados de baja correctamente.',
    });
  } catch (error) {
    console.error(
      'DELETE /api/accesos-sapi/[id]:',
      error
    );

    return NextResponse.json(
      {
        error:
          'No fue posible dar de baja el registro.',
      },
      { status: 500 }
    );
  }
}