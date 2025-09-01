//
// scripts/merge_totals_geojson.js
// Merge per-district totals into a base House Districts GeoJSON for the Spotlight Map.
//
// Inputs (relative to this file):
//   - ../data/processed/district_totals.json         (from aggregate_by_district.js)
//   - ../data/geo/va_house_districts.geojson        (base shapes; Feature.properties.district must exist or be inferrable)
//
// Output:
//   - ../data/geo/va_house_districts_merged.geojson
//
// Usage:
//   node scripts/merge_totals_geojson.js
//
const fs = require('fs');
const path = require('path');

const BASE_DIR = __dirname;
const TOTALS_PATH = path.resolve(BASE_DIR, '../data/processed/district_totals.json');
const BASE_GEO_PATH = path.resolve(BASE_DIR, '../data/geo/va_house_districts.geojson');
const OUT_GEO_PATH = path.resolve(BASE_DIR, '../data/geo/va_house_districts_merged.geojson');

function readJson(fp) {
  if (!fs.existsSync(fp)) {
    throw new Error(`Missing file: ${fp}`);
  }
  return JSON.parse(fs.readFileSync(fp, 'utf8'));
}

function normDistrict(v) {
  // accept "1", 1, "HD-01", etc. Return canonical string digits without leading zeros.
  if (v == null) return '';
  const s = String(v).trim();
  // Try to pick last numeric group
  const m = s.match(/(\d{1,3})$/);
  const num = m ? parseInt(m[1], 10) : parseInt(s.replace(/\D+/g, ''), 10);
  if (!Number.isFinite(num)) return '';
  return String(num);
}

function buildTotalsMap(totalsJson) {
  const rows = totalsJson.rows || totalsJson; // tolerate either wrapped or array shape
  const map = new Map();
  for (const r of rows) {
    const d = normDistrict(r.district);
    if (!d) continue;
    map.set(d, {
      total: Number(r.total || 0),
      count: Number(r.count || 0),
      members: Array.isArray(r.members) ? r.members : [],
      localities: Array.isArray(r.localities) ? r.localities : []
    });
  }
  return map;
}

function inferDistrictFromProps(props) {
  // Try common keys in order of likelihood.
  const keys = ['district', 'District', 'DISTRICT', 'name', 'Name', 'HD', 'hd', 'id', 'ID'];
  for (const k of keys) {
    if (props && props[k] != null) {
      const n = normDistrict(props[k]);
      if (n) return n;
    }
  }
  return '';
}

function main() {
  const totals = readJson(TOTALS_PATH);
  const base = readJson(BASE_GEO_PATH);

  if (!base || base.type !== 'FeatureCollection') {
    throw new Error('Base GeoJSON must be a FeatureCollection.');
  }

  const tmap = buildTotalsMap(totals);
  let matched = 0, missing = 0;

  for (const feat of base.features) {
    const props = feat.properties || (feat.properties = {});
    const district = inferDistrictFromProps(props);
    const rec = tmap.get(district);
    if (rec) {
      matched++;
      props.spending_total = rec.total;
      props.spending_count = rec.count;
      props.members = rec.members;
      props.localities = rec.localities;
    } else {
      missing++;
      // Still ensure keys exist for downstream UI (fill with 0/empty)
      props.spending_total = props.spending_total ?? 0;
      props.spending_count = props.spending_count ?? 0;
      props.members = props.members ?? [];
      props.localities = props.localities ?? [];
    }
  }

  fs.writeFileSync(OUT_GEO_PATH, JSON.stringify(base, null, 2));
  console.log(`✅ Merged totals into GeoJSON -> ${OUT_GEO_PATH}`);
  console.log(`   Matched districts: ${matched}`);
  console.log(`   Missing districts: ${missing}`);
  if (missing > 0) {
    console.warn('⚠️ Some districts in the GeoJSON had no matching totals. Check district id normalization.');
  }
}

if (require.main === module) {
  try {
    main();
  } catch (e) {
    console.error('❌ Fatal:', e.message);
    process.exit(1);
  }
}
