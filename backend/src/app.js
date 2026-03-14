const express = require('express');
const cors = require('cors');
const jobRoutes = require('./routes/jobRoutes');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/jobs', jobRoutes);

// Health check
app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
});

module.exports = app;
