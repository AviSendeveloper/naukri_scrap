const puppeteer = require('puppeteer');

// List of user agents for rotation
const USER_AGENTS = [
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0'
];

/**
 * Get a random user agent from the list
 * @returns {string}
 */
function getRandomUserAgent() {
    return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

/**
 * Random delay to simulate human behavior
 * @param {number} min - Minimum delay in ms
 * @param {number} max - Maximum delay in ms
 * @returns {Promise<void>}
 */
function randomDelay(min = 1000, max = 3000) {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    return new Promise(resolve => setTimeout(resolve, delay));
}

/**
 * Match job skills against config skills (case-insensitive)
 * @param {string[]} jobSkills - Skills extracted from a job listing
 * @param {string[]} configSkills - Skills from config.json
 * @returns {string[]} - Array of matched skills
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
 * NaukriScraper class for scraping job listings from Naukri.com
 */
class NaukriScraper {
    constructor() {
        this.browser = null;
        this.page = null;
    }

    /**
     * Initialize the browser with anti-detection measures
     * @returns {Promise<void>}
     */
    async initBrowser() {
        console.log('🚀 Launching headless browser...');

        this.browser = await puppeteer.launch({
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu',
                '--window-size=1920,1080',
                '--disable-blink-features=AutomationControlled'
            ]
        });

        this.page = await this.browser.newPage();

        // Set random user agent
        const userAgent = getRandomUserAgent();
        await this.page.setUserAgent(userAgent);

        // Set viewport
        await this.page.setViewport({
            width: 1920,
            height: 1080
        });

        // Override webdriver detection
        await this.page.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, 'webdriver', {
                get: () => undefined
            });

            // Override plugins
            Object.defineProperty(navigator, 'plugins', {
                get: () => [1, 2, 3, 4, 5]
            });

            // Override languages
            Object.defineProperty(navigator, 'languages', {
                get: () => ['en-US', 'en']
            });
        });

        console.log('✅ Browser initialized with anti-detection measures');
    }

    /**
     * Close the browser instance
     * @returns {Promise<void>}
     */
    async closeBrowser() {
        if (this.browser) {
            await this.browser.close();
            console.log('🔒 Browser closed');
        }
    }

    /**
     * Login to Naukri.com with credentials
     * @param {string} email - Naukri account email
     * @param {string} password - Naukri account password
     * @returns {Promise<boolean>} - Returns true if login successful
     */
    async login(email, password) {
        if (!email || !password) {
            console.log('⚠️  No Naukri credentials provided, continuing without login...');
            return false;
        }

        console.log('🔐 Logging into Naukri.com...');

        try {
            // Navigate to login page
            await this.page.goto('https://www.naukri.com/nlogin/login', {
                waitUntil: 'networkidle2',
                timeout: 30000
            });

            await randomDelay(1500, 2500);

            // Wait for login form
            await this.page.waitForSelector('input[placeholder*="Email"], input[type="text"], #usernameField', {
                timeout: 10000
            });

            // Enter email
            const emailInput = await this.page.$('input[placeholder*="Email"], input[type="text"], #usernameField');
            if (emailInput) {
                await emailInput.click({ clickCount: 3 }); // Select all existing text
                await emailInput.type(email, { delay: 50 });
            }

            await randomDelay(500, 1000);

            // Enter password
            const passwordInput = await this.page.$('input[type="password"], #passwordField');
            if (passwordInput) {
                await passwordInput.click();
                await passwordInput.type(password, { delay: 50 });
            }

            await randomDelay(500, 1000);

            // Click login button
            const loginButton = await this.page.$('button[type="submit"], .loginButton, button:has-text("Login")');
            if (loginButton) {
                await loginButton.click();
            } else {
                // Try pressing Enter as fallback
                await this.page.keyboard.press('Enter');
            }

            // Wait for navigation after login
            await randomDelay(3000, 5000);

            // Check if login was successful by looking for user menu or dashboard elements
            try {
                await this.page.waitForSelector('.nI-gNb-drawer, .user-name, [class*="profile"], .view-all-link', {
                    timeout: 10000
                });
                console.log('✅ Successfully logged into Naukri.com!');
                this.isLoggedIn = true;
                return true;
            } catch (e) {
                // Check for error messages
                const errorMsg = await this.page.$('.error-msg, .error, [class*="error"]');
                if (errorMsg) {
                    const errorText = await this.page.evaluate(el => el.textContent, errorMsg);
                    console.log(`❌ Login failed: ${errorText}`);
                } else {
                    console.log('⚠️  Login status uncertain, continuing anyway...');
                }
                return false;
            }

        } catch (error) {
            console.error('❌ Error during login:', error.message);
            return false;
        }
    }

    /**
     * Build the Naukri search URL for a keyword with optional experience filter
     * @param {string} keyword - Search keyword
     * @param {number} pageNum - Page number (1-indexed)
     * @param {Object} [experience] - Experience filter { min, max }
     * @returns {string}
     */
    buildSearchUrl(keyword, pageNum = 1, experience = null) {
        const encodedKeyword = encodeURIComponent(keyword.toLowerCase().replace(/\s+/g, '-'));
        const searchParam = encodeURIComponent(keyword);

        let url;
        if (pageNum === 1) {
            url = `https://www.naukri.com/${encodedKeyword}-jobs?k=${searchParam}`;
        } else {
            url = `https://www.naukri.com/${encodedKeyword}-jobs-${pageNum}?k=${searchParam}`;
        }

        // Append experience filter if provided
        if (experience && (experience.min !== undefined || experience.max !== undefined)) {
            if (experience.min !== undefined) {
                url += `&niyoMinExp=${experience.min}`;
            }
            if (experience.max !== undefined) {
                url += `&niyoMaxExp=${experience.max}`;
            }
        }

        return url;
    }

    /**
     * Extract job listings from the current page
     * @param {string} keyword - The search keyword used
     * @returns {Promise<Array>}
     */
    async extractJobCards(keyword) {
        return await this.page.evaluate((searchKeyword) => {
            const jobs = [];

            // Select all job cards - Naukri uses various selectors
            const jobCards = document.querySelectorAll('.srp-jobtuple-wrapper, .jobTuple, [data-job-id], .cust-job-tuple');

            jobCards.forEach((card) => {
                try {
                    // Extract job title
                    const titleElement = card.querySelector('.title, .jobTitle, a.title, [class*="title"]');
                    const title = titleElement?.textContent?.trim() || '';

                    // Extract job URL
                    const linkElement = card.querySelector('a.title, a[class*="title"], .title a');
                    let jobUrl = linkElement?.href || '';

                    // Extract company name
                    const companyElement = card.querySelector('.comp-name, .companyInfo, [class*="company"], .subTitle');
                    const company = companyElement?.textContent?.trim() || '';

                    // Extract location
                    const locationElement = card.querySelector('.loc-wrap, .location, [class*="location"], .locWdth');
                    const location = locationElement?.textContent?.trim() || 'Not specified';

                    // Extract experience
                    const expElement = card.querySelector('.exp-wrap, .experience, [class*="exp"], .expwdth');
                    const experience = expElement?.textContent?.trim() || 'Not specified';

                    // Extract salary
                    const salaryElement = card.querySelector('.sal-wrap, .salary, [class*="salary"], .salWrap');
                    const salary = salaryElement?.textContent?.trim() || 'Not disclosed';

                    // Extract skills/tags
                    const skillElements = card.querySelectorAll('.tag-li, .skill, [class*="skill"], .tags-gt li');
                    const skills = Array.from(skillElements).map(el => el.textContent?.trim()).filter(Boolean);

                    // Extract description/snippet
                    const descElement = card.querySelector('.job-desc, .description, [class*="desc"], .row2');
                    const description = descElement?.textContent?.trim() || '';

                    // Extract posted date
                    const dateElement = card.querySelector('.job-post-day, .date, [class*="date"], .fleft.grey-text');
                    const postedDate = dateElement?.textContent?.trim() || 'Not specified';

                    // Only add if we have essential fields
                    if (title && company && jobUrl) {
                        jobs.push({
                            title,
                            company,
                            location,
                            experience,
                            salary,
                            skills,
                            description,
                            jobUrl,
                            postedDate,
                            searchKeyword,
                            scrapedAt: new Date().toISOString()
                        });
                    }
                } catch (err) {
                    console.log('Error extracting job card:', err);
                }
            });

            return jobs;
        }, keyword);
    }

    /**
     * Scrape detailed information from an individual job page
     * @param {string} jobUrl - URL of the job detail page
     * @returns {Promise<Object>} - Detailed job data
     */
    async scrapeJobDetails(jobUrl) {
        const details = {
            fullDescription: '',
            keySkills: [],
            industryTypes: [],
            jobPostedAt: 'Not specified',
            salaryOffered: 'Not disclosed',
            totalVacancy: 'Not specified'
        };

        try {
            // Open job detail page in a new tab
            const detailPage = await this.browser.newPage();
            await detailPage.setUserAgent(getRandomUserAgent());
            await detailPage.setViewport({ width: 1920, height: 1080 });

            await detailPage.goto(jobUrl, {
                waitUntil: 'networkidle2',
                timeout: 30000
            });

            await randomDelay(1500, 3000);

            // Extract details from the job page
            const pageDetails = await detailPage.evaluate(() => {
                const result = {
                    fullDescription: '',
                    keySkills: [],
                    industryTypes: [],
                    jobPostedAt: 'Not specified',
                    salaryOffered: 'Not disclosed',
                    totalVacancy: 'Not specified'
                };

                // --- Full description ---
                // Try multiple selectors that Naukri uses for job description
                const descSelectors = [
                    '.styles_JDC__dang-inner-html__h0K4t',
                    '.job-desc',
                    '.dang-inner-html',
                    '[class*="job-desc"]',
                    '[class*="JobDescription"]',
                    '.jd-desc',
                    'section.styles_job-desc-container__txpYf',
                    '.description'
                ];
                for (const sel of descSelectors) {
                    const el = document.querySelector(sel);
                    if (el && el.textContent.trim().length > 50) {
                        result.fullDescription = el.textContent.trim();
                        break;
                    }
                }

                // --- Key skills ---
                const skillSelectors = [
                    '.key-skill a',
                    '.chip',
                    'a.chip',
                    '.styles_key-skill__GIPn_ a',
                    '[class*="key-skill"] a',
                    '[class*="chip"]',
                    '.tag-li',
                    '.skill-list a',
                    '.keyskill-chip'
                ];
                const skillSet = new Set();
                for (const sel of skillSelectors) {
                    const elements = document.querySelectorAll(sel);
                    if (elements.length > 0) {
                        elements.forEach(el => {
                            const text = el.textContent?.trim();
                            if (text && text.length < 100) {
                                skillSet.add(text);
                            }
                        });
                        break;
                    }
                }
                result.keySkills = Array.from(skillSet);

                // --- Industry types ---
                // Look for industry/department info in the job details section
                const allTextBlocks = document.querySelectorAll('.styles_details__Y424J .styles_details__Y424J, .other-details .details, .detail-row, [class*="detail"]');
                const allLabels = document.querySelectorAll('label, .label, [class*="label"], .styles_jhc__jd-stats__KrNRW span, .styles_other-details__oEN4O span');

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
                        if (vacancyMatch) {
                            result.totalVacancy = vacancyMatch[0];
                        }
                    }
                });

                // --- Salary from detail page ---
                const salarySelectors = [
                    '.styles_jhc__salary__jdfEC',
                    '.salary',
                    '[class*="salary"]',
                    '.sal'
                ];
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

                // --- Posted date from detail page ---
                const dateSelectors = [
                    '.styles_jhc__jd-stats__KrNRW .styles_jhc__stat__PgY67',
                    '.jd-stats .stat',
                    '.post-date',
                    '[class*="posted"]',
                    '.job-post-day'
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

                // --- Vacancy: also try the "Openings" label pattern ---
                const infoSpans = document.querySelectorAll('span, div');
                infoSpans.forEach(el => {
                    const text = el.textContent?.trim() || '';
                    if (/openings?/i.test(text) && /\d+/.test(text) && text.length < 30) {
                        const match = text.match(/(\d+)\s*openings?/i);
                        if (match) {
                            result.totalVacancy = match[1];
                        }
                    }
                });

                // --- Industry: also try the detail-page info sections ---
                if (result.industryTypes.length === 0) {
                    const detailSections = document.querySelectorAll('.styles_other-details__oEN4O .styles_details__Y424J, .other-details .detail');
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

            await detailPage.close();
        } catch (error) {
            console.error(`  ⚠️  Error scraping details for ${jobUrl}: ${error.message}`);
        }

        return details;
    }

    /**
     * Scrape jobs for a specific keyword across multiple pages
     * @param {string} keyword - Search keyword
     * @param {number} maxPages - Maximum number of pages to scrape
     * @param {Object} [config] - Configuration object with skills, experience, scrapeJobDetails
     * @returns {Promise<Array>}
     */
    async scrapeJobs(keyword, maxPages = 3, config = {}) {
        const allJobs = [];
        const experience = config.experience || null;
        const configSkills = config.skills || [];
        const shouldScrapeDetails = config.scrapeJobDetails !== false;
        const experienceLabel = experience ? `${experience.min || 0}-${experience.max || 'any'} yrs` : '';

        console.log(`\n🔍 Searching for "${keyword}" jobs on Naukri.com...`);
        if (experience) {
            console.log(`   📋 Experience filter: ${experienceLabel}`);
        }
        if (configSkills.length > 0) {
            console.log(`   🔧 Matching skills: ${configSkills.join(', ')}`);
        }

        for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
            try {
                const url = this.buildSearchUrl(keyword, pageNum, experience);
                console.log(`\n📄 Scraping page ${pageNum}/${maxPages}...`);
                console.log(`   🔗 URL: ${url}`);

                // Navigate to the search page
                await this.page.goto(url, {
                    waitUntil: 'networkidle2',
                    timeout: 30000
                });

                // Wait for job listings to load
                await randomDelay(2000, 4000);

                // Try to wait for job cards
                try {
                    await this.page.waitForSelector('.srp-jobtuple-wrapper, .jobTuple, [data-job-id], .cust-job-tuple', {
                        timeout: 10000
                    });
                } catch (e) {
                    console.log(`⚠️  No job cards found on page ${pageNum}, might be end of results`);
                    break;
                }

                // Extract jobs from this page
                const jobs = await this.extractJobCards(keyword);

                if (jobs.length === 0) {
                    console.log(`⚠️  No jobs extracted from page ${pageNum}, stopping pagination`);
                    break;
                }

                console.log(`✅ Found ${jobs.length} jobs on page ${pageNum}`);

                // Enrich each job with detailed data from individual pages
                if (shouldScrapeDetails) {
                    console.log(`   📝 Scraping detailed info for each job...`);

                    for (let i = 0; i < jobs.length; i++) {
                        const job = jobs[i];
                        console.log(`   📄 [${i + 1}/${jobs.length}] Scraping details for: ${job.title}`);

                        const details = await this.scrapeJobDetails(job.jobUrl);

                        // Merge detail data
                        job.fullDescription = details.fullDescription || '';
                        job.keySkills = details.keySkills.length > 0 ? details.keySkills : job.skills;
                        job.industryTypes = details.industryTypes || [];
                        job.jobPostedAt = details.jobPostedAt || job.postedDate;
                        job.salaryOffered = details.salaryOffered || job.salary;
                        job.totalVacancy = details.totalVacancy || 'Not specified';

                        // Match skills
                        const allJobSkills = [...new Set([...job.skills, ...job.keySkills])];
                        job.matchedSkills = matchSkills(allJobSkills, configSkills);
                        job.experienceFilter = experienceLabel;

                        // Random delay between detail page visits
                        if (i < jobs.length - 1) {
                            await randomDelay(1000, 2000);
                        }
                    }
                } else {
                    // Even without detail scraping, still do skill matching
                    for (const job of jobs) {
                        job.matchedSkills = matchSkills(job.skills, configSkills);
                        job.experienceFilter = experienceLabel;
                        job.fullDescription = '';
                        job.keySkills = job.skills;
                        job.industryTypes = [];
                        job.jobPostedAt = job.postedDate;
                        job.salaryOffered = job.salary;
                        job.totalVacancy = 'Not specified';
                    }
                }

                allJobs.push(...jobs);

                // Add delay between pages to avoid rate limiting
                if (pageNum < maxPages) {
                    console.log('⏳ Waiting before next page...');
                    await randomDelay(3000, 5000);
                }

            } catch (error) {
                console.error(`❌ Error scraping page ${pageNum}:`, error.message);

                // If first page fails, throw error. Otherwise, continue with what we have
                if (pageNum === 1) {
                    throw new Error(`Failed to scrape jobs: ${error.message}`);
                }
                break;
            }
        }

        // Summary of skill matching
        if (configSkills.length > 0) {
            const matchedJobs = allJobs.filter(j => j.matchedSkills.length > 0);
            console.log(`\n🎯 Skill matching: ${matchedJobs.length}/${allJobs.length} jobs matched configured skills`);
        }

        console.log(`\n📊 Total jobs found: ${allJobs.length}`);
        return allJobs;
    }
}

module.exports = NaukriScraper;
