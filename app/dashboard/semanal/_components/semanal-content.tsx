'use client';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart3, TrendingUp } from 'lucide-react';
import { FadeIn } from '@/components/ui/animate';
import { Badge } from '@/components/ui/badge';
import dynamic from 'next/dynamic';

const EfectividadChart = dynamic(() => import('./efectividad-chart'), { ssr: false, loading: () => <div className="h-64 animate-pulse bg-slate-100 rounded-lg" /> });

const MESES = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

interface SemanalRow {
  semana: number;
  nombre: string;
  errores: number;
  etiquetasGeneradas: number;
  etiquetasCorrectas: number;
  porcentajeError: number;
  porcentajeEfectividad: number;
  horaCritica: string;
}

export default function SemanalContent() {
  const [data, setData] = useState<SemanalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [anio, setAnio] = useState(new Date().getFullYear());

  useEffect(() => {
    setLoading(true);
    fetch(`/api/reportes/semanal?mes=${mes}&anio=${anio}`)
      .then((r) => r.json())
      .then((d) => setData(d ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [mes, anio]);

  // Group by semana for efectividad chart
  const semanas = [...new Set((data ?? []).map((d: any) => d?.semana))].sort();
  const operadores = [...new Set((data ?? []).map((d: any) => d?.nombre))];

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <FadeIn>
        <div>
          <h1 className="font-display text-2xl lg:text-3xl font-bold tracking-tight text-slate-800">Reporte Semanal</h1>
          <p className="text-sm text-slate-500 mt-1">Métricas de errores y efectividad por semana</p>
        </div>
      </FadeIn>

      <FadeIn delay={0.1}>
        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-3 items-center">
              <select
                value={mes}
                onChange={(e: any) => setMes(parseInt(e?.target?.value ?? '1'))}
                className="h-9 px-3 rounded-md border border-input bg-background text-sm"
              >
                {MESES.slice(1).map((m, i) => (
                  <option key={i + 1} value={i + 1}>{m}</option>
                ))}
              </select>
              <select
                value={anio}
                onChange={(e: any) => setAnio(parseInt(e?.target?.value ?? '2026'))}
                className="h-9 px-3 rounded-md border border-input bg-background text-sm"
              >
                {[2024, 2025, 2026, 2027].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>
      </FadeIn>

      <FadeIn delay={0.15}>
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-display flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              % Efectividad por Semana
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <EfectividadChart data={data ?? []} semanas={semanas} operadores={operadores} />
            </div>
          </CardContent>
        </Card>
      </FadeIn>

      <FadeIn delay={0.2}>
        <Card className="border-0 shadow-md overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-display flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-500" />
              Detalle por Semana y Operador
            </CardTitle>
          </CardHeader>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="text-xs font-semibold">Semana</TableHead>
                  <TableHead className="text-xs font-semibold">Usuario</TableHead>
                  <TableHead className="text-xs font-semibold text-center">Errores</TableHead>
                  <TableHead className="text-xs font-semibold text-center">Generadas</TableHead>
                  <TableHead className="text-xs font-semibold text-center">Correctas</TableHead>
                  <TableHead className="text-xs font-semibold text-center">% Error</TableHead>
                  <TableHead className="text-xs font-semibold text-center">% Efectividad</TableHead>
                  <TableHead className="text-xs font-semibold text-center">Hora Crítica</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 8 }).map((_, j) => (
                        <TableCell key={j}><div className="h-4 bg-slate-100 rounded animate-pulse" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (data ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-10 text-slate-400">Sin datos para el período seleccionado</TableCell>
                  </TableRow>
                ) : (
                  (data ?? []).map((row: any, i: number) => (
                    <TableRow key={i} className="hover:bg-slate-50/50">
                      <TableCell className="font-mono text-xs font-semibold">S{row?.semana ?? 0}</TableCell>
                      <TableCell className="text-xs font-medium">{row?.nombre ?? ''}</TableCell>
                      <TableCell className="text-center font-mono text-xs text-red-600">{row?.errores ?? 0}</TableCell>
                      <TableCell className="text-center font-mono text-xs">{row?.etiquetasGeneradas ?? 0}</TableCell>
                      <TableCell className="text-center font-mono text-xs text-emerald-600">{row?.etiquetasCorrectas ?? 0}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={(row?.porcentajeError ?? 0) > 5 ? 'destructive' : 'secondary'} className="text-[10px]">
                          {(row?.porcentajeError ?? 0).toFixed(1)}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={(row?.porcentajeEfectividad ?? 0) >= 95 ? 'default' : 'secondary'} className="text-[10px]">
                          {(row?.porcentajeEfectividad ?? 0).toFixed(1)}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center font-mono text-xs">{row?.horaCritica ?? 'SIN ERRORES'}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </FadeIn>
    </div>
  );
}
