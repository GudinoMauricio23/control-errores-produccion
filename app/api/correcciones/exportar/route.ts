export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import * as XLSX from 'xlsx';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const url = new URL(req.url);
  const mes = url.searchParams.get('mes');
  const anio = url.searchParams.get('anio');

  const where: any = {};
  if (mes && anio) {
    const mesNum = parseInt(mes);
    const anioNum = parseInt(anio);
    const fechaInicio = new Date(Date.UTC(anioNum, mesNum - 1, 1));
    const fechaFin = new Date(Date.UTC(anioNum, mesNum, 0, 23, 59, 59, 999));
    where.fecha = { gte: fechaInicio, lte: fechaFin };
  } else if (anio) {
    const anioNum = parseInt(anio);
    const fechaInicio = new Date(Date.UTC(anioNum, 0, 1));
    const fechaFin = new Date(Date.UTC(anioNum, 11, 31, 23, 59, 59, 999));
    where.fecha = { gte: fechaInicio, lte: fechaFin };
  }

  const records = await prisma.correctionRecord.findMany({
    where,
    orderBy: { fecha: 'asc' },
  });

  const data = records.map((r) => ({
    'FECHA': r.fecha ? new Date(r.fecha).toISOString().split('T')[0] : '',
    'ETIQUETA ERRONEA': r.etiquetaErronea,
    'PRODUCTO': r.producto,
    'PESO': r.peso,
    'LOTE': r.lote,
    'QUIEN LO REALIZO': r.quienLoRealizo,
    'MOTIVO': r.motivo,
    'ETIQUETA NUEVA': r.etiquetaNueva,
    'PRODUCTO NUEVO': r.productoNuevo,
    'PESO NUEVO': r.pesoNuevo,
    'DIFERENCIA': r.diferencia,
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);

  // Ajustar ancho de columnas
  ws['!cols'] = [
    { wch: 12 }, // FECHA
    { wch: 18 }, // ETIQUETA ERRONEA
    { wch: 45 }, // PRODUCTO
    { wch: 8 },  // PESO
    { wch: 10 }, // LOTE
    { wch: 35 }, // QUIEN LO REALIZO
    { wch: 40 }, // MOTIVO
    { wch: 18 }, // ETIQUETA NUEVA
    { wch: 45 }, // PRODUCTO NUEVO
    { wch: 10 }, // PESO NUEVO
    { wch: 12 }, // DIFERENCIA
  ];

  const MESES = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const sheetName = mes ? `Correcciones ${MESES[parseInt(mes)] ?? ''} ${anio ?? ''}` : 'Correcciones';
  XLSX.utils.book_append_sheet(wb, ws, sheetName.substring(0, 31));

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  const fileName = mes && anio
    ? `correcciones_${MESES[parseInt(mes)]?.toLowerCase() ?? mes}_${anio}.xlsx`
    : `correcciones_${anio ?? 'todos'}.xlsx`;

  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${fileName}"`,
    },
  });
}
