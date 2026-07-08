// Lógica de cálculo que replica las fórmulas del Excel
// IMPORTANTE: el Excel trabaja con la hora visible de México, no con UTC.
// Por eso todos los reportes usan America/Mexico_City para evitar desfases de +6 horas.

export const REPORT_TIME_ZONE = 'America/Mexico_City';

export interface ErrorRecordData {
  id?: string;
  noNomina: number;
  nombre: string;
  etiqueta: string;
  fechaHora: Date | string;
  lote: string;
  codigoMaterial: string;
  materialNombre: string;
  cantidad: number;
  dueno: string;
  eliminacion: number;
}

export interface DateTimePartsMX {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

function isDateOnlyOrLocalDateTime(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2})?)?$/.test(value.trim());
}

// Toma fecha/hora como se ve en Excel o en el input, sin moverla por zona horaria.
export function getDateTimePartsMX(value: Date | string): DateTimePartsMX {
  if (typeof value === 'string' && isDateOnlyOrLocalDateTime(value)) {
    const [datePart, timePart = '00:00:00'] = value.trim().replace(' ', 'T').split('T');
    const [year, month, day] = datePart.split('-').map(Number);
    const [hour = 0, minute = 0, second = 0] = timePart.split(':').map(Number);
    return { year, month, day, hour, minute, second };
  }

  const d = value instanceof Date ? value : new Date(value);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: REPORT_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(d);

  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour') === 24 ? 0 : get('hour'),
    minute: get('minute'),
    second: get('second'),
  };
}

// Convierte una entrada local a Date para guardar sin que cambie la hora visual.
export function parseFechaHoraForDb(value: Date | string): Date {
  if (value instanceof Date) return value;
  if (typeof value === 'string' && isDateOnlyOrLocalDateTime(value)) {
    const p = getDateTimePartsMX(value);
    // México centro trabaja actualmente en UTC-06. Así la hora escrita 09:00 se guarda como 15:00Z
    // y al reportarla en America/Mexico_City vuelve a salir 09:00, igual que Excel.
    return new Date(`${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}T${String(p.hour).padStart(2, '0')}:${String(p.minute).padStart(2, '0')}:${String(p.second).padStart(2, '0')}-06:00`);
  }
  return new Date(value);
}

// TRUNC(FECH Y HORA) - Extraer solo la fecha del turno en México
export function extractFecha(fechaHora: Date | string): Date {
  const p = getDateTimePartsMX(fechaHora);
  // Se guarda al mediodía UTC para que no se mueva al formatear/filtrar por fecha.
  return new Date(Date.UTC(p.year, p.month - 1, p.day, 12, 0, 0));
}

// MOD(FECH Y HORA, 1) - Extraer parte decimal (hora como fracción del día)
export function extractHoraDecimal(fechaHora: Date | string): number {
  const p = getDateTimePartsMX(fechaHora);
  return (p.hour * 3600 + p.minute * 60 + p.second) / 86400;
}

// Extraer hora como string HH:mm:ss
export function extractHoraString(fechaHora: Date | string): string {
  const p = getDateTimePartsMX(fechaHora);
  return `${String(p.hour).padStart(2, '0')}:${String(p.minute).padStart(2, '0')}:${String(p.second).padStart(2, '0')}`;
}

// MONTH(FECHA)
export function extractMes(fechaHora: Date | string): number {
  return getDateTimePartsMX(fechaHora).month;
}

export function extractAnio(fechaHora: Date | string): number {
  return getDateTimePartsMX(fechaHora).year;
}

// Semana del mes igual al Excel usado: días 1-7=S1, 8-14=S2, etc.
export function calcularSemana(fecha: Date | string): number {
  const p = getDateTimePartsMX(fecha);

  const dia = Number(p.day);

  if (!dia || dia < 1) return 1;

  if (dia <= 7) return 1;
  if (dia <= 14) return 2;
  if (dia <= 21) return 3;
  if (dia <= 28) return 4;

  return 5;
}

// Preparar campos calculados para un registro
export function calcularCampos(record: ErrorRecordData) {
  return {
    fecha: extractFecha(record.fechaHora),
    hora: extractHoraString(record.fechaHora),
    horaDecimal: extractHoraDecimal(record.fechaHora),
    mes: extractMes(record.fechaHora),
    anio: extractAnio(record.fechaHora),
    semana: calcularSemana(record.fechaHora),
  };
}

// Franjas horarias del turno (07:00-19:00)
export const FRANJAS_HORARIAS = [
  { label: '07-08', horaInicio: 7, horaFin: 8 },
  { label: '08-09', horaInicio: 8, horaFin: 9 },
  { label: '09-10', horaInicio: 9, horaFin: 10 },
  { label: '10-11', horaInicio: 10, horaFin: 11 },
  { label: '11-12', horaInicio: 11, horaFin: 12 },
  { label: '12-13', horaInicio: 12, horaFin: 13 },
  { label: '13-14', horaInicio: 13, horaFin: 14 },
  { label: '14-15', horaInicio: 14, horaFin: 15 },
  { label: '15-16', horaInicio: 15, horaFin: 16 },
  { label: '16-17', horaInicio: 16, horaFin: 17 },
  { label: '17-18', horaInicio: 17, horaFin: 18 },
  { label: '18-19', horaInicio: 18, horaFin: 19 },
];

// Igual a Excel: >= inicio y < fin. 09:00 pertenece a 09-10, no a 08-09.
export function horaEnFranja(horaDecimal: number, franja: typeof FRANJAS_HORARIAS[0]): boolean {
  const horaEnHoras = horaDecimal * 24;
  return horaEnHoras >= franja.horaInicio && horaEnHoras < franja.horaFin;
}

export function getFranjaIndex(horaDecimal: number): number {
  return FRANJAS_HORARIAS.findIndex((franja) => horaEnFranja(horaDecimal, franja));
}

export function getHoraCriticaPorFranja(registros: Array<{ horaDecimal: number; eliminacion?: number }>): string {
  const conteos = new Array(FRANJAS_HORARIAS.length).fill(0);
  for (const r of registros) {
    if (r.eliminacion !== undefined && r.eliminacion !== 1) continue;
    const idx = getFranjaIndex(r.horaDecimal);
    if (idx >= 0) conteos[idx]++;
  }
  const max = Math.max(...conteos);
  if (max <= 0) return 'SIN ERRORES';
  const idx = conteos.findIndex((c) => c === max);
  return `${String(FRANJAS_HORARIAS[idx].horaInicio).padStart(2, '0')}:00-${String(FRANJAS_HORARIAS[idx].horaFin).padStart(2, '0')}:00`;
}

export function getHeatColor(value: number, max: number): string {
  if (max === 0 || value === 0) return 'transparent';
  const ratio = Math.min(value / Math.max(max, 1), 1);
  if (ratio <= 0.33) return `rgba(254, 240, 138, ${0.3 + ratio * 2})`;
  if (ratio <= 0.66) return `rgba(251, 191, 36, ${0.4 + ratio})`;
  return `rgba(239, 68, 68, ${0.4 + ratio * 0.6})`;
}

export function formatFechaMX(fecha: Date | string): string {
  const p = getDateTimePartsMX(fecha);
  return `${String(p.day).padStart(2, '0')}/${String(p.month).padStart(2, '0')}/${p.year}`;
}

export function formatHora(horaStr: string): string {
  return horaStr?.substring?.(0, 5) ?? '';
}
