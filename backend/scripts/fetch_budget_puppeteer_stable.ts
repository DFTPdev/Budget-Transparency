// scripts/fetch_budget_puppeteer_stable.ts
import fs from "fs";
import path from "path";
import puppeteer from "puppeteer";

type Cfg = { outDir: string; memberIndexUrl: string };

function readCfg(): Cfg {
  const p = path.resolve("lis.config.json");
  if (!fs.existsSync(p)) throw new Error(`Config not found at: ${p}`);
  const j = JSON.parse(fs.readFileSync(p,"utf8"));
  if (!j.memberIndexUrl) throw new Error(`memberIndexUrl missing in lis.config.json`);
  return { outDir: j.outDir || "./out", memberIndexUrl: j.memberIndexUrl };
}

function parseYear(u: string): number|null {
  const m = u.match(/Amendment\/Member\/(\d{4})\//i);
  return m ? Number(m[1]) : null;
}
function withYear(u:string, y:number){ return u.replace(/(Amendment\/Member\/)(\d{4})(\/)/i, `$1${y}$3`); }

function parseCurrency(s?: string|null) {
  if (!s) return null;
  const cleaned = s.replace(/[\$,()\s]+/g,"").replace(/–|—/g,"-");
  if (!cleaned) return null;
  const neg = /\(.*\)/.test(s) || cleaned.startsWith("-");
  const n = Number(cleaned.replace(/^-/, ""));
  return Number.isNaN(n) ? null : (neg ? -n : n);
}

async function scrapeYear(indexUrl:string, outFile:string) {
  const browser = await puppeteer.launch({ headless: true, args:["--no-sandbox","--disable-setuid-sandbox"] });
  const page = await browser.newPage();
  await page.setUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36");
  await page.goto(indexUrl, { waitUntil:"networkidle2", timeout: 60000 });

  await page.waitForSelector("a", {timeout: 15000}).catch(()=>{});
  const links = await page.$$eval('a[href*="/Amendment/"]', as => {
    const seen = new Set<string>();
    const out: {name:string, href:string}[] = [];
    for (const a of as as HTMLAnchorElement[]) {
      const name = (a.textContent || "").trim();
      const href = a.href;
      if (!href) continue;
      if (seen.has(href)) continue;
      if (/Member/i.test(name) || /Member(Item|Amendments)/i.test(href)) {
        seen.add(href);
        out.push({name: name || href, href});
      }
    }
    return out;
  });

  const stream = fs.createWriteStream(outFile, {flags:"w"});
  let wrote = 0;

  for (const m of links) {
    const mp = await browser.newPage();
    try {
      await mp.setUserAgent(await page.browser().userAgent());
      await mp.goto(m.href, { waitUntil:"networkidle2", timeout: 60000 });
      const rows = await mp.$$eval("table tr", trs => {
        const out:any[] = [];
        for (const tr of trs) {
          const tds = Array.from(tr.querySelectorAll("td"));
          if (tds.length < 3) continue;
          let url = ""; let title = "";
          for (const a of tr.querySelectorAll('a[href*="/Amendment/"]')) {
            const href = (a as HTMLAnchorElement).href;
            if (href && !url) { url = href; title = (a.textContent || "").trim(); }
          }
          if (!url) continue;
          const cells = tds.map(td => (td.textContent || "").trim());
          const [c0,c1,c2,c3,c4,c5,c6] = cells;
          out.push({
            amendmentId: (c0 || title || url.split("/").pop() || "").trim(),
            agency: c1 || undefined,
            program: c2 || undefined,
            fund: c3 || undefined,
            action: c4 || undefined,
            amountText: c5,
            status: c6 || undefined,
            title: title || undefined,
            url
          });
        }
        return out;
      });
      for (const r of rows) {
        const amount = parseCurrency(r.amountText);
        stream.write(JSON.stringify({
          amendmentId: r.amendmentId,
          sessionYear: 0, // filled implicitly by filename downstream
          chamber: "House",
          member: m.name,
          memberUrl: m.href,
          agency: r.agency, program: r.program, fund: r.fund,
          action: r.action, amount: typeof amount==="number"?amount:null,
          status: r.status, title: r.title, url: r.url,
          scrapedAt: new Date().toISOString(),
        })+"\n");
        wrote++;
      }
    } catch {/* keep going */}
    finally { await mp.close(); }
  }

  stream.end();
  await browser.close();
  return wrote;
}

async function main(){
  const cfg = readCfg();
  const outDir = path.resolve(cfg.outDir); fs.mkdirSync(outDir,{recursive:true});
  const args = process.argv.slice(2);
  const yi = args.indexOf("--year");
  const year = yi>=0 ? Number(args[yi+1]) : (parseYear(cfg.memberIndexUrl) || new Date().getFullYear());
  const url = withYear(cfg.memberIndexUrl, year);
  const outFile = path.join(outDir, `lis_amendments_${year}.jsonl`);
  const count = await scrapeYear(url, outFile);
  if (count===0) {
    try { fs.unlinkSync(outFile); } catch {}
    console.error("[fatal] Puppeteer found no rows.");
    process.exit(1);
  } else {
    console.log(`[ok] Wrote ${count} rows → ${outFile}`);
  }
}
main().catch(e=>{ console.error("[fatal]", e.message || e); process.exit(1); });