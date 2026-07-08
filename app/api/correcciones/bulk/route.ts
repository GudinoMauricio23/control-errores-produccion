export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

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
    const errors: string[] = [];

    const batchSize = 100;
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      const dataToCreate = batch.map((r: any, idx: number) => {
        try {
          return {
            fecha: r.fecha ? new Date(r.fecha) : new Date(),
            etiquetaErronea: String(r.etiquetaErronea ?? ''),
            producto: String(r.producto ?? ''),
            peso: parseFloat(String(r.peso)) || 0,
            lote: String(r.lote ?? ''),
            quienLoRealizo: String(r.quienLoRealizo ?? '').trim().toUpperCase(),
            motivo: String(r.motivo ?? ''),
            etiquetaNueva: String(r.etiquetaNueva ?? ''),
            productoNuevo: String(r.productoNuevo ?? ''),
            pesoNuevo: parseFloat(String(r.pesoNuevo)) || 0,
            diferencia: Math.round(((parseFloat(String(r.pesoNuevo)) || 0) - (parseFloat(String(r.peso)) || 0)) * 100) / 100,
            //createdById: userId,
          };
        } catch (e: any) {
          errors.push(`Fila ${i + idx + 1}: ${e?.message ?? 'Error'}`);
          return null;
        }
      }).filter(Boolean);

      if (dataToCreate.length > 0) {
        const result = await prisma.correctionRecord.createMany({ data: dataToCreate as any });
        created += result.count;
      }
    }

    return NextResponse.json({ created, errors, total: records.length });
  } catch (error: any) {
    console.error('Bulk correction import error:', error);
    return NextResponse.json({ error: 'Error en importación masiva' }, { status: 500 });
  }
}
