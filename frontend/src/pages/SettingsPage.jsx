import { useEffect, useState } from 'react';
import PageHeader from '../components/PageHeader.jsx';
import { getConfig } from '../services/api.js';

function Row({ label, value, mono }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-zinc-800 bg-zinc-950/40 p-4 md:flex-row md:items-center md:justify-between">
      <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</div>
      <div className={`text-sm text-zinc-100 ${mono ? 'font-mono text-xs' : ''}`}>{value ?? '—'}</div>
    </div>
  );
}

export default function SettingsPage() {
  const [cfg, setCfg] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        setCfg(await getConfig());
      } catch (e) {
        setError(e?.response?.data?.error || e.message);
      }
    })();
  }, []);

  return (
    <div className="space-y-8">
      <PageHeader title="Configuración" subtitle="Parámetros del backend (sin contraseñas)." />
      {error ? (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          {error}
        </div>
      ) : null}
      {!cfg ? (
        <div className="h-40 animate-pulse rounded-2xl border border-zinc-800 bg-zinc-900/40" />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            <Row label="BD objetivo" value={cfg.backup_target_database} mono />
            <Row label="BD metadatos" value={cfg.metadata_database} mono />
            <Row label="Host MySQL" value={`${cfg.mysql_host}:${cfg.mysql_port}`} mono />
            <Row label="Cron" value={cfg.cron_schedule} mono />
          </div>
          <div className="space-y-3">
            <Row label="mysqldump" value={cfg.mysqldump_available ? 'Sí' : 'No'} />
            <Row label="mysql CLI" value={cfg.mysql_cli_available ? 'Sí' : 'No'} />
            <Row label="Resolución binarios" value={cfg.mysql_binaries_resolution} mono />
            <Row label="Retención (días)" value={cfg.retention_days || 'Desactivada'} />
          </div>
        </div>
      )}
    </div>
  );
}
