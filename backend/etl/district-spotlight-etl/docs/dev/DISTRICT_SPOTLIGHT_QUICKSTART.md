# District Spotlight ETL — Quick Start (Patched)

**What changed**
- `lis.config.json` now points to your roster: `./va_house_roster_with_localities_overlay.json`.
- Aggregator now includes `localities` in output and handles suffixes (`Jr.`, `III`, etc.).

**Run order**
1. Edit `lis.config.json` and add real LIS member-amendment URLs to `"sources"`.
2. Run: `node fetch_lis_member_amendments.js`
3. Run: `node aggregate_by_district.js`
4. Inspect outputs in `../data/processed` (`district_totals.json`, `district_totals.csv`).

**Next step (map)**  
Merge `district_totals.json` into your House District GeoJSON (properties per district) for the Leaflet Spotlight Map.