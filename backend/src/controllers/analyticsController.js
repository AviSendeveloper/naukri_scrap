const jobService = require('../services/jobService');

/**
 * GET /api/analytics
 * Returns full analytics data for all charts.
 */
async function getAnalytics(req, res) {
    try {
        const data = await jobService.getAnalyticsData();
        return res.json({ success: true, data });
    } catch (error) {
        console.error('Error fetching analytics data:', error.message);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
}

module.exports = { getAnalytics };
