// scripts/build_budget_dataset.ts
import fs from "fs";
import path from "path";

type RosterRow = {
  district: number;
  delegate_name: string;
};

type AmendRow = {
  amendmentId?: string;
  sessionYear?: number | string;
  chamber?: string;
  member?: string;
  memberUrl?: string;
  agency?: string;
  title?: string;
  url?: string;
  scrapedAt?: string;
  // amounts: support both legacy and enriched
  amount?: number;        // legacy total
  gf_amount?: number;     // optional GF
  ngf_amount?: number;    // optional NGF
};

type DistrictAgg = {
  sessionYear: number;
  district: number;
  delegate_name: string;
  total_amount: number;
  add_amount: number;
  reduce_amount: number;
  amendments_count: number;
};

function readArg(name: string, def?: string): string {
  const ix = process.argv.indexOf(`--${name}`);
  if (ix >= 0 && process.argv[ix + 1]) return process.argv[ix + 1];
  if (def !== undefined) return def;
  throw new Error(`Missing required arg --${name}`);
}

function readJson<T = any>(p: string): T {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function normalizeWhitespace(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}
function cleanQuotes(s: string): string {
  return s.replace(/^["']|["']$/g, "").trim();
}
function flipCommaName(n: string): string {
  const m = n.match(/^([^,]+),\s*(.+)$/);
  return m ? `${m[2]} ${m[1]}` : n;
}

/** Build a map of unique last-name -> full name from roster. Ambiguous last names are dropped. */
function buildUniqueLastMap(roster: RosterRow[]): Map<string, string> {
  const lastMap = new Map<string, string>();
  const multi = new Set<string>();
  for (const r of roster) {
    const full = normalizeWhitespace(r.delegate_name || "");
    const parts = full.split(" ");
    const last = (parts[parts.length - 1] || "").toLowerCase();
    if (!last) continue;
    if (lastMap.has(last) && lastMap.get(last) !== full) multi.add(last);
    else lastMap.set(last, full);
  }
  for (const l of multi) lastMap.delete(l);
  return lastMap;
}

/** Use roster to expand a last-name-only into a full name when unambiguous. */
function expandLastOnly(n: string, lastMap: Map<string, string>): string {
  if (!n || /\s/.test(n)) return n;
  const cand = lastMap.get(n.toLowerCase());
  return cand || n;
}

/** Normalize a member name into a join-friendly full name. */
function normalizeMemberName(raw: string, lastMap: Map<string, string>): string {
  let m = normalizeWhitespace(cleanQuotes(raw));
  m = flipCommaName(m);
  m = expandLastOnly(m, lastMap);
  return m;
}

/** Try to parse a numeric year from input, default current year if needed. */
function toYear(n: string | number | undefined): number {
  const y = typeof n === "number" ? n : Number(String(n || "").replace(/[^\d]/g, ""));
  return y || new Date().getFullYear();
}

/** Resolve total amount from a row, preferring gf/ngf if available. */
function totalFromRow(r: AmendRow): number {
  const gf = typeof r.gf_amount === "number" ? r.gf_amount : 0;
  const ngf = typeof r.ngf_amount === "number" ? r.ngf_amount : 0;
  if (gf || ngf) return gf + ngf;
  return typeof r.amount === "number" ? r.amount : 0;
}

/** CSV escape */
function csv(val: any): string {
  const s = String(val ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function main() {
  const houseRosterPath = readArg("houseRosterPath");
  const year = toYear(readArg("year"));

  const outDir = "./out";
  const jsonlPath = path.join(outDir, `lis_amendments_${year}.jsonl`);

  if (!fs.existsSync(jsonlPath)) {
    throw new Error(`Amendments JSONL not found: ${jsonlPath}`);
  }

  // Load roster
  const roster: RosterRow[] = readJson<RosterRow[]>(houseRosterPath)
    .map(r => ({
      district: Number(r.district),
      delegate_name: normalizeWhitespace(String((r as any).delegate_name ?? (r as any).name ?? "")),
    }))
    .filter(r => r.district && r.delegate_name);

  if (!roster.length) {
    throw new Error(`Roster is empty or invalid: ${houseRosterPath}`);
  }

  // Build helpers for join
  const lastMap = buildUniqueLastMap(roster);
  const nameToDistrict = new Map<string, number>();
  // Prefer exact case-insensitive mapping
  for (const r of roster) {
    nameToDistrict.set(r.delegate_name.toLowerCase(), r.district);
  }

  // Read amendments
  const lines = fs.readFileSync(jsonlPath, "utf8").split(/\r?\n/).filter(Boolean);
  const amended: AmendRow[] = [];
  let unknownNames = 0;

  for (const ln of lines) {
    const obj = JSON.parse(ln) as AmendRow;
    // Clean fields we show
    if (obj.agency) obj.agency = cleanQuotes(obj.agency);
    if (obj.title) obj.title = cleanQuotes(obj.title);

    // Normalize member
    const rawName = String(obj.member || "").trim();
    const normName = normalizeMemberName(rawName, lastMap);
    obj.member = normName;

    // Keep
    amended.push(obj);
  }

  // Aggregate by district
  const byDistrict = new Map<number, DistrictAgg>();
  const sessionYear = year;

  // If no match, we won't include that row in district rollups (but it will still be present in amendments JSON).
  for (const row of amended) {
    const memberName = String(row.member || "").trim();
    if (!memberName) {
      unknownNames++;
      continue;
    }

    const district =
      nameToDistrict.get(memberName.toLowerCase()) ?? null;

    if (!district) {
      unknownNames++;
      continue;
    }

    const amt = totalFromRow(row);
    const key = district;

    let cur = byDistrict.get(key);
    if (!cur) {
      cur = {
        sessionYear,
        district,
        delegate_name: memberName,
        total_amount: 0,
        add_amount: 0,
        reduce_amount: 0,
        amendments_count: 0,
      };
      byDistrict.set(key, cur);
    }

    cur.total_amount += amt;
    if (amt >= 0) cur.add_amount += amt;
    else cur.reduce_amount += Math.abs(amt);
    cur.amendments_count += 1;
  }

  // Emit outputs
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  // budget_amendments_<year>.json: pass-through array with cleaned fields
  const amendmentsOut = path.join(outDir, `budget_amendments_${year}.json`);
  fs.writeFileSync(amendmentsOut, JSON.stringify(amended, null, 2));

  // budget_by_district_<year>.json
  const districtRows = Array.from(byDistrict.values()).sort((a, b) => a.district - b.district);
  const byDistrictJson = path.join(outDir, `budget_by_district_${year}.json`);
  fs.writeFileSync(byDistrictJson, JSON.stringify(districtRows, null, 2));

  // budget_by_district_<year>.csv
  const byDistrictCsv = path.join(outDir, `budget_by_district_${year}.csv`);
  const header = [
    "sessionYear",
    "district",
    "delegate_name",
    "total_amount",
    "add_amount",
    "reduce_amount",
    "amendments_count",
  ];
  const csvLines = [header.join(",")].concat(
    districtRows.map(r =>
      [
        r.sessionYear,
        r.district,
        r.delegate_name,
        r.total_amount,
        r.add_amount,
        r.reduce_amount,
        r.amendments_count,
      ].map(csv).join(",")
    )
  );
  fs.writeFileSync(byDistrictCsv, csvLines.join("\n"));

  // summary_<year>.json
  const summary = {
    sessionYear,
    roster_entries: roster.length,
    amendments_rows: amended.length,
    districts_with_data: districtRows.length,
    unknown_member_rows: unknownNames,
    total_amount_all_districts: districtRows.reduce((s, x) => s + (x.total_amount || 0), 0),
    top10: [...districtRows]
      .sort((a, b) => b.total_amount - a.total_amount)
      .slice(0, 10)
      .map(({ district, delegate_name, total_amount }) => ({ district, delegate_name, total_amount })),
  };
  const summaryOut = path.join(outDir, `summary_${year}.json`);
  fs.writeFileSync(summaryOut, JSON.stringify(summary, null, 2));

  // Logs
  console.log("[ok] Wrote:");
  console.log(`- ${amendmentsOut}`);
  console.log(`- ${byDistrictJson}`);
  console.log(`- ${byDistrictCsv}`);
  console.log(`- ${summaryOut}`);
  if (unknownNames > 0) {
    console.log(`[warn] ${unknownNames} amendment row(s) could not be matched to a district (name mismatch).`);
  } else {
    console.log("[ok] All amendment rows that had members matched a district.");
  }
}

main();