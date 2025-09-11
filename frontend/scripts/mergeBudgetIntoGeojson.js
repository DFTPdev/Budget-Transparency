#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const GEOJSON_PATH = 'public/data/virginia-districts.geojson';
const BUDGET_PATH = 'public/data/budget_by_district_2025.json';
const OUTPUT_PATH = 'public/data/district-spending.geojson';
const DIAGNOSTICS_PATH = 'public/data/merge-diagnostics.json';
const BACKUP_PATH = OUTPUT_PATH + '.bak';

function parseNumeric(value) {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const cleaned = value.replace(/[^0-9.\-]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

function normalizeDistrictId(value) {
  if (value === null || value === undefined) return { full: '', numeric: '' };
  let s = String(value).toUpperCase().trim();
  s = s.replace(/^VA[-_]?/i, '').replace(/^HD[-_]?/i, '').replace(/^CD[-_]?/i, '').replace(/^DISTRICT[-_]?/i, '');
  const full = s.replace(/[^A-Z0-9]/g, '');
  const numeric = full.replace(/^0+/, '') || full;
  return { full, numeric };
}

function findDistrictKey(obj) {
  if (!obj || typeof obj !== 'object') return null;
  const keys = Object.keys(obj || {});
  const candidates = ['district','district_id','dist','districtCode','district_code','districtnum','districtNumber','id','name'];
  for (const c of candidates) {
    const found = keys.find(k => k.toLowerCase() === c.toLowerCase());
    if (found) return found;
  }
  return keys.find(k => /district|dist/i.test(k)) || null;
}

function writeJsonSafe(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

function main() {
  try {
    if (!fs.existsSync(GEOJSON_PATH)) { console.error('Missing', GEOJSON_PATH); process.exit(1); }
    if (!fs.existsSync(BUDGET_PATH)) { console.error('Missing', BUDGET_PATH); process.exit(2); }

    if (fs.existsSync(OUTPUT_PATH)) {
      try { fs.copyFileSync(OUTPUT_PATH, BACKUP_PATH); } catch (e) { /* best-effort */ }
    }

    const geo = JSON.parse(fs.readFileSync(GEOJSON_PATH, 'utf8'));
    const budget = JSON.parse(fs.readFileSync(BUDGET_PATH, 'utf8'));

    if (!Array.isArray(geo.features)) { console.error('Invalid GeoJSON features'); process.exit(3); }
    if (!Array.isArray(budget)) { console.error('Budget must be array'); process.exit(4); }

    // Build budget map (sum totals)
    const budgetMap = new Map();
    let budgetRowsProcessed = 0;
    for (let i = 0; i < budget.length; i++) {
      const row = budget[i] || {};
      const keyName = findDistrictKey(row);
      if (!keyName) continue;
      const raw = row[keyName];
      const { full, numeric } = normalizeDistrictId(raw);
      const amount = parseNumeric(row.total_amount ?? row.amount ?? row.budget_total ?? row.total ?? 0);
      if (full) { budgetMap.set(full, (budgetMap.get(full) || 0) + amount); }
      if (numeric && numeric !== full) { budgetMap.set(numeric, (budgetMap.get(numeric) || 0) + amount); }
      budgetRowsProcessed++;
    }

    // Merge onto geo features
    let matched = 0;
    const unmatchedSamples = [];
    for (let i = 0; i < geo.features.length; i++) {
      const feat = geo.features[i];
      feat.properties = feat.properties || {};
      const keyName = findDistrictKey(feat.properties);
      let nd = { full: '', numeric: '' };
      if (keyName) nd = normalizeDistrictId(feat.properties[keyName]);
      let found = false;
      for (const k of [nd.full, nd.numeric]) {
        if (k && budgetMap.has(k)) {
          feat.properties.budget_total = budgetMap.get(k);
          found = true;
          matched++;
          break;
        }
      }
      if (!found) {
        feat.properties.budget_total = 0;
        if (unmatchedSamples.length < 8) {
          unmatchedSamples.push({ index: i, sample: Object.fromEntries(Object.entries(feat.properties).slice(0,6)) });
        }
      }
    }

    // Diagnostics
    const diag = {
      timestamp: new Date().toISOString(),
      input_files: { geo: GEOJSON_PATH, budget: BUDGET_PATH },
      counts: {
        geo_features: geo.features.length,
        budget_rows: budget.length,
        budget_rows_processed: budgetRowsProcessed,
        unique_budget_keys: budgetMap.size,
        matched_features: matched,
        unmatched_features: geo.features.length - matched
      },
      unmatched_samples: unmatchedSamples.slice(0,8)
    };

    writeJsonSafe(DIAGNOSTICS_PATH, diag);
    writeJsonSafe(OUTPUT_PATH, geo);
    console.log('Merge complete:', diag.counts);
    process.exit(0);
  } catch (err) {
    console.error('Fatal:', err && err.message ? err.message : String(err));
    process.exit(10);
  }
}

if (require.main === module) main();
