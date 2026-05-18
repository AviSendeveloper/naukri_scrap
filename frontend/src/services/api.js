const API_BASE = import.meta.env.VITE_API_BASE;

/**
 * Fetch paginated jobs list with optional search, keyword filter, match filters, and sorting.
 * @param {Object} params
 * @param {number} params.page
 * @param {number} params.limit
 * @param {string} [params.search]
 * @param {string} [params.keyword]
 * @param {string|number} [params.minAiMatch] - Minimum AI match percentage
 * @param {string|number} [params.minManualMatch] - Minimum manual match percentage
 * @param {string} [params.sortBy] - Column to sort by
 * @param {string} [params.sortOrder] - Sort direction ('asc' | 'desc')
 * @returns {Promise<{ data: Array, pagination: Object }>}
 */
export async function fetchJobs({
    page = 1, limit = 10, search = '', keyword = '',
    minAiMatch = '', minManualMatch = '',
    sortBy = '', sortOrder = ''
} = {}) {
    const params = new URLSearchParams({ page, limit });
    if (search) params.append('search', search);
    if (keyword) params.append('keyword', keyword);
    if (minAiMatch) params.append('minAiMatch', minAiMatch);
    if (minManualMatch) params.append('minManualMatch', minManualMatch);
    if (sortBy) params.append('sortBy', sortBy);
    if (sortOrder) params.append('sortOrder', sortOrder);

    const res = await fetch(`${API_BASE}/jobs?${params}`);
    if (!res.ok) throw new Error('Failed to fetch jobs');
    return res.json();
}

/**
 * Fetch a single job by its ID.
 * @param {string} id
 * @returns {Promise<{ data: Object }>}
 */
export async function fetchJobById(id) {
    const res = await fetch(`${API_BASE}/jobs/${id}`);
    if (!res.ok) throw new Error('Failed to fetch job');
    return res.json();
}

/**
 * Fetch unique search keywords for the filter dropdown.
 * @returns {Promise<{ data: string[] }>}
 */
export async function fetchKeywords() {
    const res = await fetch(`${API_BASE}/jobs/keywords`);
    if (!res.ok) throw new Error('Failed to fetch keywords');
    return res.json();
}

/**
 * Fetch dashboard data (stats, recent jobs, charts).
 * @returns {Promise<{ data: Object }>}
 */
export async function fetchDashboard() {
    const res = await fetch(`${API_BASE}/dashboard`);
    if (!res.ok) throw new Error('Failed to fetch dashboard data');
    return res.json();
}

/**
 * Fetch analytics data (all chart aggregations).
 * @returns {Promise<{ data: Object }>}
 */
export async function fetchAnalytics() {
    const res = await fetch(`${API_BASE}/analytics`);
    if (!res.ok) throw new Error('Failed to fetch analytics data');
    return res.json();
}

/**
 * Fetch current scraper configuration.
 * @returns {Promise<{ data: Object }>}
 */
export async function fetchConfig() {
    const res = await fetch(`${API_BASE}/config`);
    if (!res.ok) throw new Error('Failed to fetch config');
    return res.json();
}

/**
 * Update scraper configuration.
 * @param {Object} config - { keywords, skills, experience, scraping }
 * @returns {Promise<{ data: Object }>}
 */
export async function updateConfig(config) {
    const res = await fetch(`${API_BASE}/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
    });
    if (!res.ok) throw new Error('Failed to update config');
    return res.json();
}

// ─── Scraper Stats API ───────────────────────────────────────

/**
 * Fetch live scraper stats (Redis counters).
 * @returns {Promise<{ data: Object }>}
 */
export async function fetchScraperStats() {
    const res = await fetch(`${API_BASE}/scraper-stats`);
    if (!res.ok) throw new Error('Failed to fetch scraper stats');
    return res.json();
}

// ─── Resume API ──────────────────────────────────────────────

/**
 * Upload a resume file (multipart/form-data).
 * @param {FormData} formData - FormData with 'resume' field
 * @returns {Promise<{ data: Object }>}
 */
export async function uploadResume(formData) {
    const res = await fetch(`${API_BASE}/resumes/upload`, {
        method: 'POST',
        body: formData,
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to upload resume');
    }
    return res.json();
}

/**
 * Upload a resume file (multipart/form-data).
 * @param {FormData} formData - FormData with 'resume' field
 * @returns {Promise<{ data: Object }>}
 */
export async function uploadResumeInNaukri() {
    const res = await fetch(`${API_BASE}/resumes/upload-in-naukri`, {
        method: 'GET',
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to upload resume');
    }
    return res.json();
}

/**
 * Fetch all uploaded resumes with schedule info.
 * @returns {Promise<{ data: Object }>}
 */
export async function fetchResumes() {
    const res = await fetch(`${API_BASE}/resumes`);
    if (!res.ok) throw new Error('Failed to fetch resumes');
    return res.json();
}

/**
 * Delete a resume by ID.
 * @param {string} id
 * @returns {Promise<{ data: Object }>}
 */
export async function deleteResume(id) {
    const res = await fetch(`${API_BASE}/resumes/${id}`, {
        method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete resume');
    return res.json();
}

/**
 * Select a resume for the daily upload scheduler.
 * @param {string} id
 * @returns {Promise<{ data: Object }>}
 */
export async function selectResumeForSchedule(id) {
    const res = await fetch(`${API_BASE}/resumes/${id}/select`, {
        method: 'POST',
    });
    if (!res.ok) throw new Error('Failed to select resume for schedule');
    return res.json();
}

/**
 * Fetch current schedule details.
 * @returns {Promise<{ data: Object|null }>}
 */
export async function fetchResumeSchedule() {
    const res = await fetch(`${API_BASE}/resumes/schedule`);
    if (!res.ok) throw new Error('Failed to fetch schedule details');
    return res.json();
}

/**
 * Fetch paginated scheduler run logs.
 * @param {number} page
 * @param {number} limit
 * @returns {Promise<{ data: Array, pagination: Object }>}
 */
export async function fetchSchedulerLogs(page = 1, limit = 10) {
    const params = new URLSearchParams({ page, limit });
    const res = await fetch(`${API_BASE}/resumes/schedule/logs?${params}`);
    if (!res.ok) throw new Error('Failed to fetch scheduler logs');
    return res.json();
}

