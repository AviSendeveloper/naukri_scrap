const API_BASE = 'http://localhost:3000/api';

/**
 * Fetch paginated jobs list with optional search and keyword filter.
 * @param {Object} params
 * @param {number} params.page
 * @param {number} params.limit
 * @param {string} [params.search]
 * @param {string} [params.keyword]
 * @returns {Promise<{ data: Array, pagination: Object }>}
 */
export async function fetchJobs({ page = 1, limit = 10, search = '', keyword = '' } = {}) {
    const params = new URLSearchParams({ page, limit });
    if (search) params.append('search', search);
    if (keyword) params.append('keyword', keyword);

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
