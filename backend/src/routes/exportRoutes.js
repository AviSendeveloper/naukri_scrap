const express = require('express');
const router = express.Router();
const { exportJobs } = require('../controllers/exportController');

// POST /api/export — Export jobs as xlsx (download + email)
router.post('/', exportJobs);

module.exports = router;
