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

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json;odata=verbose' } }, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
        catch (e) { reject(new Error('JSON parse failed: ' + e.message)); }
      });
      res.on('error', reject);
    }).on('error', reject);
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

async function getBSPInflationRate() {
  console.log('Fetching BSP Key Rates (inflation rate)...');
  const url = "https://www.bsp.gov.ph/_api/web/lists/GetByTitle('Key%20Rates')/items?$select=Title,Value,Order0,Published_x0020_Date&$orderby=Order0%20asc";
  const json = await fetchJSON(url);
  const items = json?.d?.results || [];
  const inflItem = items.find(i => i.Order0 === 2);
  if (!inflItem) throw new Error('Inflation rate item (Order0=2) not found in BSP Key Rates list');

  const valueStr = inflItem.Value; // e.g. "7.2%"
  const periodStr = inflItem.Published_x0020_Date; // e.g. "April 2026"

  const off = parseFloat(valueStr);
  if (isNaN(off)) throw new Error(`Could not parse inflation rate from: "${valueStr}"`);

  // Parse "April 2026" → "Apr 2026"
  const parts = periodStr.trim().split(/\s+/);
  const mIdx = MONTHS_LONG.indexOf(parts[0]);
  const year = parseInt(parts[1]);
  if (mIdx < 0 || isNaN(year)) throw new Error(`Could not parse period from: "${periodStr}"`);
  const label = `${MONTHS_SHORT[mIdx]} ${year}`;

  console.log(`BSP inflation rate: ${valueStr} for ${label}`);
  return { off, label, month: mIdx + 1, year };
}

async function main() {
  const data = JSON.parse(fs.readFileSync('data.json', 'utf8'));
  let changed = false;

  // --- Update pd values from BSP pesodollar.xlsx ---
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

  // --- Check for new month from BSP Key Rates (PSA official CPI) ---
  const latest = await getBSPInflationRate();
  const exists = data.monthly.find(r => r.m === latest.label);

  if (!exists) {
    const pd = computePD(rates, latest.year, latest.month);
    if (pd !== null) {
      data.monthly.push({ m: latest.label, off: latest.off, pd });
      console.log(`NEW MONTH ADDED: ${latest.label} (off=${latest.off}, pd=${pd})`);
      changed = true;
    } else {
      console.log(`NEW MONTH DETECTED: ${latest.label} (off=${latest.off}) but BSP peso data not yet available for pd — skipping`);
    }
  } else if (exists.off !== latest.off) {
    console.log(`off update: ${latest.label}  ${exists.off} → ${latest.off}`);
    exists.off = latest.off;
    changed = true;
  }

  data.last_updated = new Date().toISOString().split('T')[0];
  fs.writeFileSync('data.json', JSON.stringify(data, null, 2));
  console.log(changed ? 'data.json updated.' : 'No changes.');
}

main().catch(err => { console.error(err); process.exit(1); });
