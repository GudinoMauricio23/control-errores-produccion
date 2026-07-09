'use client';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar, TrendingUp } from 'lucide-react';
import { FadeIn } from '@/components/ui/animate';
import { Badge } from '@/components/ui/badge';
import dynamic from 'next/dynamic';

const MensualChart = dynamic(() => import('./mensual-chart'), { ssr: false, loading: () => <div className="h-64 animate-pulse bg-slate-100 rounded-lg" /> });

const MESES_NOMBRE = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

interface MensualRow {
  mes: number;
  nombre: string;
  errores: number;
  etiquetasGeneradas: number;
  etiquetasCorrectas: number;
  porcentajeEfectividad: number;
  porcentajeError: number;
  horaCritica: string;
}

export default function MensualContent() {
  const [data, setData] = useState<MensualRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [anio, setAnio] = useState(new Date().getFullYear());

useEffect(() => {
  setLoading(true);

  fetch(`/api/reportes/mensual?anio=${anio}`)
    .then(async (r) => {
      const text = await r.text();
      console.log("RESPUESTA MENSUAL:", text);

      if (!r.ok) {
        throw new Error(text);
      }

      return JSON.parse(text);
    })
    .then((d) => setData(Array.isArray(d) ? d : []))
    .catch((err) => {
      console.error("ERROR MENSUAL:", err);
      setData([]);
    })
    .finally(() => setLoading(false));
}, [anio]);

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <FadeIn>
        <div>
          <h1 className="font-display text-2xl lg:text-3xl font-bold tracking-tight text-slate-800">Reporte Mensual</h1>
          <p className="text-sm text-slate-500 mt-1">Métricas de errores y efectividad por mes</p>
        </div>
      </FadeIn>

      <FadeIn delay={0.1}>
        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Calendar className="w-4 h-4 text-slate-400" />
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
              Efectividad Mensual por Operador
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <pre className="text-xs overflow-auto">{JSON.stringify(data, null, 2)}</pre>
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
                  <TableHead className="text-xs font-semibold">Mes</TableHead>
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
                    <TableCell colSpan={8} className="text-center py-10 text-slate-400">Sin datos para el año seleccionado</TableCell>
                  </TableRow>
                ) : (
                  (data ?? []).map((row: any, i: number) => (
                    <TableRow key={i} className="hover:bg-slate-50/50">
                      <TableCell className="text-xs font-semibold">{MESES_NOMBRE[row?.mes ?? 0] ?? ''}</TableCell>
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
