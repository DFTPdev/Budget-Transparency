// scripts/join/build_site_artifacts.ts
//
// Build the site-facing artifacts from staged sources (LIS + optional DPB/CDS/IRS990).
// - Accepts either FILES or DIRECTORIES for --lis/--dpb/--cds/--irs990
// - Produces:
//    outDir/
//      ├─ budget_by_district_<year>.json
//      ├─ budget_by_district_<year>.csv
//      ├─ budget_amendments_<year>.json
//      ├─ recipients_<year>.json
//      ├─ summary_<year>.json
//      ├─ dpb_<year>.json           (when includeDPB)
//      ├─ cds_<year>.json           (when includeCDS)
//      └─ _qa_unmatched_members.json  (only if there are any)
//
// Notes:
//   * LIS stays the driver for district totals (maps to members).
//   * DPB/CDS/IRS990 do NOT change LIS totals; they are attached as metadata
//     so we avoid double counting.
//   * This version also emits a per-recipient `sources` field and, when DPB
//     is present, `dpb_total`, `dpb_items`, and `dpb_breakdown` (array of {title,amount,url}).

import fs from "fs";
import path from "path";

// ---------- tiny arg parser ----------
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

// ---------- fs helpers (file OR directory) ----------
function ensureDir(p: string) {
  fs.mkdirSync(p, { recursive: true });
}

function isDir(p: string) {
  try { return fs.statSync(p).isDirectory(); } catch { return false; }
}

function readJson<T = any>(p: string, fallback: T): T {
  try {
    const raw = fs.readFileSync(p, "utf8").trim();
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function readJsonl(p: string): any[] {
  try {
    const raw = fs.readFileSync(p, "utf8");
    return raw.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
  } catch {
    return [];
  }
}

function loadJsonMaybeDir(p?: string): any[] {
  if (!p) return [];
  if (!isDir(p)) {
    const v = readJson<any>(p, []);
    return Array.isArray(v) ? v : (v ? [v] : []);
  }
  const files = fs.readdirSync(p)
    .filter(f => f.toLowerCase().endsWith(".json"))
    .map(f => path.join(p, f));
  const out: any[] = [];
  for (const f of files) {
    const v = readJson<any>(f, []);
    if (Array.isArray(v)) out.push(...v);
    else if (v) out.push(v);
  }
  return out;
}

function loadJsonlMaybeDir(p?: string): any[] {
  if (!p) return [];
  if (!isDir(p)) return readJsonl(p);
  const files = fs.readdirSync(p)
    .filter(f => f.toLowerCase().endsWith(".jsonl"))
    .map(f => path.join(p, f));
  const out: any[] = [];
  for (const f of files) out.push(...readJsonl(f));
  return out;
}

// ---------- string/normalization helpers ----------
function cleanQuotes(s: any): string {
  return String(s ?? "").replace(/^["']|["']$/g, "").trim();
}
function flipCommaName(n: string): string {
  const m = String(n).match(/^([^,]+),\s*(.+)$/);
  return m ? (m[2] + " " + m[1]) : n;
}
function toNumber(x: any): number {
  if (typeof x === "number") return x;
  if (typeof x === "string") {
    const n = Number(x.replace(/[\$,]/g, ""));
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}
function csvEscape(s: any): string {
  const t = String(s ?? "");
  return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
}

// ---------- main ----------
async function main() {
  const args = parseArgs(process.argv);
  const year = Number(args.year || args.y) || new Date().getFullYear();

  const lisPath   = args.lis as string | undefined;       // file or dir
  const dpbPath   = args.dpb as string | undefined;       // file or dir
  const cdsPath   = args.cds as string | undefined;       // file or dir
  const irs990Path= args.irs990 as string | undefined;    // file or dir

  const rosterPath  = args.roster as string | undefined;  // JSON file [{district, delegate_name},...]
  const aliasPath   = args.aliases as string | undefined; // JSON file { tokenOrWeirdName: "Full Name" }
  const locmapPath  = args.locmap as string | undefined;  // JSON file { "Locality Name": [districts...] }

  const includeDPB  = String(args.includeDPB ?? "false") === "true";
  const includeCDS  = String(args.includeCDS ?? "false") === "true";
  const include990  = String(args.include990 ?? "false") === "true";

  const outDir = args.outDir ? String(args.outDir) : "out/app";
  ensureDir(outDir);

  // ---- load inputs (robust to file or directory) ----
  const lisRows = loadJsonlMaybeDir(lisPath);
  if (!lisRows.length) {
    console.warn(`[warn] No LIS rows found from ${lisPath ?? "(unset)"}. You can pass a file or a directory.`);
  }

  const dpbRows = includeDPB ? loadJsonMaybeDir(dpbPath) : [];
  const cdsRows = includeCDS ? loadJsonMaybeDir(cdsPath) : [];
  const irsRows = include990 ? loadJsonMaybeDir(irs990Path) : [];

  const roster = rosterPath ? readJson<any[]>(rosterPath, []) : [];
  const aliases = aliasPath ? readJson<Record<string, string>>(aliasPath, {}) : {};
  const localityMap = locmapPath ? readJson<Record<string, number[]>>(locmapPath, {}) : {};

  // ---- build roster lookup ----
  type RosterRow = { district?: number | string; delegate_name?: string };
  const byName = new Map<string, { district: number | null, full: string }>();

  for (const r of roster as RosterRow[]) {
    const full = cleanQuotes(r.delegate_name || "").trim();
    if (!full) continue;
    let d: number | null = null;
    const rawD = (r.district ?? "").toString().trim();
    if (rawD) {
      const m = rawD.match(/\d+/);
      if (m) d = Number(m[0]);
    }
    byName.set(full.toLowerCase(), { district: d, full });
  }

  // ---- normalize and alias member names ----
  const qaUnmatched: Array<{ member: string, amendmentId?: string, title?: string | null, amount?: number }> = [];

  function normalizeMemberName(raw: any): string {
    let m = flipCommaName(cleanQuotes(raw));
    if (!m) return m;
    // direct alias match first (literal token like "Bloxom", or weird quoting)
    if (aliases[m]) return aliases[m];
    // try lowercase
    const l = m.toLowerCase();
    if (aliases[l]) return aliases[l];

    // if single token and alias provided for that token
    if (!/\s/.test(m) && aliases[m]) return aliases[m];

    // otherwise keep as-is
    return m;
  }

  // ---- harvest LIS → amendments + district sums ----
  type DistrictAgg = {
    sessionYear: number;
    district: number;
    delegate_name: string;
    total_amount: number;
    add_amount: number;
    reduce_amount: number;
    amendments_count: number;
  };

  const byDistrict = new Map<number, DistrictAgg>();
  const amendments: any[] = [];
  const recipients = new Map<string, { agency: string, total_amount: number, items: number, sources?: string[] }>();

  for (const r of lisRows) {
    const amount = toNumber(r.amount ?? r.gf_amount ?? 0) + toNumber(r.ngf_amount ?? 0);
    const memberRaw = r.member;
    const amendmentId = r.amendmentId ?? r.id ?? "";
    const agency = cleanQuotes(r.agency ?? "");
    const title = cleanQuotes(r.title ?? "");
    const sessionYear = Number(r.sessionYear ?? year);

    // Keep a clean row for budget_amendments
    amendments.push({
      amendmentId,
      sessionYear,
      chamber: r.chamber ?? "",
      member: normalizeMemberName(memberRaw),
      department: cleanQuotes(r.department ?? ""),
      agency,
      title,
      amount,
      gf_amount: toNumber(r.gf_amount ?? 0),
      ngf_amount: toNumber(r.ngf_amount ?? 0),
      url: r.url ?? "",
    });

    // recipients rollup (by agency, from LIS)
    if (agency) {
      const curr = recipients.get(agency) ?? { agency, total_amount: 0, items: 0, sources: [] };
      curr.total_amount += amount;
      curr.items += 1;
      if (!curr.sources!.includes("lis")) curr.sources!.push("lis");
      recipients.set(agency, curr);
    }

    // district aggregation (requires mapping a member to district)
    const normMember = normalizeMemberName(memberRaw);
    const key = normMember.toLowerCase();
    const rosterHit = byName.get(key);

    if (!rosterHit || rosterHit.district == null) {
      // couldn't map this member to a district — add to QA
      qaUnmatched.push({
        member: cleanQuotes(memberRaw),
        amendmentId,
        title,
        amount
      });
      continue;
    }

    const d = rosterHit.district!;
    const existing = byDistrict.get(d);
    const isReduce = amount < 0;

    if (!existing) {
      byDistrict.set(d, {
        sessionYear,
        district: d,
        delegate_name: rosterHit.full,
        total_amount: amount,
        add_amount: isReduce ? 0 : amount,
        reduce_amount: isReduce ? Math.abs(amount) : 0,
        amendments_count: 1,
      });
    } else {
      existing.total_amount += amount;
      if (isReduce) existing.reduce_amount += Math.abs(amount);
      else existing.add_amount += amount;
      existing.amendments_count += 1;
    }
  }

  // ---- DPB/CDS/IRS990 sidecar aggregation (no double counting) ----
  type DpbSidecar = {
    dpb_total: number;
    dpb_items: number;
    dpb_breakdown: Array<{ title: string; amount: number; url: string }>;
  };
  const dpbByAgency = new Map<string, DpbSidecar>();

  if (includeDPB && dpbRows.length) {
    for (const r of dpbRows) {
      const agency = cleanQuotes(r.agency ?? "");
      if (!agency) continue;
      const title = cleanQuotes(r.title ?? "");
      const url = cleanQuotes(r.url ?? "");
      const amount = toNumber(r.amount ?? r.gf_amount ?? r.ngf_amount ?? 0);

      const side = dpbByAgency.get(agency) ?? { dpb_total: 0, dpb_items: 0, dpb_breakdown: [] };
      side.dpb_total += amount;
      side.dpb_items += 1;
      side.dpb_breakdown.push({ title, amount, url });
      dpbByAgency.set(agency, side);
    }
  }

  // CDS passthrough (just emit the raw CDS to outDir for UI/QA; recipients tagging happens in enrich step)
  // Still, we keep it available here for future joining if needed.
  const cdsOut = (includeCDS && cdsRows.length) ? cdsRows : [];

  // ---- sort & serialize district data ----
  const districtRows = Array.from(byDistrict.values())
    .sort((a, b) => a.district - b.district);

  // ---- materialize recipients array (attach DPB metadata if available) ----
  const recipientsRows = Array.from(recipients.values())
    .map((row) => {
      const side = dpbByAgency.get(row.agency);
      if (side) {
        if (!row.sources) row.sources = [];
        if (!row.sources.includes("dpb")) row.sources.push("dpb");
        return {
          ...row,
          dpb_total: side.dpb_total,
          dpb_items: side.dpb_items,
          dpb_breakdown: side.dpb_breakdown,
        };
      }
      return row;
    })
    .sort((a, b) => b.total_amount - a.total_amount);

  // ---- write outputs ----
  const outJSON = (name: string, obj: any) => {
    const p = path.join(outDir, name);
    fs.writeFileSync(p, JSON.stringify(obj, null, 2));
    return p;
  };

  const outCSV = (name: string, rows: DistrictAgg[]) => {
    const p = path.join(outDir, name);
    const header = [
      "sessionYear",
      "district",
      "delegate_name",
      "total_amount",
      "add_amount",
      "reduce_amount",
      "amendments_count",
    ];
    const lines = [header.join(",")];
    for (const r of rows) {
      lines.push([
        r.sessionYear,
        r.district,
        csvEscape(r.delegate_name),
        r.total_amount,
        r.add_amount,
        r.reduce_amount,
        r.amendments_count,
      ].join(","));
    }
    fs.writeFileSync(p, lines.join("\n"));
    return p;
  };

  const sums = {
    total_amendments: amendments.length,
    total_amount: amendments.reduce((s, r) => s + toNumber(r.amount), 0),
    districts_with_data: districtRows.length,
  };

  const byDistJson = outJSON(`budget_by_district_${year}.json`, districtRows);
  const byDistCsv  = outCSV(`budget_by_district_${year}.csv`, districtRows);
  const amendJson  = outJSON(`budget_amendments_${year}.json`, amendments);
  const recipsJson = outJSON(`recipients_${year}.json`, recipientsRows);
  const summaryJson= outJSON(`summary_${year}.json`, sums);

  const wrote: string[] = [byDistJson, byDistCsv, amendJson, recipsJson, summaryJson];

  if (includeDPB) wrote.push(outJSON(`dpb_${year}.json`, dpbRows));
  if (includeCDS) wrote.push(outJSON(`cds_${year}.json`, cdsOut));
  if (include990) wrote.push(outJSON(`irs990_index.json`, irsRows));

  if (qaUnmatched.length) {
    const qaPath = path.join(outDir, "_qa_unmatched_members.json");
    fs.writeFileSync(qaPath, JSON.stringify(qaUnmatched, null, 2));
    console.log(`[warn] ${qaUnmatched.length} LIS member row(s) unmatched → ${qaPath}`);
  } else {
    console.log(`[ok] No unmatched LIS members.`);
  }

  console.log("[ok] Wrote:");
  for (const p of wrote) console.log("-", p);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});