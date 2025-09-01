// scripts/validate_jsonl.ts
import fs from "fs";
import path from "path";

function main() {
  const args = process.argv.slice(2);
  const year = Number(args[args.indexOf("--year") + 1] || new Date().getFullYear());
  const outDir = path.resolve("./out");
  const p = path.join(outDir, `lis_amendments_${year}.jsonl`);
  if (!fs.existsSync(p)) {
    console.error(`[fatal] Missing ${p}. Run sync/ingest first.`);
    process.exit(2);
  }
  const size = fs.statSync(p).size;
  if (size === 0) {
    console.error(`[fatal] ${path.basename(p)} is 0 bytes.`);
    process.exit(3);
  }

  const text = fs.readFileSync(p, "utf8");
  const lines = text.split(/\r?\n/).filter(l => l.trim().length);
  if (!lines.length) {
    console.error(`[fatal] ${path.basename(p)} contains no records.`);
    process.exit(4);
  }

  let bad = 0;
  for (let i = 0; i < Math.min(lines.length, 1000); i++) {
    try {
      const j = JSON.parse(lines[i]);
      if (typeof j.amendmentId === "undefined" || typeof j.sessionYear === "undefined") bad++;
    } catch {
      bad++;
    }
  }
  if (bad > 0) {
    console.error(`[warn] Found ${bad} malformed/partial rows (checked first ${Math.min(lines.length, 1000)}).`);
  } else {
    console.log(`[ok] ${lines.length} rows; schema looks sane.`);
  }
}

main();