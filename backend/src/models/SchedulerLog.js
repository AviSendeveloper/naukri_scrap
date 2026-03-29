const mongoose = require('mongoose');

const schedulerLogSchema = new mongoose.Schema({
    schedulerRunAt: {
        type: Date,
        required: true,
        default: Date.now
    },
    resumeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Resume'
    },
    resumeName: {
        type: String,
        trim: true,
        default: ''
    },
    filePath: {
        type: String,
        trim: true,
        default: ''
    },
    status: {
        type: String,
        enum: ['success', 'failed'],
        required: true
    },
    errorMessage: {
        type: String,
        trim: true,
        default: null
    },
    completedAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

// Index for listing logs in reverse chronological order
schedulerLogSchema.index({ schedulerRunAt: -1 });

const SchedulerLog = mongoose.model('SchedulerLog', schedulerLogSchema);

module.exports = SchedulerLog;
