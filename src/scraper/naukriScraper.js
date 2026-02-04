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
     * Build the Naukri search URL for a keyword
     * @param {string} keyword - Search keyword
     * @param {number} pageNum - Page number (1-indexed)
     * @returns {string}
     */
    buildSearchUrl(keyword, pageNum = 1) {
        const encodedKeyword = encodeURIComponent(keyword.toLowerCase().replace(/\s+/g, '-'));
        const searchParam = encodeURIComponent(keyword);

        if (pageNum === 1) {
            return `https://www.naukri.com/${encodedKeyword}-jobs?k=${searchParam}`;
        }
        return `https://www.naukri.com/${encodedKeyword}-jobs-${pageNum}?k=${searchParam}`;
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
     * Scrape jobs for a specific keyword across multiple pages
     * @param {string} keyword - Search keyword
     * @param {number} maxPages - Maximum number of pages to scrape
     * @returns {Promise<Array>}
     */
    async scrapeJobs(keyword, maxPages = 3) {
        const allJobs = [];

        console.log(`\n🔍 Searching for "${keyword}" jobs on Naukri.com...`);

        for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
            try {
                const url = this.buildSearchUrl(keyword, pageNum);
                console.log(`\n📄 Scraping page ${pageNum}/${maxPages}...`);

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

        console.log(`\n📊 Total jobs found: ${allJobs.length}`);
        return allJobs;
    }
}

module.exports = NaukriScraper;
