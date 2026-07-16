import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import * as XLSX from 'xlsx';

import { prisma } from '@/lib/prisma';
import { requireSapiAdmin } from '@/lib/sapi-auth';
import { encryptSecret } from '@/lib/sapi-crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function normalize(value: unknown): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function getValue(
  row: Record<string, unknown>,
  aliases: string[]
): unknown {
  const normalizedAliases = aliases.map(normalize);

  const entry = Object.entries(row).find(([key]) =>
    normalizedAliases.includes(normalize(key))
  );

  return entry?.[1];
}

function toBoolean(value: unknown): boolean {
  const normalized = normalize(value);

  return [
    '1',
    'true',
    'si',
    'yes',
    'activo',
    'x',
  ].includes(normalized);
}

function optionalNumber(value: unknown): number | null {
  if (
    value === undefined ||
    value === null ||
    value === '' ||
    String(value).trim().toUpperCase() === 'NULL'
  ) {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : null;
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
    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: 'Selecciona un archivo Excel.' },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();

    const workbook = XLSX.read(bytes, {
      type: 'array',
      cellDates: true,
    });

    const sheetName = workbook.SheetNames.includes('USUARIO')
      ? 'USUARIO'
      : workbook.SheetNames[0];

    const sheet = workbook.Sheets[sheetName];

    if (!sheet) {
      return NextResponse.json(
        { error: 'No se encontró la hoja USUARIO.' },
        { status: 400 }
      );
    }

    const rows =
      XLSX.utils.sheet_to_json<Record<string, unknown>>(
        sheet,
        {
          defval: '',
          range: 1,
          raw: false,
        }
      );

    let creados = 0;
    let actualizados = 0;
    let omitidos = 0;

    const errores: string[] = [];

    for (let index = 0; index < rows.length; index++) {
      const row = rows[index];
      const excelRow = index + 3;

      const usuarioIdSapi = optionalNumber(
        getValue(row, ['UsuarioID'])
      );

      const usuarioExcel = String(
        getValue(row, [
          'UserName',
          'Usuario',
          'Usuario SAPI',
        ]) ?? ''
      ).trim();

      const passwordExcel = String(
        getValue(row, [
          'Password',
          'Contraseña',
          'Contrasena',
        ]) ?? ''
      ).trim();

      const personalId = optionalNumber(
        getValue(row, ['PersonalID'])
      );

      const noNomina = optionalNumber(
        getValue(row, [
          'NoNomina',
          'NO. NOMINA',
          'No. Nomina',
          'Nomina',
          'Nómina',
        ])
      );

      const nombreCompleto = String(
        getValue(row, [
          'NombreCompleto',
          'NOMBRE COMPLETO',
          'Nombre Completo',
          'Nombre',
        ]) ?? ''
      ).trim();

      const accesoAdministrativo = toBoolean(
        getValue(row, [
          'AccesoTotal',
          'Acceso Administrativo',
          'Administrativo',
        ])
      );

      const accesoProduccion = toBoolean(
        getValue(row, [
          'EstaActivoProd',
          'Acceso Produccion',
          'Acceso Producción',
          'Produccion',
          'Producción',
        ])
      );

      const accesoWeb = toBoolean(
        getValue(row, [
          'AccesoWeb',
          'Acceso Web',
          'Web',
        ])
      );

      const activo = toBoolean(
        getValue(row, [
          'EstaActivo',
          'Activo',
          'Estado',
        ])
      );

      const nip = String(
        getValue(row, ['NIP']) ?? ''
      ).trim();

      const noPerfil = optionalNumber(
        getValue(row, ['NoPerfil'])
      );

      const inicioEmpresaId = optionalNumber(
        getValue(row, [
          'Inicio_EmpresaID',
          'InicioEmpresaID',
        ])
      );

      if (
        !usuarioExcel ||
        !nombreCompleto ||
        noNomina === null
      ) {
        omitidos++;

        errores.push(
          `Fila ${excelRow}: faltan usuario, nombre completo o nómina.`
        );

        continue;
      }

      if (
        !accesoAdministrativo &&
        !accesoProduccion &&
        !accesoWeb
      ) {
        omitidos++;

        errores.push(
          `Fila ${excelRow}: el usuario no tiene acceso Administrativo, Producción ni Web.`
        );

        continue;
      }

      /*
       * El Excel solamente trae un UserName y un Password.
       * Se asignan al acceso marcado en cada columna.
       */
      const data = {
        usuarioIdSapi,
        personalId,
        noNomina,
        nombreCompleto,

        usuarioAdministrativo:
          accesoAdministrativo
            ? usuarioExcel
            : null,

        passwordAdministrativoCifrado:
          accesoAdministrativo
            ? encryptSecret(passwordExcel)
            : null,

        usuarioProduccion:
          accesoProduccion
            ? usuarioExcel
            : null,

        passwordProduccionCifrado:
          accesoProduccion
            ? encryptSecret(passwordExcel)
            : null,

        usuarioWeb:
          accesoWeb
            ? usuarioExcel
            : null,

        passwordWebCifrado:
          accesoWeb
            ? encryptSecret(passwordExcel)
            : null,

        nipCifrado:
          encryptSecret(nip),

        accesoAdministrativo,
        accesoProduccion,
        accesoWeb,

        activo,
        noPerfil,
        inicioEmpresaId,
        fechaEntrega: new Date(),
      };

      const conditions: Prisma.SapiAccessWhereInput[] = [];

      if (usuarioIdSapi !== null) {
        conditions.push({
          usuarioIdSapi,
        });
      }

      conditions.push({
        noNomina,
      });

      if (accesoAdministrativo) {
        conditions.push({
          usuarioAdministrativo: usuarioExcel,
        });
      }

      if (accesoProduccion) {
        conditions.push({
          usuarioProduccion: usuarioExcel,
        });
      }

      if (accesoWeb) {
        conditions.push({
          usuarioWeb: usuarioExcel,
        });
      }

      const existing =
        await prisma.sapiAccess.findFirst({
          where: {
            OR: conditions,
          },
          select: {
            id: true,
          },
        });

      if (existing) {
        await prisma.sapiAccess.update({
          where: {
            id: existing.id,
          },
          data: {
            ...data,

            movimientos: {
              create: {
                tipoMovimiento: 'IMPORTACIÓN',
                descripcion:
                  'Accesos actualizados desde el archivo Excel.',
                realizadoPor: auth.actor,
              },
            },
          },
        });

        actualizados++;
      } else {
        await prisma.sapiAccess.create({
          data: {
            ...data,

            movimientos: {
              create: {
                tipoMovimiento: 'IMPORTACIÓN',
                descripcion:
                  'Accesos creados desde el archivo Excel.',
                realizadoPor: auth.actor,
              },
            },
          },
        });

        creados++;
      }
    }

    return NextResponse.json({
      message: 'Importación terminada.',
      hoja: sheetName,
      filasLeidas: rows.length,
      creados,
      actualizados,
      omitidos,
      totalErrores: errores.length,
      errores: errores.slice(0, 50),
    });
  } catch (error) {
    console.error(
      'POST /api/accesos-sapi/import:',
      error
    );

    if (
      error instanceof
      Prisma.PrismaClientKnownRequestError
    ) {
      return NextResponse.json(
        {
          error: `Error de Prisma: ${error.code}`,
          detalle: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        error:
          'No fue posible importar el Excel.',

        detalle:
          error instanceof Error
            ? error.message
            : 'Error desconocido',
      },
      { status: 500 }
    );
  }
}