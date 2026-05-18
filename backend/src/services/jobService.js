const Job = require('../models/Job');

/**
 * Fetch paginated jobs with optional filters and sorting.
 * @param {Object} params
 * @param {number} params.page
 * @param {number} params.limit
 * @param {string} [params.search] - Title search (regex)
 * @param {string} [params.keyword] - Exact searchKeyword match
 * @param {number|null} [params.minAiMatch] - Minimum AI match percentage filter
 * @param {number|null} [params.minManualMatch] - Minimum manual match percentage filter
 * @param {string} [params.sortBy] - Column to sort by ('aiMatchPercentage' | 'matchPercentage')
 * @param {string} [params.sortOrder] - Sort direction ('asc' | 'desc')
 * @returns {Promise<{ jobs: Array, pagination: Object }>}
 */
async function getJobs({
    page = 1, limit = 20, search = '', keyword = '',
    minAiMatch = null, minManualMatch = null,
    sortBy = '', sortOrder = 'desc'
} = {}) {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(100, Math.max(1, limit));

    let filter = {};
    const conditions = [];

    if (keyword) {
        conditions.push({ searchKeyword: { $in: [keyword] } });
    }
    if (search) {
        conditions.push({ title: new RegExp(search, 'i') });
    }

    // AI match filter (preferred — applied first)
    if (minAiMatch !== null && minAiMatch !== undefined) {
        conditions.push({ aiMatchPercentage: { $gte: minAiMatch } });
    }

    // Manual match filter (applied simultaneously)
    if (minManualMatch !== null && minManualMatch !== undefined) {
        conditions.push({ matchPercentage: { $gte: minManualMatch } });
    }

    if (conditions.length > 0) {
        filter = conditions.length === 1 ? conditions[0] : { $and: conditions };
    }

    // Build dynamic sort order
    // Priority: explicit sortBy > filter-driven auto-sort > default createdAt
    const validSortColumns = ['aiMatchPercentage', 'matchPercentage'];
    const sortDirection = sortOrder === 'asc' ? 1 : -1;
    let sort = {};

    if (sortBy && validSortColumns.includes(sortBy)) {
        // Explicit user-driven column sort (highest priority)
        sort[sortBy] = sortDirection;
    } else if (minAiMatch !== null && minAiMatch !== undefined) {
        // AI filter active — auto-sort by AI match descending
        sort.aiMatchPercentage = -1;
    } else if (minManualMatch !== null && minManualMatch !== undefined) {
        // Manual filter active — auto-sort by manual match descending
        sort.matchPercentage = -1;
    }
    sort.createdAt = -1; // always fallback

    const skip = (safePage - 1) * safeLimit;

    const [jobs, totalJobs] = await Promise.all([
        Job.find(filter).sort(sort).skip(skip).limit(safeLimit).lean(),
        Job.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(totalJobs / safeLimit);

    return {
        jobs,
        pagination: {
            page: safePage,
            limit: safeLimit,
            totalJobs,
            totalPages,
            hasNextPage: safePage < totalPages,
            hasPrevPage: safePage > 1,
        },
    };
}

/**
 * Get a single job by ID.
 * @param {string} id
 * @returns {Promise<Object|null>}
 */
async function getJobById(id) {
    return Job.findById(id).lean();
}

/**
 * Get distinct search keywords.
 * @returns {Promise<string[]>}
 */
async function getKeywords() {
    const keywords = await Job.distinct('searchKeyword');
    return keywords.sort();
}

/**
 * Dashboard stats: totals + recent jobs + chart data.
 * @returns {Promise<Object>}
 */
async function getDashboardData() {
    const [
        totalJobs,
        uniqueCompanies,
        keywords,
        jobsWithMatchedSkills,
        recentJobs,
        jobsByKeyword,
        topSkills,
    ] = await Promise.all([
        Job.countDocuments(),
        Job.distinct('company').then(list => list.length),
        Job.distinct('searchKeyword'),
        Job.countDocuments({ matchedSkills: { $exists: true, $not: { $size: 0 } } }),
        Job.find().sort({ createdAt: -1 }).limit(6).lean(),
        // Aggregation: jobs per keyword
        Job.aggregate([
            { $unwind: "$searchKeyword" },
            { $group: { _id: '$searchKeyword', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $project: { keyword: '$_id', count: 1, _id: 0 } },
        ]),
        // Aggregation: top skills across keySkills
        Job.aggregate([
            { $unwind: '$keySkills' },
            { $group: { _id: '$keySkills', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 },
            { $project: { skill: '$_id', count: 1, _id: 0 } },
        ]),
    ]);

    // Derive recent activity from the last few scraping batches
    const recentActivity = await Job.aggregate([
        { $sort: { scrapedAt: -1 } },
        { $unwind: "$searchKeyword" },
        {
            $group: {
                _id: {
                    keyword: '$searchKeyword',
                    // bucket by hour
                    hour: { $dateToString: { format: '%Y-%m-%dT%H', date: '$scrapedAt' } },
                },
                count: { $sum: 1 },
                scrapedAt: { $first: '$scrapedAt' },
            },
        },
        { $sort: { scrapedAt: -1 } },
        { $limit: 5 },
        {
            $project: {
                _id: 0,
                message: { $concat: ['Scraped ', { $toString: '$count' }, ' jobs for "', '$_id.keyword', '"'] },
                scrapedAt: 1,
            },
        },
    ]);

    return {
        stats: {
            totalJobs,
            uniqueCompanies,
            keywordsTracked: keywords.length,
            skillMatches: jobsWithMatchedSkills,
        },
        recentJobs,
        jobsByKeyword,
        topSkills,
        recentActivity,
    };
}

/**
 * Full analytics aggregations.
 * @returns {Promise<Object>}
 */
async function getAnalyticsData() {
    const [
        totalJobs,
        jobsByKeyword,
        jobsByLocation,
        topCompanies,
        topSkills,
        salaryDistribution,
        jobsByIndustry,
    ] = await Promise.all([
        Job.countDocuments(),

        // Jobs by keyword
        Job.aggregate([
            { $unwind: "$searchKeyword" },
            { $group: { _id: '$searchKeyword', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $project: { keyword: '$_id', count: 1, _id: 0 } },
        ]),

        // Jobs by location (first city part)
        Job.aggregate([
            {
                $addFields: {
                    city: { $trim: { input: { $arrayElemAt: [{ $split: ['$location', ','] }, 0] } } },
                },
            },
            { $group: { _id: '$city', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $project: { location: '$_id', count: 1, _id: 0 } },
        ]),

        // Top companies
        Job.aggregate([
            { $group: { _id: '$company', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 8 },
            { $project: { company: '$_id', count: 1, _id: 0 } },
        ]),

        // Top skills
        Job.aggregate([
            { $unwind: '$keySkills' },
            { $group: { _id: '$keySkills', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 },
            { $project: { skill: '$_id', count: 1, _id: 0 } },
        ]),

        // Salary distribution
        Job.aggregate([
            {
                $addFields: {
                    salaryBucket: {
                        $switch: {
                            branches: [
                                { case: { $regexMatch: { input: '$salary', regex: /Not disclosed/i } }, then: 'Not disclosed' },
                                {
                                    case: {
                                        $and: [
                                            { $regexMatch: { input: '$salary', regex: /\d/ } },
                                            { $lte: [{ $toInt: { $arrayElemAt: [{ $regexFindAll: { input: '$salary', regex: /\d+/ } }, 0] } }, 10] },
                                        ],
                                    },
                                    then: '< ₹10 LPA',
                                },
                            ],
                            default: 'Other',
                        },
                    },
                },
            },
            { $group: { _id: '$salaryBucket', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $project: { range: '$_id', count: 1, _id: 0 } },
        ]).catch(() => {
            // Fallback: simpler salary distribution
            return [];
        }),

        // Jobs by industry
        Job.aggregate([
            { $unwind: '$industryTypes' },
            { $group: { _id: '$industryTypes', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 8 },
            { $project: { industry: '$_id', count: 1, _id: 0 } },
        ]),
    ]);

    // If aggregation-based salary failed, do a simpler approach
    let salaryData = salaryDistribution;
    if (!salaryData || salaryData.length === 0) {
        salaryData = await getSalaryDistributionFallback();
    }

    return {
        totalJobs,
        jobsByKeyword,
        jobsByLocation,
        topCompanies,
        topSkills,
        salaryDistribution: salaryData,
        jobsByIndustry,
    };
}

/**
 * Fallback salary distribution using JS processing.
 */
async function getSalaryDistributionFallback() {
    const jobs = await Job.find({}, { salary: 1 }).lean();
    const ranges = { 'Not disclosed': 0, '< ₹10 LPA': 0, '₹10-20 LPA': 0, '₹20-30 LPA': 0, '₹30+ LPA': 0 };

    jobs.forEach(j => {
        if (!j.salary || /not disclosed/i.test(j.salary)) {
            ranges['Not disclosed']++;
            return;
        }
        const match = j.salary.match(/(\d+)/);
        if (!match) return;
        const min = parseInt(match[1], 10);
        if (min < 10) ranges['< ₹10 LPA']++;
        else if (min < 20) ranges['₹10-20 LPA']++;
        else if (min < 30) ranges['₹20-30 LPA']++;
        else ranges['₹30+ LPA']++;
    });

    return Object.entries(ranges)
        .map(([range, count]) => ({ range, count }))
        .filter(r => r.count > 0);
}

module.exports = {
    getJobs,
    getJobById,
    getKeywords,
    getDashboardData,
    getAnalyticsData,
};
