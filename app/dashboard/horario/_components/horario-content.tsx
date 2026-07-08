'use client';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Clock, CalendarDays } from 'lucide-react';
import { FadeIn } from '@/components/ui/animate';
import { getHeatColor } from '@/lib/calculations';

interface MatrizRow {
  fecha: string;
  nombre: string;
  franjas: number[];
  total: number;
}

export default function HorarioContent() {
  const [data, setData] = useState<{ matriz: MatrizRow[]; franjas: string[] }>({ matriz: [], franjas: [] });
  const [loading, setLoading] = useState(true);
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  useEffect(() => {
    const params = new URLSearchParams();
    if (fechaDesde) params.set('fechaDesde', fechaDesde);
    if (fechaHasta) params.set('fechaHasta', fechaHasta);
    setLoading(true);
    fetch(`/api/reportes/horario?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => setData(d ?? { matriz: [], franjas: [] }))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [fechaDesde, fechaHasta]);

  // Find max value for color scale
  const maxVal = Math.max(1, ...(data?.matriz ?? []).flatMap((r: any) => r?.franjas ?? []));

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <FadeIn>
        <div>
          <h1 className="font-display text-2xl lg:text-3xl font-bold tracking-tight text-slate-800">Etiquetas Mal Generadas por Hora</h1>
          <p className="text-sm text-slate-500 mt-1">Desglose de errores por franja horaria (07:00 a 19:00) con escala de color</p>
        </div>
      </FadeIn>

      <FadeIn delay={0.1}>
        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-3 items-center">
              <CalendarDays className="w-4 h-4 text-slate-400" />
              <Input type="date" size="sm" className="w-40" value={fechaDesde} onChange={(e: any) => setFechaDesde(e?.target?.value ?? '')} />
              <span className="text-sm text-slate-400">a</span>
              <Input type="date" size="sm" className="w-40" value={fechaHasta} onChange={(e: any) => setFechaHasta(e?.target?.value ?? '')} />
              <div className="ml-auto flex items-center gap-2 text-xs text-slate-500">
                <span>Menos</span>
                <div className="flex gap-0.5">
                  {[0, 0.25, 0.5, 0.75, 1].map((v) => (
                    <div key={v} className="w-5 h-4 rounded-sm" style={{ backgroundColor: v === 0 ? '#f1f5f9' : getHeatColor(v * maxVal, maxVal) }} />
                  ))}
                </div>
                <span>Más</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </FadeIn>

      <FadeIn delay={0.2}>
        <Card className="border-0 shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 border-b">
                  <th className="px-3 py-2.5 text-left font-semibold text-slate-600">Fecha</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-slate-600">Nombre</th>
                  {(data?.franjas ?? []).map((f: string) => (
                    <th key={f} className="px-2 py-2.5 text-center font-semibold text-slate-600 whitespace-nowrap">{f ?? ''}</th>
                  ))}
                  <th className="px-3 py-2.5 text-center font-semibold text-slate-600">Total</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b">
                      <td className="px-3 py-2"><div className="h-4 bg-slate-100 rounded animate-pulse" /></td>
                      <td className="px-3 py-2"><div className="h-4 bg-slate-100 rounded animate-pulse" /></td>
                      {Array.from({ length: 13 }).map((_, j) => (
                        <td key={j} className="px-2 py-2"><div className="h-4 bg-slate-100 rounded animate-pulse" /></td>
                      ))}
                    </tr>
                  ))
                ) : (data?.matriz ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={15} className="text-center py-10 text-slate-400">Sin datos para el rango seleccionado</td>
                  </tr>
                ) : (
                  (data?.matriz ?? []).map((row: any, i: number) => (
                    <tr key={i} className="border-b hover:bg-slate-50/50">
                      <td className="px-3 py-2 whitespace-nowrap">{row?.fecha ?? ''}</td>
                      <td className="px-3 py-2 font-medium max-w-[180px] truncate">{row?.nombre ?? ''}</td>
                      {(row?.franjas ?? []).map((val: number, j: number) => (
                        <td
                          key={j}
                          className="px-2 py-2 text-center font-mono transition-colors"
                          style={{ backgroundColor: val > 0 ? getHeatColor(val, maxVal) : 'transparent' }}
                        >
                          {val > 0 ? val : ''}
                        </td>
                      ))}
                      <td className="px-3 py-2 text-center font-mono font-semibold">{row?.total ?? 0}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </FadeIn>
    </div>
  );
}
