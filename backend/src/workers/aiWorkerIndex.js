#!/usr/bin/env node

/**
 * Standalone entry point for the AI Match Worker (Queue 2).
 * Designed to run in its own Docker container, separate from the
 * scraping worker. Connects to MongoDB and Redis, then starts the
 * BullMQ worker that consumes ai-match jobs.
 */

require('dotenv').config({ quiet: true });

const chalk = require('chalk');
const { connectDB, closeDB } = require('../config/database');
const { getRedisConnection } = require('../config/redis');
const { startAIMatchWorker } = require('./aiMatchWorker');

async function main() {
    console.log(chalk.magenta.bold('\n╔════════════════════════════════════════╗'));
    console.log(chalk.magenta.bold('║') + chalk.yellow.bold('   🤖 Naukri AI Match Queue Worker     ') + chalk.magenta.bold('║'));
    console.log(chalk.magenta.bold('╚════════════════════════════════════════╝\n'));

    // 1. Connect to MongoDB
    await connectDB();

    // 2. Ensure Redis connection is ready
    getRedisConnection();

    // 3. Start AI match worker
    const aiWorker = await startAIMatchWorker();

    // ── Graceful shutdown ──────────────────────────────────────────────────
    const shutdown = async (signal) => {
        console.log(chalk.yellow(`\n🛑 Received ${signal}, shutting down AI worker gracefully...`));
        await aiWorker.close();
        await closeDB();
        getRedisConnection().disconnect();
        console.log(chalk.green('✅ AI match worker shut down cleanly'));
        process.exit(0);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((err) => {
    console.error(chalk.red(`Fatal error starting AI match worker: ${err.message}`));
    process.exit(1);
});
