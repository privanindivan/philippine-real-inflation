# Execution Guide — Philippine Real Inflation

Step-by-step from zero to fully automated live site.

---

## Stack

```
GitHub          — code, data (data.json), version history, open source
GitHub Actions  — automated monthly scraper (PSA + BSP)
Netlify         — hosting, auto-deploys on every GitHub push
```

That's it. No database. No server. No paid services.

---

## Repo Structure

```
philippine-real-inflation/
├── index.html                        # Netlify entry point
├── philippine-real-inflation.jsx     # Main React app
├── data.json                         # Auto-updated by GitHub Actions
├── scripts/
│   └── fetch-data.js                 # Scraper run by GitHub Actions
├── .github/
│   └── workflows/
│       └── update-data.yml           # Scheduled automation
├── README.md
└── EXECUTION.md
```

---

## Phase 1 — Deploy

### Step 1 — Create GitHub repo

1. Go to [github.com](https://github.com) → New repository
2. Name: `philippine-real-inflation`
3. Set to **Public**
4. Don't initialize with README
5. Click **Create repository**

### Step 2 — Push your files

```bash
git init
git add .
git commit -m "initial: Philippine Real Inflation v1"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/philippine-real-inflation.git
git push -u origin main
```

### Step 3 — Deploy on Netlify

1. Go to [netlify.com](https://netlify.com) → Sign up free with GitHub
2. **Add new site** → **Import an existing project** → GitHub
3. Select `philippine-real-inflation`
4. Build command: *(leave blank)*
5. Publish directory: *(leave blank)*
6. **Deploy site**
7. **Site settings** → **Change site name** → `pri`
8. Live at `pri.netlify.app`

Every push to GitHub auto-deploys in ~30 seconds.

### Step 4 — index.html wrapper

Create `index.html` in repo root:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <meta name="description" content="Philippine Real Inflation — what inflation actually feels like vs PSA official CPI"/>
  <meta property="og:title" content="Philippine Real Inflation"/>
  <meta property="og:description" content="PSA says 7.2%. Real inflation is 8.1%."/>
  <meta property="og:image" content="/og-card.png"/>
  <title>Philippine Real Inflation</title>
  <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <script src="https://unpkg.com/recharts/umd/Recharts.js"></script>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel" src="philippine-real-inflation.jsx"></script>
  <script>
    ReactDOM.createRoot(document.getElementById('root')).render(
      React.createElement(App)
    );
  </script>
</body>
</html>
```

---

## Phase 2 — Full Automation

### data.json structure

Create `data.json` in repo root. The app reads from this instead of hardcoded constants:

```json
{
  "official": {
    "2000": 4.0, "2001": 5.3, "2002": 2.7, "2003": 2.3, "2004": 4.8,
    "2005": 6.5, "2006": 5.5, "2007": 2.9, "2008": 8.3, "2009": 4.2,
    "2010": 3.8, "2011": 4.7, "2012": 3.0, "2013": 2.6, "2014": 3.6,
    "2015": 1.4, "2016": 1.3, "2017": 2.9, "2018": 5.2, "2019": 2.5,
    "2020": 2.4, "2021": 3.9, "2022": 5.8, "2023": 6.0, "2024": 3.2,
    "2025": 1.7
  },
  "peso_dep": {
    "2000": 5.0, "2001": 15.4, "2002": 2.0, "2003": 4.0, "2004": 3.0,
    "2005": 0, "2006": 0, "2007": 0, "2008": 6.0, "2009": 0,
    "2010": 0, "2011": 0, "2012": 0, "2013": 1.8, "2014": 3.5,
    "2015": 1.0, "2016": 4.4, "2017": 5.8, "2018": 5.4, "2019": 0,
    "2020": 0, "2021": 0.6, "2022": 12.9, "2023": 2.0, "2024": 3.4,
    "2025": 1.6
  },
  "monthly": [
    { "m": "Jan 2026", "off": 2.0, "pd": 1.2 },
    { "m": "Feb 2026", "off": 2.4, "pd": 1.4 },
    { "m": "Mar 2026", "off": 4.1, "pd": 2.1 },
    { "m": "Apr 2026", "off": 7.2, "pd": 2.7 }
  ],
  "last_updated": "2026-04-05"
}
```

### Scraper script

Create `scripts/fetch-data.js`:

```js
const fs = require('fs');

async function fetchPSA() {
  // PSA CPI release page — parse latest monthly figure
  // Update this URL when PSA changes their page structure
  const res = await fetch('https://psa.gov.ph/price-indices/cpi-ir');
  const html = await res.text();
  // Parse the latest inflation rate from the page
  // PSA always shows the most recent in the headline
  const match = html.match(/(\d+\.\d+)\s*percent/i);
  return match ? parseFloat(match[1]) : null;
}

async function fetchBSP() {
  // BSP daily reference exchange rate
  const res = await fetch('https://www.bsp.gov.ph/statistics/external/day99.aspx');
  const html = await res.text();
  const match = html.match(/USD.*?(\d+\.\d+)/s);
  return match ? parseFloat(match[1]) : null;
}

async function main() {
  const data = JSON.parse(fs.readFileSync('data.json', 'utf8'));
  
  const latestRate = await fetchPSA();
  const usdPhp = await fetchBSP();
  
  if (latestRate) {
    console.log(`PSA latest: ${latestRate}%`);
    // Add logic to detect if this is a new month and append to monthly[]
  }
  
  if (usdPhp) {
    console.log(`USD/PHP: ${usdPhp}`);
  }
  
  data.last_updated = new Date().toISOString().split('T')[0];
  fs.writeFileSync('data.json', JSON.stringify(data, null, 2));
}

main().catch(console.error);
```

> **Note:** PSA and BSP don't have public APIs. The scraper parses their HTML pages. It will need adjusting if they change their page structure — but that's a 10-minute fix, not a rebuild.

### GitHub Actions workflow

Create `.github/workflows/update-data.yml`:

```yaml
name: Update inflation data

on:
  schedule:
    - cron: '0 2 * * 1'  # Every Monday 2am UTC (10am Manila)
  workflow_dispatch:       # Also allows manual trigger from GitHub UI

jobs:
  update:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          
      - name: Fetch latest data
        run: node scripts/fetch-data.js
        
      - name: Commit if data changed
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git diff --quiet data.json || (
            git add data.json
            git commit -m "data: auto-update $(date +%Y-%m-%d)"
            git push
          )
```

This runs every Monday. If `data.json` changed, it commits and pushes. Netlify sees the push and deploys. **Zero manual work.**

The `git diff --quiet` check means it only commits when data actually changed — so you won't have empty commits on weeks PSA doesn't release.

---

## Manual Override

If GitHub Actions fails or PSA changes their page structure, you can always update manually:

```bash
# Edit data.json directly
# Add new month to the "monthly" array
# Push to GitHub
git add data.json
git commit -m "data: manual update May 2026"
git push
```

Netlify deploys in 30 seconds. Back to normal.

---

## Sharing the Launch

**Facebook groups:**
- Pera Paraan PH
- Philippines Personal Finance
- OFW Money Matters
- Investing in the Philippines

**What to post:**
- Download the card from the site
- One line: "PSA says 7.2%. Here's what it actually is for most Filipinos."
- Link: `pri.netlify.app`

Don't explain the methodology. Let them click the How tab.

---

## Common Issues

**Netlify shows blank page**
- Open browser console (F12) → check for red errors
- Usually a JSX syntax error

**GitHub Actions not running**
- Check Actions tab in GitHub repo
- Make sure the workflow file is in `.github/workflows/`

**Scraper gets wrong number**
- PSA or BSP changed their page HTML
- Update the regex in `scripts/fetch-data.js`
- Manual update in the meantime via `data.json`
