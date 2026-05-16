export default function DataTable({ columns, rows, rowKey, empty }) {
  if (!rows || rows.length === 0) {
    return (
      empty || (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-10 text-center text-sm text-zinc-500">
          Sin datos
        </div>
      )
    );
  }
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-950/30 shadow-panel">
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/40">
              {columns.map((c) => (
                <th
                  key={c.key}
                  className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-400"
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/80">
            {rows.map((r) => (
              <tr key={rowKey(r)} className="hover:bg-zinc-900/30">
                {columns.map((c) => (
                  <td key={c.key} className="px-4 py-3 align-middle text-zinc-200">
                    {c.render ? c.render(r) : r[c.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
