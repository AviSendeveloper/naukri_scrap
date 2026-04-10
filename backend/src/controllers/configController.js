const configService = require('../services/configService');

/**
 * GET /api/config
 * Returns the current scraper configuration.
 */
async function getConfig(req, res) {
    try {
        const config = await configService.getConfig();
        return res.json({ success: true, data: config });
    } catch (error) {
        console.error('Error fetching config:', error.message);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
}

/**
 * PUT /api/config
 * Update the scraper configuration.
 */
async function updateConfig(req, res) {
    try {
        const {
            keywords, skills, experience, scraping,
            resumeScheduleTime, totalExperience, preferredLocations, thresholdDays
        } = req.body;

        // Basic validation
        if (keywords !== undefined && !Array.isArray(keywords)) {
            return res.status(400).json({ success: false, message: 'keywords must be an array' });
        }
        if (skills !== undefined && !Array.isArray(skills)) {
            return res.status(400).json({ success: false, message: 'skills must be an array' });
        }
        if (preferredLocations !== undefined && !Array.isArray(preferredLocations)) {
            return res.status(400).json({ success: false, message: 'preferredLocations must be an array' });
        }

        const updated = await configService.updateConfig({
            keywords, skills, experience, scraping,
            resumeScheduleTime, totalExperience, preferredLocations, thresholdDays
        });

        // If scheduler time changed, reschedule the cron job
        if (resumeScheduleTime !== undefined) {
            try {
                const { reschedule } = require('../scheduler/resumeScheduler');
                reschedule(resumeScheduleTime);
            } catch (err) {
                console.error('Error rescheduling resume upload:', err.message);
            }
        }

        return res.json({ success: true, data: updated });
    } catch (error) {
        console.error('Error updating config:', error.message);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
}

module.exports = { getConfig, updateConfig };
