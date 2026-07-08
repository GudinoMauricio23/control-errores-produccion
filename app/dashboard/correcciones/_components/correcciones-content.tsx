'use client';
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, Search, ChevronLeft, ChevronRight, RefreshCw, Download } from 'lucide-react';
import { toast } from 'sonner';
import { FadeIn } from '@/components/ui/animate';
import * as XLSX from 'xlsx';

interface CorrectionRow {
  id: string;
  fecha: string;
  etiquetaErronea: string;
  producto: string;
  peso: number;
  lote: string;
  quienLoRealizo: string;
  motivo: string;
  etiquetaNueva: string;
  productoNuevo: string;
  pesoNuevo: number;
  diferencia: number;
}

const MESES = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

export default function CorreccionesContent() {
  const [data, setData] = useState<CorrectionRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [importLoading, setImportLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [exportMes, setExportMes] = useState(new Date().getMonth() + 1);
  const [exportAnio, setExportAnio] = useState(new Date().getFullYear());
  const limit = 50;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(limit));
      if (search) params.set('search', search);
      if (fechaDesde) params.set('fechaDesde', fechaDesde);
      if (fechaHasta) params.set('fechaHasta', fechaHasta);

      const res = await fetch(`/api/correcciones?${params.toString()}`);
      const json = await res.json();
      setData(json?.records ?? []);
      setTotal(json?.total ?? 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, search, fechaDesde, fechaHasta]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleExport = async () => {
    setExportLoading(true);
    try {
      const res = await fetch(`/api/correcciones/exportar?mes=${exportMes}&anio=${exportAnio}`);
      if (!res.ok) {
        toast.error('Error al exportar');
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `correcciones_${(MESES[exportMes] ?? '').toLowerCase()}_${exportAnio}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success(`Excel de ${MESES[exportMes]} ${exportAnio} descargado`);
    } catch (err) {
      console.error(err);
      toast.error('Error al descargar el archivo');
    } finally {
      setExportLoading(false);
    }
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e?.target?.files?.[0];
    if (!file) return;
    setImportLoading(true);
    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rawData: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

      const records = rawData.map((row: any) => {
        // Parsear fecha
        let fecha = '';
        const rawFecha = row['FECHA'] ?? row['fecha'] ?? '';
        if (rawFecha instanceof Date) {
          fecha = rawFecha.toISOString();
        } else if (typeof rawFecha === 'string' && rawFecha) {
          fecha = new Date(rawFecha).toISOString();
        } else if (typeof rawFecha === 'number') {
          // Excel serial date
          const d = new Date((rawFecha - 25569) * 86400 * 1000);
          fecha = d.toISOString();
        }

        return {
          fecha,
          etiquetaErronea: String(row['ETIQUETA ERRONEA'] ?? row['etiquetaErronea'] ?? ''),
          producto: String(row['PRODUCTO'] ?? row['producto'] ?? ''),
          peso: parseFloat(String(row['PESO'] ?? row['peso'] ?? 0)) || 0,
          lote: String(row['LOTE'] ?? row['lote'] ?? ''),
          quienLoRealizo: String(row['QUIEN LO REALIZO'] ?? row['quienLoRealizo'] ?? ''),
          motivo: String(row['MOTIVO'] ?? row['motivo'] ?? ''),
          etiquetaNueva: String(row['ETIQUETANUEVA'] ?? row['ETIQUETA NUEVA'] ?? row['etiquetaNueva'] ?? ''),
          productoNuevo: String(row['PRODUCTO NUEVO'] ?? row['productoNuevo'] ?? ''),
          pesoNuevo: parseFloat(String(row['PESO NUEVO'] ?? row['pesoNuevo'] ?? 0)) || 0,
        };
      }).filter((r: any) => r.etiquetaErronea || r.producto);

      if (records.length === 0) {
        toast.error('No se encontraron registros válidos en el archivo');
        setImportLoading(false);
        return;
      }

      const batchSize = 500;
      let totalCreated = 0;
      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        const res = await fetch('/api/correcciones/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ records: batch }),
        });
        const resData = await res.json();
        totalCreated += resData?.created ?? 0;
      }

      toast.success(`Se importaron ${totalCreated} registros de corrección`);
      fetchData();
    } catch (err: any) {
      console.error('Import error:', err);
      toast.error('Error al procesar el archivo Excel');
    } finally {
      setImportLoading(false);
      e.target.value = '';
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <FadeIn>
        <div>
          <h1 className="font-display text-2xl lg:text-3xl font-bold tracking-tight text-slate-800">Correcciones de Etiquetas</h1>
          <p className="text-sm text-slate-500 mt-1">Importa, exporta y consulta registros de etiquetas corregidas</p>
        </div>
      </FadeIn>

      {/* Sección de Importar y Exportar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Importar */}
        <FadeIn delay={0.05}>
          <Card className="border-0 shadow-md">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-display flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                Importar Excel de Correcciones
              </CardTitle>
              <CardDescription>Carga un archivo Excel con los registros de correcciones</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:border-emerald-400 transition-colors">
                <Upload className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500 mb-3">Selecciona tu archivo .xlsx</p>
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    className="hidden"
                    onChange={handleImportExcel}
                    disabled={importLoading}
                  />
                  <Button type="button" variant="outline" size="sm" loading={importLoading} asChild>
                    <span>
                      <Upload className="w-4 h-4 mr-2" />
                      {importLoading ? 'Procesando...' : 'Seleccionar Archivo'}
                    </span>
                  </Button>
                </label>
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Columnas esperadas:
                </h4>
                <div className="text-[11px] text-slate-500 grid grid-cols-2 gap-x-2 gap-y-0.5">
                  <p className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-400" /> FECHA</p>
                  <p className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-400" /> ETIQUETA ERRONEA</p>
                  <p className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-400" /> PRODUCTO</p>
                  <p className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-400" /> PESO, LOTE</p>
                  <p className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-400" /> QUIEN LO REALIZO</p>
                  <p className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-400" /> MOTIVO</p>
                  <p className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-400" /> ETIQUETANUEVA</p>
                  <p className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-400" /> PRODUCTO NUEVO</p>
                  <p className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-400" /> PESO NUEVO</p>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">La columna DIFERENCIA se calcula automáticamente (Peso Nuevo - Peso)</p>
              </div>
            </CardContent>
          </Card>
        </FadeIn>

        {/* Exportar */}
        <FadeIn delay={0.1}>
          <Card className="border-0 shadow-md">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-display flex items-center gap-2">
                <Download className="w-4 h-4 text-blue-500" />
                Exportar por Mes
              </CardTitle>
              <CardDescription>Descarga las correcciones de un mes específico en Excel</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex gap-2">
                  <select
                    value={exportMes}
                    onChange={(e: any) => setExportMes(parseInt(e?.target?.value ?? '1'))}
                    className="flex-1 h-9 px-3 rounded-md border border-input bg-background text-sm"
                  >
                    {MESES.slice(1).map((m, i) => (
                      <option key={i + 1} value={i + 1}>{m}</option>
                    ))}
                  </select>
                  <select
                    value={exportAnio}
                    onChange={(e: any) => setExportAnio(parseInt(e?.target?.value ?? '2026'))}
                    className="w-24 h-9 px-3 rounded-md border border-input bg-background text-sm"
                  >
                    {[2024, 2025, 2026, 2027].map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
                <Button
                  onClick={handleExport}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  size="sm"
                  loading={exportLoading}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Descargar Excel de {MESES[exportMes]} {exportAnio}
                </Button>
              </div>
            </CardContent>
          </Card>
        </FadeIn>
      </div>

      {/* Sección de filtros y búsqueda */}
      <FadeIn delay={0.15}>
        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-3 items-center">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Buscar por etiqueta, producto, operador..."
                  value={search}
                  onChange={(e: any) => { setSearch(e?.target?.value ?? ''); setPage(1); }}
                  className="pl-9"
                  size="sm"
                />
              </div>
              <Input type="date" size="sm" className="w-36" value={fechaDesde} onChange={(e: any) => { setFechaDesde(e?.target?.value ?? ''); setPage(1); }} />
              <span className="text-sm text-slate-400">a</span>
              <Input type="date" size="sm" className="w-36" value={fechaHasta} onChange={(e: any) => { setFechaHasta(e?.target?.value ?? ''); setPage(1); }} />
            </div>
          </CardContent>
        </Card>
      </FadeIn>

      {/* Tabla de Registros de Correcciones - APARTE */}
      <FadeIn delay={0.2}>
        <Card className="border-0 shadow-md overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <CardTitle className="text-base font-display">Registros de Correcciones ({total})</CardTitle>
              <Button variant="ghost" size="sm" onClick={fetchData}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="text-xs font-semibold whitespace-nowrap">Fecha</TableHead>
                  <TableHead className="text-xs font-semibold whitespace-nowrap">Etiqueta Errónea</TableHead>
                  <TableHead className="text-xs font-semibold">Producto</TableHead>
                  <TableHead className="text-xs font-semibold text-center">Peso</TableHead>
                  <TableHead className="text-xs font-semibold">Lote</TableHead>
                  <TableHead className="text-xs font-semibold whitespace-nowrap">Quién lo Realizó</TableHead>
                  <TableHead className="text-xs font-semibold">Motivo</TableHead>
                  <TableHead className="text-xs font-semibold whitespace-nowrap">Etiqueta Nueva</TableHead>
                  <TableHead className="text-xs font-semibold">Producto Nuevo</TableHead>
                  <TableHead className="text-xs font-semibold text-center">Peso Nuevo</TableHead>
                  <TableHead className="text-xs font-semibold text-center">Diferencia</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 11 }).map((_, j) => (
                        <TableCell key={j}><div className="h-4 bg-slate-100 rounded animate-pulse" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (data ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-10 text-slate-400">Sin registros de correcciones</TableCell>
                  </TableRow>
                ) : (
                  (data ?? []).map((row: CorrectionRow) => (
                    <TableRow key={row.id} className="hover:bg-slate-50/50">
                      <TableCell className="text-xs whitespace-nowrap">
                        {row.fecha ? new Date(row.fecha).toLocaleDateString('es-MX', { timeZone: 'UTC' }) : ''}
                      </TableCell>
                      <TableCell className="text-xs font-mono">{row.etiquetaErronea}</TableCell>
                      <TableCell className="text-xs max-w-[200px] truncate">{row.producto}</TableCell>
                      <TableCell className="text-xs text-center font-mono">{row.peso}</TableCell>
                      <TableCell className="text-xs font-mono">{row.lote}</TableCell>
                      <TableCell className="text-xs font-medium">{row.quienLoRealizo}</TableCell>
                      <TableCell className="text-xs max-w-[200px] truncate">{row.motivo}</TableCell>
                      <TableCell className="text-xs font-mono">{row.etiquetaNueva}</TableCell>
                      <TableCell className="text-xs max-w-[200px] truncate">{row.productoNuevo}</TableCell>
                      <TableCell className="text-xs text-center font-mono">{row.pesoNuevo}</TableCell>
                      <TableCell className="text-xs text-center font-mono">{row.diferencia}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <p className="text-xs text-slate-500">
                Página {page} de {totalPages} ({total} registros)
              </p>
              <div className="flex gap-1">
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
