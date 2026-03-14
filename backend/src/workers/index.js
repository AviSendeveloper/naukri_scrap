#!/usr/bin/env node

require('dotenv').config({ quiet: true });

const chalk = require('chalk');
const { Worker } = require('bullmq');
const { createRedisConnection, JOB_QUEUE_NAME } = require('../config/queue');
const { connectDB, closeDB } = require('../config/database');
const { processJob, closeSharedBrowser } = require('./jobProcessor');

/**
 * Boot the BullMQ worker process.
 */
async function startWorker() {
    console.log(chalk.cyan.bold('\n╔════════════════════════════════════════╗'));
    console.log(chalk.cyan.bold('║') + chalk.yellow.bold('     ⚙️  Naukri Job Queue Worker        ') + chalk.cyan.bold('║'));
    console.log(chalk.cyan.bold('╚════════════════════════════════════════╝\n'));

    // 1. Connect to MongoDB
    await connectDB();

    // 2. Create Redis connection for the worker
    const connection = createRedisConnection();

    // 3. Create BullMQ Worker
    const worker = new Worker(
        JOB_QUEUE_NAME,
        async (job) => {
            return await processJob(job);
        },
        {
            connection,
            concurrency: 2, // process 2 jobs at a time
            limiter: {
                max: 5,
                duration: 60000, // max 5 jobs per minute to avoid rate limiting
            },
        }
    );

    // ── Worker event handlers ──────────────────────────────────────────────
    worker.on('completed', (job, result) => {
        console.log(chalk.green(`  ✅ Job ${job.id} completed – match: ${result?.matchPercentage ?? '-'}%`));
    });

    worker.on('failed', (job, err) => {
        console.log(chalk.red(`  ❌ Job ${job?.id} failed (attempt ${job?.attemptsMade}): ${err.message}`));
    });

    worker.on('error', (err) => {
        console.error(chalk.red(`Worker error: ${err.message}`));
    });

    worker.on('ready', () => {
        console.log(chalk.green(`🟢 Worker is ready and listening on queue "${JOB_QUEUE_NAME}"`));
    });

    console.log(chalk.blue(`⏳ Worker started, listening for jobs on "${JOB_QUEUE_NAME}"...\n`));

    // ── Graceful shutdown ──────────────────────────────────────────────────
    const shutdown = async (signal) => {
        console.log(chalk.yellow(`\n🛑 Received ${signal}, shutting down gracefully...`));
        await worker.close();
        await closeSharedBrowser();
        await closeDB();
        connection.disconnect();
        console.log(chalk.green('✅ Worker shut down cleanly'));
        process.exit(0);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
}

startWorker().catch((err) => {
    console.error(chalk.red(`Fatal error starting worker: ${err.message}`));
    process.exit(1);
});
