import { useCallback, useEffect, useMemo, useState } from 'react';
import PageHeader from '../components/PageHeader.jsx';
import DataTable from '../components/DataTable.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import {
  getClientesGestion,
  getEmpleados,
  getMesas,
  getOrdenDetalle,
  getOrdenes,
  getPlatillosGestion,
  patchEmpleadoEstado,
  patchMesaEstado,
  patchOrdenEstado,
  postOrden,
  postOrdenPago,
} from '../services/api.js';

const mesaEstados = ['Disponible', 'Ocupada', 'Reservada'];
const empEstados = ['Activo', 'Inactivo'];
const ordenEstados = ['Pendiente', 'Preparando', 'Servida', 'Pagada', 'Cancelada'];
const metodosPago = ['Efectivo', 'Tarjeta', 'Transferencia', 'QR'];

const tabs = [
  { id: 'salon', label: 'Mesas y empleados' },
  { id: 'catalogo', label: 'Menú/platillos' },
  { id: 'nueva', label: 'Nueva orden' },
  { id: 'ordenes', label: 'Órdenes y pagos' },
];

export default function GestionPage() {
  const [tab, setTab] = useState('salon');
  const [mesas, setMesas] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [platillos, setPlatillos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [ordenes, setOrdenes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyKey, setBusyKey] = useState('');

  const [mesaId, setMesaId] = useState('');
  const [empleadoId, setEmpleadoId] = useState('');
  const [clienteId, setClienteId] = useState('');
  const [lineas, setLineas] = useState([{ platillo_id: '', cantidad: 1 }]);
  const [nuevaBusy, setNuevaBusy] = useState(false);

  const [modalOrdenId, setModalOrdenId] = useState(null);
  const [modalData, setModalData] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [pagoMetodo, setPagoMetodo] = useState('Efectivo');
  const [pagoMonto, setPagoMonto] = useState('');
  const [pagoBusy, setPagoBusy] = useState(false);

  const loadSalon = useCallback(async () => {
    const [m, e] = await Promise.all([getMesas(), getEmpleados()]);
    setMesas(m);
    setEmpleados(e);
  }, []);

  const loadCatalogo = useCallback(async () => {
    const p = await getPlatillosGestion();
    setPlatillos(p);
  }, []);

  const loadOrdenesTab = useCallback(async () => {
    const [o, m, e, c, p] = await Promise.all([
      getOrdenes(),
      getMesas(),
      getEmpleados(),
      getClientesGestion(),
      getPlatillosGestion(),
    ]);
    setOrdenes(o);
    setMesas(m);
    setEmpleados(e);
    setClientes(c);
    setPlatillos(p);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (tab === 'salon') await loadSalon();
      else if (tab === 'catalogo') await loadCatalogo();
      else if (tab === 'nueva') {
        const [m, e, c, p] = await Promise.all([
          getMesas(),
          getEmpleados(),
          getClientesGestion(),
          getPlatillosGestion(),
        ]);
        setMesas(m);
        setEmpleados(e);
        setClientes(c);
        setPlatillos(p);
      } else if (tab === 'ordenes') await loadOrdenesTab();
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  }, [tab, loadSalon, loadCatalogo, loadOrdenesTab]);

  useEffect(() => {
    load();
  }, [load]);

  async function openModalOrden(id) {
    setModalOrdenId(id);
    setModalLoading(true);
    setModalData(null);
    setPagoMetodo('Efectivo');
    setPagoMonto('');
    try {
      const d = await getOrdenDetalle(id);
      setModalData(d);
      const orden = d.orden;
      const pagado = (d.pagos || []).reduce((s, x) => s + Number(x.monto), 0);
      const rest = Math.max(0, Number(orden.total) - pagado);
      setPagoMonto(rest > 0 ? String(rest.toFixed(2)) : '');
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Error al cargar la orden');
      setModalOrdenId(null);
    } finally {
      setModalLoading(false);
    }
  }

  const colsMesas = useMemo(
    () => [
      { key: 'numero_mesa', label: 'Mesa' },
      { key: 'capacidad', label: 'Cap.' },
      {
        key: 'estado',
        label: 'Disponibilidad',
        render: (r) => (
          <select
            className="rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-100"
            value={r.estado}
            disabled={busyKey === `m${r.mesa_id}`}
            onChange={async (ev) => {
              const nuevo = ev.target.value;
              setBusyKey(`m${r.mesa_id}`);
              try {
                await patchMesaEstado(r.mesa_id, nuevo);
                await load();
              } catch (err) {
                setError(err?.response?.data?.error || err.message || 'Error al actualizar mesa');
              } finally {
                setBusyKey('');
              }
            }}
          >
            {mesaEstados.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        ),
      },
    ],
    [busyKey, load]
  );

  const colsEmp = useMemo(
    () => [
      { key: 'nombre', label: 'Nombre', render: (r) => `${r.nombre} ${r.apellido}` },
      { key: 'cargo', label: 'Cargo' },
      {
        key: 'estado',
        label: 'Estado laboral',
        render: (r) => (
          <select
            className="rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-100"
            value={r.estado}
            disabled={busyKey === `e${r.empleado_id}`}
            onChange={async (ev) => {
              const nuevo = ev.target.value;
              setBusyKey(`e${r.empleado_id}`);
              try {
                await patchEmpleadoEstado(r.empleado_id, nuevo);
                await load();
              } catch (err) {
                setError(err?.response?.data?.error || err.message || 'Error al actualizar empleado');
              } finally {
                setBusyKey('');
              }
            }}
          >
            {empEstados.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        ),
      },
    ],
    [busyKey, load]
  );

  const colsPlat = useMemo(
    () => [
      { key: 'platillo_id', label: 'ID' },
      { key: 'nombre', label: 'Platillo' },
      { key: 'categoria_nombre', label: 'Categoría', render: (r) => r.categoria_nombre || '—' },
      { key: 'precio', label: 'Precio', render: (r) => Number(r.precio).toFixed(2) },
      { key: 'disponible', label: 'En menú', render: (r) => (r.disponible ? 'Sí' : 'No') },
    ],
    []
  );

  const colsOrdenes = useMemo(
    () => [
      { key: 'orden_id', label: 'Orden' },
      { key: 'numero_mesa', label: 'Mesa' },
      { key: 'empleado_nombre', label: 'Mesero' },
      {
        key: 'estado',
        label: 'Estado',
        render: (r) => (
          <select
            className="max-w-[140px] rounded-lg border border-zinc-700 bg-zinc-900 px-1 py-1 text-xs text-zinc-100"
            value={r.estado}
            disabled={busyKey === `o${r.orden_id}`}
            onChange={async (ev) => {
              const nuevo = ev.target.value;
              setBusyKey(`o${r.orden_id}`);
              try {
                await patchOrdenEstado(r.orden_id, nuevo);
                await load();
              } catch (err) {
                setError(err?.response?.data?.error || err.message || 'Error al actualizar orden');
              } finally {
                setBusyKey('');
              }
            }}
          >
            {ordenEstados.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        ),
      },
      {
        key: 'total',
        label: 'Total',
        render: (r) => Number(r.total).toFixed(2),
      },
      {
        key: 'total_pagado',
        label: 'Pagado',
        render: (r) => Number(r.total_pagado).toFixed(2),
      },
      {
        key: 'acciones',
        label: '',
        render: (r) => (
          <button
            type="button"
            className="rounded-lg border border-cyan-800 bg-cyan-950/50 px-2 py-1 text-xs text-cyan-200 hover:bg-cyan-900/50"
            onClick={() => openModalOrden(r.orden_id)}
          >
            Detalle / pago
          </button>
        ),
      },
    ],
    [busyKey, load]
  );

  async function enviarNuevaOrden() {
    setNuevaBusy(true);
    setError('');
    try {
      const items = lineas
        .filter((l) => l.platillo_id !== '' && Number(l.platillo_id) > 0)
        .map((l) => ({ platillo_id: Number(l.platillo_id), cantidad: Number(l.cantidad) || 1 }));
      if (!mesaId || !empleadoId) {
        setError('Selecciona mesa y empleado.');
        return;
      }
      if (items.length === 0) {
        setError('Agrega al menos un platillo.');
        return;
      }
      const payload = {
        mesa_id: Number(mesaId),
        empleado_id: Number(empleadoId),
        cliente_id: clienteId === '' ? null : Number(clienteId),
        items,
      };
      await postOrden(payload);
      setLineas([{ platillo_id: '', cantidad: 1 }]);
      setTab('ordenes');
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'No se pudo crear la orden');
    } finally {
      setNuevaBusy(false);
    }
  }

  async function enviarPago() {
    if (!modalOrdenId) return;
    setPagoBusy(true);
    setError('');
    try {
      await postOrdenPago(modalOrdenId, {
        metodo_pago: pagoMetodo,
        monto: Number(pagoMonto),
      });
      await load();
      await openModalOrden(modalOrdenId);
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'No se pudo registrar el pago');
    } finally {
      setPagoBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestión del restaurante"
        subtitle="Registra órdenes, pagos y gestiona mesas y empleados. Todo se guarda en restaurante_gestion_1 para incluirlo en los respaldos."
        actions={
          <button
            type="button"
            onClick={load}
            className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm font-semibold text-zinc-200 hover:bg-zinc-800"
          >
            Refrescar
          </button>
        }
      />

      <div className="flex flex-wrap gap-2 border-b border-zinc-800 pb-4">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
              tab === t.id
                ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-500/15'
                : 'border border-zinc-800 bg-zinc-900/60 text-zinc-300 hover:bg-zinc-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{error}</div>
      ) : null}

      {tab === 'salon' && (
        <div className="space-y-8">
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">Mesas</h2>
            {loading ? (
              <div className="h-32 animate-pulse rounded-2xl border border-zinc-800 bg-zinc-900/40" />
            ) : (
              <DataTable columns={colsMesas} rows={mesas} rowKey={(r) => r.mesa_id} />
            )}
          </section>
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">Empleados</h2>
            <p className="text-sm text-zinc-500">
              Un empleado <strong className="text-zinc-300">Inactivo</strong> sigue en la BD; los respaldos conservan ese
              estado.
            </p>
            {loading ? (
              <div className="h-32 animate-pulse rounded-2xl border border-zinc-800 bg-zinc-900/40" />
            ) : (
              <DataTable columns={colsEmp} rows={empleados} rowKey={(r) => r.empleado_id} />
            )}
          </section>
        </div>
      )}

      {tab === 'catalogo' && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">Platillos disponibles para órdenes</h2>
          {loading ? (
            <div className="h-40 animate-pulse rounded-2xl border border-zinc-800 bg-zinc-900/40" />
          ) : (
            <DataTable columns={colsPlat} rows={platillos} rowKey={(r) => r.platillo_id} />
          )}
        </section>
      )}

      {tab === 'nueva' && (
        <section className="max-w-2xl space-y-4 rounded-2xl border border-zinc-800 bg-zinc-950/50 p-6">
          <h2 className="text-lg font-semibold text-white">Registrar orden</h2>
          <p className="text-sm text-zinc-500">IVA 16 % sobre subtotal. La mesa pasa a Ocupada al crear la orden.</p>
          {loading ? (
            <div className="h-40 animate-pulse rounded-xl border border-zinc-800 bg-zinc-900/40" />
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-xs font-semibold uppercase text-zinc-500">
                  Mesa
                  <select
                    className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
                    value={mesaId}
                    onChange={(e) => setMesaId(e.target.value)}
                  >
                    <option value="">—</option>
                    {mesas.map((m) => (
                      <option key={m.mesa_id} value={String(m.mesa_id)}>
                        #{m.numero_mesa} (cap. {m.capacidad})
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-xs font-semibold uppercase text-zinc-500">
                  Empleado
                  <select
                    className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
                    value={empleadoId}
                    onChange={(e) => setEmpleadoId(e.target.value)}
                  >
                    <option value="">—</option>
                    {empleados
                      .filter((e) => e.estado === 'Activo')
                      .map((e) => (
                        <option key={e.empleado_id} value={String(e.empleado_id)}>
                          {e.nombre} {e.apellido}
                        </option>
                      ))}
                  </select>
                </label>
                <label className="block text-xs font-semibold uppercase text-zinc-500 sm:col-span-2">
                  Cliente (opcional)
                  <select
                    className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
                    value={clienteId}
                    onChange={(e) => setClienteId(e.target.value)}
                  >
                    <option value="">Sin cliente lealtad</option>
                    {clientes.map((c) => (
                      <option key={c.cliente_id} value={String(c.cliente_id)}>
                        {c.nombre} {c.apellido}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase text-zinc-500">Líneas de consumo</p>
                {lineas.map((ln, idx) => (
                  <div key={idx} className="flex flex-wrap items-end gap-2">
                    <select
                      className="min-w-[200px] flex-1 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
                      value={ln.platillo_id}
                      onChange={(e) => {
                        const next = [...lineas];
                        next[idx] = { ...next[idx], platillo_id: e.target.value };
                        setLineas(next);
                      }}
                    >
                      <option value="">Platillo…</option>
                      {platillos
                        .filter((p) => p.disponible)
                        .map((p) => (
                          <option key={p.platillo_id} value={String(p.platillo_id)}>
                            {p.nombre} — {Number(p.precio).toFixed(2)}
                          </option>
                        ))}
                    </select>
                    <input
                      type="number"
                      min={1}
                      className="w-24 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
                      value={ln.cantidad}
                      onChange={(e) => {
                        const next = [...lineas];
                        next[idx] = { ...next[idx], cantidad: e.target.value };
                        setLineas(next);
                      }}
                    />
                    <button
                      type="button"
                      className="rounded-lg border border-zinc-700 px-2 py-2 text-xs text-zinc-400 hover:bg-zinc-800"
                      onClick={() => setLineas(lineas.filter((_, i) => i !== idx))}
                      disabled={lineas.length <= 1}
                    >
                      Quitar
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="text-sm text-cyan-400 hover:underline"
                  onClick={() => setLineas([...lineas, { platillo_id: '', cantidad: 1 }])}
                >
                  + Añadir platillo
                </button>
              </div>
              <button
                type="button"
                disabled={nuevaBusy}
                onClick={enviarNuevaOrden}
                className="rounded-xl bg-cyan-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-cyan-500 disabled:opacity-50"
              >
                {nuevaBusy ? 'Guardando…' : 'Crear orden'}
              </button>
            </>
          )}
        </section>
      )}

      {tab === 'ordenes' && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">Órdenes</h2>
          <p className="text-sm text-zinc-500">
            Registra pagos desde &quot;Detalle / pago&quot;. Si la suma de pagos cubre el total, la orden pasa a{' '}
            <strong className="text-zinc-300">Pagada</strong> y la mesa vuelve a{' '}
            <strong className="text-zinc-300">Disponible</strong>.
          </p>
          {loading ? (
            <div className="h-40 animate-pulse rounded-2xl border border-zinc-800 bg-zinc-900/40" />
          ) : (
            <DataTable columns={colsOrdenes} rows={ordenes} rowKey={(r) => r.orden_id} />
          )}
        </section>
      )}

      {modalOrdenId != null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-panel">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-lg font-semibold text-white">Orden #{modalOrdenId}</h3>
              <button type="button" className="text-zinc-500 hover:text-white" onClick={() => setModalOrdenId(null)}>
                ✕
              </button>
            </div>
            {modalLoading || !modalData ? (
              <p className="mt-4 text-sm text-zinc-500">Cargando…</p>
            ) : (
              <div className="mt-4 space-y-4 text-sm">
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3 text-zinc-300">
                  <p>
                    Mesa <strong className="text-white">{modalData.orden.numero_mesa}</strong> ·{' '}
                    {modalData.orden.empleado_nombre} · <StatusBadge status={modalData.orden.estado} />
                  </p>
                  <p className="mt-1">
                    Subtotal {Number(modalData.orden.subtotal).toFixed(2)} + IVA {Number(modalData.orden.impuesto).toFixed(2)}{' '}
                    = Total <strong className="text-white">{Number(modalData.orden.total).toFixed(2)}</strong>
                  </p>
                </div>
                <div>
                  <p className="mb-2 font-medium text-zinc-200">Detalle</p>
                  <ul className="space-y-1 rounded-lg border border-zinc-800 p-2">
                    {(modalData.detalle || []).map((d) => (
                      <li key={d.detalle_id} className="flex justify-between text-zinc-400">
                        <span>
                          {d.platillo_nombre} × {d.cantidad}
                        </span>
                        <span>{Number(d.subtotal).toFixed(2)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="mb-2 font-medium text-zinc-200">Pagos registrados</p>
                  {(modalData.pagos || []).length === 0 ? (
                    <p className="text-zinc-500">Ninguno</p>
                  ) : (
                    <ul className="space-y-1">
                      {modalData.pagos.map((p) => (
                        <li key={p.pago_id} className="flex justify-between text-zinc-400">
                          <span>
                            {p.metodo_pago} · {new Date(p.fecha_pago).toLocaleString()}
                          </span>
                          <span>{Number(p.monto).toFixed(2)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                {modalData.orden.estado !== 'Cancelada' && modalData.orden.estado !== 'Pagada' && (
                  <div className="space-y-2 border-t border-zinc-800 pt-4">
                    <p className="font-medium text-zinc-200">Registrar pago</p>
                    <div className="flex flex-wrap gap-2">
                      <select
                        className="rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
                        value={pagoMetodo}
                        onChange={(e) => setPagoMetodo(e.target.value)}
                      >
                        {metodosPago.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        step="0.01"
                        className="w-36 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
                        value={pagoMonto}
                        onChange={(e) => setPagoMonto(e.target.value)}
                        placeholder="Monto"
                      />
                      <button
                        type="button"
                        disabled={pagoBusy}
                        onClick={enviarPago}
                        className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                      >
                        {pagoBusy ? '…' : 'Registrar pago'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
