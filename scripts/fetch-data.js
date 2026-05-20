const fs = require('fs');

async function fetchPSA() {
  // PSA CPI release page — parse latest monthly figure
  // Update this URL when PSA changes their page structure
  const res = await fetch('https://psa.gov.ph/price-indices/cpi-ir');
  const html = await res.text();
  // Parse the latest inflation rate from the page
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
