const exportService = require('../services/exportService');

/**
 * POST /api/export
 * Body: { startDate, endDate } — both in YYYY-MM-DD format.
 * Returns the .xlsx file as a download AND triggers an email send in the background.
 */
async function exportJobs(req, res) {
    try {
        const { startDate, endDate } = req.body;

        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: 'startDate and endDate are required (YYYY-MM-DD)',
            });
        }

        // Validate date format
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return res.status(400).json({
                success: false,
                message: 'Invalid date format. Use YYYY-MM-DD.',
            });
        }

        if (start > end) {
            return res.status(400).json({
                success: false,
                message: 'startDate cannot be after endDate.',
            });
        }

        const { buffer, jobCount, emailSent } = await exportService.exportAndEmail(startDate, endDate);

        // Set response headers for .xlsx download
        const filename = `jobs_export_${startDate}_to_${endDate}.xlsx`;
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('X-Job-Count', jobCount.toString());
        res.setHeader('X-Email-Sent', emailSent.toString());

        return res.send(Buffer.from(buffer));
    } catch (error) {
        console.error('Error exporting jobs:', error.message);
        return res.status(500).json({ success: false, message: 'Export failed' });
    }
}

module.exports = { exportJobs };
