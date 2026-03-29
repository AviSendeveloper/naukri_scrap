const fs = require('fs');
const path = require('path');
const Resume = require('../models/Resume');
const ResumeSchedule = require('../models/ResumeSchedule');
const SchedulerLog = require('../models/SchedulerLog');

/**
 * Save uploaded resume metadata to DB.
 * @param {Object} file - Multer file object
 * @returns {Promise<Object>} - Created resume document
 */
async function uploadResume(file) {
    const resume = await Resume.create({
        originalName: file.originalname,
        fileName: file.filename,
        filePath: file.path,
        mimeType: file.mimetype,
        fileSize: file.size,
    });
    return resume;
}

/**
 * List all resumes with schedule selection status.
 * @returns {Promise<Object>} - { resumes, schedule }
 */
async function listResumes() {
    const resumes = await Resume.find().sort({ uploadedAt: -1 }).lean();
    const schedule = await ResumeSchedule.findOne().lean();

    // Annotate each resume with isSelected flag
    const selectedId = schedule?.resumeId?.toString() || null;
    const annotated = resumes.map(r => ({
        ...r,
        isSelected: r._id.toString() === selectedId,
    }));

    return { resumes: annotated, schedule };
}

/**
 * Delete a resume by ID. Also removes from schedule if selected, and deletes file from disk.
 * @param {string} id - Resume MongoDB _id
 * @returns {Promise<Object>} - Deleted resume document
 */
async function deleteResume(id) {
    const resume = await Resume.findById(id);
    if (!resume) {
        throw new Error('Resume not found');
    }

    // Delete the file from disk
    try {
        if (fs.existsSync(resume.filePath)) {
            fs.unlinkSync(resume.filePath);
        }
    } catch (err) {
        console.error('Error deleting file from disk:', err.message);
    }

    // Remove from schedule if this resume is selected
    await ResumeSchedule.deleteMany({ resumeId: resume._id });

    // Delete from DB
    await Resume.findByIdAndDelete(id);

    return resume;
}

/**
 * Select a resume for the daily scheduler.
 * Clears any existing schedule and creates a new one.
 * @param {string} resumeId - Resume MongoDB _id
 * @returns {Promise<Object>} - New schedule document
 */
async function selectForSchedule(resumeId) {
    const resume = await Resume.findById(resumeId);
    if (!resume) {
        throw new Error('Resume not found');
    }

    // Clear any existing schedule
    await ResumeSchedule.deleteMany({});

    // Create new schedule
    const schedule = await ResumeSchedule.create({
        resumeId: resume._id,
        originalName: resume.originalName,
        filePath: resume.filePath,
        selectedAt: new Date(),
    });

    return schedule;
}

/**
 * Get current schedule details.
 * @returns {Promise<Object|null>}
 */
async function getScheduleDetails() {
    const schedule = await ResumeSchedule.findOne().lean();
    if (!schedule) {
        return null;
    }

    // Get the latest log for this schedule
    const latestLog = await SchedulerLog.findOne({ resumeId: schedule.resumeId })
        .sort({ schedulerRunAt: -1 })
        .lean();

    return {
        ...schedule,
        lastUploadedAt: latestLog?.completedAt || null,
        lastUploadStatus: latestLog?.status || null,
        lastUploadError: latestLog?.errorMessage || null,
    };
}

/**
 * Get paginated scheduler logs.
 * @param {number} page - Page number (1-indexed)
 * @param {number} limit - Items per page
 * @returns {Promise<Object>} - { logs, pagination }
 */
async function getSchedulerLogs(page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const total = await SchedulerLog.countDocuments();
    const logs = await SchedulerLog.find()
        .sort({ schedulerRunAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

    return {
        logs,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    };
}

module.exports = {
    uploadResume,
    listResumes,
    deleteResume,
    selectForSchedule,
    getScheduleDetails,
    getSchedulerLogs,
};
