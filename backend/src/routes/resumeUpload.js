const express = require('express');
const router = express.Router();
const multer = require('multer');
const { createAIProvider } = require('../ai/AIProviderFactory');
const { decrypt } = require('../utils/encryption');
const ScraperConfig = require('../models/ScraperConfig');

// Multer config: memory storage, 5MB limit for resume skill extraction
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

/**
 * POST /upload
 * Accepts a PDF or DOCX resume, extracts skills via AI, stores them in config.
 *
 * Body: multipart/form-data with field "resume" (file)
 */
router.post('/upload', upload.single('resume'), async (req, res) => {
    try {
        // Validate file presence
        if (!req.file) {
            return res.status(400).json({
                error: 'No file uploaded',
                details: 'Please upload a PDF or DOCX file with field name "resume"',
            });
        }

        const { mimetype, buffer } = req.file;

        // Extract text based on file type
        let resumeText = '';

        if (mimetype === 'application/pdf') {
            const pdfParse = require('pdf-parse');
            const pdfData = await pdfParse(buffer);
            resumeText = pdfData.text || '';
        } else if (
            mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
            mimetype === 'application/msword'
        ) {
            const mammoth = require('mammoth');
            const result = await mammoth.extractRawText({ buffer });
            resumeText = result.value || '';
        } else {
            return res.status(400).json({
                error: 'Unsupported file type',
                details: 'Only PDF and DOCX files are supported',
            });
        }

        // Validate extracted text
        if (!resumeText || resumeText.trim().length === 0) {
            return res.status(422).json({
                error: 'Could not extract text from resume',
                details: 'The uploaded file appears to be empty or could not be parsed',
            });
        }

        // Fetch AI settings from config
        const config = await ScraperConfig.getConfig();
        const aiSettings = {
            ai_provider: config.ai_provider || 'ollama',
            ai_model: config.ai_model || undefined,
            ai_api_key: config.ai_api_key ? decrypt(config.ai_api_key) : undefined,
        };

        // Create AI provider and extract skills
        const ai = createAIProvider(aiSettings);
        const skills = await ai.extractSkills(resumeText);

        // Merge extracted skills into existing config skills (case-insensitive dedup)
        const existingSkills = config.skills || [];
        const existingLower = new Set(existingSkills.map(s => s.toLowerCase().trim()));

        const newSkills = skills.filter(
            s => !existingLower.has(s.toLowerCase().trim())
        );

        if (newSkills.length > 0) {
            const mergedSkills = [...existingSkills, ...newSkills];
            await ScraperConfig.upsertConfig({ skills: mergedSkills });
        }

        return res.json({
            success: true,
            skillsExtracted: skills.length,
            newSkillsAdded: newSkills.length,
            skills,
            newSkills,
        });

    } catch (error) {
        console.error('Resume skill extraction error:', error);
        return res.status(500).json({
            error: 'Failed to extract skills from resume',
            details: error.message,
        });
    }
});

module.exports = router;
