'use client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface Props {
  data: { nombre: string; errores: number }[];
}

export default function ErrorsPorOperadorChart({ data }: Props) {
  const chartData = (data ?? []).map((d: any) => ({
    nombre: (d?.nombre ?? '').split(' ').slice(0, 2).join(' '),
    errores: d?.errores ?? 0,
  }));

  if (chartData.length === 0) {
    return <div className="h-full flex items-center justify-center text-slate-400 text-sm">Sin datos disponibles</div>;
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 50 }}>
        <XAxis
          dataKey="nombre"
          tickLine={false}
          tick={{ fontSize: 10 }}
          angle={-45}
          textAnchor="end"
          interval={0}
        />
        <YAxis tickLine={false} tick={{ fontSize: 10 }} />
        <Tooltip contentStyle={{ fontSize: 11 }} />
        <Bar dataKey="errores" fill="#FF6363" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
