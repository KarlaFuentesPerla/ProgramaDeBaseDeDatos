const express = require('express');
const c = require('../controllers/configController');

const router = express.Router();

router.get('/', c.get);

module.exports = router;
