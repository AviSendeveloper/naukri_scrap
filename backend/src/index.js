require('dotenv').config({ quiet: true });

const app = require('./app');
const { connectDB } = require('./config/database');

const PORT = process.env.PORT || 3000;

async function startServer() {
    try {
        // Connect to MongoDB
        await connectDB();

        // Start Express server
        app.listen(PORT, () => {
            console.log(`🚀 Naukri Scraper API running on http://localhost:${PORT}`);
            console.log(`📋 Jobs endpoint: http://localhost:${PORT}/api/jobs`);
        });
    } catch (error) {
        console.error(`❌ Failed to start server: ${error.message}`);
        process.exit(1);
    }
}

startServer();
