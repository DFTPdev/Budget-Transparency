import * as fs from "fs";
import * as path from "path";

function readJSON(p: string): any {
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

(function main() {
  const year = getArg("--year");
  const inPath = getArg("--in", `out/app/budget_by_district_${year}.json`);
  const outJson = getArg("--outJson", `out/app/lis_by_district_${year}.json`);
  const outCsv  = getArg("--outCsv",  `out/app/lis_by_district_${year}.csv`);

  const data = readJSON(inPath);

  let rows: Array<{district:string, items:number, total_amount:number}> = [];

  if (Array.isArray(data)) {
    rows = data.map((d:any) => ({
      district: String(d.district ?? d.id ?? ""),
      items: Number(d.items ?? d.count ?? 0),
      total_amount: Number(d.total_amount ?? d.total ?? 0),
    })).filter(r => r.district);
  } else if (data && typeof data === "object") {
    rows = Object.entries<any>(data).map(([k, v]) => ({
      district: String(k),
      items: Number((v as any).items ?? (v as any).count ?? 0),
      total_amount: Number((v as any).total_amount ?? (v as any).total ?? 0),
    }));
  } else {
    throw new Error("Unsupported input structure");
  }

  rows = rows.filter(r => (r.items > 0) || (r.total_amount > 0));

  writeJSON(outJson, rows);
  writeCSV(outCsv, rows, ["district","items","total_amount"]);

  const tot = rows.reduce((s,r)=>s+(r.total_amount||0),0);
  console.log(`[ok] Districts: ${rows.length} → ${outJson} & ${outCsv}`);
  console.log(`[ok] Sum total: $${tot.toLocaleString()}`);
})();
