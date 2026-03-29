const mongoose = require('mongoose');

const resumeScheduleSchema = new mongoose.Schema({
    resumeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Resume',
        required: true
    },
    originalName: {
        type: String,
        required: true,
        trim: true
    },
    filePath: {
        type: String,
        required: true,
        trim: true
    },
    selectedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

const ResumeSchedule = mongoose.model('ResumeSchedule', resumeScheduleSchema);

module.exports = ResumeSchedule;
