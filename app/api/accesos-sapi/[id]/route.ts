import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { requireSapiAdmin } from '@/lib/sapi-auth';
import { decryptSecret, encryptSecret } from '@/lib/sapi-crypto';

export const dynamic = 'force-dynamic';

type Context = { params: { id: string } };

function toBoolean(value: unknown): boolean {
  return value === true || value === 'true' || value === 1 || value === '1';
}

export async function GET(_: NextRequest, { params }: Context) {
  const auth = await requireSapiAdmin();
  if (!auth.authorized) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const record = await prisma.sapiAccess.findUnique({
    where: { id: params.id },
    include: {
      movimientos: {
        orderBy: { fecha: 'desc' },
      },
    },
  });

  if (!record) {
    return NextResponse.json({ error: 'Registro no encontrado.' }, { status: 404 });
  }

  return NextResponse.json({
    ...record,
    passwordSapi: decryptSecret(record.passwordCifrado),
    nip: decryptSecret(record.nipCifrado),
    passwordCifrado: undefined,
    nipCifrado: undefined,
  });
}

export async function PUT(request: NextRequest, { params }: Context) {
  const auth = await requireSapiAdmin();
  if (!auth.authorized) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  try {
    const current = await prisma.sapiAccess.findUnique({
      where: { id: params.id },
    });

    if (!current) {
      return NextResponse.json({ error: 'Registro no encontrado.' }, { status: 404 });
    }

    const body = await request.json();
    const nuevoActivo =
      body.activo === undefined ? current.activo : toBoolean(body.activo);

    let tipoMovimiento = 'ACTUALIZACIÓN';
    if (current.activo && !nuevoActivo) tipoMovimiento = 'BAJA';
    if (!current.activo && nuevoActivo) tipoMovimiento = 'ACTIVACIÓN';
    if (body.passwordSapi) tipoMovimiento = 'CAMBIO DE CONTRASEÑA';
    if (body.nip) tipoMovimiento = 'CAMBIO DE NIP';

    await prisma.sapiAccess.update({
      where: { id: params.id },
      data: {
        personalId:
          body.personalId === undefined
            ? current.personalId
            : body.personalId
              ? Number(body.personalId)
              : null,
        noNomina:
          body.noNomina === undefined ? current.noNomina : Number(body.noNomina),
        nombreCompleto:
          body.nombreCompleto === undefined
            ? current.nombreCompleto
            : String(body.nombreCompleto).trim(),
        departamento:
          body.departamento === undefined
            ? current.departamento
            : String(body.departamento || '').trim() || null,
        usuarioSapi:
          body.usuarioSapi === undefined
            ? current.usuarioSapi
            : String(body.usuarioSapi).trim(),
        passwordCifrado: body.passwordSapi
          ? encryptSecret(body.passwordSapi)
          : current.passwordCifrado,
        nipCifrado: body.nip ? encryptSecret(body.nip) : current.nipCifrado,
        accesoAdministrativo:
          body.accesoAdministrativo === undefined
            ? current.accesoAdministrativo
            : toBoolean(body.accesoAdministrativo),
        accesoProduccion:
          body.accesoProduccion === undefined
            ? current.accesoProduccion
            : toBoolean(body.accesoProduccion),
        accesoWeb:
          body.accesoWeb === undefined
            ? current.accesoWeb
            : toBoolean(body.accesoWeb),
        activo: nuevoActivo,
        fechaBaja:
          current.activo && !nuevoActivo
            ? new Date()
            : nuevoActivo
              ? null
              : current.fechaBaja,
        fechaEntrega: body.fechaEntrega
          ? new Date(body.fechaEntrega)
          : current.fechaEntrega,
        observaciones:
          body.observaciones === undefined
            ? current.observaciones
            : String(body.observaciones || '').trim() || null,
        responsivaGenerada:
          body.responsivaGenerada === undefined
            ? current.responsivaGenerada
            : toBoolean(body.responsivaGenerada),
        responsivaFirmada:
          body.responsivaFirmada === undefined
            ? current.responsivaFirmada
            : toBoolean(body.responsivaFirmada),
        movimientos: {
          create: {
            tipoMovimiento,
            descripcion:
              String(body.descripcionMovimiento || '').trim() ||
              'Se actualizaron los datos del acceso SAPI.',
            realizadoPor: auth.actor,
          },
        },
      },
    });

    return NextResponse.json({ message: 'Registro actualizado correctamente.' });
  } catch (error) {
    console.error('PUT /api/accesos-sapi/[id]:', error);

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return NextResponse.json(
        { error: 'El usuario SAPI ya pertenece a otro registro.' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'No fue posible actualizar el registro.' },
      { status: 500 }
    );
  }
}

export async function DELETE(_: NextRequest, { params }: Context) {
  const auth = await requireSapiAdmin();
  if (!auth.authorized) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const current = await prisma.sapiAccess.findUnique({
    where: { id: params.id },
  });

  if (!current) {
    return NextResponse.json({ error: 'Registro no encontrado.' }, { status: 404 });
  }

  await prisma.sapiAccess.update({
    where: { id: params.id },
    data: {
      activo: false,
      fechaBaja: new Date(),
      movimientos: {
        create: {
          tipoMovimiento: 'BAJA',
          descripcion: 'El acceso fue dado de baja.',
          realizadoPor: auth.actor,
        },
      },
    },
  });

  return NextResponse.json({ message: 'Acceso dado de baja correctamente.' });
}
