const ExcelJS = require('exceljs');
const Job = require('../models/Job');
const ScraperConfig = require('../models/ScraperConfig');
const { sendEmail } = require('../utils/emailService');

/**
 * Generate an Excel buffer containing jobs within a date range.
 * @param {Date|string} startDate - Start of range (inclusive)
 * @param {Date|string} endDate - End of range (inclusive)
 * @returns {Promise<Buffer>} - .xlsx file as a Node Buffer
 */
async function generateExcelBuffer(startDate, endDate) {
    // Build date filter on createdAt
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);

    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const jobs = await Job.find({
        createdAt: { $gte: start, $lte: end },
    })
        .sort({ createdAt: -1 })
        .lean();

    // Create workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Naukri Job Scraper';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Jobs Export', {
        headerFooter: { firstHeader: 'Naukri Job Export' },
    });

    // Define columns
    sheet.columns = [
        { header: 'Title', key: 'title', width: 35 },
        { header: 'Company', key: 'company', width: 25 },
        { header: 'Location', key: 'location', width: 20 },
        { header: 'Experience', key: 'experience', width: 15 },
        { header: 'Salary', key: 'salary', width: 18 },
        { header: 'Manual Match %', key: 'matchPercentage', width: 15 },
        { header: 'AI Match %', key: 'aiMatchPercentage', width: 13 },
        { header: 'AI Status', key: 'aiMatchStatus', width: 12 },
        { header: 'Matched Skills', key: 'matchedSkills', width: 30 },
        { header: 'Key Skills', key: 'keySkills', width: 35 },
        { header: 'Search Keyword', key: 'searchKeyword', width: 20 },
        { header: 'Posted Date', key: 'postedDate', width: 15 },
        { header: 'Job URL', key: 'jobUrl', width: 45 },
        { header: 'Scraped At', key: 'scrapedAt', width: 20 },
    ];

    // Style header row
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4F46E5' }, // indigo-600
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.height = 24;

    // Add data rows
    jobs.forEach(job => {
        sheet.addRow({
            title: job.title || '',
            company: job.company || '',
            location: job.location || '',
            experience: job.experience || '',
            salary: job.salary || job.salaryOffered || '',
            matchPercentage: job.matchPercentage ?? 0,
            aiMatchPercentage: job.aiMatchPercentage ?? '',
            aiMatchStatus: job.aiMatchStatus || 'pending',
            matchedSkills: (job.matchedSkills || []).join(', '),
            keySkills: (job.keySkills || []).join(', '),
            searchKeyword: (job.searchKeyword || []).join(', '),
            postedDate: job.postedDate || '',
            jobUrl: job.jobUrl || '',
            scrapedAt: job.scrapedAt ? new Date(job.scrapedAt).toLocaleString('en-IN') : '',
        });
    });

    // Auto-filter on header row
    sheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: 1, column: 14 },
    };

    // Alternate row styling
    sheet.eachRow((row, rowNumber) => {
        if (rowNumber > 1) {
            row.alignment = { vertical: 'middle', wrapText: true };
            if (rowNumber % 2 === 0) {
                row.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFF8F9FA' },
                };
            }
        }
    });

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return { buffer, jobCount: jobs.length };
}

/**
 * Generate Excel export and email it to the configured address.
 * Returns the buffer so the API can also serve it as a download.
 * @param {string} startDate
 * @param {string} endDate
 * @returns {Promise<{ buffer: Buffer, jobCount: number, emailSent: boolean }>}
 */
async function exportAndEmail(startDate, endDate) {
    const { buffer, jobCount } = await generateExcelBuffer(startDate, endDate);

    // Get configured export email
    const config = await ScraperConfig.getConfig();
    const exportEmail = config.exportEmail;
    let emailSent = false;

    if (exportEmail) {
        const filename = `jobs_export_${startDate}_to_${endDate}.xlsx`;
        try {
            await sendEmail({
                to: exportEmail,
                subject: `📋 Naukri Job Export (${startDate} to ${endDate}) — ${jobCount} jobs`,
                html: `
                    <div style="font-family: Arial, sans-serif; padding: 20px;">
                        <h2 style="color: #4F46E5;">Naukri Job Export</h2>
                        <p>Your job export for <strong>${startDate}</strong> to <strong>${endDate}</strong> is attached.</p>
                        <table style="border-collapse: collapse; margin-top: 12px;">
                            <tr>
                                <td style="padding: 6px 16px; border: 1px solid #e5e7eb; font-weight: bold;">Total Jobs</td>
                                <td style="padding: 6px 16px; border: 1px solid #e5e7eb;">${jobCount}</td>
                            </tr>
                            <tr>
                                <td style="padding: 6px 16px; border: 1px solid #e5e7eb; font-weight: bold;">Date Range</td>
                                <td style="padding: 6px 16px; border: 1px solid #e5e7eb;">${startDate} to ${endDate}</td>
                            </tr>
                        </table>
                        <p style="margin-top: 16px; color: #6b7280; font-size: 13px;">
                            This email was sent by Naukri Job Scraper.
                        </p>
                    </div>
                `,
                attachments: [
                    {
                        filename,
                        content: buffer,
                        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    },
                ],
            });
            emailSent = true;
        } catch (err) {
            console.error('Export email failed:', err.message);
        }
    } else {
        console.warn('⚠️  No export email configured. Skipping email send.');
    }

    return { buffer, jobCount, emailSent };
}

/**
 * Scheduled daily report: export yesterday's jobs and email them.
 * Called by the export scheduler cron job.
 */
async function exportDailyScheduledReport() {
    const now = new Date();

    // Yesterday's date range (IST-aware)
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    const startDate = yesterday.toISOString().split('T')[0]; // YYYY-MM-DD
    const endDate = startDate; // same day

    console.log(`📊 Running scheduled daily export for ${startDate}...`);

    try {
        const { jobCount, emailSent } = await exportAndEmail(startDate, endDate);
        console.log(`✅ Daily export complete: ${jobCount} jobs${emailSent ? ', email sent' : ', email skipped'}`);
    } catch (err) {
        console.error('❌ Daily scheduled export failed:', err.message);
    }
}

module.exports = {
    generateExcelBuffer,
    exportAndEmail,
    exportDailyScheduledReport,
};
