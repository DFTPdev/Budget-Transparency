# Virginia Budget Pipeline (DFTP)

This repo fetches LIS member amendments, normalizes them, aggregates by House district, and (optionally) merges totals into district GeoJSON for the District Spotlight Map.

## Quick Start
1. Edit `lis.config.json`:
   - Add LIS URLs to `"sources"`
   - Verify paths under `"paths"` match your repo (especially `"referenceRoster"`)

2. Install deps:
   ```bash
   npm install
   ```

3. Run ETL:
   ```bash
   node scripts/fetch_lis_member_amendments.js
   node scripts/aggregate_by_district.js
   ```

4. Outputs land in `data/processed/`:
   - `lis_member_amendments.normalized.json`
   - `district_totals.json`
   - `district_totals.csv`

## Layout
- `data/` — raw HTML, reference roster, processed outputs, geo assets
- `scripts/` — fetch, aggregate, (merge-to-geojson coming next)
- `etl/` — self-contained ETL bundle + docs
- `docs/` — project docs

## Sanity check
Use this helper to confirm the roster path is correct (it reads `lis.config.json`):
```bash
python3 run_etl.py   # if placed in repo root
```
