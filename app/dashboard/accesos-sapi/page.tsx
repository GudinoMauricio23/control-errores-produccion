'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import {
  Download,
  FileSpreadsheet,
  KeyRound,
  Pencil,
  Plus,
  Printer,
  Search,
  ShieldCheck,
  UserCheck,
  UserX,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';

type SapiRecord = {
  id: string;
  noNomina: number;
  nombreCompleto: string;
  departamento: string | null;
  usuarioSapi: string;
  accesoAdministrativo: boolean;
  accesoProduccion: boolean;
  accesoWeb: boolean;
  activo: boolean;
  fechaEntrega: string;
  fechaBaja: string | null;
  observaciones: string | null;
  responsivaGenerada: boolean;
  responsivaFirmada: boolean;
};

type ApiResponse = {
  records: SapiRecord[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  summary: {
    activos: number;
    inactivos: number;
    totalGeneral: number;
  };
};

const emptyForm = {
  noNomina: '',
  nombreCompleto: '',
  departamento: '',
  usuarioSapi: '',
  passwordSapi: '',
  nip: '',
  accesoAdministrativo: false,
  accesoProduccion: false,
  accesoWeb: false,
  activo: true,
  fechaEntrega: new Date().toISOString().slice(0, 10),
  observaciones: '',
};

export default function AccesosSapiPage() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [estado, setEstado] = useState('todos');
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '20',
        search,
        estado,
      });
      const response = await fetch(`/api/accesos-sapi?${params}`, {
        cache: 'no-store',
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'No fue posible cargar.');
      setData(json);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al cargar.');
    } finally {
      setLoading(false);
    }
  }, [page, search, estado]);

  useEffect(() => {
    const timeout = setTimeout(loadData, 300);
    return () => clearTimeout(timeout);
  }, [loadData]);

  function openNew() {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  async function openEdit(id: string) {
    try {
      const response = await fetch(`/api/accesos-sapi/${id}`, {
        cache: 'no-store',
      });
      const record = await response.json();
      if (!response.ok) throw new Error(record.error);

      setEditingId(id);
      setForm({
        noNomina: String(record.noNomina),
        nombreCompleto: record.nombreCompleto || '',
        departamento: record.departamento || '',
        usuarioSapi: record.usuarioSapi || '',
        passwordSapi: record.passwordSapi || '',
        nip: record.nip || '',
        accesoAdministrativo: record.accesoAdministrativo,
        accesoProduccion: record.accesoProduccion,
        accesoWeb: record.accesoWeb,
        activo: record.activo,
        fechaEntrega: new Date(record.fechaEntrega).toISOString().slice(0, 10),
        observaciones: record.observaciones || '',
      });
      setShowForm(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al consultar.');
    }
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setSaving(true);

    try {
      const response = await fetch(
        editingId ? `/api/accesos-sapi/${editingId}` : '/api/accesos-sapi',
        {
          method: editingId ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        }
      );
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'No fue posible guardar.');

      toast.success(json.message);
      setShowForm(false);
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al guardar.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(record: SapiRecord) {
    try {
      const response = await fetch(`/api/accesos-sapi/${record.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activo: !record.activo,
          descripcionMovimiento: record.activo
            ? 'Acceso desactivado desde el listado.'
            : 'Acceso reactivado desde el listado.',
        }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error);
      toast.success(json.message);
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al actualizar.');
    }
  }

  async function importExcel(file?: File) {
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);

    const loadingToast = toast.loading('Importando archivo...');
    try {
      const response = await fetch('/api/accesos-sapi/import', {
        method: 'POST',
        body: formData,
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error);

      toast.success(
        `Creados: ${json.creados}. Actualizados: ${json.actualizados}. Errores: ${json.totalErrores}.`,
        { id: loadingToast }
      );
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al importar.', {
        id: loadingToast,
      });
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
              <KeyRound className="h-7 w-7" />
              Control de accesos SAPI
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Altas, bajas, accesos, responsivas e historial de usuarios.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border bg-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-slate-50">
              <FileSpreadsheet className="h-4 w-4" />
              Importar Excel
              <input
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(event) => {
                  importExcel(event.target.files?.[0]);
                  event.currentTarget.value = '';
                }}
              />
            </label>

            <a
              href={`/api/accesos-sapi/export?estado=${estado}`}
              className="inline-flex items-center gap-2 rounded-lg border bg-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-slate-50"
            >
              <Download className="h-4 w-4" />
              Exportar
            </a>

            <button
              onClick={openNew}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              <Plus className="h-4 w-4" />
              Nuevo usuario
            </button>
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-3">
          <SummaryCard
            title="Total"
            value={data?.summary.totalGeneral || 0}
            icon={<ShieldCheck className="h-5 w-5" />}
          />
          <SummaryCard
            title="Activos"
            value={data?.summary.activos || 0}
            icon={<UserCheck className="h-5 w-5" />}
          />
          <SummaryCard
            title="Inactivos"
            value={data?.summary.inactivos || 0}
            icon={<UserX className="h-5 w-5" />}
          />
        </section>

        <section className="rounded-xl border bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b p-4 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Buscar por nómina, nombre, departamento o usuario..."
                className="w-full rounded-lg border py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-slate-300"
              />
            </div>
            <select
              value={estado}
              onChange={(event) => {
                setEstado(event.target.value);
                setPage(1);
              }}
              className="rounded-lg border px-3 py-2 text-sm"
            >
              <option value="todos">Todos</option>
              <option value="activos">Activos</option>
              <option value="inactivos">Inactivos</option>
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Nómina</th>
                  <th className="px-4 py-3">Colaborador</th>
                  <th className="px-4 py-3">Usuario SAPI</th>
                  <th className="px-4 py-3">Accesos</th>
                  <th className="px-4 py-3">Entrega</th>
                  <th className="px-4 py-3">Responsiva</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                      Cargando registros...
                    </td>
                  </tr>
                ) : data?.records.length ? (
                  data.records.map((record) => (
                    <tr key={record.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium">{record.noNomina}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">
                          {record.nombreCompleto}
                        </div>
                        <div className="text-xs text-slate-500">
                          {record.departamento || 'Sin departamento'}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono">{record.usuarioSapi}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {record.accesoAdministrativo && <Badge>Admin.</Badge>}
                          {record.accesoProduccion && <Badge>Producción</Badge>}
                          {record.accesoWeb && <Badge>Web</Badge>}
                          {!record.accesoAdministrativo &&
                            !record.accesoProduccion &&
                            !record.accesoWeb && (
                              <span className="text-xs text-slate-400">Sin acceso</span>
                            )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {new Date(record.fechaEntrega).toLocaleDateString('es-MX')}
                      </td>
                      <td className="px-4 py-3">
                        {record.responsivaFirmada
                          ? 'Firmada'
                          : record.responsivaGenerada
                            ? 'Generada'
                            : 'Pendiente'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-medium ${
                            record.activo
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-rose-100 text-rose-700'
                          }`}
                        >
                          {record.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <a
                            href={`/dashboard/accesos-sapi/responsiva/${record.id}`}
                            target="_blank"
                            className="rounded-md p-2 hover:bg-slate-100"
                            title="Responsiva"
                          >
                            <Printer className="h-4 w-4" />
                          </a>
                          <button
                            onClick={() => openEdit(record.id)}
                            className="rounded-md p-2 hover:bg-slate-100"
                            title="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => toggleStatus(record)}
                            className="rounded-md p-2 hover:bg-slate-100"
                            title={record.activo ? 'Dar de baja' : 'Reactivar'}
                          >
                            {record.activo ? (
                              <UserX className="h-4 w-4" />
                            ) : (
                              <UserCheck className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                      No se encontraron registros.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t p-4 text-sm">
            <span className="text-slate-500">
              {data?.pagination.total || 0} registros
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
                className="rounded border px-3 py-1.5 disabled:opacity-40"
              >
                Anterior
              </button>
              <span>
                Página {data?.pagination.page || 1} de {data?.pagination.pages || 1}
              </span>
              <button
                disabled={page >= (data?.pagination.pages || 1)}
                onClick={() => setPage((value) => value + 1)}
                className="rounded border px-3 py-1.5 disabled:opacity-40"
              >
                Siguiente
              </button>
            </div>
          </div>
        </section>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[95vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="text-lg font-bold">
                {editingId ? 'Editar acceso SAPI' : 'Nuevo acceso SAPI'}
              </h2>
              <button onClick={() => setShowForm(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={save} className="grid gap-4 p-6 md:grid-cols-2">
              <Field label="Número de nómina">
                <input
                  required
                  type="number"
                  value={form.noNomina}
                  onChange={(event) =>
                    setForm({ ...form, noNomina: event.target.value })
                  }
                  className="input"
                />
              </Field>

              <Field label="Nombre completo">
                <input
                  required
                  value={form.nombreCompleto}
                  onChange={(event) =>
                    setForm({ ...form, nombreCompleto: event.target.value })
                  }
                  className="input"
                />
              </Field>

              <Field label="Departamento">
                <input
                  value={form.departamento}
                  onChange={(event) =>
                    setForm({ ...form, departamento: event.target.value })
                  }
                  className="input"
                />
              </Field>

              <Field label="Usuario SAPI">
                <input
                  required
                  value={form.usuarioSapi}
                  onChange={(event) =>
                    setForm({ ...form, usuarioSapi: event.target.value })
                  }
                  className="input"
                />
              </Field>

              <Field label="Contraseña SAPI">
                <input
                  type="password"
                  value={form.passwordSapi}
                  onChange={(event) =>
                    setForm({ ...form, passwordSapi: event.target.value })
                  }
                  className="input"
                />
              </Field>

              <Field label="NIP">
                <input
                  type="password"
                  value={form.nip}
                  onChange={(event) => setForm({ ...form, nip: event.target.value })}
                  className="input"
                />
              </Field>

              <Field label="Fecha de entrega">
                <input
                  type="date"
                  value={form.fechaEntrega}
                  onChange={(event) =>
                    setForm({ ...form, fechaEntrega: event.target.value })
                  }
                  className="input"
                />
              </Field>

              <div className="space-y-2">
                <span className="text-sm font-medium">Accesos asignados</span>
                <div className="flex flex-wrap gap-4 rounded-lg border p-3">
                  <Check
                    label="Administrativo"
                    checked={form.accesoAdministrativo}
                    onChange={(checked) =>
                      setForm({ ...form, accesoAdministrativo: checked })
                    }
                  />
                  <Check
                    label="Producción"
                    checked={form.accesoProduccion}
                    onChange={(checked) =>
                      setForm({ ...form, accesoProduccion: checked })
                    }
                  />
                  <Check
                    label="Web"
                    checked={form.accesoWeb}
                    onChange={(checked) =>
                      setForm({ ...form, accesoWeb: checked })
                    }
                  />
                  <Check
                    label="Activo"
                    checked={form.activo}
                    onChange={(checked) => setForm({ ...form, activo: checked })}
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <Field label="Observaciones">
                  <textarea
                    rows={3}
                    value={form.observaciones}
                    onChange={(event) =>
                      setForm({ ...form, observaciones: event.target.value })
                    }
                    className="input"
                  />
                </Field>
              </div>

              <div className="flex justify-end gap-2 border-t pt-4 md:col-span-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-lg border px-4 py-2"
                >
                  Cancelar
                </button>
                <button
                  disabled={saving}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
                >
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx global>{`
        .input {
          width: 100%;
          border: 1px solid rgb(203 213 225);
          border-radius: 0.5rem;
          padding: 0.5rem 0.75rem;
          outline: none;
        }
        .input:focus {
          box-shadow: 0 0 0 2px rgb(203 213 225);
        }
      `}</style>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between text-slate-500">
        <span className="text-sm font-medium">{title}</span>
        {icon}
      </div>
      <div className="mt-2 text-3xl font-bold text-slate-900">{value}</div>
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-700">
      {children}
    </span>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="space-y-1">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

function Check({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      {label}
    </label>
  );
}
