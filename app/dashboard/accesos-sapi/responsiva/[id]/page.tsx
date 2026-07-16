'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Printer } from 'lucide-react';

type RecordData = {
  id: string;
  noNomina: number;
  nombreCompleto: string;
  departamento: string | null;
  usuarioSapi: string;
  passwordSapi: string | null;
  nip: string | null;
  accesoAdministrativo: boolean;
  accesoProduccion: boolean;
  accesoWeb: boolean;
  fechaEntrega: string;
};

export default function ResponsivaSapiPage() {
  const params = useParams<{ id: string }>();
  const [record, setRecord] = useState<RecordData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/accesos-sapi/${params.id}`, { cache: 'no-store' })
      .then(async (response) => {
        const json = await response.json();
        if (!response.ok) throw new Error(json.error);
        setRecord(json);
      })
      .catch((err) => setError(err.message || 'No fue posible cargar.'));
  }, [params.id]);

  useEffect(() => {
    if (!record) return;

    fetch(`/api/accesos-sapi/${record.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        responsivaGenerada: true,
        descripcionMovimiento: 'Se generó la carta responsiva.',
      }),
    }).catch(() => undefined);
  }, [record]);

  if (error) return <div className="p-8 text-red-600">{error}</div>;
  if (!record) return <div className="p-8">Cargando responsiva...</div>;

  const accesos = [
    record.accesoAdministrativo && 'Administrativo',
    record.accesoProduccion && 'Producción',
    record.accesoWeb && 'Web',
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <main className="min-h-screen bg-slate-100 p-4 print:bg-white print:p-0">
      <div className="mx-auto mb-4 flex max-w-4xl justify-end print:hidden">
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-white"
        >
          <Printer className="h-4 w-4" />
          Imprimir / Guardar PDF
        </button>
      </div>

      <article className="mx-auto min-h-[1050px] max-w-4xl bg-white p-12 shadow print:min-h-0 print:max-w-none print:shadow-none">
        <header className="border-b-2 border-black pb-5 text-center">
          <h1 className="text-2xl font-bold">CARTA RESPONSIVA DE USUARIO SAPI</h1>
          <p className="mt-2 text-sm">Control de acceso y uso de credenciales</p>
        </header>

        <section className="mt-10 space-y-5 text-justify leading-7">
          <p>
            Por medio de la presente, yo{' '}
            <strong>{record.nombreCompleto}</strong>, con número de nómina{' '}
            <strong>{record.noNomina}</strong>
            {record.departamento
              ? `, adscrito(a) al departamento de ${record.departamento}`
              : ''}
            , manifiesto haber recibido las credenciales necesarias para acceder
            al sistema SAPI.
          </p>

          <div className="grid grid-cols-2 gap-4 border p-5">
            <Data label="Usuario SAPI" value={record.usuarioSapi} />
            <Data label="Contraseña entregada" value={record.passwordSapi || 'N/A'} />
            <Data label="NIP" value={record.nip || 'N/A'} />
            <Data label="Accesos asignados" value={accesos || 'Sin especificar'} />
            <Data
              label="Fecha de entrega"
              value={new Date(record.fechaEntrega).toLocaleDateString('es-MX')}
            />
          </div>

          <p>
            Me comprometo a utilizar estas credenciales exclusivamente para las
            actividades que me hayan sido autorizadas, mantenerlas bajo resguardo,
            no compartirlas con otras personas y reportar inmediatamente cualquier
            uso no autorizado, pérdida, bloqueo o posible vulneración.
          </p>

          <p>
            Reconozco que todas las operaciones realizadas con mi usuario podrán
            ser asociadas a mi cuenta y que el uso indebido de las credenciales
            puede generar responsabilidades conforme a las políticas internas de
            la empresa.
          </p>

          <p>
            Asimismo, me comprometo a solicitar la modificación o cancelación de
            mis accesos cuando cambien mis funciones o cuando deje de requerir el
            uso del sistema.
          </p>
        </section>

        <section className="mt-28 grid grid-cols-2 gap-16 text-center">
          <Signature label="Nombre y firma del colaborador" />
          <Signature label="Nombre y firma de quien entrega" />
        </section>

        <section className="mt-20 grid grid-cols-2 gap-16 text-center">
          <Signature label="Fecha" />
          <Signature label="Sello o validación de Sistemas" />
        </section>
      </article>
    </main>
  );
}

function Data({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-bold uppercase">{label}</div>
      <div className="mt-1 border-b border-black pb-1">{value}</div>
    </div>
  );
}

function Signature({ label }: { label: string }) {
  return (
    <div>
      <div className="border-t border-black pt-2 text-sm">{label}</div>
    </div>
  );
}
