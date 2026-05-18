import { useEffect, useMemo, useState } from 'react';
import PageHeader from '../components/PageHeader.jsx';
import DataTable from '../components/DataTable.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { createBackup, downloadBackup, getBackups } from '../services/api.js';

export default function VersionsPage() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [exportingId, setExportingId] = useState(null);

  async function load() {
    setError('');
    try {
      const list = await getBackups();
      setRows(list.filter((r) => r.puede_restaurar || r.estado === 'pendiente'));
    } catch (e) {
      setError(e?.response?.data?.error || e.message || 'Error al cargar versiones');
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function onExport(versionId, format) {
    setExportingId(`${versionId}-${format}`);
    setError('');
    try {
      await downloadBackup(versionId, format);
    } catch (e) {
      if (e?.response?.data instanceof Blob) {
        try {
          const text = await e.response.data.text();
          const json = JSON.parse(text);
          setError(json.error || 'No se pudo exportar');
        } catch {
          setError('No se pudo exportar el respaldo');
        }
      } else {
        setError(e?.response?.data?.error || e.message || 'No se pudo exportar');
      }
    } finally {
      setExportingId(null);
    }
  }

  const columns = useMemo(
    () => [
      { key: 'version_nombre', label: 'Versión' },
      {
        key: 'fecha_backup',
        label: 'Fecha',
        render: (r) => new Date(r.fecha_backup).toLocaleString(),
      },
      {
        key: 'estado',
        label: 'Estado',
        render: (r) => (
          <span className="flex flex-col gap-1">
            <StatusBadge status={r.estado} />
            {r.estado === 'completado' && r.archivos_en_disco === false ? (
              <span className="text-xs text-rose-400">Sin archivo (se eliminará al refrescar)</span>
            ) : null}
            {r.dias_restantes_retencion != null && r.archivos_en_disco ? (
              <span className="text-xs text-zinc-500">{r.dias_restantes_retencion} d de retención</span>
            ) : null}
          </span>
        ),
      },
      {
        key: 'tamano_archivo_mb',
        label: 'Tamaño (MB)',
        render: (r) => Number(r.tamano_archivo_mb).toFixed(3),
      },
      { key: 'descripcion', label: 'Descripción', render: (r) => r.descripcion || '—' },
      {
        key: 'acciones',
        label: 'Acciones',
        render: (r) => {
          const canExport = r.puede_exportar === true || (r.estado === 'completado' && r.archivos_en_disco !== false);
          const busyEnc = exportingId === `${r.version_id}-enc`;
          const busySql = exportingId === `${r.version_id}-sql`;
          if (!canExport) {
            return <span className="text-xs text-zinc-600">—</span>;
          }
          return (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={!!exportingId}
                onClick={() => onExport(r.version_id, 'enc')}
                className="rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-xs font-medium text-zinc-200 hover:border-cyan-600/50 hover:text-cyan-200 disabled:opacity-50"
              >
                {busyEnc ? '…' : 'Exportar .enc'}
              </button>
              <button
                type="button"
                disabled={!!exportingId}
                onClick={() => onExport(r.version_id, 'sql')}
                className="rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-xs font-medium text-zinc-200 hover:border-cyan-600/50 hover:text-cyan-200 disabled:opacity-50"
              >
                {busySql ? '…' : 'Exportar .sql'}
              </button>
            </div>
          );
        },
      },
    ],
    [exportingId]
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Versiones"
        subtitle="Historial de respaldos cifrados de la base objetivo."
        actions={
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await createBackup({});
                await load();
              } catch (e) {
                setError(e?.response?.data?.error || e.message);
              } finally {
                setBusy(false);
              }
            }}
            className="rounded-xl bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-500 disabled:opacity-50"
          >
            {busy ? '…' : 'Nuevo respaldo'}
          </button>
        }
      />
      {error ? (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          {error}
        </div>
      ) : null}
      <DataTable columns={columns} rows={rows} rowKey={(r) => r.version_id} />
    </div>
  );
}
