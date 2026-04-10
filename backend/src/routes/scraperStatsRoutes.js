const express = require('express');
const router = express.Router();
const { getStats, resetStats } = require('../controllers/scraperStatsController');

// GET /api/scraper-stats
router.get('/', getStats);

// POST /api/scraper-stats/reset
router.post('/reset', resetStats);

module.exports = router;
