import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";

/**
 * CLI:
 *   ts-node --files scripts/cds/fetch_cds_va.ts \
 *     --year 2025 \
 *     --csv /absolute/or/relative/path/to/ag_kaine_cds_disclosure_24_5.csv \
 *     --out out/staging/cds/2025
 *
 * Output: <out>/cds.json (array of CdsItem)
 */

// ----- Types

type VaState = "VA";
type CdsSource = "cds";

type CdsItem = {
  recipient: string;
  purpose: string;
  location: string;
  amount_thousands: number; // value as provided in CSV ($000)
  amount: number;           // computed dollars
  year: number;
  state: VaState;
  source: CdsSource;
  source_label?: string;
  source_url?: string;
  // Optional handy fields if you want to enrich later:
  member?: string;        // e.g., "Sen. Tim Kaine"
  subcommittee?: string;  // e.g., "Agriculture"
  bill?: string;          // e.g., "FY2025 Ag Approps"
};

// ----- Helpers

function getArg(name: string, fallback?: string): string | undefined {
  const flag = `--${name}`;
  const hit = process.argv.find((a) => a.startsWith(`${flag}=`)) ||
              (process.argv.includes(flag) ? process.argv[process.argv.indexOf(flag) + 1] : undefined);
  if (!hit) return fallback;
  if (hit.startsWith(`${flag}=`)) return hit.slice(flag.length + 1);
  return hit;
}

function ensureDir(p: string) {
  fs.mkdirSync(p, { recursive: true });
}

function clean(s: unknown): string {
  return String(s ?? "").replace(/\s+/g, " ").trim();
}

function toNumberSafe(s: string): number {
  const n = Number(String(s).replace(/[,$\s]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

// ----- Main

(async () => {
  const yearStr = getArg("year");
  const outDir = getArg("out") || `out/staging/cds/${yearStr || "unknown"}`;
  const csvPath = getArg("csv"); // REQUIRED for VA PDFs converted to CSV

  if (!yearStr) {
    console.error(`[fatal] --year is required.`);
    process.exit(1);
  }
  const year = Number(yearStr);
  if (!Number.isFinite(year)) {
    console.error(`[fatal] --year must be a number. Got: ${yearStr}`);
    process.exit(1);
  }

  if (!csvPath) {
    console.error(`[fatal] --csv is required (point to your converted CSV from the VA PDF).`);
    process.exit(1);
  }
  if (!fs.existsSync(csvPath)) {
    console.error(`[fatal] CSV not found: ${csvPath}`);
    process.exit(1);
  }

  // Read CSV
  const csvRaw = fs.readFileSync(csvPath, "utf8");
  const records = parse(csvRaw, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as Record<string, string>[];

  // Try to locate columns by friendly names (your latest CSV header shape)
  // Expected headers (case-insensitive):
  // "Recipient Name","Project Purpose","Project Location","Amount Requested ($000)"
  const headerMap = Object.fromEntries(
    Object.keys(records[0] || {}).map((k) => [k.toLowerCase(), k])
  );

  function pick(name: string): string | undefined {
    // find by case-insensitive exact match first
    const keyExact = Object.keys(headerMap).find((k) => k === name.toLowerCase());
    if (keyExact) return headerMap[keyExact];
    // then by contains
    const keyContains = Object.keys(headerMap).find((k) => k.includes(name.toLowerCase()));
    if (keyContains) return headerMap[keyContains];
    return undefined;
  }

  const colRecipient = pick("recipient name") || pick("recipient");
  const colPurpose   = pick("project purpose") || pick("purpose");
  const colLocation  = pick("project location") || pick("location");
  const colAmountK   = pick("amount requested ($000)") || pick("amount ($000)") || pick("amount");

  if (!colRecipient || !colPurpose || !colLocation || !colAmountK) {
    console.error("[fatal] Could not resolve required columns. Found headers:");
    console.error(Object.keys(headerMap));
    process.exit(1);
  }

  const sourceLabel = path.basename(csvPath);
  const sourceUrl = undefined; // you can set the disclosure PDF URL here if you want to store it

  const items: CdsItem[] = records.map((r) => {
    const recipient = clean(r[colRecipient]);
    const purpose   = clean(r[colPurpose]);
    const location  = clean(r[colLocation]);

    // amount_thousands is in $000; compute both
    const amount_thousands = toNumberSafe(clean(r[colAmountK]));
    const amount = Math.round(amount_thousands * 1000);

    const item: CdsItem = {
      recipient,
      purpose,
      location,
      amount_thousands,
      amount,
      year,
      state: "VA",
      source: "cds",
      source_label: sourceLabel,
      source_url: sourceUrl,
      member: "Sen. Tim Kaine",
      subcommittee: "Agriculture",
      bill: `FY${year} Ag Approps`,
    };
    return item;
  });

  ensureDir(outDir);
  const outPath = path.join(outDir, "cds.json");
  fs.writeFileSync(outPath, JSON.stringify(items, null, 2));
  console.log(`[ok] VA CDS wrote ${outPath} ( ${items.length} records )`);
})();
