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
