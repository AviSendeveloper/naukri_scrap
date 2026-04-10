const { getRedisConnection, REDIS_KEYS } = require('../config/redis');

/**
 * GET /api/scraper-stats
 * Returns all live scraper counters from Redis.
 */
async function getStats(req, res) {
    try {
        const redis = getRedisConnection();

        const [jobsDispatched, jobsProcessed, searchStats] = await Promise.all([
            redis.get(REDIS_KEYS.JOBS_DISPATCHED),
            redis.get(REDIS_KEYS.JOBS_PROCESSED),
            redis.hgetall(REDIS_KEYS.SEARCH_STATS),
        ]);

        return res.json({
            success: true,
            data: {
                jobsDispatched: parseInt(jobsDispatched) || 0,
                jobsProcessed: parseInt(jobsProcessed) || 0,
                totalSearchResults: parseInt(searchStats?.totalSearchResults) || 0,
                totalPages: parseInt(searchStats?.totalPages) || 0,
                currentPage: parseInt(searchStats?.currentPage) || 0,
                totalSkipped: parseInt(searchStats?.totalSkipped) || 0,
            },
        });
    } catch (error) {
        console.error('Error fetching scraper stats:', error.message);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
}

/**
 * POST /api/scraper-stats/reset
 * Resets all scraper counters to 0.
 */
async function resetStats(req, res) {
    try {
        const redis = getRedisConnection();

        await Promise.all([
            redis.set(REDIS_KEYS.JOBS_DISPATCHED, 0),
            redis.set(REDIS_KEYS.JOBS_PROCESSED, 0),
            redis.del(REDIS_KEYS.SEARCH_STATS),
        ]);

        return res.json({ success: true, message: 'Stats reset' });
    } catch (error) {
        console.error('Error resetting scraper stats:', error.message);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
}

module.exports = { getStats, resetStats };
