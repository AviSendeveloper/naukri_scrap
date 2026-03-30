const ResumeSchedule = require('../models/ResumeSchedule');
const SchedulerLog = require('../models/SchedulerLog');
const NaukriScraper = require('../scraper/naukriScraper');

/**
 * Execute the resume upload task.
 * Logs into Naukri and uploads the selected resume.
 */
async function executeUpload() {
    console.log('\n📅 Resume scheduler triggered at', new Date().toISOString());

    const logEntry = {
        schedulerRunAt: new Date(),
        status: 'failed', // default, will update on success
    };

    try {
        // Fetch the selected resume from schedule
        const schedule = await ResumeSchedule.findOne().lean();

        if (!schedule) {
            console.log('⚠️ No resume selected for upload, skipping scheduler run.');
            return; // Don't log if nothing is scheduled
        }

        logEntry.resumeId = schedule.resumeId;
        logEntry.resumeName = schedule.originalName;
        logEntry.filePath = schedule.filePath;

        // Verify the file still exists
        const fs = require('fs');
        if (!fs.existsSync(schedule.filePath)) {
            throw new Error(`Resume file not found at path: ${schedule.filePath}`);
        }

        // Get Naukri credentials from environment
        const email = process.env.NAUKRI_EMAIL;
        const password = process.env.NAUKRI_PASSWORD;

        if (!email || !password) {
            throw new Error('NAUKRI_EMAIL or NAUKRI_PASSWORD not set in environment variables');
        }

        // Initialize scraper and login
        const scraper = new NaukriScraper();
        await scraper.initBrowser();

        try {
            const loginSuccess = await scraper.login(email, password);
            if (!loginSuccess) {
                throw new Error('Failed to login to Naukri.com');
            }

            // Upload the resume
            const uploadResult = await scraper.uploadResume(schedule.filePath);

            if (uploadResult.success) {
                logEntry.status = 'success';
                console.log('✅ Resume uploaded successfully to Naukri.com!');
            } else {
                throw new Error(uploadResult.error || 'Resume upload failed');
            }
        } finally {
            await scraper.closeBrowser();
        }

    } catch (error) {
        logEntry.status = 'failed';
        logEntry.errorMessage = error.message;
        console.error('❌ Scheduler error:', error.message);
    } finally {
        logEntry.completedAt = new Date();

        // Save the log entry
        try {
            await SchedulerLog.create(logEntry);
            console.log(`📝 Scheduler log saved: ${logEntry.status}`);
        } catch (logError) {
            console.error('❌ Error saving scheduler log:', logError.message);
        }
    }
}

module.exports = {
    executeUpload
}