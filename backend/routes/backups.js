const express = require('express');
const c = require('../controllers/backupController');

const router = express.Router();

router.get('/', c.list);
router.post('/sync-catalog', c.syncCatalog);
router.post('/create', c.create);
router.get('/:id/download', c.download);
router.post('/restore/:id', c.restore);

module.exports = router;
