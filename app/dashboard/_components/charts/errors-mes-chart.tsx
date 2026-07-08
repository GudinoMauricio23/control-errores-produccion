'use client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const MESES = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

interface Props {
  data: { mes: number; anio: number; errores: number }[];
}

export default function ErrorsPorMesChart({ data }: Props) {
  const chartData = (data ?? []).map((d: any) => ({
    mes: `${MESES[d?.mes ?? 0] ?? ''} ${d?.anio ?? ''}`,
    errores: d?.errores ?? 0,
  }));

  if (chartData.length === 0) {
    return <div className="h-full flex items-center justify-center text-slate-400 text-sm">Sin datos disponibles</div>;
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 30 }}>
        <XAxis dataKey="mes" tickLine={false} tick={{ fontSize: 10 }} />
        <YAxis tickLine={false} tick={{ fontSize: 10 }} />
        <Tooltip contentStyle={{ fontSize: 11 }} />
        <Bar dataKey="errores" fill="#60B5FF" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
