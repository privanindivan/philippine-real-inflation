# Philippine Real Inflation

**phri.netlify.app** — An alternative Philippine inflation tracker showing what inflation actually feels like, not just what the government reports.

> PSA Official CPI is real. This project asks: *is it complete?*

---

## What This Is

The Philippine Statistics Authority (PSA) publishes monthly CPI inflation figures. These are methodologically sound but miss two things that disproportionately affect Filipino households:

1. **Market rice prices** — PSA's sampling historically included NFA-subsidized rice outlets. Most Filipinos never accessed NFA rice and paid commercial market prices. After the 2019 Rice Tariffication Law, NFA exited retail entirely.
2. **Peso depreciation passthrough** — When the peso weakens, import costs hit wholesale immediately. CPI captures it months later.

This project adds both adjustments to produce a **Real Inflation** figure alongside PSA's official number.

---

## The Formula

```
Real Inflation = PSA Official CPI
              + rice_adj[year]          (year-specific NFA distortion)
              + peso_dep% × 35% × 65%  (import passthrough)
```

**Why 35% import share?** Philippines imports 100% of petroleum products, 100% of wheat, and significant manufactured goods. Counting the import content of domestically-produced goods (fuel for transport, fertilizer, packaging) pushes effective household consumption exposure to ~35%.

**Why 65% passthrough?** Philippine retailers — especially wet markets — adjust prices fast when import costs rise. The 65% rate reflects that most import price shocks reach consumer prices within the year. CPI's measured passthrough understates this because it lags by weeks to months.

**Why year-specific rice?** The NFA-vs-commercial price gap changed every year. NFA sold at ₱10–27/kg while commercial rice ranged ₱19–46/kg. With ~12% of PSA's sampled outlets being NFA outlets (PIDS estimate of NFA retail share), this understated actual rice prices paid by most consumers. Post-2019, the adjustment is zero — NFA is out of the retail market.

| Period | Rice Adj | Notes |
|--------|----------|-------|
| 2000 | 0.5pp | NFA ₱10–12 vs market ₱19.50 — largest relative gap |
| 2001–2007 | 0.2–0.3pp | NFA ₱16–17, smaller gap |
| 2008 | 0.5pp | Global rice crisis — NFA ₱18.25 vs market ₱31–32 |
| 2009–2013 | 0.2pp | NFA raised to ₱27, market ₱31–35 |
| 2014–2018 | 0.3–0.4pp | Market rose to ₱38–46 while NFA held at ₱27 |
| 2019–2025 | 0.0pp | Rice Tariffication Law — NFA exited retail |

**Peso depreciation data** is the BSP official annual average USD/PHP rate from `pesodollar.xlsx` (bsp.gov.ph). Appreciation years produce negative adjustments — a stronger peso reduces import-driven inflation.

These are estimates with acknowledged assumptions. Fork this repo, challenge them, improve them.

---

## Data Sources

| Data | Source | Auto-updated? |
|------|--------|---------------|
| PSA Official CPI (monthly `off`) | BSP Key Rates public feed (mirrors PSA) | ✅ Auto-updated — script checks weekly, new data monthly |
| Peso depreciation (monthly `pd`) | BSP `pesodollar.xlsx` — monthly USD/PHP averages, YoY % | ✅ Auto-updated — script checks weekly, new data monthly |
| Rice adjustment | PSA Price Situationer + PIDS NFA outlet share research | Static (historical constants; 0pp post-2019) |
| Annual PESO_DEP (year chart) | BSP `pesodollar.xlsx` — annual averages | Manual update per year |
| Historical CPI 2000–2025 (year chart) | World Bank WDI via FRED | Manual update per year |

All data is public. All sources are government or multilateral. No proprietary data.

### How automation works

A GitHub Actions workflow runs every Monday (2am UTC). It:

1. Fetches `pesodollar.xlsx` from BSP and computes YoY peso depreciation for each existing month (`pd`)
2. Fetches BSP's Key Rates API (the same feed that powers bsp.gov.ph's homepage ticker) — this carries the latest PSA official CPI figure and its reference period
3. If a new month appears that isn't in `data.json`, it auto-adds the row with both `off` and `pd`
4. Commits and pushes if anything changed; Netlify auto-deploys from the push

---

## Features

- **Now tab** — Official vs Real inflation side by side, filterable by year (2000–present) and month (2026)
- **Calculator tab** — Enter your savings, bank rate, and deposit date. See what your money is actually worth today vs what PSA claims.
- **How tab** — Full methodology, formula, and source links
- **Dark mode** — Persists across refreshes

---

## Stack

- **React 18** — frontend
- **Recharts** — area chart and line chart
- **Vite** — build tool
- **Netlify** — hosting, auto-deploys on every GitHub push
- **GitHub** — version control and open source

---

## Contributing

This project is open source because **methodology transparency is the point**. If you think the adjustments are wrong, prove it — fork the repo and show your math.

Ways to contribute:

- **Nationwide housing/rent premium** — BSP's years of low rates inflated property and rental prices beyond what PSA's housing component captures. Sourcing a defensible nationwide annual rent index from public data would be the most meaningful next addition.
- **Regional breakdown** — PSA publishes regional CPI. Adding regional Real Inflation numbers would show how the peso and rice distortions hit provinces differently.
- **Historical data before 2000** — The Asian financial crisis years (1997–1999) would add important context.

Open a PR or file an issue.

---

## License

MIT. Use it, fork it, build on it.

Data sourced from PSA and BSP is public domain under Philippine open data policy.

---

## Disclaimer

This is an independent project. Not affiliated with PSA, BSP, or any Philippine government agency. The Real Inflation figure is an estimate with acknowledged assumptions. It is not investment advice.
