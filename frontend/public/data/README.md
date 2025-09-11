# Data Files

## GeoJSON Files

- `vpap-precincts.geojson` - Virginia precinct boundaries with spending data (sp_amt, sr_amt)
- `virginia-districts.geojson` - Virginia State Senate district boundaries (used in leaflet-districts-map.tsx)
- `virginia-senate.geojson` - TODO: Not currently used; candidate for removal after verification

## Usage

The active map component (`leaflet-districts-map.tsx`) uses:
- `vpap-precincts.geojson` for precinct-level spending visualization
- `virginia-districts.geojson` for district boundary overlays and aggregation
