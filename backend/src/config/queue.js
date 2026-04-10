const { Queue } = require('bullmq');
const { getRedisConnection } = require('./redis');

// Queue name constant
const JOB_QUEUE_NAME = 'naukri-job-scraping';

/**
 * Create and return the BullMQ Queue instance for dispatching jobs.
 * Uses the shared Redis connection from redis.js.
 * @param {IORedis} [connection] – optional override connection
 * @returns {Queue}
 */
function createJobQueue(connection) {
    const conn = connection || getRedisConnection();
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
    createJobQueue,
    JOB_QUEUE_NAME,
};
