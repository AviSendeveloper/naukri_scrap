const express = require('express');
const router = express.Router();
const { upload } = require('../middleware/upload');
const {
    uploadResume,
    listResumes,
    deleteResume,
    selectForSchedule,
    getScheduleDetails,
    getSchedulerLogs,
} = require('../controllers/resumeController');

// GET /api/resumes/schedule — must be before /:id routes
router.get('/schedule', getScheduleDetails);

// GET /api/resumes/schedule/logs
router.get('/schedule/logs', getSchedulerLogs);

// POST /api/resumes/upload
router.post('/upload', upload.single('resume'), (req, res, next) => {
    // Handle multer errors
    if (req.multerError) {
        return res.status(400).json({ success: false, message: req.multerError.message });
    }
    next();
}, uploadResume);

// GET /api/resumes
router.get('/', listResumes);

// DELETE /api/resumes/:id
router.delete('/:id', deleteResume);

// POST /api/resumes/:id/select
router.post('/:id/select', selectForSchedule);

// Multer error handling middleware
router.use((err, req, res, next) => {
    if (err && err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
            success: false,
            message: 'File too large. Maximum size is 2MB.'
        });
    }
    if (err && err.message) {
        return res.status(400).json({
            success: false,
            message: err.message
        });
    }
    next(err);
});

module.exports = router;
