import { useEffect, useState } from 'react';
import KpiCard from '../components/KpiCard.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import DataTable from '../components/DataTable.jsx';
import { createBackup, getApiErrorMessage, getDashboard } from '../services/api.js';

function fmtDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

function fmtMb(mb) {
  const n = Number(mb);
  if (!Number.isFinite(n)) return '0.00 MB';
  return `${n.toFixed(2)} MB`;
}

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    setError('');
    try {
      setData(await getDashboard());
    } catch (e) {
      setError(e?.response?.data?.error || e?.response?.data?.message || e.message || 'Error al cargar');
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function onBackup() {
    setBusy(true);
    setError('');
    try {
      await createBackup({ descripcion: 'Respaldo manual desde dashboard' });
      await load();
    } catch (e) {
      setError(
        await getApiErrorMessage(
          e,
          'No se pudo crear el respaldo. Revisa la terminal del backend (mysqldump / MySQL).'
        )
      );
    } finally {
      setBusy(false);
    }
  }

  const ultima = data?.ultima_version;
  const ultimaFechaHint = ultima ? fmtDate(ultima.fecha_backup) : 'Sin versiones registradas';

  const logColumns = [
    {
      key: 'fecha',
      label: 'Fecha',
      render: (r) => <span className="text-zinc-300">{fmtDate(r.fecha)}</span>,
    },
    {
      key: 'tipo',
      label: 'Tipo',
      render: (r) => <StatusBadge status={r.tipo} />,
    },
    {
      key: 'mensaje',
      label: 'Mensaje',
      render: (r) => <span className="text-zinc-200">{r.mensaje}</span>,
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Dashboard operativo</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400">
            Visibilidad en tiempo casi real del ciclo de respaldo, cifrado y restauraciones.
          </p>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={onBackup}
          className="shrink-0 rounded-xl bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-zinc-950 shadow-lg shadow-cyan-500/20 transition hover:bg-cyan-400 disabled:opacity-50"
        >
          {busy ? 'Creando…' : 'Nuevo respaldo'}
        </button>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          {error}
        </div>
      ) : null}

      {!data ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-2xl border border-zinc-800/80 bg-zinc-900/50"
            />
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <KpiCard
              label="Total de backups"
              value={String(data.total_backups ?? 0)}
              hint="Incluye versiones registradas"
            />
            <KpiCard
              label="Última fecha de respaldo"
              value={data.ultima_fecha_respaldo ? fmtDate(data.ultima_fecha_respaldo) : '—'}
              hint="Solo versiones completadas"
            />
            <KpiCard
              label="Estado del sistema"
              value={data.estado_sistema || 'Operativo'}
              hint={
                data.ultimo_error
                  ? `Último error: ${data.ultimo_error}`
                  : 'Sin errores recientes registrados'
              }
              hintClassName={data.ultimo_error ? 'text-rose-400/90' : undefined}
            />
            <KpiCard
              label="Última versión"
              value={ultima?.version_nombre || '—'}
              hint={ultimaFechaHint}
            />
            <KpiCard
              label="Restauraciones"
              value={String(data.restauraciones ?? 0)}
              hint="Conteo de restauraciones completadas"
            />
            <KpiCard
              label="Almacenamiento total"
              value={fmtMb(data.almacenamiento_mb)}
              hint="Suma de tamaños declarados por versión"
            />
          </div>

          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">Actividad reciente</h2>
                <p className="mt-1 text-sm text-zinc-500">Últimos eventos del motor de respaldos</p>
              </div>
              <button
                type="button"
                onClick={load}
                className="rounded-lg border border-zinc-700 bg-zinc-900/80 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:border-zinc-600 hover:bg-zinc-800"
              >
                Actualizar
              </button>
            </div>
            <DataTable
              columns={logColumns}
              rows={data.logs_recientes || []}
              rowKey={(r) => r.log_id}
              empty={
                <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/30 p-10 text-center text-sm text-zinc-500">
                  No hay eventos registrados todavía
                </div>
              }
            />
          </div>
        </>
      )}
    </div>
  );
}
