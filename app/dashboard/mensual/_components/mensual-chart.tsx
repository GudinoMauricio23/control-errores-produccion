'use client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const COLORS = ['#60B5FF', '#FF9149', '#FF9898', '#80D8C3', '#A19AD3', '#FF6363', '#FF90BB', '#72BF78'];
const MESES = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

interface Props {
  data: { mes: number; nombre: string; porcentajeEfectividad: number }[];
}

export default function MensualChart({ data }: Props) {
  if ((data ?? []).length === 0) {
    return <div className="h-full flex items-center justify-center text-slate-400 text-sm">Sin datos disponibles</div>;
  }

  const meses = [...new Set((data ?? []).map((d: any) => d?.mes))].sort();
  const operadores = [...new Set((data ?? []).map((d: any) => d?.nombre))];

  const chartData = meses.map((m: number) => {
    const row: any = { mes: MESES[m ?? 0] ?? '' };
    (operadores ?? []).forEach((op: string) => {
      const found = (data ?? []).find((d: any) => d?.mes === m && d?.nombre === op);
      row[op?.split?.(' ')?.[0] ?? 'Op'] = found?.porcentajeEfectividad ?? 0;
    });
    return row;
  });

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <XAxis dataKey="mes" tickLine={false} tick={{ fontSize: 10 }} />
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
