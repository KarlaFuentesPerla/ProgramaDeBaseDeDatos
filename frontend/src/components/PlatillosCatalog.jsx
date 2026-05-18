export default function PlatillosCatalog({
  platillos,
  categorias,
  nuevoPlat,
  setNuevoPlat,
  platBusy,
  onCrear,
  onLocalChange,
  onSave,
}) {
  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-white">Menú / platillos</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Agrega platillos o edita nombre, precio, categoría y disponibilidad. Solo los disponibles aparecen al crear
          órdenes.
        </p>
      </div>
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-5">
        <h3 className="text-sm font-semibold text-zinc-200">Nuevo platillo</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="block text-xs font-semibold uppercase text-zinc-500">
            Nombre
            <input
              className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
              value={nuevoPlat.nombre}
              onChange={(e) => setNuevoPlat({ ...nuevoPlat, nombre: e.target.value })}
            />
          </label>
          <label className="block text-xs font-semibold uppercase text-zinc-500">
            Precio
            <input
              type="number"
              min={0}
              step="0.01"
              className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
              value={nuevoPlat.precio}
              onChange={(e) => setNuevoPlat({ ...nuevoPlat, precio: e.target.value })}
            />
          </label>
          <label className="block text-xs font-semibold uppercase text-zinc-500">
            Categoría
            <select
              className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
              value={nuevoPlat.categoria_id}
              onChange={(e) => setNuevoPlat({ ...nuevoPlat, categoria_id: e.target.value })}
            >
              <option value="">Sin categoría</option>
              {categorias.map((c) => (
                <option key={c.categoria_id} value={String(c.categoria_id)}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-semibold uppercase text-zinc-500 sm:col-span-2">
            Descripción
            <input
              className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
              value={nuevoPlat.descripcion}
              onChange={(e) => setNuevoPlat({ ...nuevoPlat, descripcion: e.target.value })}
            />
          </label>
          <label className="flex items-end gap-2 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={nuevoPlat.disponible}
              onChange={(e) => setNuevoPlat({ ...nuevoPlat, disponible: e.target.checked })}
            />
            Disponible en menú
          </label>
        </div>
        <button
          type="button"
          disabled={platBusy === 'new'}
          onClick={onCrear}
          className="mt-4 rounded-xl bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-500 disabled:opacity-50"
        >
          {platBusy === 'new' ? 'Guardando…' : 'Agregar platillo'}
        </button>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-zinc-800/80">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/40 text-xs uppercase text-zinc-400">
              <th className="px-3 py-2">Nombre</th>
              <th className="px-3 py-2">Precio</th>
              <th className="px-3 py-2">Categoría</th>
              <th className="px-3 py-2">Descripción</th>
              <th className="px-3 py-2">Menú</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/80">
            {platillos.map((p) => (
              <tr key={p.platillo_id} className="hover:bg-zinc-900/30">
                <td className="px-3 py-2">
                  <input
                    className="w-full min-w-[120px] rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1 text-sm text-zinc-100"
                    value={p.nombre}
                    onChange={(e) => onLocalChange(p.platillo_id, 'nombre', e.target.value)}
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    className="w-24 rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1 text-sm text-zinc-100"
                    value={p.precio}
                    onChange={(e) => onLocalChange(p.platillo_id, 'precio', e.target.value)}
                  />
                </td>
                <td className="px-3 py-2">
                  <select
                    className="rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1 text-sm text-zinc-100"
                    value={p.categoria_id ?? ''}
                    onChange={(e) =>
                      onLocalChange(
                        p.platillo_id,
                        'categoria_id',
                        e.target.value === '' ? '' : Number(e.target.value)
                      )
                    }
                  >
                    <option value="">—</option>
                    {categorias.map((c) => (
                      <option key={c.categoria_id} value={c.categoria_id}>
                        {c.nombre}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2">
                  <input
                    className="w-full min-w-[140px] rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1 text-sm text-zinc-100"
                    value={p.descripcion || ''}
                    onChange={(e) => onLocalChange(p.platillo_id, 'descripcion', e.target.value)}
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={!!p.disponible}
                    onChange={(e) => onLocalChange(p.platillo_id, 'disponible', e.target.checked)}
                  />
                </td>
                <td className="px-3 py-2">
                  <button
                    type="button"
                    disabled={platBusy === `p${p.platillo_id}`}
                    onClick={() => onSave(p)}
                    className="rounded-lg border border-cyan-800 bg-cyan-950/40 px-2 py-1 text-xs text-cyan-200 hover:bg-cyan-900/40 disabled:opacity-50"
                  >
                    {platBusy === `p${p.platillo_id}` ? '…' : 'Guardar'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
