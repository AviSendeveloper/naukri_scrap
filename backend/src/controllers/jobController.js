const jobService = require('../services/jobService');

/**
 * GET /api/jobs
 * List all jobs with pagination, search, sorting, and match-percentage filters.
 */
async function getJobs(req, res) {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 20;
        const keyword = req.query.keyword?.trim() || '';
        const search = req.query.search?.trim() || '';
        const minAiMatch = req.query.minAiMatch ? parseInt(req.query.minAiMatch, 10) : null;
        const minManualMatch = req.query.minManualMatch ? parseInt(req.query.minManualMatch, 10) : null;
        const sortBy = req.query.sortBy?.trim() || '';
        const sortOrder = req.query.sortOrder?.trim() || 'desc';

        const { jobs, pagination } = await jobService.getJobs({
            page, limit, keyword, search,
            minAiMatch, minManualMatch,
            sortBy, sortOrder
        });

        return res.json({ success: true, data: jobs, pagination });
    } catch (error) {
        console.error('Error fetching jobs:', error.message);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
}

/**
 * GET /api/jobs/:id
 * Get a single job by its MongoDB _id.
 */
async function getJobById(req, res) {
    try {
        const job = await jobService.getJobById(req.params.id);

        if (!job) {
            return res.status(404).json({ success: false, message: 'Job not found' });
        }

        return res.json({ success: true, data: job });
    } catch (error) {
        if (error.kind === 'ObjectId') {
            return res.status(400).json({ success: false, message: 'Invalid job ID format' });
        }
        console.error('Error fetching job:', error.message);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
}

/**
 * GET /api/jobs/keywords
 * Get all unique search keywords for the filter dropdown.
 */
async function getKeywords(req, res) {
    try {
        const keywords = await jobService.getKeywords();
        return res.json({ success: true, data: keywords });
    } catch (error) {
        console.error('Error fetching keywords:', error.message);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
}

module.exports = { getJobs, getJobById, getKeywords };
