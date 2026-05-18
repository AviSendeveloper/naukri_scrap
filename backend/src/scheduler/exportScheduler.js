const cron = require('node-cron');
const { exportDailyScheduledReport } = require('../services/exportService');

let currentCronJob = null;

/**
 * Schedule the daily export cron job.
 * Runs every day at 08:00 AM IST.
 */
function schedule() {
    if (currentCronJob) {
        currentCronJob.stop();
        currentCronJob = null;
    }

    // 0 8 * * * = every day at 8:00 AM
    const cronExpr = '0 8 * * *';
    console.log(`📊 Export scheduler set to run daily at 08:00 AM IST (cron: ${cronExpr})`);

    currentCronJob = cron.schedule(cronExpr, exportDailyScheduledReport, {
        timezone: 'Asia/Kolkata',
    });
}

/**
 * Initialize the export scheduler on server startup.
 */
async function initExportScheduler() {
    try {
        schedule();
    } catch (error) {
        console.error('❌ Error initializing export scheduler:', error.message);
    }
}

module.exports = {
    initExportScheduler,
};
