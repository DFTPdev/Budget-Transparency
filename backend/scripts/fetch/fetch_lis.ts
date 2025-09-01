/**
 * scripts/fetch/fetch_lis.ts
 *
 * Purpose:
 *  - Fetches LIS (Virginia budget) HTML safely
 *  - Avoids cheerio.load(undefined) by validating inputs
 *  - Writes a stable JSON file for downstream joins, even on failure/empty pages
 *
 * Usage:
 *  TS_NODE_TRANSPILE_ONLY=1 ts-node --files scripts/fetch/fetch_lis.ts \
 *    --year 2025 \
 *    --out out/staging/lis/2025 \
 *    [--url https://budget.lis.virginia.gov/Amendment/Member/2025/1/House/] \
 *    [--demo]
 *
 * Output:
 *  - <out>/lis.json : Array<any> (safe, may be [])
 *  - <out>/raw.html : Raw HTML fetched (if any)
 *
 * Notes:
 *  - This script is intentionally conservative: it won’t assume page structure.
 *  - If you want to add real parsing later, do it in the "TODO: real parsing" section.
 */

import fs from "fs";
import path from "path";
import axios from "axios";

// Cheerio import (works in both CJS/ESM TypeScript setups)
import * as cheerio from "cheerio";

type Cli = {
  year?: string | number;
  out?: string;
  url?: string;
  demo?: boolean;
};

function parseArgs(): Cli {
  const argv = process.argv.slice(2);

  const out: Cli = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = argv[i + 1];

    const eat = (setter: (v: string) => void) => {
      if (next && !next.startsWith("--")) {
        setter(next);
        i++;
      }
    };

    if (a.startsWith("--year")) {
      if (a.includes("=")) out.year = a.split("=")[1];
      else eat((v) => (out.year = v));
    } else if (a.startsWith("--out")) {
      if (a.includes("=")) out.out = a.split("=")[1];
      else eat((v) => (out.out = v));
    } else if (a.startsWith("--url")) {
      if (a.includes("=")) out.url = a.split("=")[1];
      else eat((v) => (out.url = v));
    } else if (a === "--demo") {
      out.demo = true;
    }
  }

  return out;
}

function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeJsonSafe(outDir: string, filename: string, data: any) {
  ensureDir(outDir);
  const p = path.join(outDir, filename);
  fs.writeFileSync(p, JSON.stringify(data, null, 2), "utf8");
  return p;
}

function writeTextSafe(outDir: string, filename: string, text: string) {
  ensureDir(outDir);
  const p = path.join(outDir, filename);
  fs.writeFileSync(p, text, "utf8");
  return p;
}

function logOk(msg: string) {
  console.log(`[ok] ${msg}`);
}
function logInfo(msg: string) {
  console.log(`[info] ${msg}`);
}
function logWarn(msg: string) {
  console.warn(`[warn] ${msg}`);
}
function logFatal(msg: string) {
  console.error(`[fatal] ${msg}`);
  process.exitCode = 1;
}

(async function main() {
  const args = parseArgs();
  const yearRaw = args.year ?? process.env.npm_package_config_year ?? new Date().getFullYear();
  const year = Number(yearRaw);

  const outDir =
    args.out ??
    path.join("out", "staging", "lis", String(year));

  // Default House member index URL for LIS (works as a safe seed URL)
  // You can override with --url if needed.
  const defaultUrl = `https://budget.lis.virginia.gov/Amendment/Member/${year}/1/House/`;
  const targetUrl = args.url || defaultUrl;

  // DEMO MODE: output a minimal mock payload and exit cleanly
  if (args.demo) {
    const demoItems = [
      {
        // This is a lightweight, generic structure — adjust later if you add real parsing
        member: "Demo Member",
        agency: "Demo Agency",
        title: "Demo amendment",
        locality: "Richmond City",
        amount: 123456,
        year,
        source: "lis",
        href: "https://budget.lis.virginia.gov/",
      },
    ];
    writeJsonSafe(outDir, "lis.json", demoItems);
    logOk(`LIS (demo) wrote ${demoItems.length} records → ${path.join(outDir, "lis.json")}`);
    return;
  }

  logInfo(`Fetching LIS data for ${year}…`);
  logInfo(`URL: ${targetUrl}`);

  let html: string | null = null;

  try {
    const resp = await axios.get(targetUrl, {
      responseType: "text",
      timeout: 30000,
      headers: {
        "User-Agent": "va-budget-pipeline/1.0 (+https://example.local)",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      // DPB/LIS sometimes require no-cache busting; we leave defaults here.
    });

    if (typeof resp.data === "string" && resp.data.trim().length > 0) {
      html = resp.data;
      writeTextSafe(outDir, "raw.html", html);
      logOk(`Saved raw HTML → ${path.join(outDir, "raw.html")}`);
    } else {
      logWarn("Fetched response has no text body (resp.data not a non-empty string).");
    }
  } catch (e: any) {
    logWarn(`HTTP fetch failed: ${e?.message || e}`);
  }

  // Always produce a JSON file to keep downstream stable.
  // If we have HTML, we can try to parse safely; otherwise, write [].
  let items: any[] = [];

  if (html && html.trim().length > 0) {
    try {
      // SAFETY: only call cheerio.load on a real string
      const $ = cheerio.load(html);

      /**
       * TODO: real parsing
       * This block is intentionally a no-op parser so we never crash.
       * You can gradually add selectors here when you’re ready.
       *
       * For example (pseudo):
       *   $('table.amendments tr').each((_, tr) => {
       *     const tds = $(tr).find('td');
       *     // extract fields defensively
       *     items.push({ ... });
       *   });
       */

      // As a minimal proof we parsed something without error,
      // try to capture any member names if visibly present (very defensive).
      const possibleMembers: string[] = [];
      $('a, h1, h2, h3, .member, .name').each((_, el) => {
        const t = $(el).text().trim();
        if (t && /delegate|senator|house|member/i.test(t)) {
          possibleMembers.push(t);
        }
      });

      // If we found nothing structured, still write an empty array — downstream stays stable.
      if (items.length === 0 && possibleMembers.length > 0) {
        // Keep a single metadata stub so you can see that fetch worked.
        items.push({
          year,
          source: "lis",
          note: "Fetched LIS page successfully, but parser is not yet extracting structured amendments.",
          sample_member_strings: Array.from(new Set(possibleMembers)).slice(0, 5),
          url: targetUrl,
        });
      }
    } catch (e: any) {
      // If cheerio parsing itself fails, keep things graceful.
      logWarn(`Cheerio parsing failed: ${e?.message || e}`);
    }
  } else {
    logWarn("No HTML available to parse; writing empty list.");
  }

  try {
    const outPath = writeJsonSafe(outDir, "lis.json", items);
    logOk(`LIS wrote ${items.length} records → ${outPath}`);
  } catch (e: any) {
    logFatal(`Failed to write output JSON: ${e?.message || e}`);
  }
})();