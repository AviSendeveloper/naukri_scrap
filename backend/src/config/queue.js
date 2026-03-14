const { Queue } = require('bullmq');
const IORedis = require('ioredis');

// Redis connection – reads REDIS_URL from env, defaults to localhost
const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

/**
 * Create a shared IORedis connection instance.
 * BullMQ requires an ioredis-compatible connection.
 */
function createRedisConnection() {
    const connection = new IORedis(REDIS_URL, {
        maxRetriesPerRequest: null, // required by BullMQ
    });

    connection.on('connect', () => {
        console.log('✅ Redis connected');
    });

    connection.on('error', (err) => {
        console.error('❌ Redis connection error:', err.message);
    });

    return connection;
}

// Queue name constant
const JOB_QUEUE_NAME = 'naukri-job-scraping';

/**
 * Create and return the BullMQ Queue instance for dispatching jobs.
 * @param {IORedis} [connection] – optional existing connection
 * @returns {Queue}
 */
function createJobQueue(connection) {
    const conn = connection || createRedisConnection();
    return new Queue(JOB_QUEUE_NAME, {
        connection: conn,
        defaultJobOptions: {
            attempts: 3,
            backoff: {
                type: 'exponential',
                delay: 5000,
            },
            removeOnComplete: true,
            removeOnFail: false,
        },
    });
}

module.exports = {
    createRedisConnection,
    createJobQueue,
    JOB_QUEUE_NAME,
};
