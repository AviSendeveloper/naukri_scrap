const express = require('express');
const router = express.Router();
const { getJobs, getJobById, getKeywords } = require('../controllers/jobController');

// GET /api/jobs/keywords - Get unique search keywords (must be before /:id)
router.get('/keywords', getKeywords);

// GET /api/jobs - List all jobs (paginated, searchable)
router.get('/', getJobs);

// GET /api/jobs/:id - Get job details by ID
router.get('/:id', getJobById);

module.exports = router;
