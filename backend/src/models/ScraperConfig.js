const mongoose = require('mongoose');

const scraperConfigSchema = new mongoose.Schema({
    // Singleton identifier — only one config document
    configId: {
        type: String,
        default: 'default',
        unique: true,
        immutable: true,
    },

    // Search keywords used for scraping
    keywords: {
        type: [String],
        default: [],
    },

    // Skills to match against job listings
    skills: {
        type: [String],
        default: [],
    },

    // Experience range filter
    experience: {
        min: { type: Number, default: 0 },
        max: { type: Number, default: 5 },
    },

    // Scraping behavior parameters
    scraping: {
        pagesPerKeyword: { type: Number, default: 3, min: 1, max: 20 },
        delayBetweenKeywords: { type: Number, default: 5000, min: 1000, max: 30000 },
        scrapeJobDetails: { type: Boolean, default: true },
    },

    // Resume scheduler time (HH:mm format, 24hr)
    resumeScheduleTime: {
        type: String,
        default: '09:00',
        trim: true,
    },

    // Total years of experience (for Naukri search query)
    totalExperience: {
        type: Number,
        default: 0,
        min: 0,
        max: 50,
    },

    // Preferred job locations
    preferredLocations: {
        type: [String],
        default: [],
    },

    // Skip jobs older than this many days
    thresholdDays: {
        type: Number,
        default: 30,
        min: 1,
        max: 365,
    },

    // AI provider settings
    ai_provider: {
        type: String,
        default: 'ollama',
        enum: ['ollama', 'openai', 'anthropic'],
    },
    ai_model: {
        type: String,
        default: 'qwen2.5:7b',
        trim: true,
    },
    ai_api_key: {
        type: String,
        default: null,
        trim: true,
    },
}, {
    timestamps: true,
});


/**
 * Get the singleton config document, creating it with defaults if absent.
 * @returns {Promise<Object>}
 */
scraperConfigSchema.statics.getConfig = async function () {
    let config = await this.findOne({ configId: 'default' }).lean();
    if (!config) {
        config = await this.create({ configId: 'default' });
        config = config.toObject();
    }
    return config;
};

/**
 * Upsert the singleton config document.
 * @param {Object} data - Fields to update
 * @returns {Promise<Object>}
 */
scraperConfigSchema.statics.upsertConfig = async function (data) {
    const update = {};
    if (data.keywords !== undefined) update.keywords = data.keywords;
    if (data.skills !== undefined) update.skills = data.skills;
    if (data.experience !== undefined) update.experience = data.experience;
    if (data.scraping !== undefined) update.scraping = data.scraping;
    if (data.resumeScheduleTime !== undefined) update.resumeScheduleTime = data.resumeScheduleTime;
    if (data.totalExperience !== undefined) update.totalExperience = data.totalExperience;
    if (data.preferredLocations !== undefined) update.preferredLocations = data.preferredLocations;
    if (data.thresholdDays !== undefined) update.thresholdDays = data.thresholdDays;
    if (data.ai_provider !== undefined) update.ai_provider = data.ai_provider;
    if (data.ai_model !== undefined) update.ai_model = data.ai_model;
    if (data.ai_api_key !== undefined) update.ai_api_key = data.ai_api_key;

    const config = await this.findOneAndUpdate(
        { configId: 'default' },
        { $set: update },
        { new: true, upsert: true, lean: true }
    );
    return config;
};

const ScraperConfig = mongoose.model('ScraperConfig', scraperConfigSchema);

module.exports = ScraperConfig;
