// scripts/export_delegate_localities.js
const fs = require('fs');
const path = require('path');

// --- CONFIG ---
const CONFIG_PATH = path.join(__dirname, 'lis.config.json');
const cfg = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));

const rosterPath = path.isAbsolute(cfg.houseRosterPath)
  ? cfg.houseRosterPath
  : path.join(__dirname, cfg.houseRosterPath);

const OUT_DIR = path.isAbsolute(cfg.outDir)
  ? cfg.outDir
  : path.join(__dirname, cfg.outDir);

const OUT_DELEGATE_LOCALITIES_CSV  = path.join(OUT_DIR, 'delegate_localities.csv');
const OUT_DELEGATE_LOCALITIES_JSON = path.join(OUT_DIR, 'delegate_localities.json');

// --- HELPERS ---
function getLocalities(r) {
  if (Array.isArray(r.localities_overlay) && r.localities_overlay.length) return r.localities_overlay;
  if (Array.isArray(r.counties_cities)) return r.counties_cities;
  if (typeof r.counties_cities === 'string' && r.counties_cities.trim().startsWith('[')) {
    try { return JSON.parse(r.counties_cities); } catch {}
  }
  return [];
}

function writeDelegateLocalities(roster) {
  const rows = roster.map(r => ({
    delegate_name: r.delegate_name || '',
    district: String(r.district ?? '').trim(),
    localities: getLocalities(r)
  }));

  // CSV
  const csv = [
    'delegate_name,district,localities',
    ...rows.map(r => {
      const loc = `"${(r.localities || []).join('; ').replace(/"/g,'""')}"`;
      const name = `"${String(r.delegate_name || '').replace(/"/g,'""')}"`;
      return [name, r.district, loc].join(',');
    })
  ].join('\n');
  fs.writeFileSync(OUT_DELEGATE_LOCALITIES_CSV, csv);

  // JSON
  fs.writeFileSync(OUT_DELEGATE_LOCALITIES_JSON, JSON.stringify({ count: rows.length, rows }, null, 2));

  console.log(`Localities CSV written to: ${OUT_DELEGATE_LOCALITIES_CSV}`);
  console.log(`Localities JSON written to: ${OUT_DELEGATE_LOCALITIES_JSON}`);
}

// --- MAIN ---
(function main() {
  if (!fs.existsSync(rosterPath)) {
    console.error(`Roster file not found at: ${rosterPath}`);
    process.exit(1);
  }
  const roster = JSON.parse(fs.readFileSync(rosterPath, 'utf8'));
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
  writeDelegateLocalities(roster);
})();