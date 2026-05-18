const gestionService = require('../services/gestionService');

function badId(msg) {
  const e = new Error(msg);
  e.status = 400;
  return e;
}

async function mesasList(req, res, next) {
  try {
    const data = await gestionService.listMesas();
    res.json({ ok: true, data });
  } catch (e) {
    next(e);
  }
}

async function mesaPatch(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) throw badId('ID de mesa inválido');
    const estado = req.body && req.body.estado != null ? String(req.body.estado).trim() : '';
    const row = await gestionService.updateMesaEstado(id, estado);
    res.json({ ok: true, data: row });
  } catch (e) {
    next(e);
  }
}

async function empleadosList(req, res, next) {
  try {
    const data = await gestionService.listEmpleados();
    res.json({ ok: true, data });
  } catch (e) {
    next(e);
  }
}

async function empleadoPatch(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) throw badId('ID de empleado inválido');
    const estado = req.body && req.body.estado != null ? String(req.body.estado).trim() : '';
    const row = await gestionService.updateEmpleadoEstado(id, estado);
    res.json({ ok: true, data: row });
  } catch (e) {
    next(e);
  }
}

async function categoriasList(req, res, next) {
  try {
    const data = await gestionService.listCategorias();
    res.json({ ok: true, data });
  } catch (e) {
    next(e);
  }
}

async function platillosList(req, res, next) {
  try {
    const data = await gestionService.listPlatillos();
    res.json({ ok: true, data });
  } catch (e) {
    next(e);
  }
}

async function platilloCreate(req, res, next) {
  try {
    const data = await gestionService.createPlatillo(req.body || {});
    res.status(201).json({ ok: true, data });
  } catch (e) {
    next(e);
  }
}

async function platilloPatch(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) throw badId('ID de platillo inválido');
    const data = await gestionService.updatePlatillo(id, req.body || {});
    res.json({ ok: true, data });
  } catch (e) {
    next(e);
  }
}

async function clientesList(req, res, next) {
  try {
    const data = await gestionService.listClientes();
    res.json({ ok: true, data });
  } catch (e) {
    next(e);
  }
}

async function ordenesList(req, res, next) {
  try {
    const data = await gestionService.listOrdenes();
    res.json({ ok: true, data });
  } catch (e) {
    next(e);
  }
}

async function ordenGet(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) throw badId('ID de orden inválido');
    const data = await gestionService.getOrdenCompleta(id);
    if (!data) {
      const e = new Error('Orden no encontrada');
      e.status = 404;
      throw e;
    }
    res.json({ ok: true, data });
  } catch (e) {
    next(e);
  }
}

async function ordenCreate(req, res, next) {
  try {
    const data = await gestionService.createOrden(req.body || {});
    res.status(201).json({ ok: true, data });
  } catch (e) {
    next(e);
  }
}

async function ordenEstadoPatch(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) throw badId('ID de orden inválido');
    const estado = req.body && req.body.estado != null ? String(req.body.estado).trim() : '';
    const data = await gestionService.updateOrdenEstado(id, estado);
    res.json({ ok: true, data });
  } catch (e) {
    next(e);
  }
}

async function ordenPagoPost(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) throw badId('ID de orden inválido');
    const metodo = req.body && req.body.metodo_pago != null ? String(req.body.metodo_pago).trim() : '';
    const monto = req.body && req.body.monto != null ? Number(req.body.monto) : NaN;
    const data = await gestionService.registrarPago(id, metodo, monto);
    res.status(201).json({ ok: true, data });
  } catch (e) {
    next(e);
  }
}

module.exports = {
  mesasList,
  mesaPatch,
  empleadosList,
  empleadoPatch,
  categoriasList,
  platillosList,
  platilloCreate,
  platilloPatch,
  clientesList,
  ordenesList,
  ordenGet,
  ordenCreate,
  ordenEstadoPatch,
  ordenPagoPost,
};

