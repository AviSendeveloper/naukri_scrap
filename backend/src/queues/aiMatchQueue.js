const { Queue } = require('bullmq');
const { getRedisConnection } = require('../config/redis');

// Queue name for AI match processing
const AI_MATCH_QUEUE_NAME = 'naukri-ai-match';

/**
 * Create and return the BullMQ Queue instance for AI match jobs.
 * Uses the same shared Redis connection as the existing scraping queue.
 *
 * @param {IORedis} [connection] – optional override connection
 * @returns {Queue}
 */
function createAIMatchQueue(connection) {
    const conn = connection || getRedisConnection();
    return new Queue(AI_MATCH_QUEUE_NAME, {
        connection: conn,
        defaultJobOptions: {
            attempts: 3,
            backoff: {
                type: 'exponential',
                delay: 10000, // 10s initial backoff (AI inference is heavier)
            },
            removeOnComplete: true,
            removeOnFail: false,
        },
    });
}

// Singleton queue instance (lazy-initialised)
let _aiMatchQueue = null;

/**
 * Get (or create) the singleton AI match queue.
 * @returns {Queue}
 */
function getAIMatchQueue() {
    if (!_aiMatchQueue) {
        _aiMatchQueue = createAIMatchQueue();
    }
    return _aiMatchQueue;
}

/**
 * Dispatch a job to Queue 2 for AI-based match scoring.
 * Called by the existing Queue 1 worker after writing the job document to DB.
 *
 * @param {string} jobId  – MongoDB document ID of the saved job
 * @param {string} configId – config document ID (for fetching skills + AI settings)
 */
async function dispatchAIMatchJob(jobId, configId = 'default') {
    const queue = getAIMatchQueue();
    await queue.add('ai-match', { jobId, configId }, {
        jobId: `ai-match-${jobId}`, // deterministic ID to prevent duplicates
    });
    console.log(`  📤 Dispatched AI match job for: ${jobId}`);
}

module.exports = {
    createAIMatchQueue,
    getAIMatchQueue,
    dispatchAIMatchJob,
    AI_MATCH_QUEUE_NAME,
};
