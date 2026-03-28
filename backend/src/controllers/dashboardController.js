const jobService = require('../services/jobService');

/**
 * GET /api/dashboard
 * Returns all dashboard data: stats, recent jobs, charts.
 */
async function getDashboard(req, res) {
    try {
        const data = await jobService.getDashboardData();
        return res.json({ success: true, data });
    } catch (error) {
        console.error('Error fetching dashboard data:', error.message);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
}

module.exports = { getDashboard };
