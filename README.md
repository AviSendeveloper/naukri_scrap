# Naukri Job Scraper

A Node.js application to scrape job listings from Naukri.com based on keywords and store them in MongoDB.

## Features

- 🔍 Search jobs by keyword on Naukri.com
- 🔐 Login to Naukri with your account credentials
- 📋 Configure multiple keywords in `config.json`
- 💾 Store results in MongoDB with duplicate detection
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

4. Configure keywords in `config.json`:
   ```json
   {
     "keywords": [
       "nodejs developer",
       "react developer",
       "full stack developer"
     ],
     "scraping": {
       "pagesPerKeyword": 3,
       "delayBetweenKeywords": 5000
     }
   }
   ```

## Usage

### Run All Keywords (Recommended)

Uses `config.json` keywords and logs into Naukri:

```bash
node src/index.js run
```

### Scrape Single Keyword

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

# Filter by keyword
node src/index.js list --keyword "nodejs"
```

### View Statistics

```bash
node src/index.js stats
```

## Project Structure

```
NaukriScrap/
├── src/
│   ├── config/database.js    # MongoDB connection
│   ├── models/Job.js         # Job schema
│   ├── scraper/naukriScraper.js  # Puppeteer scraper + login
│   └── index.js              # CLI entry point
├── config.json               # Keywords configuration
├── .env                      # Your credentials
└── package.json
```

## License

ISC
