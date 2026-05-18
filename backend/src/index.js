require('dotenv').config({ quiet: true });

const app = require('./app');
const { connectDB } = require('./config/database');
const { initScheduler } = require('./scheduler/resumeScheduler');
const { initExportScheduler } = require('./scheduler/exportScheduler');

const PORT = process.env.PORT || 3000;

async function startServer() {
    try {
        // Connect to MongoDB
        await connectDB();

        // Initialize resume upload scheduler
        await initScheduler();

        // Initialize daily export scheduler (8 AM IST)
        await initExportScheduler();

        // Start Express server
        app.listen(PORT, () => {
            console.log(`🚀 Naukri Scraper API running on http://localhost:${PORT}`);
            console.log(`📋 Jobs endpoint: http://localhost:${PORT}/api/jobs`);
            console.log(`📄 Resume endpoint: http://localhost:${PORT}/api/resumes`);
        });
    } catch (error) {
        console.error(`❌ Failed to start server: ${error.message}`);
        process.exit(1);
    }
}

startServer();

