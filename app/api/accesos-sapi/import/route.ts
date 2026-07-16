import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import * as XLSX from 'xlsx';
import prisma from '@/lib/prisma';
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
