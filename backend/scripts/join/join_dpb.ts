// scripts/join/join_dpb.ts
import fs from "fs";
import path from "path";

type AnyJson = any;

function readJSON<T = AnyJson>(p: string, fallback: T): T {
  try {
    const raw = fs.readFileSync(p, "utf8").trim();
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

function toNumber(x: any): number {
  if (typeof x === "number") return x;
  if (typeof x === "string") {
    const n = Number(x.replace(/[$,]/g, "").trim());
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

// Accepts [], {items: [...]}, {}, or object-map → returns array
function normalizeArrayish(json: AnyJson): AnyJson[] {
  if (Array.isArray(json)) return json;
  if (json && Array.isArray(json.items)) return json.items;
  if (json && typeof json === "object") {
    // Could be a dict of id -> row
    const vals = Object.values(json);
    // If all values are objects, treat them as rows
    if (vals.every(v => v && typeof v === "object")) return vals as AnyJson[];
  }
  return [];
}

function loadLocMap(p?: string): Record<string, number[]> {
  if (!p) return {};
  const obj = readJSON<Record<string, number[]>>(p, {});
  // Normalize keys for safer lookups
  const out: Record<string, number[]> = {};
  for (const [k, v] of Object.entries(obj)) {
    out[k.trim().toLowerCase()] = Array.isArray(v) ? v : [];
  }
  return out;
}

function mapDistricts(locality: string | undefined, locMap: Record<string, number[]>): number[] {
  if (!locality) return [];
  const key = locality.trim().toLowerCase();
  return locMap[key] || [];
}

function parseArgs(argv: string[]) {
  const args = { dpbDir: "", locmap: "", out: "" } as {
    dpbDir: string; locmap: string; out: string;
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dpb") args.dpbDir = argv[++i];
    else if (a === "--locmap") args.locmap = argv[++i];
    else if (a === "--out") args.out = argv[++i];
  }
  if (!args.dpbDir) {
    console.error("[fatal] --dpb <dir> is required");
    process.exit(1);
  }
  if (!args.out) {
    console.error("[fatal] --out <file> is required");
    process.exit(1);
  }
  return args;
}

function loadDpb(dpbDir: string): AnyJson[] {
  if (!fs.existsSync(dpbDir)) return [];
  const files = fs.readdirSync(dpbDir)
    .filter(f => f.toLowerCase().endsWith(".json"))
    .map(f => path.join(dpbDir, f));

  const all: AnyJson[] = [];
  for (const f of files) {
    const json = readJSON<AnyJson>(f, []);
    const arr = normalizeArrayish(json);
    for (const r of arr) all.push(r);
  }
  return all;
}

function normalizeRow(row: AnyJson, locMap: Record<string, number[]>) {
  // Accept a variety of field names; keep it forgiving
  const id = String(row.id ?? row.item_id ?? row.key ?? "").trim();
  const title = String(row.title ?? row.description ?? "").trim();
  const agency = String(row.agency ?? row.department ?? "").trim();
  const fund = String(row.fund ?? row.funding_source ?? "").trim();
  const recipient = String(row.recipient ?? row.payee ?? "").trim();
  const locality = String(row.locality ?? row.city ?? row.county ?? "").trim() || undefined;
  const amount = toNumber(row.amount ?? row.total ?? row.gf_amount ?? row.ngf_amount);

  const districts = mapDistricts(locality, locMap);

  return {
    id,
    title,
    agency,
    fund,
    recipient,
    locality,
    districts,
    amount
  };
}

async function main() {
  const { dpbDir, locmap, out } = parseArgs(process.argv.slice(2));
  ensureDir(path.dirname(out));

  const locMap = loadLocMap(locmap);
  const raw = loadDpb(dpbDir);
  const rows = raw.map(r => normalizeRow(r, locMap));

  const total = rows.reduce((s, r) => s + toNumber(r.amount), 0);
  const outObj = {
    meta: {
      source: "dpb",
      dpbDir,
      generatedAt: new Date().toISOString(),
      count: rows.length,
      total_amount: total
    },
    rows
  };

  fs.writeFileSync(out, JSON.stringify(outObj, null, 2));
  console.log(`[ok] DPB joined ${rows.length} rows → ${out}`);
}

main().catch(err => {
  console.error("[fatal] join_dpb failed:", err);
  process.exit(1);
});