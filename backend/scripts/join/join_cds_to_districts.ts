/* scripts/join/join_cds_to_districts.ts
 * Temporary locality-based CDS aggregator (no district map needed).
 * Input:  --cds out/staging/cds/<year>/cds.json
 * Output: out/app/cds_by_locality_<year>.json
 */

import fs from "fs";
import path from "path";

type CdsItem = {
  recipient: string;
  purpose: string;
  location: string;           // e.g., "City of Bristol VA", "Alleghany County VA"
  amount_thousands: number;
  amount: number;             // dollars
  year: number;               // 2025
  state: "VA";
  source: "cds";
  source_label?: string;
  source_url?: string;
  member?: string;            // e.g., "Sen. Tim Kaine"
  subcommittee?: string;      // e.g., "Agriculture"
  bill?: string;              // e.g., "FY2025 Ag Approps"
};

type LocalityBucket = {
  locality: string;           // normalized locality name
  items: number;
  total_amount: number;       // sum in dollars
  records: CdsItem[];         // kept for tracing
  members: string[];          // unique list of members appearing in records
};

function readJSON<T=any>(p: string): T {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function writeJSON(p: string, data: unknown) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(data, null, 2));
}

function normLocality(input: string): string {
  // Normalize CDS "location" into a reasonable locality bucket
  let s = input.trim();

  // strip common leading phrases
  s = s.replace(/^City of\s+/i, "");
  s = s.replace(/^Town of\s+/i, "");

  // strip trailing state markers
  s = s.replace(/,\s*Virginia$/i, "");
  s = s.replace(/\s+VA\s*$/i, "");

  // collapse whitespace
  s = s.replace(/\s+/g, " ").trim();

  // Optional: normalize “County”/“City” suffix spacing
  // Keep “Statewide/Multiple Locations” as-is
  return s;
}

function uniq<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

function main() {
  const argv = process.argv.slice(2);
  const get = (flag: string) => {
    const ix = argv.findIndex(a => a === flag || a.startsWith(flag + "="));
    if (ix === -1) return undefined;
    const a = argv[ix];
    const eq = a.indexOf("=");
    if (eq >= 0) return a.slice(eq + 1);
    return argv[ix + 1];
  };

  const year = get("--year") || "2025";
  const cdsPath = get("--cds") || `out/staging/cds/${year}/cds.json`;
  const outPath = get("--out") || `out/app/cds_by_locality_${year}.json`;

  if (!fs.existsSync(cdsPath)) {
    console.error(`[fatal] CDS file not found: ${cdsPath}`);
    process.exit(1);
  }

  const cds: CdsItem[] = readJSON(cdsPath);
  const buckets = new Map<string, LocalityBucket>();

  for (const r of cds) {
    const loc = r.location ? normLocality(r.location) : "Unknown";
    const key = loc || "Unknown";
    if (!buckets.has(key)) {
      buckets.set(key, {
        locality: key,
        items: 0,
        total_amount: 0,
        records: [],
        members: [],
      });
    }
    const b = buckets.get(key)!;
    b.items += 1;
    b.total_amount += Number(r.amount || 0);
    b.records.push(r);
    if (r.member) b.members.push(r.member);
  }

  const out = Array.from(buckets.values())
    .map(b => ({ ...b, members: uniq(b.members).sort() }))
    .sort((a, b) => b.total_amount - a.total_amount || a.locality.localeCompare(b.locality));

  writeJSON(outPath, out);
  console.log(`[ok] CDS→locality wrote ${out.length} localities → ${outPath}`);
}

main();