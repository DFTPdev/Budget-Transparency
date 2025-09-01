import * as fs from "fs";
import * as path from "path";

type DistrictRow = { district: string; items: number; total_amount: number; };
type RosterRow = { delegate_name: string; district: string; counties_cities?: string };

function readJSON<T=any>(p: string): T {
  if (!fs.existsSync(p)) throw new Error(`File not found: ${p}`);
  return JSON.parse(fs.readFileSync(p, "utf8"));
}
function writeJSON(p: string, data: any) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(data, null, 2));
}
function writeCSV(p: string, rows: any[], headers: string[]) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  const esc = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const out = [
    headers.map(esc).join(","),
    ...rows.map(r => headers.map(h => esc(r[h])).join(","))
  ].join("\n");
  fs.writeFileSync(p, out);
}
function getArg(name: string, def?: string): string {
  const i = process.argv.indexOf(name);
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1];
  if (def !== undefined) return def;
  throw new Error(`Missing arg: ${name}`);
}
function normDistrict(s: string) {
  if (!s) return "";
  const digits = String(s).match(/\d+/g);
  return digits ? digits.join("") : String(s);
}

(function main() {
  const year = getArg("--year");
  const inPath = getArg("--in", `out/app/lis_by_district_${year}.json`);
  const rosterPath = getArg("--roster", "scripts/house_delegates_roster_enriched.json");
  const outJson = getArg("--outJson", `out/app/lis_by_delegate_${year}.json`);
  const outCsv  = getArg("--outCsv",  `out/app/lis_by_delegate_${year}.csv`);

  const districts: DistrictRow[] = readJSON(inPath);
  const roster: RosterRow[] = readJSON(rosterPath);

  // Map district -> delegate_name (assume one delegate per district)
  const byDistrict = new Map<string, string>();
  for (const r of roster) {
    const d = normDistrict(r.district);
    if (d) byDistrict.set(d, r.delegate_name);
  }

  const rows = districts.map(d => {
    const dd = normDistrict(d.district);
    const delegate_name = byDistrict.get(dd) ?? "";
    return {
      delegate_name,
      district: dd || d.district,
      items: d.items ?? 0,
      total_amount: d.total_amount ?? 0
    };
  }).filter(r => r.delegate_name); // keep only matched districts

  rows.sort((a,b)=> (b.total_amount||0) - (a.total_amount||0));

  writeJSON(outJson, rows);
  writeCSV(outCsv, rows, ["delegate_name","district","items","total_amount"]);

  const tot = rows.reduce((s,r)=>s+(r.total_amount||0),0);
  console.log(`[ok] Delegates: ${rows.length} → ${outJson} & ${outCsv}`);
  console.log(`[ok] Sum total: $${tot.toLocaleString()}`);
})();
