import * as fs from "fs";
import * as path from "path";

type DistrictRow = {
  district: string | number;
  items?: number;
  total_amount?: number;
};

type DelegateRow = {
  delegate_name: string;
  district: string | number;
  items: number;
  total_amount: number;
};

type RosterRow = {
  district: string | number;
  delegate_name: string;
  [k: string]: any;
};

function normDistrict(d: string | number): string {
  return String(d).trim();
}

function readJSON<T = any>(p: string): T {
  if (!fs.existsSync(p)) {
    throw new Error(`File not found: ${p}`);
  }
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function writeJSON(p: string, data: any) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(data, null, 2));
}

function writeCSV(p: string, rows: any[], headers: string[]) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  const esc = (v: any) => {
    const s = String(v ?? "");
    return `"${s.replace(/"/g, '""')}"`;
    };
  const out = [
    headers.map(esc).join(","),
    ...rows.map((r) => headers.map((h) => esc(r[h])).join(",")),
  ].join("\n");
  fs.writeFileSync(p, out);
}

function getArg(name: string, def?: string): string {
  const i = process.argv.indexOf(name);
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1];
  if (def !== undefined) return def;
  throw new Error(`Missing required arg: ${name}`);
}

(function main() {
  const year = getArg("--year");
  const inPath = getArg("--in"); // out/app/lis_by_district_<year>.json
  const rosterPath = getArg("--roster"); // scripts/house_delegates_roster_enriched.json
  const outJson = getArg("--outJson", `out/app/lis_by_delegate_${year}.json`);
  const outCsv  = getArg("--outCsv",  `out/app/lis_by_delegate_${year}.csv`);

  const districts = readJSON<DistrictRow[]>(inPath) || [];
  const roster = readJSON<RosterRow[]>(rosterPath) || [];

  // Index district totals by district id (stringified)
  const dIndex = new Map<string, { items: number; total_amount: number }>();
  for (const d of districts) {
    const key = normDistrict(d.district);
    const items = Number(d.items ?? 0);
    const total = Number(d.total_amount ?? 0);
    dIndex.set(key, { items, total_amount: total });
  }

  // Build delegate totals by joining roster (district -> delegate)
  const out: DelegateRow[] = [];
  for (const r of roster) {
    const dk = normDistrict(r.district);
    const t = dIndex.get(dk);
    if (!t) continue;                 // no spending in that district
    if ((t.items ?? 0) <= 0) continue; // skip empty
    out.push({
      delegate_name: r.delegate_name,
      district: r.district,
      items: t.items ?? 0,
      total_amount: t.total_amount ?? 0,
    });
  }

  // Sort by total desc
  out.sort((a, b) => (b.total_amount - a.total_amount));

  writeJSON(outJson, out);
  writeCSV(outCsv, out, ["delegate_name", "district", "items", "total_amount"]);

  const total = out.reduce((s, r) => s + (r.total_amount || 0), 0);
  console.log(`[ok] Delegates: ${out.length} rows → ${outJson} & ${outCsv}`);
  console.log(`[ok] Sum total: $${total.toLocaleString()}`);
})();
