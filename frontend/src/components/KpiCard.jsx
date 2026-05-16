export default function KpiCard({ label, value, hint, hintClassName }) {
  return (
    <div className="rounded-2xl border border-zinc-800/90 bg-zinc-900/40 p-5 shadow-panel">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">{label}</p>
      <p className="mt-3 text-2xl font-bold tracking-tight text-white">{value}</p>
      {hint ? (
        <p className={`mt-2 text-xs leading-relaxed ${hintClassName || 'text-zinc-500'}`}>{hint}</p>
      ) : null}
    </div>
  );
}
