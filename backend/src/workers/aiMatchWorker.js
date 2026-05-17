const { Worker } = require('bullmq');
const chalk = require('chalk');
const { getRedisConnection } = require('../config/redis');
const { AI_MATCH_QUEUE_NAME } = require('../queues/aiMatchQueue');
const { createAIProvider } = require('../ai/AIProviderFactory');
const { decrypt } = require('../utils/encryption');
const Job = require('../models/Job');
const ScraperConfig = require('../models/ScraperConfig');

// p-limit for concurrency control — max 2 concurrent AI calls
let pLimit;

/**
 * Dynamically import p-limit (ESM-only package) and cache it.
 * @returns {Promise<Function>}
 */
async function getPLimit() {
    if (!pLimit) {
        const mod = await import('p-limit');
        pLimit = mod.default;
    }
    return pLimit;
}

/**
 * Process a single AI match job from Queue 2.
 *
 * @param {import('bullmq').Job} queueJob – BullMQ job with data { jobId, configId }
 * @param {Function} limit – p-limit limiter function
 */
async function processAIMatch(queueJob, limit) {
    const { jobId, configId } = queueJob.data;

    try {
        // 1. Fetch job document from DB
        const jobDoc = await Job.findById(jobId);
        if (!jobDoc) {
            console.log(chalk.yellow(`  ⚠️  AI match: Job ${jobId} not found in DB, skipping`));
            return;
        }

        // Skip if already processed
        if (jobDoc.aiMatchStatus === 'done') {
            console.log(chalk.gray(`  ⏭️  AI match: Job ${jobId} already processed, skipping`));
            return;
        }

        // 2. Fetch config (skills + AI settings)
        const config = await ScraperConfig.getConfig();
        const userSkills = config.skills || [];

        if (userSkills.length === 0) {
            console.log(chalk.yellow(`  ⚠️  AI match: No user skills configured, skipping ${jobId}`));
            await Job.findByIdAndUpdate(jobId, {
                aiMatchStatus: 'failed',
                aiReasoning: 'No user skills configured',
            });
            return;
        }

        // 3. Build AI settings from config
        const aiSettings = {
            ai_provider: config.ai_provider || 'ollama',
            ai_model: config.ai_model || undefined,
            ai_api_key: config.ai_api_key ? decrypt(config.ai_api_key) : undefined,
        };

        // 4. Create provider via factory
        const ai = createAIProvider(aiSettings);

        // 5. Run AI inference with concurrency control
        const jobKeySkills = jobDoc.keySkills || [];
        const jobDescription = jobDoc.fullDescription || jobDoc.description || '';

        console.log(chalk.blue(`  🤖 AI match: Processing ${jobDoc.title} (${jobId})`));

        const result = await limit(() =>
            ai.calculateMatch(userSkills, jobKeySkills, jobDescription)
        );

        // 6. Update DB document
        await Job.findByIdAndUpdate(jobId, {
            aiMatchPercentage: result.matchPercentage,
            aiReasoning: result.reasoning,
            aiMatchStatus: 'done',
        });

        console.log(
            chalk.green(`  ✅ AI match: ${jobDoc.title} → ${result.matchPercentage}% (${result.reasoning})`)
        );

    } catch (error) {
        console.error(
            chalk.red(`  ❌ AI match failed for ${jobId}: ${error.message}`)
        );

        // Update document with failed status (do NOT re-throw so queue handles retry)
        try {
            await Job.findByIdAndUpdate(jobId, {
                aiMatchStatus: 'failed',
                aiReasoning: error.message.slice(0, 200),
            });
        } catch (updateErr) {
            console.error(
                chalk.red(`  ⚠️  Could not update aiMatchStatus for ${jobId}: ${updateErr.message}`)
            );
        }

        // Throw to let BullMQ retry
        throw error;
    }
}

/**
 * Start the AI match worker.
 * Called from the existing worker index.js alongside the scraping worker.
 *
 * @returns {Worker} the BullMQ worker instance
 */
async function startAIMatchWorker() {
    const connection = getRedisConnection();

    // Dynamically import p-limit (ESM module)
    const createLimit = await getPLimit();
    const limit = createLimit(2); // max 2 concurrent Ollama calls

    const worker = new Worker(
        AI_MATCH_QUEUE_NAME,
        async (job) => {
            return await processAIMatch(job, limit);
        },
        {
            connection,
            concurrency: 4, // pull up to 4 jobs, but p-limit caps actual AI calls to 2
        }
    );

    worker.on('completed', (job) => {
        console.log(chalk.green(`  ✅ AI match job ${job.id} completed`));
    });

    worker.on('failed', (job, err) => {
        console.log(
            chalk.red(`  ❌ AI match job ${job?.id} failed (attempt ${job?.attemptsMade}): ${err.message}`)
        );
    });

    worker.on('error', (err) => {
        console.error(chalk.red(`AI match worker error: ${err.message}`));
    });

    worker.on('ready', () => {
        console.log(
            chalk.green(`🟢 AI match worker ready, listening on queue "${AI_MATCH_QUEUE_NAME}"`)
        );
    });

    console.log(
        chalk.blue(`⏳ AI match worker started, listening on "${AI_MATCH_QUEUE_NAME}"...`)
    );

    return worker;
}

module.exports = { startAIMatchWorker };
