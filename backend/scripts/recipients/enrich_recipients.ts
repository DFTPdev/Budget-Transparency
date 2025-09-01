// scripts/recipients/enrich_recipients.ts
import fs from "fs";
import path from "path";

type Cli = { year: number; inPath: string; outPath: string };
type InRow = string | { name: string; count?: number } | { recipient: string; count?: number };
type OutRow = {
  name: string;
  count?: number;
  type: "nonprofit" | "government" | "education" | "healthcare" | "other";
  search_irs: string;
  search_guidestar: string;
};

function parseArgs(): Cli {
  const argv = process.argv.slice(2);
  const get = (k: string) => {
    const i = argv.indexOf(`--${k}`);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  const year = Number(get("year"));
  if (!year || Number.isNaN(year)) throw new Error("Missing --year");
  const inPath = get("in") || `out/app/recipients_${year}.json`;
  const outPath = get("out") || `out/app/recipients_enriched_${year}.json`;
  return { year, inPath, outPath };
}

function classify(name: string): OutRow["type"] {
  const n = name.toLowerCase();
  if (/\b(university|college|school|academy|institut(e|ion)|nsu|vcu|uva)\b/.test(n)) return "education";
  if (/\b(hospital|clinic|health|medical|behavioral)\b/.test(n)) return "healthcare";
  if (/\b(city|county|town|authority|commission|board|department|office)\b/.test(n)) return "government";
  if (/\b(inc\.?|foundation|association|society|coalition|alliance|nonprofit|church|museum|center)\b/.test(n)) return "nonprofit";
  return "other";
}

function enc(s: string) { return encodeURIComponent(s); }

function build(name: string, count?: number): OutRow {
  return {
    name,
    count,
    type: classify(name),
    search_irs: `https://apps.irs.gov/app/eos/allSearch.do?ein1=&names=${enc(name)}&resultsPerPage=25&indexOfFirstRow=0&dispatchMethod=searchAll`,
    search_guidestar: `https://www.guidestar.org/search?q=${enc(name)}`
  };
}

function normalize(row: InRow): { name: string; count?: number } | null {
  if (typeof row === "string") return { name: row.trim() };
  const any = row as any;
  const name = (any?.name || any?.recipient || "").trim();
  if (!name) return null;
  return { name, count: typeof any?.count === "number" ? any.count : undefined };
}

(function main() {
  const { inPath, outPath } = parseArgs();
  const raw = JSON.parse(fs.readFileSync(inPath, "utf8")) as InRow[] | Record<string, any>;
  let arr: InRow[] = Array.isArray(raw) ? raw : raw?.items || raw?.data || [];
  if (!Array.isArray(arr)) throw new Error("Unrecognized recipients JSON shape");

  const out: OutRow[] = [];
  const seen = new Set<string>();
  for (const r of arr) {
    const norm = normalize(r);
    if (!norm) continue;
    const key = norm.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(build(norm.name, norm.count));
  }

  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log("[ok] recipients enriched →", outPath, `(${out.length})`);
})();