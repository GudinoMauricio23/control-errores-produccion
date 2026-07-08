'use client';
import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { History, Search, Download, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { FadeIn } from '@/components/ui/animate';
import { Badge } from '@/components/ui/badge';

interface ErrorRecord {
  id: string;
  noNomina: number;
  nombre: string;
  etiqueta: string;
  fechaHora: string;
  lote: string;
  codigoMaterial: string;
  materialNombre: string;
  cantidad: number;
  dueno: string;
  eliminacion: number;
  fecha: string;
  hora: string;
  mes: number;
}

export default function HistorialContent() {
  const [records, setRecords] = useState<ErrorRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [filtroEliminacion, setFiltroEliminacion] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '100');
      if (search) params.set('search', search);
      if (filtroEliminacion !== '') params.set('eliminacion', filtroEliminacion);
      if (fechaDesde) params.set('fechaDesde', fechaDesde);
      if (fechaHasta) params.set('fechaHasta', fechaHasta);

      const res = await fetch(`/api/errores?${params.toString()}`);
      const data = await res.json();
      setRecords(data?.records ?? []);
      setTotalPages(data?.totalPages ?? 1);
      setTotal(data?.total ?? 0);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, search, filtroEliminacion, fechaDesde, fechaHasta]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleExport = () => {
    const params = new URLSearchParams();
    params.set('tipo', 'datos');
    if (fechaDesde) params.set('fechaDesde', fechaDesde);
    if (fechaHasta) params.set('fechaHasta', fechaHasta);
    const link = document.createElement('a');
    link.href = `/api/reportes/exportar?${params.toString()}`;
    link.click();
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <FadeIn>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl lg:text-3xl font-bold tracking-tight text-slate-800">Historial</h1>
            <p className="text-sm text-slate-500 mt-1">{total.toLocaleString('es-MX')} registros encontrados</p>
          </div>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Exportar Excel
          </Button>
        </div>
      </FadeIn>

      <FadeIn delay={0.1}>
        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Buscar por etiqueta, lote, material..."
                  className="pl-10"
                  size="sm"
                  value={search}
                  onChange={(e: any) => { setSearch(e?.target?.value ?? ''); setPage(1); }}
                />
              </div>
              <select
                value={filtroEliminacion}
                onChange={(e: any) => { setFiltroEliminacion(e?.target?.value ?? ''); setPage(1); }}
                className="h-9 px-3 rounded-md border border-input bg-background text-sm"
              >
                <option value="">Todos</option>
                <option value="0">Correctas</option>
                <option value="1">Errores</option>
              </select>
              <Input
                type="date"
                size="sm"
                className="w-36"
                value={fechaDesde}
                onChange={(e: any) => { setFechaDesde(e?.target?.value ?? ''); setPage(1); }}
                placeholder="Desde"
              />
              <Input
                type="date"
                size="sm"
                className="w-36"
                value={fechaHasta}
                onChange={(e: any) => { setFechaHasta(e?.target?.value ?? ''); setPage(1); }}
                placeholder="Hasta"
              />
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
                  <TableHead className="text-xs font-semibold">Nómina</TableHead>
                  <TableHead className="text-xs font-semibold">Nombre</TableHead>
                  <TableHead className="text-xs font-semibold">Etiqueta</TableHead>
                  <TableHead className="text-xs font-semibold">Fecha</TableHead>
                  <TableHead className="text-xs font-semibold">Hora</TableHead>
                  <TableHead className="text-xs font-semibold">Lote</TableHead>
                  <TableHead className="text-xs font-semibold">Material</TableHead>
                  <TableHead className="text-xs font-semibold">Cantidad</TableHead>
                  <TableHead className="text-xs font-semibold">Dueño</TableHead>
                  <TableHead className="text-xs font-semibold">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 10 }).map((_, j) => (
                        <TableCell key={j}><div className="h-4 bg-slate-100 rounded animate-pulse" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (records ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-10 text-slate-400">
                      No se encontraron registros
                    </TableCell>
                  </TableRow>
                ) : (
                  (records ?? []).map((r: any) => (
                    <TableRow key={r?.id} className="hover:bg-slate-50/50">
                      <TableCell className="font-mono text-xs">{r?.noNomina ?? 0}</TableCell>
                      <TableCell className="text-xs font-medium">{r?.nombre ?? ''}</TableCell>
                      <TableCell className="font-mono text-xs">{r?.etiqueta ?? ''}</TableCell>
                      <TableCell className="text-xs">{r?.fechaHora ? new Date(r.fechaHora).toLocaleDateString('es-MX') : ''}</TableCell>
                      <TableCell className="font-mono text-xs">{r?.hora?.substring?.(0, 5) ?? ''}</TableCell>
                      <TableCell className="font-mono text-xs">{r?.lote ?? ''}</TableCell>
                      <TableCell className="text-xs max-w-[150px] truncate">{r?.materialNombre ?? ''}</TableCell>
                      <TableCell className="font-mono text-xs">{r?.cantidad ?? 0}</TableCell>
                      <TableCell className="text-xs">{r?.dueno ?? ''}</TableCell>
                      <TableCell>
                        <Badge variant={r?.eliminacion === 1 ? 'destructive' : 'default'} className="text-[10px]">
                          {r?.eliminacion === 1 ? 'Error' : 'OK'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t">
              <p className="text-xs text-slate-500">Página {page} de {totalPages}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      </FadeIn>
    </div>
  );
}
