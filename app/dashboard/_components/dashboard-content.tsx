'use client';
import { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, CheckCircle, Tags, TrendingUp, Users, BarChart3 } from 'lucide-react';
import dynamic from 'next/dynamic';
import { FadeIn, SlideIn } from '@/components/ui/animate';

const ErrorsPorOperadorChart = dynamic(() => import('./charts/errors-operador-chart'), { ssr: false, loading: () => <div className="h-64 animate-pulse bg-slate-100 rounded-lg" /> });
const ErrorsPorMesChart = dynamic(() => import('./charts/errors-mes-chart'), { ssr: false, loading: () => <div className="h-64 animate-pulse bg-slate-100 rounded-lg" /> });

interface DashboardData {
  totalRegistros: number;
  totalErrores: number;
  totalCorrectos: number;
  porcentajeEfectividad: number;
  totalOperadores: number;
  erroresPorMes: { mes: number; anio: number; errores: number }[];
  erroresPorOperador: { nombre: string; errores: number }[];
}

function AnimatedCounter({ value, suffix = '' }: { value: number; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (value === 0) { setDisplay(0); return; }
    const duration = 1000;
    const steps = 40;
    const increment = value / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setDisplay(value);
        clearInterval(timer);
      } else {
        setDisplay(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [value]);

  return <span ref={ref} className="font-mono">{suffix === '%' ? display.toFixed(1) : display.toLocaleString('es-MX')}{suffix}</span>;
}

export default function DashboardContent() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/reportes/dashboard')
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-6 lg:p-8 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-32 animate-pulse bg-slate-200 rounded-xl" />)}
        </div>
      </div>
    );
  }

  const kpis = [
    { label: 'Total Registros', value: data?.totalRegistros ?? 0, icon: Tags, color: 'bg-blue-500', textColor: 'text-blue-600' },
    { label: 'Errores', value: data?.totalErrores ?? 0, icon: AlertTriangle, color: 'bg-red-500', textColor: 'text-red-600' },
    { label: 'Correctos', value: data?.totalCorrectos ?? 0, icon: CheckCircle, color: 'bg-emerald-500', textColor: 'text-emerald-600' },
    { label: 'Efectividad', value: data?.porcentajeEfectividad ?? 0, icon: TrendingUp, color: 'bg-amber-500', textColor: 'text-amber-600', suffix: '%' },
  ];

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <FadeIn>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl lg:text-3xl font-bold tracking-tight text-slate-800">Dashboard</h1>
            <p className="text-sm text-slate-500 mt-1">Resumen general del sistema de control de errores</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Users className="w-4 h-4" />
            <span>{data?.totalOperadores ?? 0} operadores</span>
          </div>
        </div>
      </FadeIn>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <SlideIn key={kpi.label} from="bottom" delay={i * 0.1}>
              <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{kpi.label}</p>
                      <p className={`text-2xl font-bold mt-1 ${kpi.textColor}`}>
                        <AnimatedCounter value={kpi.value} suffix={kpi?.suffix} />
                      </p>
                    </div>
                    <div className={`w-11 h-11 ${kpi.color} rounded-xl flex items-center justify-center shadow-sm`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </SlideIn>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FadeIn delay={0.2}>
          <Card className="border-0 shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-display flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-blue-500" />
                Errores por Operador
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ErrorsPorOperadorChart data={data?.erroresPorOperador ?? []} />
              </div>
            </CardContent>
          </Card>
        </FadeIn>
        <FadeIn delay={0.3}>
          <Card className="border-0 shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-display flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                Errores por Mes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ErrorsPorMesChart data={data?.erroresPorMes ?? []} />
              </div>
            </CardContent>
          </Card>
        </FadeIn>
      </div>
    </div>
  );
}
