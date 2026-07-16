import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import prisma from '@/lib/prisma';
import { requireSapiAdmin } from '@/lib/sapi-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await requireSapiAdmin();
  if (!auth.authorized) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const estado = searchParams.get('estado') || 'todos';

  const records = await prisma.sapiAccess.findMany({
    where:
      estado === 'activos'
        ? { activo: true }
        : estado === 'inactivos'
          ? { activo: false }
          : undefined,
    orderBy: { nombreCompleto: 'asc' },
  });

  const rows = records.map((record) => ({
    'No. Nómina': record.noNomina,
    'Nombre completo': record.nombreCompleto,
    Departamento: record.departamento || '',
    'Usuario SAPI': record.usuarioSapi,
    Administrativo: record.accesoAdministrativo ? 'Sí' : 'No',
    Producción: record.accesoProduccion ? 'Sí' : 'No',
    Web: record.accesoWeb ? 'Sí' : 'No',
    Estado: record.activo ? 'Activo' : 'Inactivo',
    'Fecha entrega': record.fechaEntrega.toLocaleDateString('es-MX'),
    'Fecha baja': record.fechaBaja?.toLocaleDateString('es-MX') || '',
    'Responsiva generada': record.responsivaGenerada ? 'Sí' : 'No',
    'Responsiva firmada': record.responsivaFirmada ? 'Sí' : 'No',
    Observaciones: record.observaciones || '',
  }));

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet['!cols'] = [
    { wch: 12 },
    { wch: 35 },
    { wch: 25 },
    { wch: 20 },
    { wch: 16 },
    { wch: 14 },
    { wch: 10 },
    { wch: 12 },
    { wch: 15 },
    { wch: 15 },
    { wch: 20 },
    { wch: 18 },
    { wch: 40 },
  ];

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Accesos SAPI');
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition':
        'attachment; filename="control-accesos-sapi.xlsx"',
    },
  });
}
