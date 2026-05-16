function notFoundHandler(req, res) {
  res.status(404).json({ ok: false, error: 'Ruta no encontrada' });
}

function errorHandler(err, req, res, next) {
  const status = err?.status || 500;
  const message = err?.message || 'Error interno';
  // No exponemos stack en producción para no filtrar info
  res.status(status).json({ ok: false, error: message });
}

module.exports = { notFoundHandler, errorHandler };

