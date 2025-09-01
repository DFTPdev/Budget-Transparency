// scripts/fetch_budget_api_stable.ts (fixed types)
import fs from "fs";
import path from "path";
import axios from "axios";

type Cfg = { outDir: string };
const API = "https://budget.lis.virginia.gov/BudgetPortalWebService";

type Combo = {
  year: number;
  sessionType: string;
  billNumber: string;
  billType: string;
  status: string;
};

function readCfg(): Cfg {
  const p = path.resolve("lis.config.json");
  if (!fs.existsSync(p)) throw new Error(`Config not found at: ${p}`);
  const j = JSON.parse(fs.readFileSync(p, "utf8"));
  return { outDir: j.outDir || "./out" };
}

async function getJson(url: string) {
  const r = await axios.get(url, {
    timeout: 30000,
    headers: { "User-Agent": "DFTP-budget-pipeline", "Accept": "application/json" }
  });
  return r.data;
}

function toNumber(x: any): number | null {
  if (x == null) return null;
  const s = String(x).replace(/[\$,()\s]/g,"").replace(/–|—/g,"-");
  const neg = /\(.*\)/.test(String(x)) || s.startsWith("-");
  const n = Number(s.replace(/^-/, ""));
  return Number.isFinite(n) ? (neg ? -n : n) : null;
}
const sum = (vals:(number|null|undefined)[]) =>
  vals.reduce<number>((acc, v) => acc + (typeof v === "number" ? v : 0), 0);

function parseYears(arg?: string): number[] {
  if (!arg) return [];
  return arg.split(",").map(s=>Number(s.trim())).filter(n=>Number.isFinite(n));
}

async function listCombos(): Promise<Combo[]> {
  try {
    const d = await getJson(`${API}/Budget.Amendments.1.ListOfYearSessionAmendment/`);
    const arr = Array.isArray(d) ? d : (Array.isArray(d?.ListOfYearSessionAmendment) ? d.ListOfYearSessionAmendment : []);
    return arr.map((x:any)=> ({
      year: Number(x?.Year ?? x?.BudgetYear),
      sessionType: String(x?.SessionType ?? x?.Session ?? "1"),
      billNumber: String(x?.BillNumber ?? "HB30"),
      billType: String(x?.BillType ?? "Introduced"),
      status: String(x?.BillStatusAbbreviation ?? "").trim()
    })).filter((x:Combo)=>Number.isFinite(x.year));
  } catch {
    const years = [2025,2024,2023];
    const sessionTypes = ["1","0"];
    const bills = ["HB29","HB30","SB29","SB30"];
    const billType = "Introduced";
    const statuses = ["MR","GA","CA","GR",""]; // try MR first, then others, then no filter
    const combos: Combo[] = [];
    for (const year of years) for (const st of sessionTypes) for (const b of bills) for (const s of statuses) {
      combos.push({year, sessionType: st, billNumber:b, billType, status:s});
    }
    return combos;
  }
}

async function fetchOne(year:number, st:string, bill:string, billType:string, status:string) {
  const url = `${API}/Budget.Amendments.2.ListOfAllItems/${year}/${st}/${bill}/${billType}${status?`/${status}`:""}/`;
  const d = await getJson(url);
  const parts = d?.Amendments || d?.amendments || [];
  const rows:any[] = [];
  for (const part of parts) {
    const secs = part?.SecretariatList || part?.secretariatList || [];
    for (const sec of secs||[]) {
      const agencies = sec?.AgencyList || sec?.agencyList || [];
      for (const a of agencies||[]) {
        const patron = String(a?.ChiefPatron || "").trim();
        if (!patron) continue;
        const gf1 = toNumber(a?.GeneralFundYear1Change);
        const gf2 = toNumber(a?.GeneralFundYear2Change);
        const ngf1 = toNumber(a?.NonGeneralFundYear1Change);
        const ngf2 = toNumber(a?.NonGeneralFundYear2Change);
        const amount = sum([gf1,gf2,ngf1,ngf2]);
        const amendmentId = String(a?.AmendmentItemNumber ?? a?.ExpenseItemNumber ?? `${sec?.Secretariat||""}-${a?.Agency||""}`);
        const detailUrl = `https://budget.lis.virginia.gov/amendment/${year}/${st}/${bill}/${billType}/${status||"ALL"}/${a?.ExpenseItemNumber||""}/`;
        rows.push({
          amendmentId,
          sessionYear: year,
          chamber: bill.startsWith("HB") ? "House":"Senate",
          member: patron,
          memberUrl: "",
          agency: a?.Agency || undefined,
          program: undefined,
          fund: undefined,
          action: status || "Unknown",
          amount,
          status: a?.Status || undefined,
          title: a?.Description || undefined,
          url: detailUrl,
          scrapedAt: new Date().toISOString()
        });
      }
    }
  }
  return rows;
}

async function main() {
  const args = process.argv.slice(2);
  const yearIdx = args.indexOf("--year");
  const yearsArg = yearIdx>=0 ? args[yearIdx+1] : "";
  const preferredYears = parseYears(yearsArg);
  const cfg = readCfg();
  const outDir = path.resolve(cfg.outDir);
  fs.mkdirSync(outDir,{recursive:true});

  const combos = await listCombos();
  const filtered: Combo[] = preferredYears.length
    ? combos.filter((c: Combo)=>preferredYears.includes(Number(c.year)))
    : combos;

  let wrote = 0;
  let targetYear = preferredYears[0] || (filtered[0]?.year) || new Date().getFullYear();
  const outFile = path.join(outDir, `lis_amendments_${targetYear}.jsonl`);
  const stream = fs.createWriteStream(outFile, {flags:"w"});

  const priority = (c: Combo) => Number(c.year)===Number(targetYear) ? 0 : 1;
  filtered.sort((a: Combo, b: Combo)=> priority(a)-priority(b));

  for (const c of filtered) {
    if (Number(c.year)!==Number(targetYear)) continue;
    try {
      const rows = await fetchOne(c.year, c.sessionType, c.billNumber, c.billType, c.status);
      for (const r of rows) { stream.write(JSON.stringify(r)+"\n"); wrote++; }
    } catch { /* continue */ }
  }
  stream.end();

  if (wrote===0) {
    try { fs.unlinkSync(outFile); } catch {}
    console.error("[fatal] API returned no usable rows. Try Puppeteer fallback.");
    process.exit(1);
  } else {
    console.log(`[ok] Wrote ${wrote} rows → ${outFile}`);
  }
}
main().catch(e=>{ console.error("[fatal]", e.message || e); process.exit(1); });
