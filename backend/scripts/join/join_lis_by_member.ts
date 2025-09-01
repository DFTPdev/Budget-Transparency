// scripts/join/join_lis_by_member.ts
import * as fs from "fs";
import * as path from "path";

function getArg(name: string, fallback?: string) {
  const idx = process.argv.findIndex(a => a === `--${name}` || a.startsWith(`--${name}=`));
  if (idx === -1) return fallback;
  const tok = process.argv[idx];
  if (tok.includes("=")) return tok.split("=")[1];
  const val = process.argv[idx + 1];
  return (val && !val.startsWith("--")) ? val : fallback;
}

const year = getArg("year", process.env.npm_package_config_year || "2025");
const lisPath = getArg("lis") || path.join("out", "staging", "lis", String(year), "lis.json");
const rosterPath = getArg("roster") || path.join("scripts", "house_delegates_roster_enriched.json");
const aliasPath = getArg("aliases") || path.join("ingest", "member_aliases.json");
const outPath = getArg("out") || path.join("out", "app", `lis_by_district_${year}.json`);
const debugDir = path.join("out", "app", "_debug");
const unmatchedPath = path.join(debugDir, `lis_unmatched_members_${year}.txt`);

type LisRec = {
  member?: string;
  amount?: number;
  locality?: string | null;
  purpose?: string;
  agency?: string;
  year?: number;
  source?: string;
  [k: string]: any;
};

type RosterRec = {
  name?: string;
  full_name?: string;
  member?: string;
  chamber?: string;
  district?: string;
  number?: string | number;
  [k: string]: any;
};

function readJSON<T>(p: string, optional=false): T {
  if (!fs.existsSync(p)) {
    if (optional) return [] as unknown as T;
    throw new Error(`File not found: ${p}`);
  }
  return JSON.parse(fs.readFileSync(p, "utf8")) as T;
}

function toDistrictString(raw?: string | number | null): string | null {
  if (raw === undefined || raw === null) return null;
  const s = String(raw).trim();
  if (!s) return null;
  if (/^(HD|SD)\s*[-]?\s*\d+$/i.test(s)) {
    const m = s.toUpperCase().replace(/\s+/g, "").replace("–", "-");
    const parts = m.split("-");
    return `${parts[0]}-${parts[1]}`;
  }
  if (/^\d+$/.test(s)) return s;
  return s;
}

function normName(x?: string): string {
  let s = (x || "").toLowerCase();

  // remove titles/honorifics
  s = s.replace(/\b(del(?:\.|egate)?|sen(?:\.|ator)?|rep(?:\.|resentative)?)\b/g, " ");
  // remove content in parens and after commas (often titles)
  s = s.replace(/\(.*?\)/g, " ");
  // drop suffixes like Jr., Sr., II, III
  s = s.replace(/\b(jr|sr|ii|iii|iv|phd|esq)\b/g, " ");
  // remove punctuation
  s = s.replace(/[.,]/g, " ");
  // collapse spaces
  s = s.replace(/\s+/g, " ").trim();
  return s;
}

function buildMemberToDistrict(roster: RosterRec[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const r of roster) {
    const nm = normName(r.full_name || r.name || r.member || "");
    const d = toDistrictString(r.district || r.number || (r as any).dist || null);
    if (!nm || !d) continue;
    map.set(nm, d);
  }
  return map;
}

function main() {
  try {
    const lis: LisRec[] = readJSON<LisRec[]>(lisPath);
    const roster: RosterRec[] = readJSON<RosterRec[]>(rosterPath);
    const aliases: Record<string,string> = fs.existsSync(aliasPath) ? readJSON<Record<string,string>>(aliasPath, true) : {};

    const nameToDist = buildMemberToDistrict(roster);

    const byDistrict = new Map<string, { district: string; records: LisRec[]; total: number }>();
    let noAmount = 0, noMember = 0, noMatch = 0;

    const unmatchedSet = new Set<string>();

    for (const rec of lis) {
      const amt = Number(rec.amount ?? 0);
      if (!isFinite(amt) || amt === 0) { noAmount++; continue; }

      let rawName = (rec.member || "").trim();
      if (!rawName) { noMember++; continue; }

      // apply alias if present (aliases are keyed by the *raw* LIS string)
      if (aliases[rawName]) rawName = aliases[rawName];

      const nm = normName(rawName);
      const dist = nameToDist.get(nm);

      if (!dist) {
        noMatch++;
        unmatchedSet.add(rec.member || "");
        continue;
      }

      if (!byDistrict.has(dist)) byDistrict.set(dist, { district: dist, records: [], total: 0 });
      const bucket = byDistrict.get(dist)!;
      bucket.records.push(rec);
      bucket.total += amt;
    }

    const out = [...byDistrict.values()]
      .map(d => ({
        district: d.district,
        items: d.records.length,
        total_amount: Math.round(d.total),
        records: d.records,
      }))
      .sort((a, b) => b.total_amount - a.total_amount);

    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(out, null, 2));

    if (unmatchedSet.size) {
      fs.mkdirSync(debugDir, { recursive: true });
      fs.writeFileSync(unmatchedPath, [...unmatchedSet].sort().join("\n") + "\n", "utf8");
    }

    const districts = out.length;
    const items = out.reduce((s, d) => s + d.items, 0);
    const total = out.reduce((s, d) => s + d.total_amount, 0);

    console.log(`[ok] LIS→district wrote ${districts} districts, ${items} items, $${total.toLocaleString()} → ${outPath}`);
    console.log(`[note] skipped: noMember=${noMember}, noMatch=${noMatch}, noAmount=${noAmount}`);
    if (unmatchedSet.size) {
      console.log(`[hint] unmatched member names written to: ${unmatchedPath}`);
      console.log(`[hint] add mappings to ${aliasPath} as {"<LIS name>": "<Roster canonical name>"} and re-run.`);
    }
  } catch (err: any) {
    console.error(`[fatal] ${err?.message || err}`);
    process.exit(1);
  }
}

main();