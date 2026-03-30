const cron = require('node-cron');
const path = require('path');
const ScraperConfig = require('../models/ScraperConfig');
const {executeUpload} = require('../resume/upload');

let currentCronJob = null;

/**
 * Parse HH:mm time string into cron expression (runs daily at that time).
 * @param {string} time - Time in HH:mm format (24hr)
 * @returns {string} - Cron expression
 */
function timeToCron(time) {
    const [hours, minutes] = time.split(':').map(Number);
    // node-cron: minute hour * * *
    return `${minutes} ${hours} * * *`;
}

/**
 * Schedule the resume upload cron job.
 * @param {string} time - Time in HH:mm format
 */
function schedule(time) {
    // Stop existing cron job if any
    if (currentCronJob) {
        currentCronJob.stop();
        currentCronJob = null;
    }

    const cronExpr = timeToCron(time);
    console.log(`⏰ Resume upload scheduler set to run daily at ${time} (cron: ${cronExpr})`);

    currentCronJob = cron.schedule(cronExpr, executeUpload, {
        timezone: 'Asia/Kolkata'
    });
}

/**
 * Reschedule the cron job with a new time.
 * Called from the config controller when scheduler time is updated.
 * @param {string} newTime - Time in HH:mm format
 */
function reschedule(newTime) {
    console.log(`🔄 Rescheduling resume upload to ${newTime}`);
    schedule(newTime);
}

/**
 * Initialize the scheduler on server startup.
 * Reads the schedule time from ScraperConfig.
 */
async function initScheduler() {
    try {
        const config = await ScraperConfig.getConfig();
        const time = config.resumeScheduleTime || '09:00';
        schedule(time);
    } catch (error) {
        console.error('❌ Error initializing resume scheduler:', error.message);
        // Fallback: schedule at default time
        schedule('09:00');
    }
}

module.exports = {
    initScheduler,
    reschedule,
    executeUpload,
};
