// scripts/fetch_budget_api_simple.ts
// Resilient fetcher: skip discovery and query common bill numbers directly.
// Usage:
//   npx ts-node scripts/fetch_budget_api_simple.ts --year 2024 [--config ./lis.config.json]

import fs from "fs";
import path from "path";
import axios from "axios";

const API_BASE = "https://budget.lis.virginia.gov/BudgetPortalWebService";

type Cfg = { outDir: string; };
function readConfig(customPath?: string): Cfg {
  const p = customPath ?? path.resolve("lis.config.json");
  if (!fs.existsSync(p)) throw new Error(`Config not found at: ${p}`);
  const cfg = JSON.parse(fs.readFileSync(p, "utf8"));
  if (!cfg.outDir) cfg.outDir = "./out";
  return cfg as Cfg;
}

async function getJson(url: string): Promise<any> {
  const res = await axios.get(url, {
    timeout: 30000,
    headers: {
      "User-Agent": "Mozilla/5.0 (DFTP-budget-pipeline)",
      "Accept": "application/json,text/plain,*/*"
    }
  });
  return res.data;
}

function toNumber(x: any): number | null {
  if (x == null) return null;
  const s = String(x).replace(/[\$,()\s]/g, "").replace(/–|—/g, "-");
  if (s === "" || s.toUpperCase() === "N/A") return null;
  const neg = /\(.*\)/.test(String(x)) || s.startsWith("-");
  const n = Number(s.replace(/^-/, ""));
  if (Number.isNaN(n)) return null;
  return neg ? -n : n;
}

function sumNonNull(vals: Array<number | null | undefined>): number {
  return vals.reduce<number>((acc, v) => acc + (typeof v === "number" ? v : 0), 0);
}

async function main() {
  const args = process.argv.slice(2);
  const cfgPathIdx = args.findIndex(a => a === "--config");
  const yearIdx = args.findIndex(a => a === "--year");
  const cfg = readConfig(cfgPathIdx >= 0 ? args[cfgPathIdx + 1] : undefined);
  const year = yearIdx >= 0 ? Number(args[yearIdx + 1]) : undefined;
  if (!year) throw new Error("Provide --year <YYYY>");

  const outDir = path.resolve(cfg.outDir);
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `lis_amendments_${year}.jsonl`);
  const stream = fs.createWriteStream(outFile, { flags: "w" });

  const sessionTypes = ["1", "0"]; // regular & special
  const billNumbers = ["HB29", "HB30", "SB29", "SB30"];
  const billType = "Introduced";
  const status = "MR"; // Member Request

  let count = 0;

  for (const sessionType of sessionTypes) {
    for (const billNumber of billNumbers) {
      const url = `${API_BASE}/Budget.Amendments.2.ListOfAllItems/${year}/${sessionType}/${billNumber}/${billType}/${status}/`;
      try {
        const data = await getJson(url);
        // We expect something like: { Amendments: [ { SecretariatList: [ { AgencyList: [...] } ] } ] }
        const amendments = data?.Amendments || data?.amendments || [];
        if (!Array.isArray(amendments)) continue;
        for (const part of amendments) {
          const secs = part?.SecretariatList || part?.secretariatList || [];
          for (const sec of secs || []) {
            const agencies = sec?.AgencyList || sec?.agencyList || [];
            for (const a of agencies || []) {
              const member = String(a?.ChiefPatron || "").trim();
              if (!member) continue;
              const gf1 = toNumber(a?.GeneralFundYear1Change);
              const gf2 = toNumber(a?.GeneralFundYear2Change);
              const ngf1 = toNumber(a?.NonGeneralFundYear1Change);
              const ngf2 = toNumber(a?.NonGeneralFundYear2Change);
              const total = sumNonNull([gf1, gf2, ngf1, ngf2]);
              const amendmentId = String(a?.AmendmentItemNumber || a?.ExpenseItemNumber || `${sec?.Secretariat || ""}-${a?.Agency || ""}-${a?.Description || ""}`);
              const detailUrl = `https://budget.lis.virginia.gov/amendment/${year}/${sessionType}/${billNumber}/${billType}/${status}/${a?.ExpenseItemNumber || ""}/`;
              const row = {
                amendmentId,
                sessionYear: year,
                chamber: billNumber.startsWith("HB") ? "House" : "Senate",
                member,
                memberUrl: "",
                agency: a?.Agency || undefined,
                program: undefined,
                fund: undefined,
                action: "Member Request",
                amount: Number.isFinite(total) ? total : null,
                status: a?.Status || undefined,
                title: a?.Description || undefined,
                url: detailUrl,
                scrapedAt: new Date().toISOString(),
              };
              stream.write(JSON.stringify(row) + "\n");
              count++;
            }
          }
        }
      } catch (e: any) {
        console.warn(`[warn] API fetch failed ${url}: ${e?.message || e}`);
      }
    }
  }

  stream.end();
  if (count === 0) {
    console.error("[fatal] API returned no Member Request rows for any tried combo. Try another year or check LIS API status.");
    process.exit(1);
  } else {
    console.log(`[ok] Wrote ${count} rows → ${outFile}`);
  }
}

main().catch(e => {
  console.error(`[fatal] ${e.stack || e.message}`);
  process.exit(1);
});
