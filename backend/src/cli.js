#!/usr/bin/env node

require('dotenv').config({ quiet: true });

const { program } = require('commander');
const chalk = require('chalk');
const { connectDB, closeDB } = require('./config/database');
const Job = require('./models/Job');
const NaukriScraper = require('./scraper/naukriScraper');
const { createJobQueue } = require('./config/queue');
const { getRedisConnection, REDIS_KEYS } = require('./config/redis');
const configService = require('./services/configService');

// Package info
const packageInfo = require('../package.json');

/**
 * Load configuration from DB first, then config.json fallback.
 * @returns {Promise<Object>} Configuration object
 */
async function loadConfig() {
    try {
        return await configService.getConfig();
    } catch (error) {
        console.error(chalk.yellow(`⚠️ Could not load config from DB, using file fallback: ${error.message}`));
        return configService.loadFileConfig();
    }
}

/**
 * Display a styled banner
 */
function showBanner() {
    console.log(chalk.cyan.bold('\n╔════════════════════════════════════════╗'));
    console.log(chalk.cyan.bold('║') + chalk.yellow.bold('       🔍 Naukri Job Scraper            ') + chalk.cyan.bold('║'));
    console.log(chalk.cyan.bold('╚════════════════════════════════════════╝\n'));
}

/**
 * Delay helper function
 * @param {number} ms - Milliseconds to wait
 */
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Parse a "posted date" string (e.g. "3 Days Ago", "Just Now", "30+ Days Ago")
 * and return the approximate number of days ago.
 * @param {string} postedDate - Text from job card
 * @returns {number} - Days ago (0 if unparseable or today)
 */
function parsePostedDaysAgo(postedDate) {
    if (!postedDate) return 0;
    const text = postedDate.toLowerCase().trim();

    if (text.includes('just now') || text.includes('today') || text.includes('few hours')) {
        return 0;
    }

    // "X day(s) ago"
    const dayMatch = text.match(/(\d+)\+?\s*day/i);
    if (dayMatch) return parseInt(dayMatch[1], 10);

    // "X week(s) ago"  -> approximate
    const weekMatch = text.match(/(\d+)\+?\s*week/i);
    if (weekMatch) return parseInt(weekMatch[1], 10) * 7;

    // "X month(s) ago"
    const monthMatch = text.match(/(\d+)\+?\s*month/i);
    if (monthMatch) return parseInt(monthMatch[1], 10) * 30;

    return 0; // unknown format, don't skip
}

/**
 * Scrape basic job cards and dispatch each to the BullMQ queue.
 * Detail scraping is handled asynchronously by the worker.
 * @param {Object} scraper - Initialized scraper instance
 * @param {string} keyword - Search keyword
 * @param {number} pages - Number of pages to scrape
 * @param {Object} [config] - Configuration object with skills, experience
 * @param {Queue} jobQueue - BullMQ Queue instance
 * @returns {Object} - Results summary
 */
async function scrapeAndDispatch(scraper, keyword, pages, config = {}, jobQueue) {
    const redis = getRedisConnection();
    const thresholdDays = config.thresholdDays || 30;

    // Scrape basic job cards only (skip detail scraping – worker does it)
    const jobs = await scraper.scrapeJobs(keyword, pages, {
        experience: config.experience || null,
        skills: config.skills || [],
        scrapeJobDetails: false  // never scrape details in producer
    });

    if (jobs.length === 0) {
        console.log(chalk.yellow('\n⚠️  No jobs found for the given keyword.'));
        return { found: 0, dispatched: 0, skipped: 0 };
    }

    // Dispatch each job to the queue
    console.log(chalk.blue(`\n📤 Dispatching ${jobs.length} jobs to the message queue...`));

    let dispatched = 0;
    let skipped = 0;
    const experienceLabel = config.experience
        ? `${config.experience.min || 0}-${config.experience.max || 'any'} yrs`
        : '';

    for (const job of jobs) {
        // Check threshold days filter
        const daysAgo = parsePostedDaysAgo(job.postedDate);
        if (daysAgo > thresholdDays) {
            skipped++;
            console.log(chalk.gray(`  ⏭️  Skipping "${job.title}" — posted ${daysAgo} days ago (threshold: ${thresholdDays})`));
            await redis.hincrby(REDIS_KEYS.SEARCH_STATS, 'totalSkipped', 1);
            continue;
        }

        try {
            await jobQueue.add('scrape-job-detail', {
                jobUrl: job.jobUrl,
                searchKeyword: keyword,
                pageNumber: job.pageNumber || 1,
                configSkills: config.skills || [],
                experienceFilter: experienceLabel,
                basicDetails: {
                    title: job.title,
                    company: job.company,
                    location: job.location,
                    experience: job.experience,
                    salary: job.salary,
                    skills: job.skills,
                    description: job.description,
                    postedDate: job.postedDate,
                },
            });
            dispatched++;

            // Increment dispatched counter in Redis
            await redis.incr(REDIS_KEYS.JOBS_DISPATCHED);
        } catch (error) {
            console.error(chalk.red(`  Error dispatching job "${job.title}": ${error.message}`));
        }
    }

    console.log(chalk.green(`  ✅ Dispatched ${dispatched}/${jobs.length} jobs to queue`));
    if (skipped > 0) {
        console.log(chalk.yellow(`  ⏭️  Skipped ${skipped} jobs (older than ${thresholdDays} days)`));
    }
    return { found: jobs.length, dispatched, skipped };
}

/**
 * Run scraper for a single keyword (legacy command)
 * @param {string} keyword - Search keyword
 * @param {number} pages - Number of pages to scrape
 * @param {boolean} withLogin - Whether to login first
 */
async function runSingleScrape(keyword, pages, withLogin = false) {
    const config = await loadConfig();
    const scraper = new NaukriScraper();
    const jobQueue = createJobQueue();

    try {
        // Initialize browser
        await scraper.initBrowser();

        // Login if credentials provided
        if (withLogin) {
            const email = process.env.NAUKRI_EMAIL;
            const password = process.env.NAUKRI_PASSWORD;
            await scraper.login(email, password);
        }

        // Scrape basic cards and dispatch to queue
        const results = await scrapeAndDispatch(scraper, keyword, pages, config, jobQueue);

        // Summary
        console.log(chalk.green('\n✅ Scraping & Dispatch Complete!'));
        console.log(chalk.white('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
        console.log(chalk.blue(`📊 Jobs Found: ${results.found}`));
        console.log(chalk.green(`📤 Jobs Dispatched to Queue: ${results.dispatched}`));
        console.log(chalk.yellow(`⏭️  Jobs Skipped: ${results.skipped}`));
        console.log(chalk.gray(`   ℹ️  Worker will process details and save to DB`));
        console.log(chalk.white('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));

    } finally {
        await scraper.closeBrowser();
        await jobQueue.close();
    }
}

/**
 * Run optimized scraper — combines all keywords into one search,
 * auto-calculates pages, and filters by threshold days.
 */
async function runOptimizedScrape() {
    const config = await loadConfig();
    const keywords = config.keywords || [];
    const skills = config.skills || [];
    const experience = config.experience || null;
    const preferredLocations = config.preferredLocations || [];
    const thresholdDays = config.thresholdDays || 30;

    if (keywords.length === 0) {
        console.log(chalk.yellow('\n⚠️  No keywords found in config'));
        console.log(chalk.white('Please add keywords via Settings page'));
        return;
    }

    const redis = getRedisConnection();

    // Reset counters for this session
    await redis.set(REDIS_KEYS.JOBS_DISPATCHED, 0);
    await redis.set(REDIS_KEYS.JOBS_PROCESSED, 0);
    await redis.del(REDIS_KEYS.SEARCH_STATS);

    console.log(chalk.blue(`\n📋 Optimized Search Configuration:`));
    console.log(chalk.white(`   Keywords: ${keywords.join(', ')}`));
    if (skills.length > 0) {
        console.log(chalk.magenta(`   🔧 Skills to match: ${skills.join(', ')}`));
    }
    if (experience) {
        console.log(chalk.magenta(`   📋 Experience filter: ${experience.min || 0}-${experience.max || 'any'} years`));
    }
    if (preferredLocations.length > 0) {
        console.log(chalk.magenta(`   📍 Preferred locations: ${preferredLocations.join(', ')}`));
    }
    console.log(chalk.yellow(`   📅 Threshold: skip jobs older than ${thresholdDays} days`));
    console.log(chalk.gray(`   📝 Detail scraping: handled by worker via message queue`));

    const scraper = new NaukriScraper();
    const jobQueue = createJobQueue();
    let totalStats = { found: 0, dispatched: 0, skipped: 0 };

    try {
        // Initialize browser
        await scraper.initBrowser();

        // Login with Naukri credentials
        const email = process.env.NAUKRI_EMAIL;
        const password = process.env.NAUKRI_PASSWORD;
        await scraper.login(email, password);

        // Perform search by typing into Naukri's search bar (page 1)
        console.log(chalk.cyan(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`));
        console.log(chalk.cyan.bold(`📌 Combined Search: "${keywords.join(', ')}"`));
        console.log(chalk.cyan(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`));

        await scraper.performCombinedSearch(keywords, experience, preferredLocations);

        // 📸 Take screenshot after search for verification
        await scraper.captureSearchScreenshot('combined_search_page1.png');

        // Extract total search results metadata
        const metadata = await scraper.extractSearchMetadata();
        const totalResults = metadata.totalResults;
        const jobsPerPage = metadata.jobsPerPage || 20;
        const totalPages = totalResults > 0 ? Math.ceil(totalResults / jobsPerPage) : 1;

        console.log(chalk.blue(`\n📊 Search Results: ${totalResults} total jobs, ${totalPages} pages`));

        // Store in Redis
        await redis.hset(REDIS_KEYS.SEARCH_STATS, {
            totalSearchResults: totalResults.toString(),
            totalPages: totalPages.toString(),
            currentPage: '0',
            totalSkipped: '0',
        });

        const experienceLabel = experience
            ? `${experience.min || 0}-${experience.max || 'any'} yrs`
            : '';

        // Scrape each page
        for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
            try {
                console.log(chalk.cyan(`\n📄 Scraping page ${pageNum}/${totalPages}...`));

                // Update current page in Redis
                await redis.hset(REDIS_KEYS.SEARCH_STATS, 'currentPage', pageNum.toString());

                // Navigate to the page (page 1 is already loaded from performCombinedSearch)
                if (pageNum > 1) {
                    await scraper.navigateToSearchUrl(keywords, experience, preferredLocations, pageNum);
                }

                // Wait for job cards
                try {
                    await scraper.page.waitForSelector('.srp-jobtuple-wrapper, .jobTuple, [data-job-id], .cust-job-tuple', {
                        timeout: 10000,
                    });
                } catch (e) {
                    console.log(chalk.yellow(`⚠️  No job cards found on page ${pageNum}, stopping pagination`));
                    break;
                }

                // Extract job cards
                const combinedKeywordStr = keywords.join(' ');
                const jobs = await scraper.extractJobCards(combinedKeywordStr);

                if (jobs.length === 0) {
                    console.log(chalk.yellow(`⚠️  No jobs extracted from page ${pageNum}, stopping`));
                    break;
                }

                console.log(chalk.white(`   ✅ Found ${jobs.length} jobs on page ${pageNum}`));

                // Dispatch with threshold filtering
                let pageDispatched = 0;
                let pageSkipped = 0;

                for (const job of jobs) {
                    // Check threshold days
                    const daysAgo = parsePostedDaysAgo(job.postedDate);
                    if (daysAgo > thresholdDays) {
                        pageSkipped++;
                        await redis.hincrby(REDIS_KEYS.SEARCH_STATS, 'totalSkipped', 1);
                        continue;
                    }

                    try {
                        await jobQueue.add('scrape-job-detail', {
                            jobUrl: job.jobUrl,
                            searchKeyword: keywords,
                            pageNumber: pageNum,
                            configSkills: skills,
                            experienceFilter: experienceLabel,
                            basicDetails: {
                                title: job.title,
                                company: job.company,
                                location: job.location,
                                experience: job.experience,
                                salary: job.salary,
                                skills: job.skills,
                                description: job.description,
                                postedDate: job.postedDate,
                            },
                        });
                        pageDispatched++;
                        await redis.incr(REDIS_KEYS.JOBS_DISPATCHED);
                    } catch (err) {
                        console.error(chalk.red(`  Error dispatching: ${err.message}`));
                    }
                }

                totalStats.found += jobs.length;
                totalStats.dispatched += pageDispatched;
                totalStats.skipped += pageSkipped;

                console.log(chalk.green(`   📤 Dispatched: ${pageDispatched}`) +
                    (pageSkipped > 0 ? chalk.yellow(` | ⏭️ Skipped: ${pageSkipped}`) : ''));

                // Delay between pages
                if (pageNum < totalPages) {
                    await delay(3000 + Math.random() * 2000);
                }

            } catch (error) {
                console.error(chalk.red(`❌ Error on page ${pageNum}: ${error.message}`));
                if (pageNum === 1) {
                    throw error;
                }
                break;
            }
        }

        // Final summary
        console.log(chalk.green('\n\n╔════════════════════════════════════════╗'));
        console.log(chalk.green('║     🎉 OPTIMIZED SCRAPE COMPLETE!     ║'));
        console.log(chalk.green('╚════════════════════════════════════════╝'));
        console.log(chalk.white('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
        console.log(chalk.blue(`🔎 Search Results: ${totalResults}`));
        console.log(chalk.blue(`📄 Pages Scraped: ${totalPages}`));
        console.log(chalk.blue(`📊 Total Jobs Found: ${totalStats.found}`));
        console.log(chalk.green(`📤 Total Jobs Dispatched: ${totalStats.dispatched}`));
        console.log(chalk.yellow(`⏭️  Total Jobs Skipped: ${totalStats.skipped}`));
        console.log(chalk.gray(`   ℹ️  Run "npm run worker" to process the queue`));
        console.log(chalk.white('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));

    } finally {
        await scraper.closeBrowser();
        await jobQueue.close();
    }
}

/**
 * Run scraper for all keywords from config file (legacy per-keyword approach)
 */
async function runFromConfig() {
    const config = await loadConfig();
    const keywords = config.keywords || [];
    const skills = config.skills || [];
    const experience = config.experience || null;
    const pagesPerKeyword = config.scraping?.pagesPerKeyword || 3;
    const delayBetweenKeywords = config.scraping?.delayBetweenKeywords || 5000;

    if (keywords.length === 0) {
        console.log(chalk.yellow('\n⚠️  No keywords found in config.json'));
        console.log(chalk.white('Please add keywords to config.json:'));
        console.log(chalk.gray(`  {\n    "keywords": ["nodejs developer", "react developer"]\n  }`));
        return;
    }

    console.log(chalk.blue(`\n📋 Found ${keywords.length} keywords in config.json`));
    console.log(chalk.white(`   Keywords: ${keywords.join(', ')}`));
    console.log(chalk.white(`   Pages per keyword: ${pagesPerKeyword}`));

    if (skills.length > 0) {
        console.log(chalk.magenta(`   🔧 Skills to match: ${skills.join(', ')}`));
    }
    if (experience) {
        console.log(chalk.magenta(`   📋 Experience filter: ${experience.min || 0}-${experience.max || 'any'} years`));
    }
    console.log(chalk.gray(`   📝 Detail scraping: handled by worker via message queue`));

    const scraper = new NaukriScraper();
    const jobQueue = createJobQueue();
    let totalStats = { found: 0, dispatched: 0, skipped: 0 };

    try {
        // Initialize browser
        await scraper.initBrowser();

        // Login with Naukri credentials
        const email = process.env.NAUKRI_EMAIL;
        const password = process.env.NAUKRI_PASSWORD;
        await scraper.login(email, password);

        // Scrape each keyword and dispatch to queue
        for (let i = 0; i < keywords.length; i++) {
            const keyword = keywords[i];
            console.log(chalk.cyan(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`));
            console.log(chalk.cyan.bold(`📌 Keyword ${i + 1}/${keywords.length}: "${keyword}"`));
            console.log(chalk.cyan(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`));

            const results = await scrapeAndDispatch(scraper, keyword, pagesPerKeyword, config, jobQueue);

            totalStats.found += results.found;
            totalStats.dispatched += results.dispatched;
            totalStats.skipped += results.skipped;

            // Delay between keywords
            if (i < keywords.length - 1) {
                console.log(chalk.gray(`\n⏳ Waiting ${delayBetweenKeywords / 1000}s before next keyword...`));
                await delay(delayBetweenKeywords);
            }
        }

        // Final summary
        console.log(chalk.green('\n\n╔════════════════════════════════════════╗'));
        console.log(chalk.green('║     🎉 ALL SCRAPING & DISPATCH DONE!  ║'));
        console.log(chalk.green('╚════════════════════════════════════════╝'));
        console.log(chalk.white('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
        console.log(chalk.blue(`🔑 Keywords Processed: ${keywords.length}`));
        console.log(chalk.blue(`📊 Total Jobs Found: ${totalStats.found}`));
        console.log(chalk.green(`📤 Total Jobs Dispatched: ${totalStats.dispatched}`));
        console.log(chalk.yellow(`⏭️  Total Jobs Skipped: ${totalStats.skipped}`));
        console.log(chalk.gray(`   ℹ️  Run "npm run worker" to process the queue`));
        console.log(chalk.white('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));

    } finally {
        await scraper.closeBrowser();
        await jobQueue.close();
    }
}

/**
 * List jobs from MongoDB
 * @param {string} keyword - Optional filter by keyword
 * @param {number} limit - Maximum number of jobs to display
 */
async function listJobs(keyword, limit = 20) {
    let query = {};

    if (keyword) {
        query = {
            $or: [
                { searchKeyword: new RegExp(keyword, 'i') },
                { title: new RegExp(keyword, 'i') },
                { skills: { $in: [new RegExp(keyword, 'i')] } },
                { keySkills: { $in: [new RegExp(keyword, 'i')] } },
                { matchedSkills: { $in: [new RegExp(keyword, 'i')] } }
            ]
        };
    }

    const jobs = await Job.find(query)
        .sort({ scrapedAt: -1 })
        .limit(limit);

    if (jobs.length === 0) {
        console.log(chalk.yellow('\n⚠️  No jobs found in the database.'));
        return;
    }

    console.log(chalk.green(`\n📋 Found ${jobs.length} jobs:\n`));
    console.log(chalk.white('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));

    jobs.forEach((job, index) => {
        console.log(chalk.cyan.bold(`\n${index + 1}. ${job.title}`));
        console.log(chalk.white(`   🏢 Company: ${job.company}`));
        console.log(chalk.white(`   📍 Location: ${job.location}`));
        console.log(chalk.white(`   💼 Experience: ${job.experience}`));
        console.log(chalk.white(`   💰 Salary: ${job.salaryOffered || job.salary}`));

        if (job.keySkills && job.keySkills.length > 0) {
            console.log(chalk.white(`   🔧 Key Skills: ${job.keySkills.slice(0, 8).join(', ')}`));
        } else if (job.skills && job.skills.length > 0) {
            console.log(chalk.white(`   🔧 Skills: ${job.skills.slice(0, 5).join(', ')}`));
        }

        if (job.matchedSkills && job.matchedSkills.length > 0) {
            console.log(chalk.magenta(`   🎯 Matched Skills: ${job.matchedSkills.join(', ')}`));
        }

        if (job.industryTypes && job.industryTypes.length > 0) {
            console.log(chalk.white(`   🏭 Industry: ${job.industryTypes.join(', ')}`));
        }

        if (job.totalVacancy && job.totalVacancy !== 'Not specified') {
            console.log(chalk.white(`   👥 Vacancies: ${job.totalVacancy}`));
        }

        console.log(chalk.gray(`   🔗 ${job.jobUrl}`));
        console.log(chalk.gray(`   📅 Posted: ${job.jobPostedAt || job.postedDate} | Scraped: ${new Date(job.scrapedAt).toLocaleDateString()}`));
    });

    console.log(chalk.white('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));
}

/**
 * Show statistics about stored jobs
 */
async function showStats() {
    const stats = await Job.getStats();

    console.log(chalk.green('\n📈 Database Statistics:\n'));
    console.log(chalk.white('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
    console.log(chalk.blue(`📊 Total Jobs: ${stats.totalJobs}`));
    console.log(chalk.blue(`🏢 Unique Companies: ${stats.uniqueCompanies}`));
    console.log(chalk.blue(`🔑 Keywords Searched: ${stats.keywordsSearched.join(', ') || 'None'}`));
    console.log(chalk.magenta(`🎯 Jobs with Matched Skills: ${stats.jobsWithMatchedSkills}`));
    console.log(chalk.white('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));
}

// Setup CLI
program
    .name('naukri-scraper')
    .description('Scrape job listings from Naukri.com and store in MongoDB')
    .version(packageInfo.version);

// New "run" command - optimized combined search (default)
program
    .command('run')
    .description('Run optimized scraper — combines all keywords into one search, auto-paginates, filters by threshold')
    .action(async () => {
        showBanner();

        try {
            await connectDB();
            await runOptimizedScrape();
        } catch (error) {
            console.error(chalk.red(`\n❌ Error: ${error.message}`));
            process.exit(1);
        } finally {
            await closeDB();
        }
    });

// Legacy per-keyword scrape command
program
    .command('run-keyword')
    .description('Run scraper for each keyword individually (legacy mode)')
    .action(async () => {
        showBanner();

        try {
            await connectDB();
            await runFromConfig();
        } catch (error) {
            console.error(chalk.red(`\n❌ Error: ${error.message}`));
            process.exit(1);
        } finally {
            await closeDB();
        }
    });

// Single keyword scrape command
program
    .command('scrape')
    .description('Scrape jobs for a specific keyword')
    .requiredOption('-k, --keyword <keyword>', 'Job keyword to search for (e.g., "nodejs developer")')
    .option('-p, --pages <number>', 'Number of pages to scrape', '3')
    .option('-l, --login', 'Login to Naukri before scraping', false)
    .action(async (options) => {
        showBanner();

        try {
            await connectDB();
            await runSingleScrape(options.keyword, parseInt(options.pages, 10), options.login);
        } catch (error) {
            console.error(chalk.red(`\n❌ Error: ${error.message}`));
            process.exit(1);
        } finally {
            await closeDB();
        }
    });

program
    .command('list')
    .description('List stored jobs from MongoDB')
    .option('-k, --keyword <keyword>', 'Filter jobs by keyword')
    .option('-l, --limit <number>', 'Maximum number of jobs to display', '20')
    .action(async (options) => {
        showBanner();

        try {
            await connectDB();
            await listJobs(options.keyword, parseInt(options.limit, 10));
        } catch (error) {
            console.error(chalk.red(`\n❌ Error: ${error.message}`));
            process.exit(1);
        } finally {
            await closeDB();
        }
    });

program
    .command('stats')
    .description('Show statistics about stored jobs')
    .action(async () => {
        showBanner();

        try {
            await connectDB();
            await showStats();
        } catch (error) {
            console.error(chalk.red(`\n❌ Error: ${error.message}`));
            process.exit(1);
        } finally {
            await closeDB();
        }
    });

// Parse arguments
program.parse();

// Show help if no command provided
if (!process.argv.slice(2).length) {
    showBanner();
    program.outputHelp();
}
