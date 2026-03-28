const fs = require('fs');
const path = require('path');
const ScraperConfig = require('../models/ScraperConfig');

const CONFIG_PATH = path.join(__dirname, '..', '..', 'config.json');

/**
 * Load config.json as a fallback.
 * @returns {Object}
 */
function loadFileConfig() {
    try {
        if (fs.existsSync(CONFIG_PATH)) {
            const data = fs.readFileSync(CONFIG_PATH, 'utf8');
            return JSON.parse(data);
        }
    } catch (err) {
        console.error('Error reading config.json:', err.message);
    }
    return {
        keywords: [],
        skills: [],
        experience: { min: 0, max: 5 },
        scraping: { pagesPerKeyword: 3, delayBetweenKeywords: 5000, scrapeJobDetails: true },
    };
}

/**
 * Get the scraper configuration.
 * Tries DB first, falls back to config.json.
 * @returns {Promise<Object>} - { keywords, skills, experience, scraping }
 */
async function getConfig() {
    try {
        const dbConfig = await ScraperConfig.getConfig();
        // If the DB config has keywords, treat it as the source of truth
        if (dbConfig && dbConfig.keywords && dbConfig.keywords.length > 0) {
            return {
                keywords: dbConfig.keywords,
                skills: dbConfig.skills || [],
                experience: dbConfig.experience || { min: 0, max: 5 },
                scraping: dbConfig.scraping || { pagesPerKeyword: 3, delayBetweenKeywords: 5000, scrapeJobDetails: true },
            };
        }
    } catch (err) {
        console.error('Error fetching config from DB, using file fallback:', err.message);
    }

    return loadFileConfig();
}

/**
 * Update/upsert the scraper configuration in MongoDB.
 * @param {Object} data - Fields to update
 * @returns {Promise<Object>}
 */
async function updateConfig(data) {
    const updated = await ScraperConfig.upsertConfig(data);
    return {
        keywords: updated.keywords,
        skills: updated.skills,
        experience: updated.experience,
        scraping: updated.scraping,
    };
}

module.exports = {
    getConfig,
    updateConfig,
    loadFileConfig,
};
