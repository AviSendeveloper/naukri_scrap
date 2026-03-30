const resumeService = require('../services/resumeService');
const { executeUpload } = require('../resume/upload');
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

/**
 * POST /api/resumes/upload
 * Upload a new resume file.
 */
async function uploadResume(req, res) {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }

        const s3BucketName = process.env.S3_BUCKET_NAME
        const s3BucketRegion = process.env.S3_BUCKET_REGION
        const s3AccessKey = process.env.S3_ACCESS_KEY
        const s3SecretKey = process.env.S3_SECRET_KEY

        const s3Client = new S3Client({
            region: s3BucketRegion,
            credentials: {
                accessKeyId: s3AccessKey,
                secretAccessKey: s3SecretKey
            }
        })

        const command = new PutObjectCommand({
            Bucket: s3BucketName,
            Key: req.file.originalname,
            Body: req.file.buffer,
            ContentType: req.file.mimetype,
        });

        const s3Response = await s3Client.send(command);


        // const resume = await resumeService.uploadResume(req.file);
        const resume = {};
        return res.status(201).json({ success: true, data: resume });
    } catch (error) {
        console.error('Error uploading resume:', error.message);
        return res.status(500).json({ success: false, message: error.message || 'Internal server error' });
    }
}

/**
 * GET /api/resumes
 * List all uploaded resumes.
 */
async function listResumes(req, res) {
    try {
        const result = await resumeService.listResumes();
        return res.json({ success: true, data: result });
    } catch (error) {
        console.error('Error listing resumes:', error.message);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
}

/**
 * DELETE /api/resumes/:id
 * Delete a resume by ID.
 */
async function deleteResume(req, res) {
    try {
        const resume = await resumeService.deleteResume(req.params.id);
        return res.json({ success: true, data: resume });
    } catch (error) {
        if (error.message === 'Resume not found') {
            return res.status(404).json({ success: false, message: 'Resume not found' });
        }
        if (error.kind === 'ObjectId') {
            return res.status(400).json({ success: false, message: 'Invalid resume ID format' });
        }
        console.error('Error deleting resume:', error.message);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
}

/**
 * POST /api/resumes/:id/select
 * Select a resume for the daily upload scheduler.
 */
async function selectForSchedule(req, res) {
    try {
        const schedule = await resumeService.selectForSchedule(req.params.id);
        return res.json({ success: true, data: schedule });
    } catch (error) {
        if (error.message === 'Resume not found') {
            return res.status(404).json({ success: false, message: 'Resume not found' });
        }
        if (error.kind === 'ObjectId') {
            return res.status(400).json({ success: false, message: 'Invalid resume ID format' });
        }
        console.error('Error selecting resume for schedule:', error.message);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
}

/**
 * GET /api/resumes/schedule
 * Get current schedule details.
 */
async function getScheduleDetails(req, res) {
    try {
        const schedule = await resumeService.getScheduleDetails();
        return res.json({ success: true, data: schedule });
    } catch (error) {
        console.error('Error fetching schedule details:', error.message);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
}

/**
 * GET /api/resumes/schedule/logs
 * Get paginated scheduler run logs.
 */
async function getSchedulerLogs(req, res) {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;

        const result = await resumeService.getSchedulerLogs(page, limit);
        return res.json({ success: true, data: result.logs, pagination: result.pagination });
    } catch (error) {
        console.error('Error fetching scheduler logs:', error.message);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
}

/**
 * GET /api/resumes/upload-in-naukri
 * Upload a resume to Naukri.
 */
async function uploadResumeInNaukri(req, res) {
    try {
        // upload resume in naukri using executeUpload function (fetch db config + scrap naukri upload)
        await executeUpload();
        return res.json({ success: true });
    } catch (error) {
        console.error('Error uploading resume to Naukri:', error.message);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
}

module.exports = {
    uploadResume,
    listResumes,
    deleteResume,
    selectForSchedule,
    getScheduleDetails,
    getSchedulerLogs,
    uploadResumeInNaukri,
};
