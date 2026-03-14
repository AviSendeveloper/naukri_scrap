const Job = require('../models/Job');

/**
 * GET /api/jobs
 * List all jobs with pagination, search, and sorting.
 *
 * Query params:
 *   page    - Page number (default: 1)
 *   limit   - Items per page (default: 20, max: 100)
 *   keyword - Filter by searchKeyword field (exact match, case-insensitive)
 *   search  - Search on title (like SQL LIKE %search%)
 */
async function getJobs(req, res) {
    try {
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
        const keyword = req.query.keyword?.trim();
        const search = req.query.search?.trim();

        // Build filter
        let filter = {};
        const conditions = [];

        if (keyword) {
            conditions.push({ searchKeyword: new RegExp(`^${keyword}$`, 'i') });
        }

        if (search) {
            conditions.push({ title: new RegExp(search, 'i') });
        }

        if (conditions.length > 0) {
            filter = conditions.length === 1 ? conditions[0] : { $and: conditions };
        }

        const skip = (page - 1) * limit;

        // Run query and count in parallel
        const [jobs, totalJobs] = await Promise.all([
            Job.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Job.countDocuments(filter)
        ]);

        const totalPages = Math.ceil(totalJobs / limit);

        return res.json({
            success: true,
            data: jobs,
            pagination: {
                page,
                limit,
                totalJobs,
                totalPages,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1
            }
        });
    } catch (error) {
        console.error('Error fetching jobs:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
}

/**
 * GET /api/jobs/:id
 * Get a single job by its MongoDB _id.
 */
async function getJobById(req, res) {
    try {
        const job = await Job.findById(req.params.id).lean();

        if (!job) {
            return res.status(404).json({
                success: false,
                message: 'Job not found'
            });
        }

        return res.json({
            success: true,
            data: job
        });
    } catch (error) {
        // Handle invalid ObjectId format
        if (error.kind === 'ObjectId') {
            return res.status(400).json({
                success: false,
                message: 'Invalid job ID format'
            });
        }

        console.error('Error fetching job:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
}

/**
 * GET /api/jobs/keywords
 * Get all unique search keywords for the filter dropdown.
 */
async function getKeywords(req, res) {
    try {
        const keywords = await Job.distinct('searchKeyword');
        return res.json({
            success: true,
            data: keywords.sort()
        });
    } catch (error) {
        console.error('Error fetching keywords:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
}

module.exports = { getJobs, getJobById, getKeywords };
