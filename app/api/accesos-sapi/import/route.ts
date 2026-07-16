/*import { NextRequest, NextResponse } from 'next/server';
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

function getValue(row: Record<string, unknown>, aliases: string[]) {
  const normalizedAliases = aliases.map(normalize);
  const entry = Object.entries(row).find(([key]) =>
    normalizedAliases.includes(normalize(key))
  );
  return entry?.[1];
}

function asBoolean(value: unknown): boolean {
  const text = normalize(value);
  return ['1', 'si', 'sí', 'true', 'x', 'activo', 'yes'].includes(text);
}

function excelDate(value: unknown): Date {
  if (value instanceof Date) return value;

  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) return new Date(parsed.y, parsed.m - 1, parsed.d);
  }

  const date = new Date(String(value || ''));
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

export async function POST(request: NextRequest) {
  const auth = await requireSapiAdmin();
  if (!auth.authorized) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: 'Selecciona un archivo de Excel.' },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const workbook = XLSX.read(bytes, { type: 'array', cellDates: true });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, {
      defval: '',
    });

    let creados = 0;
    let actualizados = 0;
    const errores: string[] = [];

    for (let index = 0; index < rows.length; index++) {
      const row = rows[index];

      const noNomina = Number(
        getValue(row, [
          'No Nomina',
          'Nómina',
          'Nomina',
          'Numero Nomina',
          'NoNomina',
        ])
      );

      const nombreCompleto = String(
        getValue(row, ['Nombre', 'Nombre Completo', 'Empleado']) || ''
      ).trim();

      const usuarioSapi = String(
        getValue(row, ['Usuario SAPI', 'Usuario', 'User SAPI']) || ''
      ).trim();

      if (!Number.isInteger(noNomina) || !nombreCompleto || !usuarioSapi) {
        errores.push(
          `Fila ${index + 2}: faltan nómina, nombre completo o usuario SAPI.`
        );
        continue;
      }

      const data = {
        noNomina,
        nombreCompleto,
        departamento:
          String(getValue(row, ['Departamento', 'Area', 'Área']) || '').trim() ||
          null,
        passwordCifrado: encryptSecret(
          String(getValue(row, ['Password', 'Contraseña', 'Contrasena']) || '')
        ),
        nipCifrado: encryptSecret(String(getValue(row, ['NIP', 'Pin']) || '')),
        accesoAdministrativo: asBoolean(
          getValue(row, ['Administrativo', 'Acceso Administrativo'])
        ),
        accesoProduccion: asBoolean(
          getValue(row, ['Produccion', 'Producción', 'Acceso Produccion'])
        ),
        accesoWeb: asBoolean(getValue(row, ['Web', 'Acceso Web'])),
        activo:
          getValue(row, ['Activo', 'Estado']) === ''
            ? true
            : asBoolean(getValue(row, ['Activo', 'Estado'])),
        fechaEntrega: excelDate(
          getValue(row, ['Fecha Entrega', 'Fecha de Entrega', 'Fecha'])
        ),
        observaciones:
          String(getValue(row, ['Observaciones', 'Notas']) || '').trim() || null,
      };

      const existing = await prisma.sapiAccess.findUnique({
        where: { usuarioSapi },
        select: { id: true },
      });

      if (existing) {
        await prisma.sapiAccess.update({
          where: { id: existing.id },
          data: {
            ...data,
            movimientos: {
              create: {
                tipoMovimiento: 'IMPORTACIÓN',
                descripcion: 'Registro actualizado mediante Excel.',
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
            usuarioSapi,
            movimientos: {
              create: {
                tipoMovimiento: 'IMPORTACIÓN',
                descripcion: 'Registro creado mediante Excel.',
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
      totalFilas: rows.length,
      creados,
      actualizados,
      errores: errores.slice(0, 50),
      totalErrores: errores.length,
    });
  } catch (error) {
    console.error('POST /api/accesos-sapi/import:', error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return NextResponse.json(
        { error: `Error de base de datos: ${error.code}` },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'No fue posible importar el archivo.' },
      { status: 500 }
    );
  }
}
*/
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
  const aliasesNormalizados = aliases.map(normalize);

  const entry = Object.entries(row).find(([key]) =>
    aliasesNormalizados.includes(normalize(key))
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

    /*
     * range: 1 omite la primera fila.
     *
     * Tu archivo tiene:
     * fila 1: encabezados originales
     * fila 2: encabezados repetidos
     * fila 3: primer usuario
     *
     * Con range: 1 se utiliza la fila 2 como encabezado
     * y los datos comienzan en la fila 3.
     */
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

      const userName = String(
        getValue(row, [
          'UserName',
          'Usuario',
          'Usuario SAPI',
        ]) ?? ''
      ).trim();

      const passwordSapi = String(
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

      const accesoTotal = toBoolean(
        getValue(row, ['AccesoTotal'])
      );

      const noPerfil = optionalNumber(
        getValue(row, ['NoPerfil'])
      );

      const estaActivo = toBoolean(
        getValue(row, ['EstaActivo'])
      );

      const nip = String(
        getValue(row, ['NIP']) ?? ''
      ).trim();

      const inicioEmpresaId = optionalNumber(
        getValue(row, [
          'Inicio_EmpresaID',
          'InicioEmpresaID',
        ])
      );

      const estaActivoProd = toBoolean(
        getValue(row, ['EstaActivoProd'])
      );

      const accesoWeb = toBoolean(
        getValue(row, ['AccesoWeb'])
      );

      if (!userName || !nombreCompleto || noNomina === null) {
        omitidos++;

        errores.push(
          `Fila ${excelRow}: faltan UserName, nombre completo o nómina.`
        );

        continue;
      }

      const data = {
        usuarioIdSapi,
        personalId,
        noNomina,
        nombreCompleto,
        passwordCifrado: encryptSecret(passwordSapi),
        nipCifrado: encryptSecret(nip),
        accesoTotal,
        noPerfil,
        estaActivo,
        inicioEmpresaId,
        estaActivoProd,
        accesoWeb,
        fechaEntrega: new Date(),
      };

      const existing =
        await prisma.sapiAccess.findFirst({
          where: {
            OR: [
              { userName },
              ...(usuarioIdSapi !== null
                ? [{ usuarioIdSapi }]
                : []),
            ],
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
                  'Usuario actualizado desde el archivo Excel.',
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
            userName,

            movimientos: {
              create: {
                tipoMovimiento: 'IMPORTACIÓN',
                descripcion:
                  'Usuario creado desde el archivo Excel.',
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
        error: 'No fue posible importar el Excel.',
        detalle:
          error instanceof Error
            ? error.message
            : 'Error desconocido',
      },
      { status: 500 }
    );
  }
}