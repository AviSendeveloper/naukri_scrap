const IORedis = require('ioredis');

// Redis connection URL from environment, with fallback
const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

// ── Singleton IORedis connection ────────────────────────────────────────────
let _connection = null;

/**
 * Get (or create) the shared Redis connection.
 * Every module that needs Redis should import this.
 * @returns {IORedis}
 */
function getRedisConnection() {
    if (!_connection) {
        _connection = new IORedis(REDIS_URL, {
            maxRetriesPerRequest: null, // required by BullMQ
        });

        _connection.on('connect', () => {
            console.log('✅ Redis connected (shared)');
        });

        _connection.on('error', (err) => {
            console.error('❌ Redis connection error:', err.message);
        });
    }
    return _connection;
}

// ── Redis key constants ─────────────────────────────────────────────────────
const REDIS_KEYS = {
    JOBS_DISPATCHED: 'scraper:jobs_dispatched',
    JOBS_PROCESSED: 'scraper:jobs_processed',
    SEARCH_STATS: 'scraper:search_stats',
};

module.exports = {
    getRedisConnection,
    REDIS_KEYS,
};
