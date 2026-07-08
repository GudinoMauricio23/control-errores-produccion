export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { calcularCampos, parseFechaHoraForDb } from '@/lib/calculations';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const { records } = await req.json();
    if (!Array.isArray(records) || records.length === 0) {
      return NextResponse.json({ error: 'No se recibieron registros' }, { status: 400 });
    }

    //const userId = (session.user as any)?.id;
    let created = 0;
    let errors: string[] = [];

    // Process in batches of 100
    const batchSize = 100;
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      const dataToCreate = batch.map((r: any, idx: number) => {
        try {
          const campos = calcularCampos(r);
          return {
            noNomina: parseInt(String(r.noNomina)) || 0,
            nombre: String(r.nombre ?? '').trim().toUpperCase(),
            etiqueta: String(r.etiqueta ?? ''),
            fechaHora: parseFechaHoraForDb(r.fechaHora),
            lote: String(r.lote ?? ''),
            codigoMaterial: String(r.codigoMaterial ?? ''),
            materialNombre: String(r.materialNombre ?? ''),
            cantidad: parseFloat(String(r.cantidad)) || 0,
            dueno: String(r.dueno ?? '').trim().toUpperCase(),
            eliminacion: parseInt(String(r.eliminacion)) || 0,
            ...campos,
            //createdById: userId,
          };
        } catch (e: any) {
          errors.push(`Fila ${i + idx + 1}: ${e?.message ?? 'Error'}`);
          return null;
        }
      }).filter(Boolean);

      if (dataToCreate.length > 0) {
        const result = await prisma.errorRecord.createMany({ data: dataToCreate as any });
        created += result.count;
      }
    }

    return NextResponse.json({ created, errors, total: records.length });
  } catch (error: any) {
    console.error('Bulk import error:', error);
    return NextResponse.json({ error: 'Error en importaci\u00f3n masiva' }, { status: 500 });
  }
}
