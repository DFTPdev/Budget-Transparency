// scripts/dpb/fetch_dpb.ts
//
// DPB fetcher (index resolver + agency page fetch)
// - Supports: --year, --out, --agencyUrl, --agencyName, --agencyCode, --max, --no-cache, --debug
// - Caches HTML in cache/dpb/<sha1>.html (unless --no-cache)
// - If given an index agencyUrl + agencyName, resolves to agencyCode and fetches pdocagy page
// - Ensures every output item has a clean `agency` label (prefers --agencyName)
//
// Output: writes JSON array to <out>/items.json with items like:
// { id, title, amount, agency, url, source, agencyCode? }

import fs from "fs";
import path from "path";
import axios from "axios";
import { load as cheerioLoad } from "cheerio";
import { createHash } from "crypto";

type Cli = {
  year: number;
  out: string;
  agencyUrl?: string;
  agencyName?: string;
  agencyCode?: string;
  max?: number;
  noCache?: boolean;
  debug?: boolean;
};

type DpbItem = {
  id: string;
  title: string;
  amount: number;
  agency: string;
  url: string;
  source: "dpb";
  agencyCode?: string;
};

function parseArgs(): Cli {
  const argv = process.argv.slice(2);
  const get = (k: string) => {
    const i = argv.indexOf(`--${k}`);
    return i >= 0 ? argv[i + 1] : undefined;
  };

  const year = Number(get("year"));
  if (!year || Number.isNaN(year)) throw new Error("Missing --year");

  const out = get("out") || `out/staging/dpb/${year}`;
  const agencyUrl = get("agencyUrl");
  const agencyName = get("agencyName");
  const agencyCode = get("agencyCode");
  const max = get("max") ? Number(get("max")) : undefined;
  const noCache = argv.includes("--no-cache");
  const debug = argv.includes("--debug");

  return { year, out, agencyUrl, agencyName, agencyCode, max, noCache, debug };
}

function ensureDir(p: string) {
  fs.mkdirSync(p, { recursive: true });
}

const CACHE_DIR = "cache/dpb";

function sha1(s: string): string {
  return createHash("sha1").update(s).digest("hex");
}

async function fetchHtml(url: string, noCache: boolean, debug: boolean): Promise<string> {
  ensureDir(CACHE_DIR);
  const key = sha1(url) + ".html";
  const p = path.join(CACHE_DIR, key);

  if (!noCache && fs.existsSync(p)) {
    if (debug) console.log(`[cache] hit ${p}`);
    return fs.readFileSync(p, "utf8");
  }

  if (debug) console.log(`[http] GET ${url}`);
  const res = await axios.get(url, { responseType: "text", timeout: 30000 });
  const html = String(res.data ?? "");
  fs.writeFileSync(p, html);
  return html;
}

function textNum(val: string): number {
  const n = Number(val.replace(/[\$,]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function inferAgencyNameFromPage(html: string): string | undefined {
  // Very best-effort: look for a prominent heading or label.
  // DPB pages often have the agency code in the URL, not consistently in the DOM.
  // Try <title>, <h1>, or a label pattern.
  const $ = cheerioLoad(html);

  const tryTexts: string[] = [];
  const title = $("title").first().text().trim();
  if (title) tryTexts.push(title);

  const h1 = $("h1").first().text().trim();
  if (h1) tryTexts.push(h1);

  const pageText = $("body").text().slice(0, 2000); // limit scan
  const m = pageText.match(/Agency\s*:\s*([A-Za-z0-9&.,'()\/\-\s]+)/i);
  if (m && m[1]) tryTexts.push(m[1].trim());

  // Heuristic: choose the longest plausible label
  const best = tryTexts
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter((s) => s && !/^pdocagy/i.test(s))
    .sort((a, b) => b.length - a.length)[0];

  return best;
}

function parseAgencyPageToItems(opts: {
  html: string;
  url: string;
  agencyLabel: string;
  agencyCode?: string;
  max?: number;
}): DpbItem[] {
  const { html, url, agencyLabel, agencyCode, max } = opts;
  const $ = cheerioLoad(html);

  const items: DpbItem[] = [];

  // Strategy (best-effort, resilient):
  // - Find tables; for each table, look for an "All Funds" total, or a "$"-looking total in the last row.
  // - Use the first column text as the "title" (program/service).
  // This won’t be perfect for every DPB layout, but it gets us meaningful line-items
  // while we iterate on a precise selector map per agency.

  $("table").each((_, t) => {
    const $table = $(t);
    const rows = $table.find("tr");
    if (!rows.length) return;

    // Attempt to detect headers, to locate an "All Funds" column.
    const $hdr = rows.filter((_, r) => $(r).find("th").length > 0).first();
    const headers = $hdr.length ? $hdr.find("th").map((_, th) => $(th).text().trim()).get() : [];
    const allFundsIdx = headers.findIndex((h: string) =>
      /all\s*funds/i.test(h)
    );

    // For each data row, try amount (prefer All Funds if we found it)
    rows.each((ri, r) => {
      const $tds = $(r).find("td");
      if (!$tds.length) return;

      let title = $tds.first().text().trim();
      // skip obviously empty or "Totals row" for now
      if (!title || /^totals?\b/i.test(title)) return;

      let amt = 0;
      if (allFundsIdx >= 0 && allFundsIdx < $tds.length) {
        const txt = $tds.eq(allFundsIdx).text().trim();
        amt = textNum(txt);
      } else {
        // fallback: look for the right-most numeric-looking cell
        for (let i = $tds.length - 1; i >= 1; i--) {
          const txt = $tds.eq(i).text().trim();
          if (/[\d,]/.test(txt)) {
            const n = textNum(txt);
            if (n !== 0) {
              amt = n;
              break;
            }
          }
        }
      }

      if (amt === 0) return;

      const id = createHash("sha1")
        .update(`${url}|${agencyLabel}|${title}|${amt}|${ri}`)
        .digest("hex");

      items.push({
        id,
        title,
        amount: amt,
        agency: agencyLabel,
        url,
        source: "dpb",
        agencyCode,
      });
    });
  });

  // If we found nothing, emit a single placeholder "Total" if we can find any big number on page
  if (!items.length) {
    const m = html.match(/\$?\s*\d{1,3}(?:,\d{3})+(?:\.\d+)?/g);
    if (m && m.length) {
      // pick the largest numeric as a rough total
      let best = 0;
      for (const s of m) {
        const n = textNum(s);
        if (n > best) best = n;
      }
      if (best > 0) {
        items.push({
          id: createHash("sha1").update(`${url}|${agencyLabel}|__TOTAL__|${best}`).digest("hex"),
          title: "Total (parsed)",
          amount: best,
          agency: agencyLabel,
          url,
          source: "dpb",
          agencyCode,
        });
      }
    }
  }

  if (max && items.length > max) items.splice(max);
  return items;
}

function writeItems(outDir: string, items: DpbItem[]) {
  ensureDir(outDir);
  const outPath = path.join(outDir, "items.json");
  fs.writeFileSync(outPath, JSON.stringify(items, null, 2));
  console.log(`[ok] DPB wrote ${outPath} ( ${items.length} records )`);
}

function extractAgenciesFromIndex(html: string, year: number): Array<{ name: string; code: string; url: string }> {
  const $ = cheerioLoad(html);
  const agencies: Array<{ name: string; code: string; url: string }> = [];

  // Look for links like pdocagy?Year=2025&agencycode=247
  $("a[href*='pdocagy?']").each((_, a) => {
    const href = String($(a).attr("href") || "");
    const u = new URL(href, "https://reports.dpb.virginia.gov");
    const code = u.searchParams.get("agencycode") || "";
    const name = $(a).text().trim() || code || "Unknown";
    if (!code) return;

    // Only include same-year links
    const yr = u.searchParams.get("Year");
    if (yr && Number(yr) !== year) return;

    agencies.push({
      name,
      code,
      url: u.toString(),
    });
  });

  return agencies;
}

async function main() {
  const cli = parseArgs();
  ensureDir(cli.out);

  let items: DpbItem[] = [];

  // Case A: Direct agencyCode provided → fetch pdocagy page
  if (cli.agencyCode) {
    const u = new URL(`https://reports.dpb.virginia.gov/pdocagy?Year=${cli.year}&agencycode=${encodeURIComponent(cli.agencyCode)}`);
    const html = await fetchHtml(u.toString(), !!cli.noCache, !!cli.debug);

    const inferred = inferAgencyNameFromPage(html);
    const agencyLabel =
      (cli.agencyName && String(cli.agencyName).trim()) ||
      (inferred && inferred.trim()) ||
      "pdocagy (DPB Website Public Reports)";

    items = parseAgencyPageToItems({
      html,
      url: u.toString(),
      agencyLabel,
      agencyCode: cli.agencyCode,
      max: cli.max,
    });

    writeItems(cli.out, items);
    return;
  }

  // Case B: Index URL provided → resolve to an agency by name (if any), then fetch pdocagy page
  if (cli.agencyUrl) {
    const indexHtml = await fetchHtml(cli.agencyUrl, !!cli.noCache, !!cli.debug);
    const discovered = extractAgenciesFromIndex(indexHtml, cli.year);
    if (cli.debug) {
      console.log(`[index] agencies found: ${discovered.length}`);
      if (discovered.length) {
        for (const a of discovered.slice(0, 10)) console.log(" ", a);
      }
    }

    let candidate = discovered;
    if (cli.agencyName) {
      const needle = String(cli.agencyName).toLowerCase();
      candidate = discovered.filter(a => a.name.toLowerCase().includes(needle) || needle.includes(a.code));
      if (cli.debug) console.log(`[filter] agencyName="${cli.agencyName}", matches=${candidate.length}`);
    }

    if (!candidate.length) {
      console.warn("[warn] No agencies matched the filter on the index page.");
      // As a fallback, try to parse *something* from the index page itself so you see a DPB row
      // with the label set to your agencyName (if provided).
      const fallbackLabel =
        (cli.agencyName && String(cli.agencyName).trim()) ||
        "pdoc_op (DPB Website Public Reports)";
      // Grab any “Totals row count = N” or big number for a placeholder
      const m = indexHtml.match(/\$?\s*\d{1,3}(?:,\d{3})+(?:\.\d+)?/g);
      const best = m ? m.map(textNum).reduce((a, b) => Math.max(a, b), 0) : 0;

      items = [{
        id: createHash("sha1").update(`${cli.agencyUrl}|${fallbackLabel}`).digest("hex"),
        title: best > 0 ? "Total (index parsed)" : "Index Page",
        amount: best,
        agency: fallbackLabel,
        url: cli.agencyUrl,
        source: "dpb",
      }];

      writeItems(cli.out, items);
      return;
    }

    // Pick the first match (or clamp by max if they want a sample)
    const chosen = cli.max ? candidate.slice(0, cli.max) : candidate.slice(0, 1);

    for (const ag of chosen) {
      const html = await fetchHtml(ag.url, !!cli.noCache, !!cli.debug);
      const inferred = inferAgencyNameFromPage(html);
      const agencyLabel =
        (cli.agencyName && String(cli.agencyName).trim()) ||
        (inferred && inferred.trim()) ||
        ag.name ||
        "pdocagy (DPB Website Public Reports)";

      const part = parseAgencyPageToItems({
        html,
        url: ag.url,
        agencyLabel,
        agencyCode: ag.code,
        max: cli.max,
      });
      items.push(...part);
    }

    // Deduplicate by id
    const seen = new Set<string>();
    items = items.filter(it => {
      if (seen.has(it.id)) return false;
      seen.add(it.id);
      return true;
    });

    writeItems(cli.out, items);
    return;
  }

  // Case C: No inputs → write empty to stay pipeline-safe
  writeItems(cli.out, []);
}

main().catch((e) => {
  console.error("[fatal] DPB fetch failed:", e.message);
  process.exit(1);
});