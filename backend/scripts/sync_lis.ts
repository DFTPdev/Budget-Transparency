// scripts/sync_lis.ts
// Orchestrates: API -> Puppeteer -> CSV ingest -> last-good guard -> build
// Usage: ts-node --files scripts/sync_lis.ts --year 2025 --houseRosterPath ./scripts/house_delegates_roster_enriched.json

import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";

type Args = { year: number; houseRosterPath: string };
const log = (lvl: "info"|"warn"|"ok"|"fatal", msg: string) =>
  console[lvl === "fatal" ? "error" : lvl === "ok" ? "log" : lvl](
    `${lvl === "ok" ? "[ok]" : lvl === "warn" ? "[warn]" : lvl === "fatal" ? "[fatal]" : "[info]"} ${msg}`
  );

function parseArgs(): Args {
  const argv = process.argv.slice(2);
  const get = (k: string, fallback?: string) => {
    const i = argv.indexOf(k);
    return i >= 0 ? argv[i + 1] : fallback;
  };
  const year = Number(get("--year", process.env.npm_package_config_year || ""));
  if (!Number.isFinite(year)) {
    throw new Error("Missing --year (or package.json config.year).");
  }
  const houseRosterPath =
    get("--houseRosterPath", process.env.npm_package_config_rosterPath || "./scripts/house_delegates_roster_enriched.json")!;
  return { year, houseRosterPath };
}

function ensureDirs() {
  fs.mkdirSync("out", { recursive: true });
  fs.mkdirSync("ingest", { recursive: true });
}

function fileSize(p: string): number {
  try {
    return fs.statSync(p).size;
  } catch {
    return 0;
  }
}

function runTs(tsFile: string, args: string[]): { code: number; stdout: string; stderr: string } {
  const res = spawnSync(
    process.execPath, // node
    [require.resolve("ts-node/dist/bin.js"), "--files", tsFile, ...args],
    { stdio: "pipe", encoding: "utf8" }
  );
  if (res.stdout?.trim()) process.stdout.write(res.stdout);
  if (res.stderr?.trim()) process.stderr.write(res.stderr);
  return { code: res.status ?? 0, stdout: res.stdout || "", stderr: res.stderr || "" };
}

function lisJsonlPath(year: number, outDir = "./out") {
  return path.join(outDir, `lis_amendments_${year}.jsonl`);
}

function hasCsvToIngest(globDir = "./ingest"): boolean {
  try {
    const files = fs.readdirSync(globDir);
    return files.some(f => f.toLowerCase().endsWith(".csv"));
  } catch {
    return false;
  }
}

function reuseLastGood(target: string, outDir = "./out") {
  log("warn", "No new data; trying last-good reuse...");
  const candidates = fs
    .readdirSync(outDir)
    .filter(f => /^lis_amendments_\d{4}\.jsonl$/i.test(f))
    .map(f => path.join(outDir, f))
    .filter(f => fileSize(f) > 0)
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);

  if (candidates.length) {
    fs.copyFileSync(candidates[0], target);
    log("ok", `Reused last-good ${path.basename(candidates[0])} → ${path.basename(target)}`);
  } else {
    log("fatal", "No last-good JSONL available. Leaving empty file as-is for debugging.");
  }
}

async function main() {
  const { year, houseRosterPath } = parseArgs();
  ensureDirs();

  const outFile = lisJsonlPath(year);
  const lisCfgPath = path.resolve("lis.config.json");
  const outDir = path.dirname(outFile);

  log("info", `Syncing LIS amendments for ${year}…`);
  log("info", `Using roster: ${houseRosterPath}`);
  if (!fs.existsSync(houseRosterPath)) {
    log("warn", `Roster not found at ${houseRosterPath}. District mapping may be limited.`);
  }
  if (!fs.existsSync(lisCfgPath)) {
    log("warn", `lis.config.json not found at ${lisCfgPath}. Puppeteer/API may rely on defaults.`);
  }

  // 1) API fetch (stable)
  log("info", "Step 1/3: API fetch (stable) …");
  runTs("scripts/fetch_budget_api_stable.ts", ["--year", String(year)]);
  let sz = fileSize(outFile);

  // 2) Puppeteer fallback (only if still empty)
  if (sz === 0) {
    log("info", "Step 2/3: Puppeteer fallback …");
    runTs("scripts/fetch_budget_puppeteer_stable.ts", ["--year", String(year)]);
    sz = fileSize(outFile);
  }

  // 3) CSV ingest (only if still empty and we have CSVs)
  if (sz === 0 && hasCsvToIngest("./ingest")) {
    log("info", "Step 3/3: CSV ingest (found files in ./ingest) …");
    // Use the flexible ingester if present, otherwise fall back to the original one
    const flexible = fs.existsSync("scripts/ingest_csv_append.ts");
    const ingester = flexible ? "scripts/ingest_csv_append.ts" : "scripts/convert_member_csv.ts";
    const args = flexible
      ? ["--year", String(year), "--glob", "./ingest/*.csv"]
      : ["--year", String(year), "--input", "./ingest/AmendmentsByMember.csv"];
    runTs(ingester, args);
    sz = fileSize(outFile);
  }

  // --- Last-good guard ---
  if (sz === 0) {
    reuseLastGood(outFile, outDir);
    sz = fileSize(outFile);
  }

  if (sz === 0) {
    log("fatal", `${path.basename(outFile)} is still 0 bytes. Aborting before build.`);
    process.exit(2);
  } else {
    log("ok", `JSONL ready (${(sz / 1024).toFixed(1)} KB) → ${path.basename(outFile)}`);
  }

  // Optional: validate the JSONL if the validator exists
  if (fs.existsSync("scripts/validate_jsonl.ts")) {
    log("info", "Validating JSONL …");
    const v = runTs("scripts/validate_jsonl.ts", ["--year", String(year)]);
    if (v.code !== 0) {
      log("warn", "Validator reported issues. Continuing to build anyway.");
    }
  }

  // Build outputs
  log("info", "Building aggregates …");
  const build = runTs("scripts/build_budget_dataset.ts", [
    "--houseRosterPath",
    houseRosterPath,
    "--year",
    String(year),
  ]);

  if (build.code !== 0) {
    log("fatal", "Build step failed.");
    process.exit(build.code);
  }

  log("ok", "Sync complete. Outputs written in ./out:");
  log("ok", "- budget_amendments_<year>.json");
  log("ok", "- budget_by_district_<year>.json");
  log("ok", "- budget_by_district_<year>.csv");
}

main().catch((e) => {
  log("fatal", e?.message || String(e));
  process.exit(1);
});