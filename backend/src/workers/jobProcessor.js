const puppeteer = require('puppeteer');
const Job = require('../models/Job');
const FailedJob = require('../models/FailedJob');

// List of user agents for rotation
const USER_AGENTS = [
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
];

function getRandomUserAgent() {
    return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function randomDelay(min = 1000, max = 3000) {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    return new Promise(resolve => setTimeout(resolve, delay));
}

/**
 * Match job skills against config skills (case-insensitive).
 * @param {string[]} jobSkills
 * @param {string[]} configSkills
 * @returns {string[]}
 */
function matchSkills(jobSkills, configSkills) {
    if (!configSkills || configSkills.length === 0 || !jobSkills || jobSkills.length === 0) {
        return [];
    }

    const normalizedConfigSkills = configSkills.map(s => s.toLowerCase().trim());

    return jobSkills.filter(skill => {
        const normalizedSkill = skill.toLowerCase().trim();
        return normalizedConfigSkills.some(configSkill =>
            normalizedSkill.includes(configSkill) || configSkill.includes(normalizedSkill)
        );
    });
}

/**
 * Calculate match percentage based on how many config skills were matched.
 * @param {string[]} matchedSkills
 * @param {string[]} configSkills
 * @returns {number} percentage 0-100
 */
function calculateMatchPercentage(matchedSkills, configSkills) {
    if (!configSkills || configSkills.length === 0) return 0;
    if (!matchedSkills || matchedSkills.length === 0) return 0;

    // Deduplicate matched config skills (a single config skill may match multiple job skills)
    const normalizedConfig = configSkills.map(s => s.toLowerCase().trim());
    const matchedConfigSkills = new Set();

    matchedSkills.forEach(matched => {
        const norm = matched.toLowerCase().trim();
        normalizedConfig.forEach(cs => {
            if (norm.includes(cs) || cs.includes(norm)) {
                matchedConfigSkills.add(cs);
            }
        });
    });

    return Math.round((matchedConfigSkills.size / normalizedConfig.length) * 100);
}

// ── Shared browser management ──────────────────────────────────────────────────
let _browser = null;

async function getSharedBrowser() {
    if (!_browser || !_browser.isConnected()) {
        _browser = await puppeteer.launch({
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu',
                '--window-size=1920,1080',
                '--disable-blink-features=AutomationControlled',
            ],
        });
        console.log('🚀 Worker browser launched');
    }
    return _browser;
}

async function closeSharedBrowser() {
    if (_browser) {
        await _browser.close();
        _browser = null;
        console.log('🔒 Worker browser closed');
    }
}

// ── Detail scraping (runs in a new tab) ────────────────────────────────────────
async function scrapeJobDetails(browser, jobUrl) {
    const details = {
        fullDescription: '',
        keySkills: [],
        industryTypes: [],
        jobPostedAt: 'Not specified',
        salaryOffered: 'Not disclosed',
        totalVacancy: 'Not specified',
    };

    const detailPage = await browser.newPage();
    try {
        await detailPage.setUserAgent(getRandomUserAgent());
        await detailPage.setViewport({ width: 1920, height: 1080 });

        await detailPage.goto(jobUrl, {
            waitUntil: 'networkidle2',
            timeout: 30000,
        });

        await randomDelay(1500, 3000);

        const pageDetails = await detailPage.evaluate(() => {
            const result = {
                fullDescription: '',
                keySkills: [],
                industryTypes: [],
                jobPostedAt: 'Not specified',
                salaryOffered: 'Not disclosed',
                totalVacancy: 'Not specified',
            };

            // Full description
            const descSelectors = [
                '.styles_JDC__dang-inner-html__h0K4t',
                '.job-desc',
                '.dang-inner-html',
                '[class*="job-desc"]',
                '[class*="JobDescription"]',
                '.jd-desc',
                'section.styles_job-desc-container__txpYf',
                '.description',
            ];
            for (const sel of descSelectors) {
                const el = document.querySelector(sel);
                if (el && el.textContent.trim().length > 50) {
                    result.fullDescription = el.textContent.trim();
                    break;
                }
            }

            // Key skills
            const skillSelectors = [
                '.key-skill a', '.chip', 'a.chip',
                '.styles_key-skill__GIPn_ a', '[class*="key-skill"] a',
                '[class*="chip"]', '.tag-li', '.skill-list a', '.keyskill-chip',
            ];
            const skillSet = new Set();
            for (const sel of skillSelectors) {
                const elements = document.querySelectorAll(sel);
                if (elements.length > 0) {
                    elements.forEach(el => {
                        const text = el.textContent?.trim();
                        if (text && text.length < 100) skillSet.add(text);
                    });
                    break;
                }
            }
            result.keySkills = Array.from(skillSet);

            // Industry types
            const allLabels = document.querySelectorAll(
                'label, .label, [class*="label"], .styles_jhc__jd-stats__KrNRW span, .styles_other-details__oEN4O span'
            );
            allLabels.forEach(label => {
                const labelText = label.textContent?.trim().toLowerCase() || '';
                const parentEl = label.closest('div') || label.parentElement;
                const siblingOrValue = parentEl?.querySelector('span:not(:first-child), a, .value') || parentEl;
                const valueText = siblingOrValue?.textContent?.trim() || '';

                if (labelText.includes('industry')) {
                    result.industryTypes = valueText
                        .split(/[,/]/)
                        .map(s => s.trim())
                        .filter(s => s && !s.toLowerCase().includes('industry'));
                }
                if (labelText.includes('vacancy') || labelText.includes('opening')) {
                    const vacancyMatch = valueText.match(/\d+/);
                    if (vacancyMatch) result.totalVacancy = vacancyMatch[0];
                }
            });

            // Salary
            const salarySelectors = ['.styles_jhc__salary__jdfEC', '.salary', '[class*="salary"]', '.sal'];
            for (const sel of salarySelectors) {
                const el = document.querySelector(sel);
                if (el) {
                    const text = el.textContent?.trim();
                    if (text && text !== '' && !text.toLowerCase().includes('not disclosed')) {
                        result.salaryOffered = text;
                        break;
                    }
                }
            }

            // Posted date
            const dateSelectors = [
                '.styles_jhc__jd-stats__KrNRW .styles_jhc__stat__PgY67',
                '.jd-stats .stat', '.post-date', '[class*="posted"]', '.job-post-day',
            ];
            for (const sel of dateSelectors) {
                const elements = document.querySelectorAll(sel);
                elements.forEach(el => {
                    const text = el.textContent?.trim().toLowerCase() || '';
                    if (text.includes('ago') || text.includes('posted') || text.includes('day') || text.includes('today') || text.includes('just now')) {
                        result.jobPostedAt = el.textContent.trim();
                    }
                });
            }

            // Vacancy fallback
            const infoSpans = document.querySelectorAll('span, div');
            infoSpans.forEach(el => {
                const text = el.textContent?.trim() || '';
                if (/openings?/i.test(text) && /\d+/.test(text) && text.length < 30) {
                    const match = text.match(/(\d+)\s*openings?/i);
                    if (match) result.totalVacancy = match[1];
                }
            });

            // Industry fallback
            if (result.industryTypes.length === 0) {
                const detailSections = document.querySelectorAll(
                    '.styles_other-details__oEN4O .styles_details__Y424J, .other-details .detail'
                );
                detailSections.forEach(section => {
                    const heading = section.querySelector('label, .label, span:first-child');
                    const headText = heading?.textContent?.trim().toLowerCase() || '';
                    if (headText.includes('industry')) {
                        const values = section.querySelectorAll('a, span:not(:first-child)');
                        values.forEach(v => {
                            const t = v.textContent?.trim();
                            if (t && t.length < 100 && !t.toLowerCase().includes('industry')) {
                                result.industryTypes.push(t);
                            }
                        });
                    }
                });
            }

            return result;
        });

        Object.assign(details, pageDetails);
    } catch (error) {
        console.error(`  ⚠️  Error scraping details for ${jobUrl}: ${error.message}`);
        throw error; // re-throw so we can catch in the processor
    } finally {
        await detailPage.close();
    }

    return details;
}

// ── Main processor function ────────────────────────────────────────────────────

/**
 * Process a single job queue message.
 * @param {import('bullmq').Job} queueJob – BullMQ job
 */
async function processJob(queueJob) {
    const {
        jobUrl,
        searchKeyword,
        pageNumber,
        configSkills = [],
        experienceFilter = '',
        basicDetails = {},
    } = queueJob.data;

    console.log(`🔧 Processing: ${basicDetails.title || jobUrl}  (page ${pageNumber})`);

    try {
        const browser = await getSharedBrowser();

        // 1. Scrape the detail page
        const details = await scrapeJobDetails(browser, jobUrl);

        // 2. Merge basic + detail data
        const allJobSkills = [
            ...new Set([
                ...(basicDetails.skills || []),
                ...(details.keySkills || []),
            ]),
        ];

        const matched = matchSkills(allJobSkills, configSkills);
        const matchPct = calculateMatchPercentage(matched, configSkills);

        const jobDoc = {
            title: basicDetails.title,
            company: basicDetails.company,
            location: basicDetails.location || 'Not specified',
            experience: basicDetails.experience || 'Not specified',
            salary: basicDetails.salary || 'Not disclosed',
            skills: basicDetails.skills || [],
            description: basicDetails.description || '',
            jobUrl,
            postedDate: basicDetails.postedDate || 'Not specified',
            searchKeyword,

            // Detail fields
            fullDescription: details.fullDescription || '',
            keySkills: allJobSkills,
            industryTypes: details.industryTypes || [],
            jobPostedAt: details.jobPostedAt || basicDetails.postedDate || 'Not specified',
            salaryOffered: details.salaryOffered || basicDetails.salary || 'Not disclosed',
            totalVacancy: details.totalVacancy || 'Not specified',

            // Matching
            matchedSkills: matched,
            matchPercentage: matchPct,
            experienceFilter,

            scrapedAt: new Date(),
        };

        // 3. Upsert into MongoDB
        await Job.findOneAndUpdate(
            { jobUrl },
            jobDoc,
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        console.log(`  ✅ Saved: ${basicDetails.title} (match: ${matchPct}%)`);
        return { status: 'saved', matchPercentage: matchPct };

    } catch (error) {
        console.error(`  ❌ Failed: ${basicDetails.title || jobUrl} – ${error.message}`);

        // Store to FailedJob collection
        try {
            await FailedJob.create({
                jobUrl,
                searchKeyword,
                payload: queueJob.data,
                errorReason: error.message,
                attempts: queueJob.attemptsMade + 1,
            });
            console.log(`  📦 Saved to FailedJob collection`);
        } catch (saveErr) {
            console.error(`  ⚠️  Could not save to FailedJob: ${saveErr.message}`);
        }

        throw error; // re-throw so BullMQ marks it as failed and retries
    }
}

module.exports = { processJob, closeSharedBrowser };
