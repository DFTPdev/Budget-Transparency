// scripts/cds/fetch_cds.ts
//
// Fetch/ingest real CDS (Congressionally Directed Spending) data.
// - Accepts a CSV or JSON via --source (URL or local file path).
// - If --source is omitted, falls back to ingest/cds_<YEAR>.csv if it exists.
// - Normalizes fields and writes out: <out>/cds.json
//
// Usage examples:
//   npx ts-node --files scripts/cds/fetch_cds.ts --year 2025 --out out/staging/cds/2025 \
//     --source https://example.com/va_cds_2025.csv
//
//   npx ts-node --files scripts/cds/fetch_cds.ts --year 2025 --out out/staging/cds/2025
//   (falls back to ingest/cds_2025.csv if present)
//
// Notes:
//  • Expected CSV columns (case/spacing flexible; best-effort mapping):
//      Sponsor, Recipient, Project, City, State, Amount, Account, Subcommittee, Year, URL
//    We’ll also try common synonyms: Organization/Agency/Entity for Recipient,
//    Funding/Request for Amount, Link for URL, etc.
//
import fs from "fs";
import path from "path";
import axios from "axios";
import { parse } from "csv-parse";

type Args = {
  year: number;
  out: string;
  source?: string;       // URL or local file path (CSV or JSON)
  state?: string;        // optional filter (e.g., "VA")
  limit?: number;        // optional cap
};

function parseArgs(argv: string[]): Args {
  const a: Record<string, string> = {};
  for (let i = 2; i < argv.length; i++) {
    const k = argv[i];
    if (k.startsWith("--")) {
      const key = k.slice(2);
      const val = (i + 1 < argv.length && !argv[i + 1].startsWith("--")) ? argv[++i] : "true";
      a[key] = val;
    }
  }
  const year = Number(a.year || new Date().getFullYear());
  const out = String(a.out || `out/staging/cds/${year}`);
  const source = a.source;
  const state = a.state;
  const limit = a.limit ? Number(a.limit) : undefined;
  return { year, out, source, state, limit };
}

function ensureDir(p: string) {
  fs.mkdirSync(p, { recursive: true });
}

function sha1(s: string) {
  // tiny inline sha1 (node crypto) without importing types in older ts configs
  const crypto = require("crypto");
  return crypto.createHash("sha1").update(s).digest("hex");
}

function toNumber(x: any): number {
  if (typeof x === "number") return x;
  if (typeof x === "string") {
    const n = Number(x.replace(/[\$,]/g, "").trim());
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function clean(s: any): string {
  return String(s ?? "").trim();
}

// Heuristic column mapping from CSV headers to our normalized keys.
const HEADER_MAP: Record<string, string> = {
  // sponsor
  "sponsor": "sponsor",
  "member": "sponsor",
  "senator": "sponsor",

  // recipient/org
  "recipient": "recipient",
  "organization": "recipient",
  "organisation": "recipient",
  "agency": "recipient",
  "entity": "recipient",

  // project/title/description
  "project": "project",
  "project name": "project",
  "project title": "project",
  "description": "project",

  // city
  "city": "city",
  "locality": "city",
  "location": "city",

  // state
  "state": "state",

  // amount
  "amount": "amount",
  "funding": "amount",
  "request": "amount",
  "requested amount": "amount",

  // account
  "account": "account",
  "appropriations account": "account",

  // subcommittee
  "subcommittee": "subcommittee",

  // year
  "year": "year",
  "fiscal year": "year",
  "fy": "year",

  // url
  "url": "url",
  "link": "url",
  "source": "url",
};

type CdsRow = {
  id: string;
  source: "cds";
  sponsor?: string;
  recipient?: string;
  project?: string;
  city?: string;
  state?: string;
  amount?: number;
  account?: string;
  subcommittee?: string;
  year?: number;
  url?: string;
};

function normalizeHeaders(hdrs: string[]): string[] {
  return hdrs.map(h => h.toLowerCase().replace(/\s+/g, " ").trim());
}

function mapHeaderToKey(h: string): string {
  const direct = HEADER_MAP[h];
  if (direct) return direct;

  // try loose contains
  const lc = h.toLowerCase();
  for (const [k, v] of Object.entries(HEADER_MAP)) {
    if (lc === k) return v;
  }
  if (lc.includes("sponsor") || lc.includes("senator") || lc.includes("member")) return "sponsor";
  if (lc.includes("recipient") || lc.includes("organization") || lc.includes("agency") || lc.includes("entity")) return "recipient";
  if (lc.includes("project") || lc.includes("title") || lc.includes("description")) return "project";
  if (lc.includes("city") || lc.includes("locality")) return "city";
  if (lc === "state") return "state";
  if (lc.includes("amount") || lc.includes("funding") || lc.includes("request")) return "amount";
  if (lc.includes("account")) return "account";
  if (lc.includes("subcommittee")) return "subcommittee";
  if (lc === "year" || lc.includes("fiscal") || lc === "fy") return "year";
  if (lc === "url" || lc.includes("link") || lc.includes("source")) return "url";

  return h; // keep as-is if unknown
}

async function readCsvFromString(csv: string): Promise<Record<string, any>[]> {
  return new Promise((resolve, reject) => {
    const rows: Record<string, any>[] = [];
    parse(csv, { columns: true, skip_empty_lines: true }, (err, data) => {
      if (err) return reject(err);
      resolve(data as Record<string, any>[]);
    });
  });
}

async function readCsvFromFile(filePath: string): Promise<Record<string, any>[]> {
  const content = fs.readFileSync(filePath, "utf8");
  return readCsvFromString(content);
}

async function readJsonFromFile(filePath: string): Promise<any> {
  const raw = fs.readFileSync(filePath, "utf8");
  return JSON.parse(raw);
}

async function fetchText(url: string): Promise<string> {
  const res = await axios.get(url, { responseType: "text", timeout: 60000 });
  return res.data;
}

async function fetchJson(url: string): Promise<any> {
  const res = await axios.get(url, { responseType: "json", timeout: 60000 });
  return res.data;
}

function normalizeCsvRows(rows: Record<string, any>[], yearDefault: number): CdsRow[] {
  if (!rows.length) return [];

  const headers = Object.keys(rows[0] ?? {});
  const normHeaders = normalizeHeaders(headers);
  const mapped = normHeaders.map(mapHeaderToKey);

  const out: CdsRow[] = [];
  for (const row of rows) {
    const obj: Record<string, any> = {};
    headers.forEach((h, idx) => {
      const key = mapped[idx] || h;
      obj[key] = row[h];
    });

    const rec: CdsRow = {
      id: "",
      source: "cds",
      sponsor: clean(obj["sponsor"]),
      recipient: clean(obj["recipient"]),
      project: clean(obj["project"]),
      city: clean(obj["city"]),
      state: clean(obj["state"]),
      amount: toNumber(obj["amount"]),
      account: clean(obj["account"]),
      subcommittee: clean(obj["subcommittee"]),
      year: obj["year"] ? Number(obj["year"]) : yearDefault,
      url: clean(obj["url"]),
    };

    const sig = [
      rec.sponsor, rec.recipient, rec.project, rec.city, rec.state,
      rec.amount, rec.account, rec.subcommittee, rec.year, rec.url
    ].map(x => String(x ?? "")).join("|");

    rec.id = sha1(`cds|${sig}`);
    out.push(rec);
  }
  return out;
}

function normalizeJsonRows(data: any, yearDefault: number): CdsRow[] {
  // Accept: array of objects (already shaped) OR array with similar keys to CSV map
  if (!Array.isArray(data)) return [];
  const rows = data as any[];
  // If already looks like CdsRow, just coerce and fix id
  const out: CdsRow[] = [];
  for (const r of rows) {
    const rec: CdsRow = {
      id: "",
      source: "cds",
      sponsor: clean(r.sponsor ?? r.member ?? r.senator),
      recipient: clean(r.recipient ?? r.organization ?? r.agency ?? r.entity),
      project: clean(r.project ?? r.title ?? r.description),
      city: clean(r.city ?? r.locality ?? r.location),
      state: clean(r.state),
      amount: toNumber(r.amount ?? r.funding ?? r.request),
      account: clean(r.account ?? r.appropriations_account),
      subcommittee: clean(r.subcommittee),
      year: r.year ? Number(r.year) : yearDefault,
      url: clean(r.url ?? r.link ?? r.source),
    };
    const sig = [
      rec.sponsor, rec.recipient, rec.project, rec.city, rec.state,
      rec.amount, rec.account, rec.subcommittee, rec.year, rec.url
    ].map(x => String(x ?? "")).join("|");
    rec.id = sha1(`cds|${sig}`);
    out.push(rec);
  }
  return out;
}

function applyFilters(rows: CdsRow[], args: Args): CdsRow[] {
  let r = rows;
  if (args.state) {
    const want = args.state.toUpperCase();
    r = r.filter(x => (x.state || "").toUpperCase() === want);
  }
  if (args.limit && args.limit > 0) {
    r = r.slice(0, args.limit);
  }
  return r;
}

async function main() {
  const args = parseArgs(process.argv);
  ensureDir(args.out);

  let rows: CdsRow[] = [];

  if (args.source) {
    // URL or local file?
    if (/^https?:\/\//i.test(args.source)) {
      // URL
      try {
        // detect by file extension first
        if (/\.(csv)(\?|$)/i.test(args.source)) {
          const csv = await fetchText(args.source);
          const raw = await readCsvFromString(csv);
          rows = normalizeCsvRows(raw, args.year);
        } else if (/\.(json)(\?|$)/i.test(args.source)) {
          const json = await fetchJson(args.source);
          rows = normalizeJsonRows(json, args.year);
        } else {
          // unknown — try JSON first, then CSV
          try {
            const json = await fetchJson(args.source);
            rows = normalizeJsonRows(json, args.year);
          } catch {
            const txt = await fetchText(args.source);
            const raw = await readCsvFromString(txt);
            rows = normalizeCsvRows(raw, args.year);
          }
        }
      } catch (e: any) {
        console.error("[error] Failed to fetch --source URL:", e?.message || e);
      }
    } else {
      // local path
      const p = path.resolve(args.source);
      if (fs.existsSync(p)) {
        if (p.toLowerCase().endsWith(".csv")) {
          const raw = await readCsvFromFile(p);
          rows = normalizeCsvRows(raw, args.year);
        } else if (p.toLowerCase().endsWith(".json")) {
          const json = await readJsonFromFile(p);
          rows = normalizeJsonRows(json, args.year);
        } else {
          // try JSON then CSV
          try {
            const json = await readJsonFromFile(p);
            rows = normalizeJsonRows(json, args.year);
          } catch {
            const raw = await readCsvFromFile(p);
            rows = normalizeCsvRows(raw, args.year);
          }
        }
      } else {
        console.error(`[warn] --source path not found: ${p}`);
      }
    }
  }

  // Fallback: ingest/cds_<year>.csv
  if (!rows.length) {
    const fallback = path.resolve(`ingest/cds_${args.year}.csv`);
    if (fs.existsSync(fallback)) {
      try {
        const raw = await readCsvFromFile(fallback);
        rows = normalizeCsvRows(raw, args.year);
        console.log(`[info] Loaded fallback CSV: ${fallback}`);
      } catch (e: any) {
        console.error("[error] Failed to read fallback CSV:", e?.message || e);
      }
    }
  }

  rows = applyFilters(rows, args);

  const outFile = path.join(args.out, "cds.json");
  fs.writeFileSync(outFile, JSON.stringify(rows, null, 2));
  console.log(`[ok] CDS wrote ${outFile} ( ${rows.length} records )`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});