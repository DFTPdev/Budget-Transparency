// scripts/join/enrich_irs990.ts
//
// Usage: ts-node --files scripts/join/enrich_irs990.ts <year>
// Reads:  out/app/recipients_<year>.json
//         out/app/irs990_index.json
//         ingest/irs990_aliases.json (optional; { "recipient name":"990 org name", ... })
// Writes: out/app/recipients_<year>_enriched.json
//
// Behavior:
// - Adds `irs990` array to any matched recipient: [{ org, ein, year, url }]
// - Appends "irs990" to `sources` once at least one match attaches
// - Robust normalization (lowercase, strip punctuation/stopwords/company suffixes)

import fs from "fs";
import path from "path";

type Recipient = {
  agency: string;
  total_amount: number;
  items: number;
  sources?: string[];
  // new fields we may add:
  irs990?: Array<{ org: string; ein?: string; year?: number; url?: string }>;
};

type IndexRow = {
  org: string;
  ein?: string;
  year?: number;
  url?: string;
};

function readJSON<T=any>(p: string, fallback: T): T {
  try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return fallback; }
}

function ensureDir(p: string) {
  fs.mkdirSync(p, { recursive: true });
}

function normalizeName(s: string): string {
  let t = String(s || "").toLowerCase();

  // remove punctuation
  t = t.replace(/[.,'’"()\-]/g, " ");

  // collapse whitespace
  t = t.replace(/\s+/g, " ").trim();

  // strip common org suffixes/stopwords
  const stop = [
    "inc", "inc.", "incorporated", "foundation", "association", "society", "trust",
    "the", "of", "for", "at", "and", "department", "dept", "university", "college",
    "board", "authority", "center", "centre", "commission", "committee", "office",
    "commonwealth", "state", "virginia"
  ];
  const parts = t.split(" ").filter(w => !stop.includes(w));
  return parts.join(" ");
}

function addSource(rec: Recipient, source: string) {
  if (!rec.sources) rec.sources = [];
  if (!rec.sources.includes(source)) rec.sources.push(source);
}

function main() {
  const year = Number(process.argv[2] || new Date().getFullYear());
  const appDir = "out/app";
  const inRecipients = path.join(appDir, `recipients_${year}.json`);
  const inIndex = path.join(appDir, "irs990_index.json"); // written by fetch_990_index.ts
  const aliasesPath = "ingest/irs990_aliases.json";

  const recipients: Recipient[] = readJSON(inRecipients, []);
  const indexRows: IndexRow[] = readJSON(inIndex, []);
  const aliases: Record<string, string> = readJSON(aliasesPath, {});

  if (!recipients.length) {
    console.log(`[warn] No recipients at ${inRecipients}`);
    return;
  }

  // Build lookups
  const byNormOrg = new Map<string, IndexRow[]>();
  for (const r of indexRows) {
    if (!r || !r.org) continue;
    const norm = normalizeName(r.org);
    if (!norm) continue;
    const list = byNormOrg.get(norm) || [];
    list.push(r);
    byNormOrg.set(norm, list);
  }

  let attached = 0;

  for (const rec of recipients) {
    const rawName = rec.agency || "";
    // Apply alias if provided
    const aliasTarget = aliases[rawName] || rawName;
    const norm = normalizeName(aliasTarget);

    const matches = byNormOrg.get(norm);
    if (matches && matches.length) {
      rec.irs990 = (rec.irs990 || []);
      for (const m of matches) {
        // avoid dupes
        if (!rec.irs990.find(x => x.org === m.org && x.ein === m.ein)) {
          rec.irs990.push({ org: m.org, ein: m.ein, year: m.year, url: m.url });
        }
      }
      addSource(rec, "irs990");
      attached++;
    }
  }

  const outPath = path.join(appDir, `recipients_${year}_enriched.json`);
  fs.writeFileSync(outPath, JSON.stringify(recipients, null, 2));
  console.log(`[ok] enriched recipients with IRS 990 links: ${attached}/${recipients.length} → ${outPath}`);
}

main();