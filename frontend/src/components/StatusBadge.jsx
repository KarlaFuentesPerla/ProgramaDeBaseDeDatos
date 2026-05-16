const styles = {
  operativo: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
  completado: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
  error: 'border-rose-500/30 bg-rose-500/10 text-rose-200',
  pendiente: 'border-zinc-600 bg-zinc-800/60 text-zinc-200',
  backup: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-100',
  export: 'border-amber-500/30 bg-amber-500/10 text-amber-100',
  encrypt: 'border-indigo-500/30 bg-indigo-500/10 text-indigo-100',
  restore: 'border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-100',
  cron: 'border-sky-500/30 bg-sky-500/10 text-sky-100',
  cleanup: 'border-zinc-500/30 bg-zinc-700/30 text-zinc-100',
  system_start: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100',
};

export default function StatusBadge({ status }) {
  const key = String(status || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  const cls = styles[key] || 'border-zinc-700 bg-zinc-900 text-zinc-200';
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${cls}`}>
      {status}
    </span>
  );
}
