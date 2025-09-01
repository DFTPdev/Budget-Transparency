// scripts/convert_member_csv.ts
import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";

type Args = {
  year: number;
  input: string;
  outDir: string;
};

type Row = Record<string, string | number | null | undefined>;

function getArg(name: string, def?: string): string {
  const i = process.argv.indexOf(`--${name}`);
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1];
  if (def !== undefined) return def;
  throw new Error(`Missing required arg --${name}`);
}

function toYear(x: string): number {
  const y = Number(String(x).replace(/[^\d]/g, ""));
  if (!y) throw new Error(`Invalid --year value: ${x}`);
  return y;
}

function readCsvUtf8(p: string): string {
  const raw = fs.readFileSync(p);
  // Very light BOM guard; real UTF-16 should be cleaned beforehand via iconv.
  if (raw.length >= 2 && raw[0] === 0xff && raw[1] === 0xfe) {
    throw new Error(
      "Input appears to be UTF-16LE. Please pre-clean with iconv (see README) before running this script."
    );
  }
  return raw.toString("utf8");
}

function normalizeHeader(h: string): string {
  return h.trim().replace(/\u00A0/g, " "); // squash nbsp
}

function findCol(header: string[], candidates: string[]): string | null {
  const H = header.map((h) => normalizeHeader(h).toLowerCase());
  for (const cand of candidates) {
    const i = H.indexOf(cand.toLowerCase());
    if (i !== -1) return header[i];
  }
  return null;
}

function moneyToNumber(s: any): number {
  if (s == null) return 0;
  const str = String(s).trim();
  if (!str) return 0;
  // Remove $ , and spaces; handle negatives; ignore footnote text
  const cleaned = str.replace(/[^0-9\-.]/g, "");
  const n = Number(cleaned);
  return isFinite(n) ? n : 0;
}

function cleanQuotes(s: any): string {
  return String(s ?? "")
    .replace(/^["']|["']$/g, "")
    .trim();
}

function main() {
  const year = toYear(getArg("year"));
  const input = getArg("input");
  const outDir = getArg("outDir", "./out");
  const outPath = path.join(outDir, `lis_amendments_${year}.jsonl`);

  if (!fs.existsSync(input)) {
    throw new Error(`Input CSV not found: ${input}`);
  }
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const csvText = readCsvUtf8(input);

  // Robust parsing: relax column counts/quotes; autodetect delimiter (comma or tab).
  const firstLine = csvText.split(/\r?\n/)[0] || "";
  const delimiter =
    firstLine.includes("\t") && firstLine.split("\t").length > firstLine.split(",").length
      ? "\t"
      : ",";

  const recs = parse(csvText, {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
    delimiter,
    trim: true,
  }) as Row[];

  if (!recs.length) {
    throw new Error("CSV appears empty after header row.");
  }

  // Detect columns (LIS exports vary slightly in wording/quotes)
  const header = Object.keys(recs[0] || {}).map(normalizeHeader);

  const colAmendment = findCol(header, ['Amendment #', 'Amendment # ']) || 'Amendment #';
  const colPatron = findCol(header, ['Patron', 'Member', 'Member Name']) || 'Patron';
  const colAgency = findCol(header, ['Agency']) || 'Agency';
  const colDept = findCol(header, ['Department']) || 'Department';
  const colDesc = findCol(header, ['Description','Title']) || 'Description';
  const colLang = findCol(header, ['Language']) || 'Language';
  const colExpl = findCol(header, ['Explanation']) || 'Explanation';

  // GF/NGF candidates
  const gf25 = findCol(header, ['GF Dollars FY2025', 'GF Dollars FY2025']) || 'GF Dollars FY2025';
  const gf26 = findCol(header, ['GF Dollars FY2026', 'GF Dollars FY2026']) || 'GF Dollars FY2026';
  const ngf25 = findCol(header, ['NGF Dollars FY2025', 'NGF Dollars FY2025']) || 'NGF Dollars FY2025';
  const ngf26 = findCol(header, ['NGF Dollars FY2026', 'NGF Dollars FY2026']) || 'NGF Dollars FY2026';

  // Validate money columns exist (they should, in the “Spreadsheet” export with Dollars)
  const moneyMissing =
    !header.includes(gf25) ||
    !header.includes(gf26) ||
    !header.includes(ngf25) ||
    !header.includes(ngf26);

  if (moneyMissing) {
    console.error("[fatal] CSV has no recognizable 'GF/NGF ... Dollars ... FY...' columns.");
    console.error("Header preview:", header.slice(0, 10));
    process.exit(2);
  }

  const out = fs.createWriteStream(outPath, { encoding: "utf8" });

  let rows = 0;
  let sumGF = 0;
  let sumNGF = 0;

  for (const r of recs) {
    const amendmentId = cleanQuotes(r[colAmendment]);
    const patron = cleanQuotes(r[colPatron]);
    const agency = cleanQuotes(r[colAgency]);
    const dept = cleanQuotes(r[colDept]);
    const desc = cleanQuotes(r[colDesc]);
    const language = cleanQuotes(r[colLang]);
    const explanation = cleanQuotes(r[colExpl]);

    // Compute money
    const gf_amount = moneyToNumber(r[gf25]) + moneyToNumber(r[gf26]);
    const ngf_amount = moneyToNumber(r[ngf25]) + moneyToNumber(r[ngf26]);
    const amount = gf_amount + ngf_amount;

    // Skip truly empty amendments (no id, no patron, no dollars)
    if (!amendmentId && !patron && amount === 0) continue;

    const record = {
      amendmentId,
      sessionYear: year,
      chamber: "House", // This export is from the House “Amendments by Member” page
      member: patron,   // leave as-is; builder will normalize
      memberUrl: "",
      department: dept || undefined,
      agency: agency || undefined,
      title: desc || undefined,
      url: "",
      scrapedAt: new Date().toISOString(),
      // extra fields that many UIs find handy
      language: language || undefined,
      explanation: explanation || undefined,
      // key amounts
      gf_amount,
      ngf_amount,
      amount,
    };

    out.write(JSON.stringify(record) + "\n");
    rows++;
    sumGF += gf_amount;
    sumNGF += ngf_amount;
  }

  out.end();

  console.log(
    `[ok] Wrote ${rows} rows → ${outPath}`
  );
  console.log(
    `[ok] Totals — GF: ${sumGF.toLocaleString()} | NGF: ${sumNGF.toLocaleString()} | All: ${(sumGF+sumNGF).toLocaleString()}`
  );
}

main();