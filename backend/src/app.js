const express = require('express');
const cors = require('cors');

// Route modules
const jobRoutes = require('./routes/jobRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const configRoutes = require('./routes/configRoutes');
const resumeRoutes = require('./routes/resumeRoutes');
const scraperStatsRoutes = require('./routes/scraperStatsRoutes');

const app = express();

// cors
const allowedOrigins = process.env.CORS_ORIGINS
? process.env.CORS_ORIGINS.split(',')
: [];

app.use(
    cors({
        origin: function (origin, callback) {
            // allow requests with no origin (like mobile apps, curl, Postman)
            if (!origin) return callback(null, true);
            
            if (allowedOrigins.includes(origin)) {
                return callback(null, true);
            } else {
                return callback(new Error('Not allowed by CORS'));
            }
        },
        credentials: true, // if using cookies/auth
    })
);

// Middlewares
app.use(express.json());

// Routes
app.use('/api/jobs', jobRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/config', configRoutes);
app.use('/api/resumes', resumeRoutes);
app.use('/api/scraper-stats', scraperStatsRoutes);

// Health check
app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
});

module.exports = app;
