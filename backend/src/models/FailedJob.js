const mongoose = require('mongoose');

const failedJobSchema = new mongoose.Schema({
    jobUrl: {
        type: String,
        required: true,
        trim: true,
    },
    searchKeyword: {
        type: String,
        required: true,
        trim: true,
    },
    payload: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
    },
    errorReason: {
        type: String,
        required: true,
        trim: true,
    },
    attempts: {
        type: Number,
        default: 1,
    },
    failedAt: {
        type: Date,
        default: Date.now,
    },
}, {
    timestamps: true,
});

// Index for quick lookups
failedJobSchema.index({ jobUrl: 1 });
failedJobSchema.index({ searchKeyword: 1 });
failedJobSchema.index({ failedAt: -1 });

const FailedJob = mongoose.model('FailedJob', failedJobSchema);

module.exports = FailedJob;
