import fs from "fs";

type Roster = Array<{full_name?:string,name?:string,member?:string,district?:string}>;
type LisItem = { member?: string };

const ROSTER_FILE = "scripts/house_delegates_roster_enriched.json";
const LIS_FILE    = `out/staging/lis/${process.env.npm_package_config_year || "2025"}/lis.json`;
const OUT_FILE    = "ingest/member_aliases.json";
const DEBUG_FILE  = "out/app/_debug/lis_unmatched_after_alias_${YEAR}.txt".replace("${YEAR}", String(process.env.npm_package_config_year || "2025"));

function readJSON<T=any>(p:string):T { return JSON.parse(fs.readFileSync(p,"utf8")); }
function writeJSON(p:string,o:any){ fs.mkdirSync(p.split("/").slice(0,-1).join("/"),{recursive:true}); fs.writeFileSync(p,JSON.stringify(o,null,2)); }
function norm(s:string){ return s.toLowerCase().replace(/[^a-z\s]/g,"").replace(/\s+/g," ").trim(); }
function stripSuffixes(s:string){
  return s.replace(/\b(jr|sr|iii|ii|iv)\b\.?/gi,"").replace(/\b(rep|del|delegate|senator|sen|del\.)\b\.?/gi,"").replace(/\s+/g," ").trim();
}

function lastName(s:string){ const parts= s.trim().split(/\s+/); return parts[parts.length-1]; }
function firstName(s:string){ return s.trim().split(/\s+/)[0]; }

const roster: Roster = fs.existsSync(ROSTER_FILE) ? readJSON(ROSTER_FILE) : [];
if(!roster.length){ console.error("[fatal] Roster empty or missing:", ROSTER_FILE); process.exit(1); }

const lis: LisItem[] = fs.existsSync(LIS_FILE) ? readJSON(LIS_FILE) : [];
if(!lis.length){ console.error("[fatal] LIS file empty or missing:", LIS_FILE); process.exit(1); }

// build canonical roster name set
const rosterNames = new Set<string>();
const rosterCanon: string[] = [];
for (const r of roster){
  for (const k of [r.full_name, r.name, r.member]){
    if(k){ rosterNames.add(k); rosterCanon.push(k); }
  }
}
// helper to find a roster match
function matchRoster(lisNameRaw:string): string|undefined{
  const cleaned = stripSuffixes(lisNameRaw);
  if (rosterNames.has(cleaned)) return cleaned;

  // try exact without punctuation
  const nLis = norm(cleaned);
  for (const cand of rosterCanon){
    if (norm(stripSuffixes(cand)) === nLis) return cand;
  }

  // last name + first initial heuristic
  const ln = lastName(cleaned);
  const fn = firstName(cleaned);
  const finit = fn[0]?.toLowerCase();
  const lnNorm = norm(ln);

  const candidates = rosterCanon.filter(c=>{
    const cClean = stripSuffixes(c);
    const cFN = firstName(cClean);
    const cLN = lastName(cClean);
    return norm(cLN)===lnNorm && (cFN[0]?.toLowerCase()===finit || norm(cFN)===norm(fn));
  });
  return candidates[0];
}

// load existing aliases (if any)
let existing: Record<string,string> = {};
if (fs.existsSync(OUT_FILE)) {
  try { existing = readJSON(OUT_FILE); } catch { existing = {}; }
}

const year = String(process.env.npm_package_config_year || "2025");
const lisNames = Array.from(new Set(lis.map(x=>x.member).filter(Boolean))) as string[];

const merged: Record<string,string> = { ...existing };
const unmatched: string[] = [];

for (const lisName of lisNames){
  if (merged[lisName]) continue;
  const match = matchRoster(lisName);
  if (match) merged[lisName] = match;
  else unmatched.push(lisName);
}

writeJSON(OUT_FILE, merged);
fs.mkdirSync("out/app/_debug",{recursive:true});
fs.writeFileSync(DEBUG_FILE, unmatched.join("\n"));

console.log(`[ok] Wrote merged aliases → ${OUT_FILE} (added ${Object.keys(merged).length - Object.keys(existing).length})`);
if (unmatched.length){
  console.log(`[warn] Unmatched after rules: ${unmatched.length} → ${DEBUG_FILE}`);
} else {
  console.log("[ok] All LIS names matched to roster.");
}
