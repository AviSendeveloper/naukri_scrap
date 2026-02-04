const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
    // Job basic info
    title: {
        type: String,
        required: true,
        trim: true
    },
    company: {
        type: String,
        required: true,
        trim: true
    },
    location: {
        type: String,
        trim: true,
        default: 'Not specified'
    },

    // Job requirements
    experience: {
        type: String,
        trim: true,
        default: 'Not specified'
    },
    salary: {
        type: String,
        trim: true,
        default: 'Not disclosed'
    },
    skills: {
        type: [String],
        default: []
    },

    // Job details
    description: {
        type: String,
        trim: true,
        default: ''
    },
    jobUrl: {
        type: String,
        required: true,
        unique: true
    },
    postedDate: {
        type: String,
        trim: true,
        default: 'Not specified'
    },

    // Scraping metadata
    searchKeyword: {
        type: String,
        required: true,
        trim: true
    },
    scrapedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Create indexes for better query performance
jobSchema.index({ searchKeyword: 1 });
jobSchema.index({ company: 1 });
jobSchema.index({ scrapedAt: -1 });

// Text index for full-text search
jobSchema.index({
    title: 'text',
    description: 'text',
    skills: 'text'
});

// Static method to find jobs by keyword
jobSchema.statics.findByKeyword = function (keyword) {
    return this.find({
        searchKeyword: new RegExp(keyword, 'i')
    }).sort({ scrapedAt: -1 });
};

// Static method to get job statistics
jobSchema.statics.getStats = async function () {
    const totalJobs = await this.countDocuments();
    const uniqueCompanies = await this.distinct('company');
    const keywords = await this.distinct('searchKeyword');

    return {
        totalJobs,
        uniqueCompanies: uniqueCompanies.length,
        keywordsSearched: keywords
    };
};

const Job = mongoose.model('Job', jobSchema);

module.exports = Job;
