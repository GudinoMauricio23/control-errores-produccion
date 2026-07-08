'use client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const COLORS = ['#60B5FF', '#FF9149', '#FF9898', '#80D8C3', '#A19AD3', '#FF6363', '#FF90BB', '#72BF78'];

interface Props {
  data: { semana: number; nombre: string; porcentajeEfectividad: number }[];
  semanas: number[];
  operadores: string[];
}

export default function EfectividadChart({ data, semanas, operadores }: Props) {
  if ((data ?? []).length === 0) {
    return <div className="h-full flex items-center justify-center text-slate-400 text-sm">Sin datos disponibles</div>;
  }

  const chartData = (semanas ?? []).map((s: number) => {
    const row: any = { semana: `S${s}` };
    (operadores ?? []).forEach((op: string) => {
      const found = (data ?? []).find((d: any) => d?.semana === s && d?.nombre === op);
      row[op?.split?.(' ')?.[0] ?? 'Op'] = found?.porcentajeEfectividad ?? 0;
    });
    return row;
  });

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <XAxis dataKey="semana" tickLine={false} tick={{ fontSize: 10 }} />
        <YAxis tickLine={false} tick={{ fontSize: 10 }} domain={[0, 100]} />
        <Tooltip contentStyle={{ fontSize: 11 }} />
        <Legend verticalAlign="top" wrapperStyle={{ fontSize: 11 }} />
        {(operadores ?? []).map((op: string, i: number) => (
          <Bar key={op} dataKey={op?.split?.(' ')?.[0] ?? 'Op'} fill={COLORS[i % COLORS.length]} radius={[2, 2, 0, 0]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
