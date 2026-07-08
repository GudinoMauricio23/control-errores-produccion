'use client';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlusCircle, Save, Upload, FileSpreadsheet, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { FadeIn } from '@/components/ui/animate';
import * as XLSX from 'xlsx';

export default function CapturaContent() {
  const [loading, setLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [form, setForm] = useState({
    noNomina: '',
    nombre: '',
    etiqueta: '',
    fechaHora: '',
    lote: '',
    codigoMaterial: '',
    materialNombre: '',
    cantidad: '',
    dueno: '',
    eliminacion: '0',
  });

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombre || !form.fechaHora) {
      toast.error('Nombre y Fecha/Hora son obligatorios');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/errores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          noNomina: parseInt(form.noNomina) || 0,
          cantidad: parseFloat(form.cantidad) || 0,
          eliminacion: parseInt(form.eliminacion) || 0,
        }),
      });
      if (res.ok) {
        toast.success('Registro guardado correctamente');
        setForm({ noNomina: '', nombre: '', etiqueta: '', fechaHora: '', lote: '', codigoMaterial: '', materialNombre: '', cantidad: '', dueno: '', eliminacion: '0' });
      } else {
        const data = await res.json();
        toast.error(data?.error ?? 'Error al guardar');
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

 /*const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e?.target?.files?.[0];
    if (!file) return;
    setImportLoading(true);
    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      //const rawData: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });
      const rawData: any[] = XLSX.utils.sheet_to_json(ws, {defval: '',raw: false,});

      const records = rawData.map((row: any) => {
        const getValue = (row: any, names: string[]) => {
  for (const name of names) {
    const value = row[name];
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return String(value).trim();
    }
  }
  return '';
};

const juntarFechaHora = (fecha: any, hora: any) => {
  const f = String(fecha ?? '').trim();
  const h = String(hora ?? '').trim();

  if (f && h) {
    return `${f} ${h}`;
  }

  return f || h || '';
};
        // Map Excel column names to our fields
        let fechaHora: any =
  getValue(row, ['FECH Y HORA', 'FECHA Y HORA', 'fechaHora']) ||
  juntarFechaHora(
    getValue(row, ['FECHA', 'Fecha', 'fecha']),
    getValue(row, ['HORA', 'Hora', 'hora'])
  );
        const toLocalDateTimeText = (d: Date) => {
          const yyyy = d.getFullYear();
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          const dd = String(d.getDate()).padStart(2, '0');
          const hh = String(d.getHours()).padStart(2, '0');
          const mi = String(d.getMinutes()).padStart(2, '0');
          const ss = String(d.getSeconds()).padStart(2, '0');
          return `${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss}`;
        };

        let parsedDate = fechaHora;
        if (fechaHora instanceof Date) {
          // No usar toISOString(): eso mueve 09:00 a 15:00Z y rompe las franjas.
          parsedDate = toLocalDateTimeText(fechaHora);
        } else if (typeof fechaHora === 'string' && fechaHora) {
          parsedDate = fechaHora.trim();
        } else if (typeof fechaHora === 'number') {
          // Excel serial date. Se conserva la hora visual del Excel.
          const utcDays = Math.floor(fechaHora - 25569);
          const utcValue = utcDays * 86400;
          const dateInfo = new Date(utcValue * 1000);
          const fractionalDay = fechaHora - Math.floor(fechaHora);
          const totalSeconds = Math.round(86400 * fractionalDay);
          dateInfo.setHours(0, 0, 0, 0);
          dateInfo.setSeconds(totalSeconds);
          parsedDate = toLocalDateTimeText(dateInfo);
        }

        return {
          noNomina: row['NO.NOMINA'] ?? row['noNomina'] ?? 0,
          nombre: row['NOMBRE'] ?? row['nombre'] ?? '',
          etiqueta: String(row['ETIQUETA'] ?? row['etiqueta'] ?? ''),
          fechaHora: parsedDate,
          lote: String(row['LOTE'] ?? row['lote'] ?? ''),
          codigoMaterial: String(row['CODIGO'] ?? row['codigoMaterial'] ?? ''),
          //materialNombre: getValue(row, ['MATERIAL','Material','material','MATERIAL(NOMBRE)','MATERIAL (NOMBRE)','DESCRIPCION','DESCRIPCIÓN','Descripcion','Descripción','PRODUCTO','Producto',]),
          materialNombre: String(
  Object.entries(row).find(([key]) =>
    key
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '')
      .replace(/\./g, '')
      .replace(/[()]/g, '')
      .toUpperCase() === 'MATERIAL'
  )?.[1] ?? ''
).trim(),
          cantidad: row['CANTIDAD'] ?? row['cantidad'] ?? 0,
          dueno: row['DUEÑO'] ?? row['DUENO'] ?? row['dueno'] ?? '',
          eliminacion: row['ELIMINACION'] ?? row['eliminacion'] ?? 0,
        };
      //}).filter((r: any) => r.nombre && r.fechaHora);
      }).filter((r: any) => r.etiqueta || r.nombre || r.fechaHora);

      if (records.length === 0) {
        toast.error('No se encontraron registros válidos en el archivo');
        setImportLoading(false);
        return;
      }

      // Send in batches
      const batchSize = 500;
      let totalCreated = 0;
      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        const res = await fetch('/api/errores/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ records: batch }),
        });
        const data = await res.json();
        totalCreated += data?.created ?? 0;
      }

      //toast.success(`Se importaron ${totalCreated} registros de ${records.length} encontrados`);
      if (totalCreated !== records.length) {
  toast.error(`Solo se importaron ${totalCreated} de ${records.length}. Revisa filas sin nombre, fecha u hora.`);
} else {
  toast.success(`Se importaron ${totalCreated} registros correctamente`);
}
    } catch (err: any) {
      console.error('Import error:', err);
      toast.error('Error al procesar el archivo Excel');
    } finally {
      setImportLoading(false);
      // Reset input
      e.target.value = '';
    }
  };
  */
 const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e?.target?.files?.[0];
  if (!file) return;

  setImportLoading(true);

  const normalizar = (v: any) =>
    String(v ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '')
      .replace(/\./g, '')
      .replace(/[()]/g, '')
      .toUpperCase();

  const formatoFechaHora = (d: Date) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss}`;
  };

  const excelSerialToDate = (serial: number) => {
    const utcDays = Math.floor(serial - 25569);
    const utcValue = utcDays * 86400;
    const d = new Date(utcValue * 1000);
    const fraction = serial - Math.floor(serial);
    const seconds = Math.round(fraction * 86400);
    d.setHours(0, 0, 0, 0);
    d.setSeconds(seconds);
    return d;
  };

  const convertirFecha = (fecha: any, hora: any, fechaHora: any) => {
    if (fechaHora instanceof Date) return formatoFechaHora(fechaHora);
    if (typeof fechaHora === 'number') return formatoFechaHora(excelSerialToDate(fechaHora));

    let base: Date | null = null;

    if (fecha instanceof Date) {
      base = new Date(fecha);
    } else if (typeof fecha === 'number') {
      base = excelSerialToDate(fecha);
    } else if (String(fecha ?? '').trim()) {
      const partes = String(fecha).trim().split(/[\/\-]/);
      if (partes.length >= 3) {
        const a = Number(partes[0]);
        const b = Number(partes[1]);
        const c = Number(partes[2]);
        const year = c < 100 ? 2000 + c : c;
        base = new Date(year, a - 1, b);
      }
    }

    if (!base && String(fechaHora ?? '').trim()) {
      return String(fechaHora).trim();
    }

    if (!base) return '';

    if (hora instanceof Date) {
      base.setHours(hora.getHours(), hora.getMinutes(), hora.getSeconds(), 0);
    } else if (typeof hora === 'number') {
      const seconds = Math.round(hora * 86400);
      base.setHours(0, 0, 0, 0);
      base.setSeconds(seconds);
    } else if (String(hora ?? '').trim()) {
      const p = String(hora).trim().split(':');
      base.setHours(Number(p[0]) || 0, Number(p[1]) || 0, Number(p[2]) || 0, 0);
    }

    return formatoFechaHora(base);
  };

  try {
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true });
    const ws = wb.Sheets[wb.SheetNames[0]];

    const rows: any[][] = XLSX.utils.sheet_to_json(ws, {
      header: 1,
      defval: '',
      raw: true,
    });

    const headers = rows[0].map((h) => normalizar(h));
    const body = rows.slice(1);

    const get = (row: any[], names: string[]) => {
      for (const name of names) {
        const index = headers.findIndex((h) => h === normalizar(name));
        if (index >= 0 && row[index] !== undefined && row[index] !== null && String(row[index]).trim() !== '') {
          return row[index];
        }
      }
      return '';
    };

    const records = body
      .map((row) => {
        const fecha = get(row, ['FECHA']);
        const hora = get(row, ['HORA']);
        const fechaHora = get(row, ['FECH Y HORA', 'FECHA Y HORA']);

        return {
          noNomina: parseInt(String(get(row, ['NO.NOMINA', 'NOMINA', 'NO NOMINA']))) || 0,
          nombre: String(get(row, ['NOMBRE'])).trim(),
          etiqueta: String(get(row, ['ETIQUETA'])).trim(),
          fechaHora: convertirFecha(fecha, hora, fechaHora),
          lote: String(get(row, ['LOTE'])).trim(),
          codigoMaterial: String(get(row, ['CODIGO', 'CÓDIGO'])).trim(),
          materialNombre: String(get(row, ['MATERIAL', 'MATERIAL NOMBRE', 'DESCRIPCION', 'DESCRIPCIÓN'])).trim(),
          cantidad: parseFloat(String(get(row, ['CANTIDAD']))) || 0,
          dueno: String(get(row, ['DUEÑO', 'DUENO'])).trim(),
          eliminacion: parseInt(String(get(row, ['ELIMINACION', 'ELIMINACIÓN']))) || 0,
        };
      })
      .filter((r) => r.etiqueta);

    const batchSize = 500;
    let totalCreated = 0;

    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      const res = await fetch('/api/errores/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records: batch }),
      });

      const data = await res.json();
      totalCreated += data?.created ?? 0;
    }

    toast.success(`Se importaron ${totalCreated} registros de ${records.length}`);
  } catch (err) {
    console.error('Import error:', err);
    toast.error('Error al procesar el archivo Excel');
  } finally {
    setImportLoading(false);
    e.target.value = '';
  }
};
  


  const fields = [
    { key: 'noNomina', label: 'No. Nómina', type: 'number', placeholder: 'Ej: 12345', icon: '#' },
    { key: 'nombre', label: 'Nombre *', type: 'text', placeholder: 'Nombre del operador', required: true },
    { key: 'etiqueta', label: 'Etiqueta', type: 'text', placeholder: 'Número de etiqueta' },
    { key: 'fechaHora', label: 'Fecha y Hora *', type: 'datetime-local', placeholder: '', required: true },
    { key: 'lote', label: 'Lote', type: 'text', placeholder: 'Número de lote' },
    { key: 'codigoMaterial', label: 'Código Material', type: 'text', placeholder: 'Código' },
    { key: 'materialNombre', label: 'MaterialNombre', type: 'text', placeholder: 'Nombre del material' },
    { key: 'cantidad', label: 'Cantidad', type: 'number', placeholder: '0.00' },
    { key: 'dueno', label: 'Dueño', type: 'text', placeholder: 'Empresa dueña' },
  ];

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <FadeIn>
        <div>
          <h1 className="font-display text-2xl lg:text-3xl font-bold tracking-tight text-slate-800">Captura de Datos</h1>
          <p className="text-sm text-slate-500 mt-1">Ingresa registros de etiquetas individualmente o importa desde Excel</p>
        </div>
      </FadeIn>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <FadeIn delay={0.1} className="lg:col-span-2">
          <Card className="border-0 shadow-md">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-display flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-blue-500" />
                Nuevo Registro
              </CardTitle>
              <CardDescription>Completa los campos para agregar un nuevo registro de etiqueta</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {fields.map((f) => (
                    <div key={f.key} className="space-y-1.5">
                      <Label className="text-xs font-medium text-slate-600">{f.label}</Label>
                      <Input
                        type={f.type}
                        placeholder={f.placeholder}
                        value={(form as any)[f.key] ?? ''}
                        onChange={(e: any) => handleChange(f.key, e?.target?.value ?? '')}
                        required={f.required}
                        size="sm"
                        step={f.type === 'number' ? 'any' : undefined}
                      />
                    </div>
                  ))}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-600">Eliminación</Label>
                    <select
                      value={form.eliminacion}
                      onChange={(e: any) => handleChange('eliminacion', e?.target?.value ?? '0')}
                      className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                    >
                      <option value="0">0 - Correcta</option>
                      <option value="1">1 - Error (Eliminada)</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <Button type="submit" className="bg-blue-600 hover:bg-blue-700" loading={loading}>
                    <Save className="w-4 h-4 mr-2" />
                    Guardar Registro
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </FadeIn>

        <FadeIn delay={0.2}>
          <Card className="border-0 shadow-md">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-display flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                Importar Excel
              </CardTitle>
              <CardDescription>Carga un archivo Excel con múltiples registros</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:border-blue-400 transition-colors">
                <Upload className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-500 mb-3">Arrastra un archivo .xlsx o haz clic para seleccionar</p>
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

              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Columnas esperadas:
                </h4>
                <div className="text-[11px] text-slate-500 space-y-0.5">
                  <p className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-400" /> NO.NOMINA, NOMBRE</p>
                  <p className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-400" /> ETIQUETA, FECH Y HORA</p>
                  <p className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-400" /> LOTE, CODIGO, MATERIAL</p>
                  <p className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-400" /> CANTIDAD, DUEÑO</p>
                  <p className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-400" /> ELIMINACION (0 o 1)</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </FadeIn>
      </div>
    </div>
  );
}

