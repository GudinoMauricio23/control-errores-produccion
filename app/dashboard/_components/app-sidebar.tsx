'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import {
  LayoutDashboard,
  PlusCircle,
  History,
  BarChart3,
  Clock,
  CalendarDays,
  Calendar,
  LogOut,
  Factory,
  Menu,
  X,
  ChevronDown,
  User,
  FileCheck,
  KeyRound,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/captura', label: 'Captura de Datos', icon: PlusCircle },
  { href: '/dashboard/historial', label: 'Historial', icon: History },
  { href: '/dashboard/resumen', label: 'Resumen Diario', icon: CalendarDays },
  { href: '/dashboard/horario', label: 'Errores por Hora', icon: Clock },
  { href: '/dashboard/semanal', label: 'Reporte Semanal', icon: BarChart3 },
  { href: '/dashboard/mensual', label: 'Reporte Mensual', icon: Calendar },
  { href: '/dashboard/correcciones', label: 'Correcciones', icon: FileCheck },
  { href: '/dashboard/accesos-sapi', label: 'Control de accesos SAPI', icon: KeyRound },
];

export default function AppSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession() || {};
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-blue-600 text-white rounded-lg shadow-lg"
        aria-label="Abrir menú"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 lg:z-auto h-screen w-64 bg-slate-900 text-white flex flex-col transition-transform duration-300 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="p-5 flex items-center justify-between border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
              <Factory className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display font-bold text-sm tracking-tight">Control Errores</h2>
              <p className="text-[10px] text-slate-400">Producción</p>
            </div>
          </div>
          <button onClick={() => setMobileOpen(false)} className="lg:hidden text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-700">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-blue-700 rounded-full flex items-center justify-center">
              <User className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{session?.user?.name ?? 'Usuario'}</p>
              <p className="text-[10px] text-slate-400 truncate">{session?.user?.email ?? ''}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-slate-400 hover:text-red-400 hover:bg-slate-800"
            onClick={() => signOut({ callbackUrl: '/login' })}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Cerrar Sesión
          </Button>
        </div>
      </aside>
    </>
  );
}
