import { useCallback, useEffect, useState } from 'react';
import PageHeader from '../components/PageHeader.jsx';
import { getApiErrorMessage, getRestorableBackups, restoreBackup } from '../services/api.js';

export default function RestorePage() {
  const [versions, setVersions] = useState([]);
  const [retentionDays, setRetentionDays] = useState(0);
  const [selected, setSelected] = useState('');
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      const { versions, retentionDays: days } = await getRestorableBackups();
      setVersions(versions);
      setRetentionDays(days);
      setSelected((prev) => {
        const ids = versions.map((v) => String(v.version_id));
        return ids.includes(prev) ? prev : '';
      });
    } catch (e) {
      setError(await getApiErrorMessage(e, 'Error al cargar versiones'));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function onRestore() {
    if (!selected) return;
    if (
      !window.confirm(
        'Esto reemplazará los datos actuales de la base con el contenido de esta versión. ¿Continuar?'
      )
    ) {
      return;
    }
    setBusy(true);
    setError('');
    setOk('');
    try {
      const data = await restoreBackup(Number(selected));
      setOk(
        `Restaurado ${data.version_nombre} en ${data.target_database}. Puedes volver a usar esta versión mientras el archivo siga en el servidor.`
      );
      await load();
    } catch (e) {
      setError(await getApiErrorMessage(e, 'No se pudo restaurar'));
      await load();
    } finally {
      setBusy(false);
    }
  }

  const selectedVersion = versions.find((v) => String(v.version_id) === selected);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Restauración"
        subtitle="Solo aparecen versiones con archivos en disco. Las copias viven en backups/ y encrypted/, no solo en memoria."
      />
      {retentionDays > 0 ? (
        <p className="text-sm text-zinc-500">
          Retención: <strong className="text-zinc-300">{retentionDays} días</strong>. Después se borran los archivos y
          la versión desaparece del listado (al iniciar el servidor, al abrir esta página o con el respaldo programado).
        </p>
      ) : null}
      {error ? (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          {error}
        </div>
      ) : null}
      {ok ? (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
          {ok}
        </div>
      ) : null}
      <div className="max-w-lg space-y-4 rounded-2xl border border-zinc-800 bg-zinc-950/50 p-6">
        <label className="block text-xs font-semibold uppercase text-zinc-500">
          Versión restaurable
          <select
            className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
          >
            <option value="">
              {versions.length === 0 ? 'No hay versiones con archivo en disco' : '— Selecciona —'}
            </option>
            {versions.map((v) => (
              <option key={v.version_id} value={String(v.version_id)}>
                {v.version_nombre} · {new Date(v.fecha_backup).toLocaleString()}
                {v.dias_restantes_retencion != null ? ` · ${v.dias_restantes_retencion} d restantes` : ''}
              </option>
            ))}
          </select>
        </label>
        {selectedVersion ? (
          <p className="text-xs text-zinc-500">
            Tamaño: {Number(selectedVersion.tamano_archivo_mb).toFixed(2)} MB
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy || !selected}
            onClick={onRestore}
            className="rounded-xl bg-fuchsia-600 px-4 py-2 text-sm font-semibold text-white hover:bg-fuchsia-500 disabled:opacity-50"
          >
            {busy ? 'Restaurando…' : 'Restaurar versión'}
          </button>
          <button
            type="button"
            onClick={load}
            className="rounded-xl border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
          >
            Actualizar lista
          </button>
        </div>
      </div>
    </div>
  );
}
