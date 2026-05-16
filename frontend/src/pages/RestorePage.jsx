import { useEffect, useState } from 'react';
import PageHeader from '../components/PageHeader.jsx';
import { getBackups, restoreBackup } from '../services/api.js';

export default function RestorePage() {
  const [versions, setVersions] = useState([]);
  const [selected, setSelected] = useState('');
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const rows = await getBackups();
        setVersions(rows.filter((v) => v.estado === 'completado'));
      } catch (e) {
        setError(e?.response?.data?.error || e.message);
      }
    })();
  }, []);

  async function onRestore() {
    if (!selected) return;
    setBusy(true);
    setError('');
    setOk('');
    try {
      const data = await restoreBackup(Number(selected));
      setOk(`Restaurado ${data.version_nombre} en ${data.target_database}`);
    } catch (e) {
      setError(e?.response?.data?.error || e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Restauración"
        subtitle="Restaura la base objetivo desde una versión cifrada. Operación destructiva."
      />
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
          Versión
          <select
            className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
          >
            <option value="">—</option>
            {versions.map((v) => (
              <option key={v.version_id} value={String(v.version_id)}>
                {v.version_nombre} · {new Date(v.fecha_backup).toLocaleString()}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          disabled={busy || !selected}
          onClick={onRestore}
          className="rounded-xl bg-fuchsia-600 px-4 py-2 text-sm font-semibold text-white hover:bg-fuchsia-500 disabled:opacity-50"
        >
          {busy ? 'Restaurando…' : 'Restaurar versión'}
        </button>
      </div>
    </div>
  );
}
