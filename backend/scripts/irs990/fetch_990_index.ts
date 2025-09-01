// scripts/irs990/fetch_990_index.ts
//
// Purpose: Produce a normalized IRS 990 index for enrichment.
// Output: outDir/irs990_index.json  (array of { org, ein, year, url })
//
// Modes:
//   --demo           -> writes a small deterministic sample
//   --source <path>  -> normalize/convert an existing JSON/CSV into the schema
//   (no flags)       -> you can plug in your real fetch here later if desired
//
// Notes:
//  - We *normalize* various common keys (name, OrganizationName, EIN, TaxYear, Link, etc.)
//  - We *guarantee* `org` is a string (non-null), otherwise we drop the record.

import fs from "fs";
import path from "path";
import { parse as parseCSV } from "csv-parse/sync";

type IndexRow = {
  org: string;   // normalized org name
  ein?: string;  // digits only, no hyphens
  year?: number; // tax year (optional)
  url?: string;  // canonical URL if available
};

function parseArgs(argv: string[]) {
  const out: Record<string, any> = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const k = a.slice(2);
      const v = (i + 1 < argv.length && !argv[i + 1].startsWith("--")) ? argv[++i] : "true";
      out[k] = v;
    }
  }
  return out;
}

function ensureDir(p: string) {
  fs.mkdirSync(p, { recursive: true });
}

function readJSON(p: string): any {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function readMaybeJSON(p: string): any | null {
  try { return readJSON(p); } catch { return null; }
}

function normalizeEin(raw?: string): string | undefined {
  if (!raw) return;
  const digits = String(raw).replace(/[^\d]/g, "");
  return digits.length >= 7 ? digits : undefined;
}

function chooseString(obj: any, keys: string[], fallback = ""): string {
  for (const k of keys) {
    const v = obj?.[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return fallback;
}

function chooseNumber(obj: any, keys: string[]): number | undefined {
  for (const k of keys) {
    const v = obj?.[k];
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function ensureUrl(org: string, ein?: string, url?: string): string | undefined {
  if (url && /^https?:\/\//i.test(url)) return url;
  if (ein) return `https://www.guidestar.org/profile/${ein}`;
  if (org) return undefined;
  return undefined;
}

function toIndexRow(obj: any): IndexRow | null {
  const org = chooseString(obj, ["org", "name", "OrganizationName", "organization", "title"]);
  if (!org) return null;

  const ein = normalizeEin(chooseString(obj, ["ein", "EIN", "ein_num", "EmployerIdentificationNumber"]));
  const year = chooseNumber(obj, ["year", "TaxYear", "tax_year"]);
  const url = ensureUrl(org, ein, chooseString(obj, ["url", "Link", "Website"]));

  return { org, ein, year, url };
}

function writeOut(rows: IndexRow[], outDir: string) {
  ensureDir(outDir);
  const p = path.join(outDir, "irs990_index.json");
  fs.writeFileSync(p, JSON.stringify(rows, null, 2));
  console.log(`[ok] IRS 990 wrote ${p} ( ${rows.length} records )`);
}

function loadSourceFile(p: string): any[] {
  const ext = path.extname(p).toLowerCase();
  if (ext === ".json") {
    const v = readMaybeJSON(p);
    if (Array.isArray(v)) return v;
    if (v && typeof v === "object" && Array.isArray(v.data)) return v.data;
    return [];
  }
  if (ext === ".csv") {
    const raw = fs.readFileSync(p, "utf8");
    return parseCSV(raw, { columns: true, skip_empty_lines: true });
  }
  console.warn(`[warn] Unrecognized source extension (${ext}); returning []`);
  return [];
}

async function main() {
  const args = parseArgs(process.argv);
  const outDir = args.out || "out/staging/990";
  ensureDir(outDir);

  // Demo mode: emit a few realistic nonprofit rows
  if (String(args.demo) === "true") {
    const demo: IndexRow[] = [
      { org: "George Mason University Foundation, Inc.", ein: "540853508", year: 2023, url: "https://www.guidestar.org/profile/540853508" },
      { org: "Virginia Museum of Natural History Foundation", ein: "541713015", year: 2022, url: "https://www.guidestar.org/profile/541713015" },
      { org: "Virginia Alliance of Boys and Girls Clubs", ein: "541950001", year: 2022, url: "https://www.guidestar.org/profile/541950001" },
    ];
    writeOut(demo, outDir);
    return;
  }

  // Source mode: normalize an existing file (JSON/CSV) into the schema
  if (args.source) {
    const rawRows = loadSourceFile(String(args.source));
    const out = rawRows.map(toIndexRow).filter((x): x is IndexRow => !!x && !!x.org);
    writeOut(out, outDir);
    return;
  }

  // Placeholder for a future “real fetch”:
  // For now, if there’s an existing file in outDir, try to normalize it (defensive).
  const existing = readMaybeJSON(path.join(outDir, "irs990_index.json"));
  if (Array.isArray(existing)) {
    const out = existing.map(toIndexRow).filter((x): x is IndexRow => !!x && !!x.org);
    writeOut(out, outDir);
    return;
  }

  // If nothing else, just write an empty file cleanly.
  writeOut([], outDir);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});