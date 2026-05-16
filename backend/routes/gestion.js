const express = require('express');
const c = require('../controllers/gestionController');

const router = express.Router();

router.get('/categorias', c.categoriasList);
router.get('/platillos', c.platillosList);
router.get('/clientes', c.clientesList);

router.get('/mesas', c.mesasList);
router.patch('/mesas/:id', c.mesaPatch);
router.get('/empleados', c.empleadosList);
router.patch('/empleados/:id', c.empleadoPatch);

router.get('/ordenes', c.ordenesList);
router.post('/ordenes', c.ordenCreate);
router.get('/ordenes/:id', c.ordenGet);
router.patch('/ordenes/:id/estado', c.ordenEstadoPatch);
router.post('/ordenes/:id/pagos', c.ordenPagoPost);

module.exports = router;

