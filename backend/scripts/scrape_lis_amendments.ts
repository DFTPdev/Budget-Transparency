// scripts/scrape_lis_amendments.ts (patched)
// Usage:
//   npx ts-node scripts/scrape_lis_amendments.ts [--config ./lis.config.json]
//
// Adds: robust retries, polite headers, lower concurrency, graceful fallback to prior year.
import fs from "fs";
import path from "path";
import axios from "axios";
import * as cheerio from "cheerio";
import pLimit from "p-limit";
import { z } from "zod";

type Cfg = {
  memberIndexUrl: string; // e.g. https://budget.lis.virginia.gov/Amendment/Member/2025/1/House/
  outDir: string;         // e.g. ./out
  strictHouseOnly?: boolean;
  sessionLabel?: string;
};

const AmendmentRow = z.object({
  amendmentId: z.string().min(1),
  sessionYear: z.number(),
  chamber: z.enum(["House", "Senate"]).default("House"),
  member: z.string().min(1),
  memberUrl: z.string().url(),
  agency: z.string().optional(),
  program: z.string().optional(),
  fund: z.string().optional(),
  action: z.string().optional(),
  amount: z.number().nullable().optional(),
  status: z.string().optional(),
  title: z.string().optional(),
  url: z.string().url(),
  scrapedAt: z.string(),
});

function readConfig(customPath?: string): Cfg {
  const p = customPath ?? path.resolve("lis.config.json");
  if (!fs.existsSync(p)) throw new Error(`Config not found at: ${p}`);
  const cfg = JSON.parse(fs.readFileSync(p, "utf8"));
  if (!cfg.outDir) cfg.outDir = "./out";
  if (cfg.strictHouseOnly === undefined) cfg.strictHouseOnly = true;
  return cfg as Cfg;
}

function ensureDir(p: string) { fs.mkdirSync(p, { recursive: true }); }

function parseYearFromIndexUrl(u: string): number | null {
  const m = u.match(/Amendment\/Member\/(\d{4})\//i);
  return m ? Number(m[1]) : null;
}
function replaceYear(u: string, newYear: number): string {
  return u.replace(/(Amendment\/Member\/)(\d{4})(\/)/i, `$1${newYear}$3`);
}
function absolutize(base: string, href: string): string {
  try { return new URL(href, base).toString(); } catch { return href; }
}

async function sleep(ms: number) { return new Promise(res => setTimeout(res, ms)); }

// Retry network/5xx with backoff; bail quickly on 4xx
async function getHtml(url: string, attempts = 5): Promise<string> {
  let lastErr: any;
  for (let i = 1; i <= attempts; i++) {
    try {
      const res = await axios.get(url, {
        timeout: 30_000,
        headers: {
          "User-Agent": "Mozilla/5.0 (DFTP-budget-pipeline)",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.5",
          "Connection": "keep-alive"
        }
      });
      return String(res.data);
    } catch (err: any) {
      lastErr = err;
      const status = err?.response?.status;
      if (status && status < 500) break; // don't retry on 4xx
      await sleep(600 * i);
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

function extractMemberLinks(indexHtml: string, baseUrl: string): Array<{ name: string; url: string }> {
  const $ = cheerio.load(indexHtml);
  const links: Array<{ name: string; url: string }> = [];

  $('a[href*="/Amendment/MemberItem/"], a[href*="/Amendment/MemberAmendments/"]').each((_, a) => {
    const name = ($(a).text() || "").trim();
    const href = $(a).attr("href");
    if (href && name) links.push({ name, url: absolutize(baseUrl, href) });
  });

  if (links.length === 0) {
    $("table a").each((_, a) => {
      const name = ($(a).text() || "").trim();
      const href = $(a).attr("href") || "";
      if (href.includes("/Amendment/") && /member/i.test(name)) {
        links.push({ name, url: absolutize(baseUrl, href) });
      }
    });
  }

  if (links.length === 0) {
    $('a[href*="/Amendment/"]').each((_, a) => {
      const t = ($(a).text() || "").trim();
      if (t.split(/\s+/).length >= 2) {
        const href = $(a).attr("href");
        if (href) links.push({ name: t, url: absolutize(baseUrl, href) });
      }
    });
  }

  const seen = new Set<string>();
  return links.filter(l => !seen.has(l.url) && seen.add(l.url));
}

function parseCurrency(s?: string | null): number | null {
  if (!s) return null;
  const cleaned = s.replace(/[\$,()\s]+/g, "").replace(/–|—/g, "-");
  if (!cleaned) return null;
  const neg = /\(.*\)/.test(s) || cleaned.startsWith("-");
  const n = Number(cleaned.replace(/^-/, ""));
  if (Number.isNaN(n)) return null;
  return neg ? -n : n;
}

function extractAmendmentsFromMemberPage(
  html: string,
  member: string,
  memberUrl: string,
  sessionYear: number,
  chamber: "House" | "Senate" = "House"
) {
  const $ = cheerio.load(html);
  const rows: z.infer<typeof AmendmentRow>[] = [];

  $("table tr").each((_, tr) => {
    const tds = $(tr).find("td");
    if (tds.length < 3) return;

    let url = "";
    let title = "";
    $(tds).find('a[href*="/Amendment/"]').each((__, a) => {
      const href = $(a).attr("href");
      if (href && !url) {
        url = absolutize(memberUrl, href);
        title = ($(a).text() || "").trim();
      }
    });
    if (!url) return;

    const textCells = tds.map((__, td) => ($(td).text() || "").trim()).get();
    const [col0, col1, col2, col3, col4, col5, col6] = textCells;

    const amendmentId = (col0 || title || url.split("/").pop() || "").trim();
    const agency = col1 || undefined;
    const program = col2 || undefined;
    const fund = col3 || undefined;
    const action = col4 || undefined;
    const amount = parseCurrency(col5);
    const status = col6 || undefined;

    const row = {
      amendmentId,
      sessionYear,
      chamber,
      member,
      memberUrl,
      agency,
      program,
      fund,
      action,
      amount,
      status,
      title: title || undefined,
      url,
      scrapedAt: new Date().toISOString(),
    };

    const parsed = AmendmentRow.safeParse(row);
    if (parsed.success) rows.push(parsed.data);
  });

  return rows;
}

async function scrapeForYear(cfg: Cfg, year: number) {
  const indexUrl = replaceYear(cfg.memberIndexUrl, year);
  let indexHtml: string | null = null;
  try {
    indexHtml = await getHtml(indexUrl);
  } catch (e: any) {
    console.warn(`[warn] Failed to load index for ${year} (${indexUrl}): ${e?.message || e}`);
    return { year, rowsCount: 0, outFile: "" };
  }
  const memberLinks = extractMemberLinks(indexHtml, indexUrl);
  if (memberLinks.length === 0) return { year, rowsCount: 0, outFile: "" };

  const outDir = path.resolve(cfg.outDir);
  ensureDir(outDir);
  const outFile = path.join(outDir, `lis_amendments_${year}.jsonl`);
  const outStream = fs.createWriteStream(outFile, { flags: "w" });

  const limit = pLimit(3);
  let total = 0;

  await Promise.all(
    memberLinks.map((m) =>
      limit(async () => {
        try {
          const html = await getHtml(m.url);
          const chamber = (cfg.strictHouseOnly ?? true) ? "House" : (cfg.sessionLabel?.includes("Senate") ? "Senate" : "House");
          const rows = extractAmendmentsFromMemberPage(html, m.name, m.url, year, chamber as "House" | "Senate");
          for (const r of rows) {
            outStream.write(JSON.stringify(r) + "\n");
            total++;
          }
        } catch (err: any) {
          console.warn(`[warn] Failed ${m.url}: ${err?.message || err}`);
        }
      })
    )
  );

  outStream.end();
  return { year, rowsCount: total, outFile };
}

async function main() {
  const args = process.argv.slice(2);
  const cfgPathIdx = args.findIndex(a => a === "--config");
  const cfg = readConfig(cfgPathIdx >= 0 ? args[cfgPathIdx + 1] : undefined);

  const preferred = parseYearFromIndexUrl(cfg.memberIndexUrl);
  if (!preferred) throw new Error(`Unable to infer year from memberIndexUrl: ${cfg.memberIndexUrl}`);

  const candidates = [preferred, preferred - 1];

  for (const y of candidates) {
    console.log(`[info] Scraping LIS amendments for ${y}…`);
    const res = await scrapeForYear(cfg, y);
    if (res.rowsCount > 0) {
      console.log(`[ok] Wrote ${res.rowsCount} rows → ${res.outFile}`);
      return;
    }
    console.log(`[info] No rows from ${y}. Trying fallback…`);
  }

  throw new Error("No amendments extracted for preferred or fallback year (LIS might be down or blocking requests).");
}

main().catch((e) => {
  console.error(`[fatal] ${e.stack || e.message}`);
  process.exit(1);
});
