// scripts/aggregate_by_district.js
const fs = require('fs');
const path = require('path');
const path = require('path');

const baseDir = __dirname;
const cfg = JSON.parse(fs.readFileSync(path.resolve(baseDir, 'lis.config.json'), 'utf8'));

const OUT_DIR = path.resolve(baseDir, cfg.outDir || './out');
const INPUT_NORMALIZED = path.join(OUT_DIR, 'lis_member_amendments.normalized.json');
const ROSTER_PATH = path.resolve(baseDir, cfg.houseRosterPath || './house_delegates_roster_enriched.json');

const OUT_DISTRICT_JSON = path.join(OUT_DIR, 'district_totals.json');
const OUT_DISTRICT_CSV  = path.join(OUT_DIR, 'district_totals.csv');

function loadJson(fp) {
  if (!fs.existsSync(fp)) return [];
  return JSON.parse(fs.readFileSync(fp, 'utf8'));
}

function normalizeName(s) {
  return (s || '')
    .toLowerCase()
    .replace(/delegate\s+|del\.\s+|hon\.\s+/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function nameKey(s) {
  const parts = (normalizeName(s).match(/[a-z]+/gi) || []);
  if (parts.length === 0) return '';
  const last = parts[parts.length - 1];
  const first = parts[0] || '';
  return `${last},${first[0] || ''}`;
}

function toCsv(rows) {
  const headers = Object.keys(rows[0] || { district: '', total: '', count: '', members: '' });
  const lines = [headers.join(',')];
  for (const r of rows) {
    lines.push(headers.map(h => {
      const v = r[h];
      if (Array.isArray(v)) return `"${v.join('; ').replace(/"/g,'""')}"`;
      if (typeof v === 'string') return `"${v.replace(/"/g,'""')}"`;
      return String(v ?? '');
    }).join(','));
  }
  return lines.join('\n');
}

function main() {
  const amendments = loadJson(INPUT_NORMALIZED);
  const roster = loadJson(ROSTER_PATH);

  if (!amendments.length) {
    console.warn('⚠️ No amendments found. Did you run fetch_lis_member_amendments.js?');
  }
  if (!roster.length) {
    console.error('❌ Roster missing or empty:', ROSTER_PATH);
    process.exit(1);
  }

  const sponsorToDistrict = new Map();
  const districtToMembers = new Map();
  for (const r of roster) {
    const d = String(r.district || '').trim();
    const key = nameKey(r.delegate_name);
    if (d && key) sponsorToDistrict.set(key, d);
    if (!districtToMembers.has(d)) districtToMembers.set(d, new Set());
    if (r.delegate_name) districtToMembers.get(d).add(r.delegate_name);
  }

  const totals = new Map();
  const unknown = [];
  for (const a of amendments) {
    const k = nameKey(a.sponsor);
    const district = sponsorToDistrict.get(k);
    if (!district) { unknown.push(a); continue; }
    if (!totals.has(district)) totals.set(district, { total: 0, count: 0 });
    const bucket = totals.get(district);
    bucket.total += Number(a.amount || 0);
    bucket.count += 1;
  }

  const rows = Array.from(totals.entries())
    .map(([district, { total, count }]) => ({
      district,
      total,
      count,
      members: Array.from(districtToMembers.get(district) || []),
    }))
    .sort((a, b) => Number(a.district) - Number(b.district));

  fs.writeFileSync(OUT_DISTRICT_JSON, JSON.stringify({
    generated_at: new Date().toISOString(),
    session: cfg.sessionLabel || '',
    notes: "Totals derived by matching amendment sponsor names to the current House roster; verify cross-session caveats.",
    count: rows.length,
    rows
  }, null, 2));

  if (rows.length) {
    fs.writeFileSync(OUT_DISTRICT_CSV, toCsv(rows));
  }

  console.log(`✅ Wrote ${rows.length} district rows:`);
  console.log(`   JSON: ${OUT_DISTRICT_JSON}`);
  console.log(`   CSV : ${OUT_DISTRICT_CSV}`);

  if (unknown.length) {
    const unkPath = path.join(OUT_DIR, 'unmatched_sponsors.json');
    fs.writeFileSync(unkPath, JSON.stringify(unknown.slice(0, 500), null, 2));
    console.warn(`⚠️ Unmatched sponsors: ${unknown.length} (sample saved to ${unkPath})`);
  }
}

main();