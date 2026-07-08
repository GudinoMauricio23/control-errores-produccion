'use client';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CalendarDays, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { FadeIn } from '@/components/ui/animate';
import { Badge } from '@/components/ui/badge';

interface ResumenRow {
  fecha: string;
  nombre: string;
  etiquetasGeneradas: number;
  etiquetasEliminadas: number;
  horaCritica: string;
}

export default function ResumenContent() {
  const [data, setData] = useState<ResumenRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  useEffect(() => {
    const params = new URLSearchParams();
    if (fechaDesde) params.set('fechaDesde', fechaDesde);
    if (fechaHasta) params.set('fechaHasta', fechaHasta);
    setLoading(true);
    fetch(`/api/reportes/resumen?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => setData(d ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [fechaDesde, fechaHasta]);

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <FadeIn>
        <div>
          <h1 className="font-display text-2xl lg:text-3xl font-bold tracking-tight text-slate-800">Resumen Diario</h1>
          <p className="text-sm text-slate-500 mt-1">Etiquetas generadas y eliminadas por operador por día</p>
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
            </div>
          </CardContent>
        </Card>
      </FadeIn>

      <FadeIn delay={0.2}>
        <Card className="border-0 shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="text-xs font-semibold">Fecha</TableHead>
                  <TableHead className="text-xs font-semibold">Usuario</TableHead>
                  <TableHead className="text-xs font-semibold text-center">Etiquetas Generadas</TableHead>
                  <TableHead className="text-xs font-semibold text-center">Etiquetas Eliminadas</TableHead>
                  <TableHead className="text-xs font-semibold text-center">% Error</TableHead>
                  <TableHead className="text-xs font-semibold text-center">Hora Crítica</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 6 }).map((_, j) => (
                        <TableCell key={j}><div className="h-4 bg-slate-100 rounded animate-pulse" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (data ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-slate-400">Sin datos para el rango seleccionado</TableCell>
                  </TableRow>
                ) : (
                  (data ?? []).map((row: any, i: number) => {
                    const pctError = (row?.etiquetasGeneradas ?? 0) > 0
                      ? ((row?.etiquetasEliminadas ?? 0) / (row?.etiquetasGeneradas ?? 1) * 100).toFixed(1)
                      : '0.0';
                    return (
                      <TableRow key={i} className="hover:bg-slate-50/50">
                        <TableCell className="text-xs">{row?.fecha ?? ''}</TableCell>
                        <TableCell className="text-xs font-medium">{row?.nombre ?? ''}</TableCell>
                        <TableCell className="text-center font-mono text-xs">{row?.etiquetasGeneradas ?? 0}</TableCell>
                        <TableCell className="text-center">
                          <span className={`font-mono text-xs ${(row?.etiquetasEliminadas ?? 0) > 0 ? 'text-red-600 font-semibold' : 'text-slate-500'}`}>
                            {row?.etiquetasEliminadas ?? 0}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={parseFloat(pctError) > 5 ? 'destructive' : 'secondary'} className="text-[10px]">
                            {pctError}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {(row?.horaCritica ?? '') === 'SIN ERRORES' ? (
                            <span className="text-xs text-emerald-600 flex items-center justify-center gap-1">
                              <CheckCircle className="w-3 h-3" /> Sin errores
                            </span>
                          ) : (
                            <span className="text-xs text-red-600 font-mono flex items-center justify-center gap-1">
                              <Clock className="w-3 h-3" /> {row?.horaCritica ?? ''}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </FadeIn>
    </div>
  );
}
