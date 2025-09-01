// scripts/join/join_lis_to_districts.ts
// Locality rollup for LIS amendments, mirroring the CDS joiner behavior.

import fs from "fs";
import path from "path";

// ---------- CLI args ----------
type Argv = {
  year?: string;
  lis?: string;      // path to LIS JSON (default: out/staging/lis/{year}/lis.json)
  out?: string;      // path to output JSON (default: out/app/lis_by_locality_{year}.json)
};

function parseArgv(): Argv {
  const a: Argv = {};
  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];
    const [k, v] = arg.split("=");
    if (k === "--year") a.year = v;
    else if (k === "--lis") a.lis = v;
    else if (k === "--out") a.out = v;
  }
  return a;
}

const argv = parseArgv();
const year =
  argv.year ||
  (process.env.npm_package_config_year &&
    String(process.env.npm_package_config_year));

if (!year) {
  console.error(
    "[fatal] --year is required (or set package.json config.year)."
  );
  process.exit(1);
}

const lisFile =
  argv.lis || path.join("out", "staging", "lis", String(year), "lis.json");
const outFile =
  argv.out || path.join("out", "app", `lis_by_locality_${year}.json`);

// ---------- helpers ----------
function exists(p: string) {
  try {
    fs.accessSync(p, fs.constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

function readJSON<T = any>(p: string): T {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function ensureDir(p: string) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
}

function normalizeLocality(raw?: string | null): string | null {
  if (!raw) return null;
  let s = raw.trim();

  // Common cleanups like in CDS flow
  s = s.replace(/^City of\s+/i, "");
  s = s.replace(/^Town of\s+/i, "");
  s = s.replace(/,\s*Virginia$/i, "");
  s = s.replace(/\s+VA\s*$/i, "");
  s = s.replace(/\s+/g, " ");

  // Drop ambiguous statewide rows into “Statewide/Multiple Locations”
  if (/^statewide/i.test(s) || /multiple locations/i.test(s)) {
    return "Statewide/Multiple Locations";
  }

  // Be consistent with county/city suffixes already present
  return s;
}

function toNumberLoose(v: any): number | null {
  if (v == null) return null;
  if (typeof v === "number" && isFinite(v)) return v;
  if (typeof v === "string") {
    const cleaned = v.replace(/[$,]/g, "").trim();
    const num = Number(cleaned);
    return isFinite(num) ? num : null;
  }
  return null;
}

// ---------- input validation ----------
if (!exists(lisFile)) {
  console.error(`[fatal] LIS file not found: ${lisFile}`);
  process.exit(1);
}

type LisRecord = Record<string, any>;
const lisRecords: LisRecord[] = readJSON(lisFile);

if (!Array.isArray(lisRecords)) {
  console.error("[fatal] LIS file is not an array of records:", lisFile);
  process.exit(1);
}

// ---------- rollup by locality ----------
type Bucket = {
  locality: string;
  items: number;
  total_amount: number;
  records: LisRecord[];
  members: string[]; // unique
};

const byLocality = new Map<string, Bucket>();

let noLoc = 0;
let noAmt = 0;

for (const r of lisRecords) {
  // Try a few likely fields for locality / location
  const locRaw: string | null =
    (r.locality as string) ??
    (r.location as string) ??
    (r.recipient_locality as string) ??
    (r.recipientLocation as string) ??
    null;

  const locality = normalizeLocality(locRaw);
  if (!locality) {
    noLoc++;
    continue;
  }

  // Amount field(s)
  const amount =
    toNumberLoose(r.amount) ??
    (toNumberLoose(r.amount_thousands) != null
      ? (toNumberLoose(r.amount_thousands) as number) * 1000
      : null) ??
    toNumberLoose(r.Amount) ??
    toNumberLoose(r.Appropriation) ??
    null;

  if (amount == null) {
    noAmt++;
    continue;
  }

  // Member field(s)
  const member: string | null =
    (r.member as string) ??
    (r.sponsor as string) ??
    (r.delegate as string) ??
    (r.senator as string) ??
    null;

  // Upsert bucket
  if (!byLocality.has(locality)) {
    byLocality.set(locality, {
      locality,
      items: 0,
      total_amount: 0,
      records: [],
      members: [],
    });
  }
  const b = byLocality.get(locality)!;
  b.items += 1;
  b.total_amount += amount;
  b.records.push(r);

  if (member) {
    if (!b.members.includes(member)) b.members.push(member);
  }
}

// ---------- finalize & write ----------
const result = Array.from(byLocality.values()).sort(
  (a, b) => b.total_amount - a.total_amount
);

ensureDir(outFile);
fs.writeFileSync(outFile, JSON.stringify(result, null, 2));
console.log(
  `[ok] LIS→locality wrote ${result.length} localities → ${outFile} (skipped: noLoc=${noLoc}, noAmount=${noAmt})`
);