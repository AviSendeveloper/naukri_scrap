#!/usr/bin/env node

require('dotenv').config({ quiet: true });

const fs = require('fs');
const path = require('path');
const { program } = require('commander');
const chalk = require('chalk');
const { connectDB, closeDB } = require('./config/database');
const Job = require('./models/Job');
const NaukriScraper = require('./scraper/naukriScraper');

// Package info
const packageInfo = require('../package.json');

// Config file path
const CONFIG_PATH = path.join(__dirname, '..', 'config.json');

/**
 * Load configuration from config.json
 * @returns {Object} Configuration object
 */
function loadConfig() {
    try {
        if (fs.existsSync(CONFIG_PATH)) {
            const configData = fs.readFileSync(CONFIG_PATH, 'utf8');
            return JSON.parse(configData);
        }
    } catch (error) {
        console.error(chalk.red(`Error loading config.json: ${error.message}`));
    }
    return {
        keywords: [],
        skills: [],
        experience: null,
        scraping: { pagesPerKeyword: 3, delayBetweenKeywords: 5000, scrapeJobDetails: true }
    };
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
 * Scrape jobs and save to MongoDB
 * @param {Object} scraper - Initialized scraper instance
 * @param {string} keyword - Search keyword
 * @param {number} pages - Number of pages to scrape
 * @param {Object} [config] - Configuration object with skills, experience, scrapeJobDetails
 * @returns {Object} - Results summary
 */
async function scrapeAndSave(scraper, keyword, pages, config = {}) {
    // Scrape jobs (pass config for experience/skills/detail scraping)
    const jobs = await scraper.scrapeJobs(keyword, pages, {
        experience: config.experience || null,
        skills: config.skills || [],
        scrapeJobDetails: config.scraping?.scrapeJobDetails !== false
    });

    if (jobs.length === 0) {
        console.log(chalk.yellow('\n⚠️  No jobs found for the given keyword.'));
        return { found: 0, saved: 0, duplicates: 0, matched: 0 };
    }

    // Save to MongoDB
    console.log(chalk.blue('\n💾 Saving jobs to MongoDB...'));

    let savedCount = 0;
    let duplicateCount = 0;
    let matchedCount = 0;

    for (const jobData of jobs) {
        try {
            // Track matched jobs
            if (jobData.matchedSkills && jobData.matchedSkills.length > 0) {
                matchedCount++;
            }

            // Use upsert to avoid duplicates
            const result = await Job.findOneAndUpdate(
                { jobUrl: jobData.jobUrl },
                jobData,
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );

            if (result.isNew !== false) {
                savedCount++;
            } else {
                duplicateCount++;
            }
        } catch (error) {
            if (error.code === 11000) {
                duplicateCount++;
            } else {
                console.error(chalk.red(`Error saving job: ${error.message}`));
            }
        }
    }

    return { found: jobs.length, saved: savedCount, duplicates: duplicateCount, matched: matchedCount };
}

/**
 * Run scraper for a single keyword (legacy command)
 * @param {string} keyword - Search keyword
 * @param {number} pages - Number of pages to scrape
 * @param {boolean} withLogin - Whether to login first
 */
async function runSingleScrape(keyword, pages, withLogin = false) {
    const config = loadConfig();
    const scraper = new NaukriScraper();

    try {
        // Initialize browser
        await scraper.initBrowser();

        // Login if credentials provided
        if (withLogin) {
            const email = process.env.NAUKRI_EMAIL;
            const password = process.env.NAUKRI_PASSWORD;
            await scraper.login(email, password);
        }

        // Scrape jobs (pass config for experience/skills)
        const results = await scrapeAndSave(scraper, keyword, pages, config);

        // Summary
        console.log(chalk.green('\n✅ Scraping Complete!'));
        console.log(chalk.white('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
        console.log(chalk.blue(`📊 Jobs Found: ${results.found}`));
        console.log(chalk.green(`💾 New Jobs Saved: ${results.saved}`));
        console.log(chalk.yellow(`🔄 Duplicates Skipped: ${results.duplicates}`));
        if (config.skills && config.skills.length > 0) {
            console.log(chalk.magenta(`🎯 Jobs Matched by Skills: ${results.matched}`));
        }
        console.log(chalk.white('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));

    } finally {
        await scraper.closeBrowser();
    }
}

/**
 * Run scraper for all keywords from config file
 */
async function runFromConfig() {
    const config = loadConfig();
    const keywords = config.keywords || [];
    const skills = config.skills || [];
    const experience = config.experience || null;
    const pagesPerKeyword = config.scraping?.pagesPerKeyword || 3;
    const delayBetweenKeywords = config.scraping?.delayBetweenKeywords || 5000;
    const scrapeJobDetails = config.scraping?.scrapeJobDetails !== false;

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
    if (scrapeJobDetails) {
        console.log(chalk.gray(`   📝 Detail scraping: enabled (will visit each job page)`));
    }

    const scraper = new NaukriScraper();
    let totalStats = { found: 0, saved: 0, duplicates: 0, matched: 0 };

    try {
        // Initialize browser
        await scraper.initBrowser();

        // Login with Naukri credentials
        const email = process.env.NAUKRI_EMAIL;
        const password = process.env.NAUKRI_PASSWORD;
        await scraper.login(email, password);

        // Scrape each keyword
        for (let i = 0; i < keywords.length; i++) {
            const keyword = keywords[i];
            console.log(chalk.cyan(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`));
            console.log(chalk.cyan.bold(`📌 Keyword ${i + 1}/${keywords.length}: "${keyword}"`));
            console.log(chalk.cyan(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`));

            const results = await scrapeAndSave(scraper, keyword, pagesPerKeyword, config);

            totalStats.found += results.found;
            totalStats.saved += results.saved;
            totalStats.duplicates += results.duplicates;
            totalStats.matched += results.matched;

            // Delay between keywords
            if (i < keywords.length - 1) {
                console.log(chalk.gray(`\n⏳ Waiting ${delayBetweenKeywords / 1000}s before next keyword...`));
                await delay(delayBetweenKeywords);
            }
        }

        // Final summary
        console.log(chalk.green('\n\n╔════════════════════════════════════════╗'));
        console.log(chalk.green('║        🎉 ALL SCRAPING COMPLETE!       ║'));
        console.log(chalk.green('╚════════════════════════════════════════╝'));
        console.log(chalk.white('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
        console.log(chalk.blue(`🔑 Keywords Processed: ${keywords.length}`));
        console.log(chalk.blue(`📊 Total Jobs Found: ${totalStats.found}`));
        console.log(chalk.green(`💾 Total New Jobs Saved: ${totalStats.saved}`));
        console.log(chalk.yellow(`🔄 Total Duplicates Skipped: ${totalStats.duplicates}`));
        if (skills.length > 0) {
            console.log(chalk.magenta(`🎯 Total Jobs Matched by Skills: ${totalStats.matched}`));
        }
        console.log(chalk.white('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));

    } finally {
        await scraper.closeBrowser();
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

// New "run" command - uses config file and login
program
    .command('run')
    .description('Run scraper for all keywords in config.json (with Naukri login)')
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
