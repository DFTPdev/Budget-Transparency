// scripts/verify.ts
import fs from "fs";
import path from "path";

type Cli = { year: number };
function parseArgs(): Cli {
  const argv = process.argv.slice(2);
  const i = argv.indexOf("--year");
  const year = i >= 0 ? Number(argv[i + 1]) : NaN;
  if (!year || Number.isNaN(year)) throw new Error("Missing --year");
  return { year };
}
function exists(p: string) { return fs.existsSync(p); }
function readJson<T=any>(p: string): T { return JSON.parse(fs.readFileSync(p, "utf8")); }

(function main() {
  const { year } = parseArgs();

  const lisPath = `out/lis_amendments_${year}.jsonl`;
  const unmatchedPath = `out/app/_qa_unmatched_members.json`;
  const dpbPath = `out/staging/dpb/${year}/items.json`;
  const cdsPath = `out/staging/cds/${year}/items.json`;
  const recipientsEnriched = `out/app/recipients_enriched_${year}.json`;

  let fail = false;

  if (!exists(lisPath)) { console.error("[fail] missing", lisPath); fail = true; }
  if (exists(unmatchedPath)) {
    const len = readJson<any[]>(unmatchedPath).length;
    if (len > 0) { console.error(`[fail] unmatched members: ${len}`); fail = true; }
    else console.log("[ok] unmatched members: 0");
  } else {
    console.log("[ok] unmatched members file not present (likely 0).");
  }

  if (exists(dpbPath)) {
    const dpb = readJson<any[]>(dpbPath);
    console.log(`[ok] DPB items: ${dpb.length}`);
  } else {
    console.warn("[warn] DPB items.json not found (ok if not included).");
  }

  if (exists(cdsPath)) {
    const cds = readJson<any[]>(cdsPath);
    console.log(`[ok] CDS items: ${cds.length}`);
  } else {
    console.warn("[warn] CDS items.json not found (ok if not included).");
  }

  if (exists(recipientsEnriched)) {
    const arr = readJson<any[]>(recipientsEnriched);
    console.log(`[ok] recipients_enriched_${year}.json: ${arr.length}`);
  } else {
    console.warn("[warn] recipients_enriched missing — Nonprofit lookup will still work with raw recipients, but enrich step is recommended.");
  }

  if (fail) process.exit(1);
  console.log("[ok] verify passed.");
})();