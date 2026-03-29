const mongoose = require('mongoose');

const resumeSchema = new mongoose.Schema({
    originalName: {
        type: String,
        required: true,
        trim: true
    },
    fileName: {
        type: String,
        required: true,
        trim: true
    },
    filePath: {
        type: String,
        required: true,
        trim: true
    },
    mimeType: {
        type: String,
        required: true,
        enum: [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/rtf',
            'text/rtf'
        ]
    },
    fileSize: {
        type: Number,
        required: true
    },
    uploadedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Index for listing resumes sorted by upload date
resumeSchema.index({ uploadedAt: -1 });

const Resume = mongoose.model('Resume', resumeSchema);

module.exports = Resume;
