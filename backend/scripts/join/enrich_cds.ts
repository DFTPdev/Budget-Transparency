// scripts/join/enrich_cds.ts
//
// Tag recipients with CDS references (if any).
// - INPUT (prefers already-enriched; falls back to base):
//     out/app/recipients_<year>_enriched.json  (if exists)  OR
//     out/app/recipients_<year>.json
// - CDS data source (produced by site:build:full or copy from staging):
//     out/app/cds_<year>.json  OR  out/staging/cds/<year>/cds.json
// - OUTPUT:
//     out/app/recipients_<year>_enriched.json
//
// This script is tolerant of sparse CDS shapes. It looks for a recipient-ish field
// among: recipient, agency, organization, org, beneficiary, grantee.
// It normalizes names and uses an alias map to improve matching.

import fs from "fs";
import path from "path";

function readJson<T = any>(p: string, fallback: T): T {
  try {
    const raw = fs.readFileSync(p, "utf8").trim();
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(p: string, v: any) {
  fs.writeFileSync(p, JSON.stringify(v, null, 2));
}

function exists(p: string) {
  try { return fs.existsSync(p); } catch { return false; }
}

function norm(s: string): string {
  return String(s || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/\buniv\.?\b/g, "university")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Expandable alias map → normalized key on left, canonical recipient agency on right
const ALIASES: Record<string, string> = {
  "george mason university": "George Mason University",
  "george mason u": "George Mason University",
  "virginia museum of natural history foundation": "Virginia Museum of Natural History",
  "virginia alliance of boys and girls clubs": "Virginia Alliance of Boys and Girls Clubs",
};

function pickRecipientLike(o: any): string {
  const candidates = [
    o?.recipient, o?.agency, o?.organization, o?.org, o?.beneficiary, o?.grantee, o?.applicant
  ];
  for (const c of candidates) {
    if (c && String(c).trim()) return String(c).trim();
  }
  return "";
}

function main() {
  const yearArg = process.argv[2];
  const year = Number(yearArg || new Date().getFullYear());

  const baseOutDir = "out/app";
  const enrichedPath = path.join(baseOutDir, `recipients_${year}_enriched.json`);
  const basePath     = path.join(baseOutDir, `recipients_${year}.json`);

  // prefer already-enriched as input (to preserve IRS990 tags, etc.)
  const inputPath = exists(enrichedPath) ? enrichedPath : basePath;
  const recipients: Array<any> = readJson(inputPath, []);

  // load CDS (prefer out/app; fallback to staging)
  const cdsAppPath = path.join(baseOutDir, `cds_${year}.json`);
  const cdsStagePath = path.join("out/staging/cds", String(year), "cds.json");
  const cdsRows: Array<any> = exists(cdsAppPath)
    ? readJson(cdsAppPath, [])
    : readJson(cdsStagePath, []);

  if (!cdsRows.length) {
    // No-op; still write-through so downstream always has an enriched file.
    writeJson(enrichedPath, recipients);
    console.log(`[ok] tagged recipients with CDS refs: 0/${recipients.length} → ${enrichedPath}`);
    return;
  }

  // Build a lookup of recipients by normalized agency name
  const byNormAgency = new Map<string, number>();
  for (let i = 0; i < recipients.length; i++) {
    const agency = String(recipients[i]?.agency || "").trim();
    if (!agency) continue;
    byNormAgency.set(norm(agency), i);
  }

  let tagged = 0;

  for (const row of cdsRows) {
    const rawName = pickRecipientLike(row);
    if (!rawName) continue;

    let key = norm(rawName);
    if (ALIASES[key]) key = norm(ALIASES[key]);

    const idx = byNormAgency.get(key);
    if (idx == null) continue;

    const r = recipients[idx];
    if (!r.sources) r.sources = [];
    if (!r.sources.includes("cds")) r.sources.push("cds");

    // Attach minimal CDS snippet for traceability (don’t change totals)
    const snippet = {
      title: String(row?.title ?? row?.project ?? row?.description ?? "").trim(),
      amount: Number(row?.amount ?? 0) || 0,
      url: String(row?.url ?? row?.link ?? "").trim(),
      year: Number(row?.year ?? year)
    };

    if (!r.cds) r.cds = [];
    r.cds.push(snippet);

    tagged++;
  }

  writeJson(enrichedPath, recipients);
  console.log(`[ok] tagged recipients with CDS refs: ${tagged}/${recipients.length} → ${enrichedPath}`);
}

main();