# Naukri Job Scraper

A Node.js application to scrape job listings from Naukri.com based on keywords, skills, and experience — and store enriched results in MongoDB.

## Features

- 🔍 Search jobs by keyword on Naukri.com
- 🔐 Login to Naukri with your account credentials
- 📋 Configure multiple keywords, skills, and experience range in `config.json`
- 🎯 **Skill matching** — automatically matches job skills against your configured skills
- � **Experience filtering** — filters search results by min/max years of experience
- 📝 **Detail scraping** — visits each job page to extract full description, key skills, industry, salary, vacancy, and posted date
- �💾 Store enriched results in MongoDB with duplicate detection
- 🤖 Headless browser scraping using Puppeteer
- 🛡️ Anti-detection measures (user agent rotation, delays)

## Prerequisites

- Node.js 18+ 
- MongoDB (local or Atlas)
- Naukri.com account (optional, for authenticated searches)

## Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env` file:
   ```bash
   cp .env.example .env
   ```

3. Edit `.env` with your credentials:
   ```env
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/naukri_jobs
   NAUKRI_EMAIL=your-naukri-email@example.com
   NAUKRI_PASSWORD=your-naukri-password
   ```

4. Configure `config.json`:
   ```json
   {
     "keywords": [
       "nodejs developer",
       "react developer",
       "full stack developer",
       "mern stack developer"
     ],
     "skills": [
       "node.js",
       "react",
       "mongodb",
       "express",
       "javascript",
       "typescript"
     ],
     "experience": {
       "min": 0,
       "max": 5
     },
     "scraping": {
       "pagesPerKeyword": 3,
       "delayBetweenKeywords": 5000,
       "scrapeJobDetails": true
     }
   }
   ```

### Config Options

| Key | Type | Description |
|---|---|---|
| `keywords` | `string[]` | Job search keywords to scrape |
| `skills` | `string[]` | Skills to match against job listings (case-insensitive) |
| `experience.min` | `number` | Minimum years of experience filter |
| `experience.max` | `number` | Maximum years of experience filter |
| `scraping.pagesPerKeyword` | `number` | Number of result pages to scrape per keyword |
| `scraping.delayBetweenKeywords` | `number` | Delay (ms) between keyword searches |
| `scraping.scrapeJobDetails` | `boolean` | Visit each job page for full details (slower but richer data) |

## Usage

### Run All Keywords (Recommended)

Uses `config.json` keywords, skills, experience filters and logs into Naukri:

```bash
npm start
# or
node src/index.js run
```

### Scrape Single Keyword

Still uses skills & experience from `config.json` for matching/filtering:

```bash
# Without login
node src/index.js scrape --keyword "nodejs developer"

# With login
node src/index.js scrape --keyword "nodejs developer" --login

# Custom page count
node src/index.js scrape --keyword "react developer" --pages 5
```

### List Stored Jobs

```bash
# All jobs
node src/index.js list

# Filter by keyword or skill
node src/index.js list --keyword "nodejs"

# Limit results
node src/index.js list --keyword "react" --limit 10
```

### View Statistics

```bash
node src/index.js stats
```

## Job Schema

Each stored job contains:

| Field | Description |
|---|---|
| `title` | Job title |
| `company` | Company name |
| `location` | Job location |
| `experience` | Required experience (from listing) |
| `salary` | Salary from listing card |
| `salaryOffered` | Detailed salary from job page |
| `skills` | Skills from listing card |
| `keySkills` | All key skills from job detail page |
| `description` | Brief description / snippet |
| `fullDescription` | Complete job description from detail page |
| `industryTypes` | Industry categories |
| `jobPostedAt` | When the job was posted |
| `totalVacancy` | Number of openings (if available) |
| `matchedSkills` | Config skills that matched this job |
| `experienceFilter` | Experience filter used during search |
| `jobUrl` | Link to the job posting |
| `searchKeyword` | Keyword used to find this job |
| `scrapedAt` | Timestamp of when the job was scraped |

## Project Structure

```
NaukriScrap/
├── src/
│   ├── config/database.js       # MongoDB connection
│   ├── models/Job.js            # Job schema (enriched)
│   ├── scraper/naukriScraper.js  # Puppeteer scraper + login + detail scraping
│   └── index.js                 # CLI entry point
├── config.json                  # Keywords, skills & experience config
├── .env                         # Your credentials
└── package.json
```

## License

ISC
