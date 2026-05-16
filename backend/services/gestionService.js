const { queryTarget, runTarget, qualifiedTarget, pool } = require('../config/db');

const MESA_ESTADOS = new Set(['Disponible', 'Ocupada', 'Reservada']);
const EMPLEADO_ESTADOS = new Set(['Activo', 'Inactivo']);
const ORDEN_ESTADOS = new Set(['Pendiente', 'Preparando', 'Servida', 'Pagada', 'Cancelada']);
const PAGO_METODOS = new Set(['Efectivo', 'Tarjeta', 'Transferencia', 'QR']);

function d2(x) {
  return Math.round(Number(x) * 100) / 100;
}

async function listMesas() {
  const t = qualifiedTarget('mesas');
  return queryTarget(`SELECT mesa_id, numero_mesa, capacidad, estado FROM ${t} ORDER BY numero_mesa`, []);
}

async function updateMesaEstado(mesaId, estado) {
  if (!MESA_ESTADOS.has(estado)) {
    const e = new Error(`Estado de mesa inválido. Use: ${[...MESA_ESTADOS].join(', ')}`);
    e.status = 400;
    throw e;
  }
  const t = qualifiedTarget('mesas');
  const result = await runTarget(`UPDATE ${t} SET estado = ? WHERE mesa_id = ?`, [estado, mesaId]);
  if (result.affectedRows === 0) {
    const e = new Error('Mesa no encontrada');
    e.status = 404;
    throw e;
  }
  return queryTarget(`SELECT * FROM ${t} WHERE mesa_id = ? LIMIT 1`, [mesaId]).then((r) => r[0] || null);
}

async function listEmpleados() {
  const t = qualifiedTarget('empleados');
  return queryTarget(
    `SELECT empleado_id, nombre, apellido, cargo, telefono, correo, estado FROM ${t} ORDER BY empleado_id`,
    []
  );
}

async function updateEmpleadoEstado(empleadoId, estado) {
  if (!EMPLEADO_ESTADOS.has(estado)) {
    const e = new Error(`Estado de empleado inválido. Use: ${[...EMPLEADO_ESTADOS].join(', ')}`);
    e.status = 400;
    throw e;
  }
  const t = qualifiedTarget('empleados');
  const result = await runTarget(`UPDATE ${t} SET estado = ? WHERE empleado_id = ?`, [estado, empleadoId]);
  if (result.affectedRows === 0) {
    const e = new Error('Empleado no encontrado');
    e.status = 404;
    throw e;
  }
  return queryTarget(`SELECT * FROM ${t} WHERE empleado_id = ? LIMIT 1`, [empleadoId]).then((r) => r[0] || null);
}

async function listCategorias() {
  const t = qualifiedTarget('categorias');
  return queryTarget(`SELECT categoria_id, nombre, descripcion FROM ${t} ORDER BY nombre`, []);
}

async function listPlatillos() {
  const tP = qualifiedTarget('platillos');
  const tC = qualifiedTarget('categorias');
  return queryTarget(
    `SELECT p.platillo_id, p.categoria_id, p.nombre, p.descripcion, p.precio, p.disponible,
            c.nombre AS categoria_nombre
     FROM ${tP} p
     LEFT JOIN ${tC} c ON c.categoria_id = p.categoria_id
     ORDER BY c.nombre, p.nombre`,
    []
  );
}

async function listClientes() {
  const t = qualifiedTarget('clientes_lealtad');
  return queryTarget(
    `SELECT cliente_id, nombre, apellido, telefono, correo, puntos, nivel, estado FROM ${t} ORDER BY cliente_id`,
    []
  );
}

async function listOrdenes() {
  const tO = qualifiedTarget('ordenes');
  const tM = qualifiedTarget('mesas');
  const tE = qualifiedTarget('empleados');
  const tPg = qualifiedTarget('pagos');
  return queryTarget(
    `SELECT o.orden_id, o.mesa_id, m.numero_mesa, o.empleado_id,
            CONCAT(e.nombre, ' ', e.apellido) AS empleado_nombre,
            o.cliente_id, o.fecha_orden, o.estado, o.subtotal, o.impuesto, o.total,
            COALESCE((SELECT SUM(px.monto) FROM ${tPg} px WHERE px.orden_id = o.orden_id), 0) AS total_pagado
     FROM ${tO} o
     JOIN ${tM} m ON m.mesa_id = o.mesa_id
     JOIN ${tE} e ON e.empleado_id = o.empleado_id
     ORDER BY o.orden_id DESC`,
    []
  );
}

async function getOrdenCompleta(ordenId) {
  const tO = qualifiedTarget('ordenes');
  const tM = qualifiedTarget('mesas');
  const tE = qualifiedTarget('empleados');
  const rows = await queryTarget(
    `SELECT o.*, m.numero_mesa, CONCAT(e.nombre, ' ', e.apellido) AS empleado_nombre
     FROM ${tO} o
     JOIN ${tM} m ON m.mesa_id = o.mesa_id
     JOIN ${tE} e ON e.empleado_id = o.empleado_id
     WHERE o.orden_id = ? LIMIT 1`,
    [ordenId]
  );
  const orden = rows[0] || null;
  if (!orden) return null;

  const tD = qualifiedTarget('detalle_orden');
  const tP = qualifiedTarget('platillos');
  const detalle = await queryTarget(
    `SELECT d.*, pl.nombre AS platillo_nombre
     FROM ${tD} d
     JOIN ${tP} pl ON pl.platillo_id = d.platillo_id
     WHERE d.orden_id = ?
     ORDER BY d.detalle_id`,
    [ordenId]
  );

  const tPg = qualifiedTarget('pagos');
  const pagos = await queryTarget(`SELECT * FROM ${tPg} WHERE orden_id = ? ORDER BY pago_id`, [ordenId]);

  return { orden, detalle, pagos };
}

async function createOrden(body) {
  const mesa_id = Number(body.mesa_id);
  const empleado_id = Number(body.empleado_id);
  const cliente_id =
    body.cliente_id === undefined || body.cliente_id === null || body.cliente_id === ''
      ? null
      : Number(body.cliente_id);
  const items = Array.isArray(body.items) ? body.items : [];

  if (!Number.isFinite(mesa_id) || !Number.isFinite(empleado_id)) {
    const e = new Error('mesa_id y empleado_id son obligatorios');
    e.status = 400;
    throw e;
  }
  if (cliente_id != null && !Number.isFinite(cliente_id)) {
    const e = new Error('cliente_id inválido');
    e.status = 400;
    throw e;
  }
  if (items.length === 0) {
    const e = new Error('Debe incluir al menos un ítem en items: [{ platillo_id, cantidad }]');
    e.status = 400;
    throw e;
  }

  const tOrd = qualifiedTarget('ordenes');
  const tDet = qualifiedTarget('detalle_orden');
  const tPlat = qualifiedTarget('platillos');
  const tMesa = qualifiedTarget('mesas');

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    let subtotal = 0;
    const lineas = [];
    for (const it of items) {
      const pid = Number(it.platillo_id);
      const qty = Number(it.cantidad);
      if (!Number.isFinite(pid) || !Number.isFinite(qty) || qty < 1) {
        const e = new Error('Cada ítem requiere platillo_id y cantidad >= 1');
        e.status = 400;
        throw e;
      }

      const [prows] = await conn.execute(`SELECT precio, disponible FROM ${tPlat} WHERE platillo_id = ? LIMIT 1`, [pid]);
      const plat = prows[0];
      if (!plat) {
        const e = new Error(`Platillo no encontrado: ${pid}`);
        e.status = 404;
        throw e;
      }
      if (!plat.disponible) {
        const e = new Error(`Platillo no disponible: ${pid}`);
        e.status = 400;
        throw e;
      }

      const precio = d2(plat.precio);
      const lineSub = d2(precio * qty);
      subtotal += lineSub;
      lineas.push({ pid, qty, precio, lineSub });
    }

    subtotal = d2(subtotal);
    const impuesto = d2(subtotal * 0.16);
    const total = d2(subtotal + impuesto);

    const [ins] = await conn.execute(
      `INSERT INTO ${tOrd} (mesa_id, empleado_id, cliente_id, estado, subtotal, impuesto, total)
       VALUES (?, ?, ?, 'Pendiente', ?, ?, ?)`,
      [mesa_id, empleado_id, cliente_id, subtotal, impuesto, total]
    );
    const ordenId = ins.insertId;

    for (const L of lineas) {
      await conn.execute(
        `INSERT INTO ${tDet} (orden_id, platillo_id, cantidad, precio_unitario, subtotal) VALUES (?, ?, ?, ?, ?)`,
        [ordenId, L.pid, L.qty, L.precio, L.lineSub]
      );
    }

    await conn.execute(`UPDATE ${tMesa} SET estado = 'Ocupada' WHERE mesa_id = ?`, [mesa_id]);

    await conn.commit();
    return getOrdenCompleta(ordenId);
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

async function updateOrdenEstado(ordenId, estado) {
  if (!ORDEN_ESTADOS.has(estado)) {
    const e = new Error(`Estado de orden inválido. Use: ${[...ORDEN_ESTADOS].join(', ')}`);
    e.status = 400;
    throw e;
  }

  const tO = qualifiedTarget('ordenes');
  const tM = qualifiedTarget('mesas');
  const rows = await queryTarget(`SELECT mesa_id FROM ${tO} WHERE orden_id = ? LIMIT 1`, [ordenId]);
  if (!rows[0]) {
    const e = new Error('Orden no encontrada');
    e.status = 404;
    throw e;
  }
  const mesaId = rows[0].mesa_id;

  await runTarget(`UPDATE ${tO} SET estado = ? WHERE orden_id = ?`, [estado, ordenId]);
  if (estado === 'Cancelada' || estado === 'Pagada') {
    await runTarget(`UPDATE ${tM} SET estado = 'Disponible' WHERE mesa_id = ?`, [mesaId]);
  }

  return getOrdenCompleta(ordenId);
}

async function registrarPago(ordenId, metodo_pago, monto) {
  if (!PAGO_METODOS.has(metodo_pago)) {
    const e = new Error(`Método de pago inválido. Use: ${[...PAGO_METODOS].join(', ')}`);
    e.status = 400;
    throw e;
  }

  const m = d2(monto);
  if (!Number.isFinite(m) || m <= 0) {
    const e = new Error('El monto debe ser un número mayor a 0');
    e.status = 400;
    throw e;
  }

  const tO = qualifiedTarget('ordenes');
  const tPg = qualifiedTarget('pagos');
  const tM = qualifiedTarget('mesas');

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [orows] = await conn.execute(
      `SELECT orden_id, mesa_id, total, estado FROM ${tO} WHERE orden_id = ? LIMIT 1`,
      [ordenId]
    );
    const orden = orows[0];
    if (!orden) {
      const e = new Error('Orden no encontrada');
      e.status = 404;
      throw e;
    }

    if (orden.estado === 'Cancelada') {
      const e = new Error('No se pueden registrar pagos en una orden cancelada');
      e.status = 400;
      throw e;
    }

    await conn.execute(`INSERT INTO ${tPg} (orden_id, metodo_pago, monto) VALUES (?, ?, ?)`, [
      ordenId,
      metodo_pago,
      m,
    ]);

    const [sums] = await conn.execute(`SELECT COALESCE(SUM(monto), 0) AS s FROM ${tPg} WHERE orden_id = ?`, [
      ordenId,
    ]);
    const totalPagado = d2(sums[0].s);
    const totalOrden = d2(orden.total);

    if (totalPagado + 0.005 >= totalOrden) {
      await conn.execute(`UPDATE ${tO} SET estado = 'Pagada' WHERE orden_id = ?`, [ordenId]);
      await conn.execute(`UPDATE ${tM} SET estado = 'Disponible' WHERE mesa_id = ?`, [orden.mesa_id]);
    }

    await conn.commit();
    return getOrdenCompleta(ordenId);
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

module.exports = {
  listMesas,
  updateMesaEstado,
  listEmpleados,
  updateEmpleadoEstado,
  listCategorias,
  listPlatillos,
  listClientes,
  listOrdenes,
  getOrdenCompleta,
  createOrden,
  updateOrdenEstado,
  registrarPago,
};

