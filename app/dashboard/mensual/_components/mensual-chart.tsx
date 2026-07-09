'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const COLORS = ['#60B5FF', '#FF9149', '#FF9898', '#80D8C3', '#A19AD3', '#FF6363', '#FF90BB', '#72BF78'];
const MESES = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

interface Props {
  data: { mes: number; nombre: string; porcentajeEfectividad: number }[];
}

export default function MensualChart({ data }: Props) {
  const safeData = Array.isArray(data) ? data : [];

  if (safeData.length === 0) {
    return <div className="h-full flex items-center justify-center text-slate-400 text-sm">Sin datos disponibles</div>;
  }

  const meses = [...new Set(safeData.map((d) => Number(d.mes)))].sort((a, b) => a - b);
  const operadores = [...new Set(safeData.map((d) => d.nombre))];

  const chartData = meses.map((m) => {
    const row: any = { mes: MESES[m] ?? String(m) };

    operadores.forEach((op) => {
      const found = safeData.find((d) => Number(d.mes) === m && d.nombre === op);
      row[op] = found?.porcentajeEfectividad ?? 0;
    });

    return row;
  });

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData} margin={{ top: 20, right: 10, left: 0, bottom: 5 }}>
        <XAxis dataKey="mes" tickLine={false} tick={{ fontSize: 10 }} />
        <YAxis tickLine={false} tick={{ fontSize: 10 }} domain={[0, 100]} />
        <Tooltip contentStyle={{ fontSize: 11 }} />
        <Legend verticalAlign="top" wrapperStyle={{ fontSize: 11 }} />
        {operadores.map((op, i) => (
          <Bar
            key={op}
            dataKey={op}
            name={op}
            fill={COLORS[i % COLORS.length]}
            radius={[2, 2, 0, 0]}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
