const express = require('express');
const router = express.Router();
const { getConfig, updateConfig } = require('../controllers/configController');

// GET /api/config
router.get('/', getConfig);

// PUT /api/config
router.put('/', updateConfig);

module.exports = router;
