// scripts/fetch_budget_puppeteer.ts (fixed)
/**
 * Headless Chrome scraper for LIS "By Member" amendments pages.
 *
 * Usage:
 *   npx ts-node scripts/fetch_budget_puppeteer.ts [--config ./lis.config.json]
 *
 * Requires:
 *   npm i puppeteer p-limit zod
 */
import fs from "fs";
import path from "path";
import pLimit from "p-limit";
import { z } from "zod";
import puppeteer, { Page } from "puppeteer";

type Cfg = {
  memberIndexUrl: string;
  outDir: string;
  strictHouseOnly?: boolean;
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

type MemberLink = { name: string; href: string };

async function getMemberLinks(page: Page): Promise<MemberLink[]> {
  const anchors = await page.$$eval('a[href*="/Amendment/"]', (as: Element[]) => {
    const out: MemberLink[] = [];
    for (const a of as) {
      const name = (a.textContent || "").trim();
      const href = (a as HTMLAnchorElement).href;
      if (!href) continue;
      if (name && (/member/i.test(name) || /MemberItem|MemberAmendments/i.test(href))) {
        out.push({ name, href });
      }
    }
    // de-dup
    const seen = new Set<string>();
    return out.filter(l => !seen.has(l.href) && seen.add(l.href));
  });
  return anchors;
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

async function extractRowsFromMember(page: Page, memberName: string, memberUrl: string, sessionYear: number, chamber: "House" | "Senate") {
  // Return serializable data directly from the browser context to avoid typing issues
  const rawRows = await page.$$eval("table tr", (trs: Element[]) => {
    const rows: any[] = [];
    for (const tr of trs) {
      const tds = Array.from(tr.querySelectorAll("td"));
      if (tds.length < 3) continue;
      let url = "";
      let title = "";
      const anchors = tr.querySelectorAll('a[href*="/Amendment/"]');
      for (const a of anchors) {
        const href = (a as HTMLAnchorElement).href;
        if (href && !url) {
          url = href;
          title = (a.textContent || "").trim();
        }
      }
      if (!url) continue;
      const texts = tds.map(td => (td.textContent || "").trim());
      const [col0, col1, col2, col3, col4, col5, col6] = texts;
      rows.push({
        amendmentId: (col0 || title || url.split("/").pop() || "").trim(),
        agency: col1 || undefined,
        program: col2 || undefined,
        fund: col3 || undefined,
        action: col4 || undefined,
        amountText: col5 || undefined,
        status: col6 || undefined,
        title: title || undefined,
        url
      });
    }
    return rows;
  });

  return rawRows.map((r: any) => ({
    amendmentId: r.amendmentId,
    sessionYear,
    chamber,
    member: memberName,
    memberUrl,
    agency: r.agency,
    program: r.program,
    fund: r.fund,
    action: r.action,
    amount: parseCurrency(r.amountText),
    status: r.status,
    title: r.title,
    url: r.url,
    scrapedAt: new Date().toISOString(),
  }));
}

async function scrapeYear(cfg: Cfg, year: number) {
  const browser = await puppeteer.launch({
    headless: true, // TS-friendly; "new" literal causes type mismatch in some versions
    args: ["--no-sandbox","--disable-setuid-sandbox"]
  });
  const page = await browser.newPage();
  await page.setUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36");

  const indexUrl = replaceYear(cfg.memberIndexUrl, year);
  try {
    await page.goto(indexUrl, { waitUntil: "networkidle2", timeout: 60000 });
  } catch (e) {
    await browser.close();
    return { year, count: 0, file: "" };
  }

  const memberLinks = await getMemberLinks(page);
  if (memberLinks.length === 0) {
    await browser.close();
    return { year, count: 0, file: "" };
  }

  const outDir = path.resolve(cfg.outDir);
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `lis_amendments_${year}.jsonl`);
  const stream = fs.createWriteStream(outFile, { flags: "w" });

  const chamber: "House" | "Senate" = "House";
  const limit = pLimit(2);
  let total = 0;

  await Promise.all(memberLinks.map(m =>
    limit(async () => {
      const mp = await browser.newPage();
      try {
        await mp.setUserAgent(await page.browser().userAgent());
        await mp.goto(m.href, { waitUntil: "networkidle2", timeout: 60000 });
        const rows = await extractRowsFromMember(mp, m.name, m.href, year, chamber);
        for (const r of rows) {
          const parsed = AmendmentRow.safeParse(r);
          if (parsed.success) {
            stream.write(JSON.stringify(parsed.data) + "\n");
            total++;
          }
        }
      } catch { /* ignore individual failures */ }
      finally {
        await mp.close();
      }
    })
  ));

  stream.end();
  await browser.close();
  return { year, count: total, file: outFile };
}

async function main() {
  const args = process.argv.slice(2);
  const cfgPathIdx = args.findIndex(a => a === "--config");
  const cfg = readConfig(cfgPathIdx >= 0 ? args[cfgPathIdx + 1] : undefined);

  const preferred = parseYearFromIndexUrl(cfg.memberIndexUrl);
  if (!preferred) throw new Error(`Unable to infer year from memberIndexUrl: ${cfg.memberIndexUrl}`);

  const years = [preferred, preferred - 1];
  for (const y of years) {
    console.log(`[info] Puppeteer: scraping year ${y}…`);
    const res = await scrapeYear(cfg, y);
    if (res.count > 0) {
      console.log(`[ok] Wrote ${res.count} rows → ${res.file}`);
      return;
    } else {
      console.log(`[info] Year ${y} produced no rows, trying fallback…`);
    }
  }
  throw new Error("Puppeteer scraper produced no rows for preferred or fallback year.");
}

main().catch(e => {
  console.error(`[fatal] ${e.stack || e.message}`);
  process.exit(1);
});
