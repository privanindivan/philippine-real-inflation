const fs = require('fs');
const https = require('https');
const XLSX = require('xlsx');

const MONTHS_LONG  = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    const get = (u) => {
      https.get(u, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
        if ([301,302,303,307,308].includes(res.statusCode) && res.headers.location) {
          return get(res.headers.location);
        }
        const chunks = [];
        res.on('data', c => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks)));
        res.on('error', reject);
      }).on('error', reject);
    };
    get(url);
  });
}

async function getBSPMonthlyRates() {
  console.log('Fetching BSP pesodollar.xlsx...');
  const buf = await fetchBuffer('https://www.bsp.gov.ph/statistics/external/pesodollar.xlsx');
  const wb = XLSX.read(buf, { type: 'buffer' });
  const ws = wb.Sheets['monthly'];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });

  const rates = [];
  let curYear = null;
  for (const row of rows) {
    if (typeof row[1] === 'number' && row[1] > 1944) curYear = row[1];
    const monthName = row[2];
    const avg = row[3];
    if (curYear && typeof monthName === 'string' && typeof avg === 'number') {
      const mIdx = MONTHS_LONG.indexOf(monthName);
      if (mIdx >= 0) rates.push({ year: curYear, month: mIdx + 1, avg: +avg.toFixed(4) });
    }
  }
  console.log(`BSP: ${rates.length} monthly records, latest: ${rates.at(-1)?.year}-${rates.at(-1)?.month}`);
  return rates;
}

function computePD(rates, year, month) {
  const cur  = rates.find(r => r.year === year     && r.month === month);
  const prev = rates.find(r => r.year === year - 1 && r.month === month);
  if (!cur || !prev) return null;
  return +((cur.avg - prev.avg) / prev.avg * 100).toFixed(2);
}

async function main() {
  const data = JSON.parse(fs.readFileSync('data.json', 'utf8'));
  let changed = false;

  // --- Update pd values from BSP ---
  const rates = await getBSPMonthlyRates();

  for (const row of data.monthly) {
    const [mName, yr] = row.m.split(' ');
    const mIdx = MONTHS_SHORT.indexOf(mName);
    const year = parseInt(yr);
    if (mIdx < 0 || isNaN(year)) continue;
    const pd = computePD(rates, year, mIdx + 1);
    if (pd !== null && pd !== row.pd) {
      console.log(`pd update: ${row.m}  ${row.pd} → ${pd}`);
      row.pd = pd;
      changed = true;
    }
  }

  // --- Check for new month in BSP not yet in data.monthly ---
  const latest = rates.at(-1);
  if (latest) {
    const label = `${MONTHS_SHORT[latest.month - 1]} ${latest.year}`;
    if (!data.monthly.find(r => r.m === label)) {
      const pd = computePD(rates, latest.year, latest.month);
      if (pd !== null) {
        // Placeholder: off must be filled in manually after PSA releases the figure
        console.log(`NEW MONTH AVAILABLE: ${label} (pd=${pd}). Set off manually from PSA CPI release.`);
        // Uncomment to auto-add with off=null once PSA figure is confirmed:
        // data.monthly.push({ m: label, off: null, pd });
        // changed = true;
      }
    }
  }

  data.last_updated = new Date().toISOString().split('T')[0];
  fs.writeFileSync('data.json', JSON.stringify(data, null, 2));
  console.log(changed ? 'data.json updated.' : 'No pd changes.');
}

main().catch(err => { console.error(err); process.exit(1); });
