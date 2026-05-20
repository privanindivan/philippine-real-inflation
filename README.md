# Philippine Real Inflation

**pri.netlify.app** — An alternative Philippine inflation tracker that shows what inflation actually feels like, not just what the government reports.

> PSA Official CPI is real. This project asks: *is it complete?*

---

## What This Is

The Philippine Statistics Authority (PSA) publishes monthly CPI inflation figures. These are methodologically sound but miss two things that disproportionately affect Filipino households:

1. **Market rice prices** — PSA's sampling includes NFA-subsidized rice, which most Filipinos don't actually buy. Market rice costs more.
2. **Peso depreciation passthrough** — When the peso weakens, import costs rise immediately at the wholesale level. PSA captures this months later in CPI.

This project adds both adjustments to produce a **Real Inflation** figure alongside PSA's official number.

---

## The Formula

```
Real Inflation = PSA Official CPI
              + 0.5pp  (market rice adjustment)
              + peso dep% × 30% × 50%  (import passthrough)
```

**Why 30%?** The Philippines imports roughly 30% of household consumption — all fuel, most wheat, many goods.

**Why 50%?** Estimated passthrough rate — not all import cost increases reach retail prices immediately.

**Why 0.5pp for rice?** PSA's rice sampling includes NFA-subsidized prices. Actual wet market prices run consistently higher. 0.5pp is a conservative adjustment.

These are starting estimates. Fork this repo, challenge them, improve them.

---

## Data Sources

| Data | Source | URL |
|------|--------|-----|
| PSA Official CPI | Philippine Statistics Authority | [psa.gov.ph](https://psa.gov.ph/price-indices/cpi-ir) |
| Peso depreciation | Bangko Sentral ng Pilipinas | [bsp.gov.ph](https://www.bsp.gov.ph/sitepages/statistics/exchangerate.aspx) |
| Rice prices | PSA Price Situationer | [psa.gov.ph](https://psa.gov.ph/statistics/price-situationer/selected-agri-commodities) |
| Historical CPI (2000–2014) | World Bank WDI via FRED | [fred.stlouisfed.org](https://fred.stlouisfed.org/data/FPCPITOTLZGPHL) |

All data is public. All sources are government or multilateral. No proprietary data.

---

## Features

- **Now tab** — Official vs Real inflation side by side, filterable by year (2000–present) and month (2026)
- **Calculator tab** — Enter your savings, bank rate, and deposit date. See what your money is actually worth today vs what PSA claims.
- **How tab** — Full methodology, formula, and source links
- **Download** — Shareable image card of the current reading
- **Dark mode** — Toggle between light and dark

---

## Stack

- **React** (single JSX file, no build step needed for Claude.ai preview)
- **Recharts** — area chart and line chart
- **Netlify** — hosting and auto-deploy
- **GitHub** — version control and open source

- **React** (frontend)
- **Recharts** — charts
- **GitHub Actions** — automated monthly data fetching (PSA + BSP)
- **Netlify** — hosting, auto-deploys on every GitHub push

No database. No server. Data lives in `data.json` in the repo, updated automatically by GitHub Actions every time PSA releases new CPI figures.

---

## Monthly Update Process

Fully automated via GitHub Actions. Every Monday the scraper checks PSA and BSP, updates `data.json`, commits, and Netlify deploys automatically.

If the scraper needs a manual override, edit `data.json` directly and push. See `EXECUTION.md` for details.

---

## Contributing

This project is open source because **methodology transparency is the point**. If you think the adjustments are wrong, prove it — fork the repo and show your math.

Ways to contribute:

- **Better rice price data** — Regional wet market prices vs PSA's sampled prices
- **Better peso passthrough estimate** — The 30%/50% figures are estimates. Academic papers on Philippine import passthrough rates welcome.
- **Regional breakdown** — PSA publishes regional CPI. Adding regional Real Inflation numbers would be valuable.
- **Historical data before 2000** — PSA has data back to 1997. The Asian financial crisis years (1997–1999) would be interesting context.

Open a PR or file an issue.

---

## License

MIT. Use it, fork it, build on it.

Data sourced from PSA and BSP is public domain under Philippine open data policy.

---

## Disclaimer

This is an independent project. Not affiliated with PSA, BSP, or any Philippine government agency. The Real Inflation figure is an estimate with acknowledged assumptions. It is not investment advice.
