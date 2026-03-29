const express = require('express');
const cors = require('cors');

// Route modules
const jobRoutes = require('./routes/jobRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const configRoutes = require('./routes/configRoutes');
const resumeRoutes = require('./routes/resumeRoutes');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/jobs', jobRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/config', configRoutes);
app.use('/api/resumes', resumeRoutes);

// Health check
app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
});

module.exports = app;
