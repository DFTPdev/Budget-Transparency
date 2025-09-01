// scripts/fetch_budget_api_multi.ts
// Resilient fetcher that tries multiple years, session types, bills, and statuses.
// Falls back to "all statuses" and filters by presence of ChiefPatron.
// Writes JSONL compatible with build_budget_dataset.ts.
//
// Usage:
//   npx ts-node scripts/fetch_budget_api_multi.ts [--years 2025,2024,2023] [--config ./lis.config.json]

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
    headers: { "User-Agent": "Mozilla/5.0 (DFTP-budget-pipeline)" }
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

function parseYearsArg(arg?: string): number[] {
  if (!arg) return [2025, 2024, 2023];
  return arg.split(",").map(s => Number(s.trim())).filter(n => Number.isFinite(n));
}

async function runForYears(years: number[], cfg: Cfg): Promise<{year:number,count:number,file:string} | null> {
  const sessionTypes = ["1","0","2"]; // regular/special/other
  const billNumbers = ["HB29","HB30","SB29","SB30"];
  const billType = "Introduced";
  const statuses = ["MR","CA","GR","GA",""]; // include empty to mean "all"

  for (const year of years) {
    const outDir = path.resolve(cfg.outDir);
    fs.mkdirSync(outDir, { recursive: true });
    const outFile = path.join(outDir, `lis_amendments_${year}.jsonl`);
    const stream = fs.createWriteStream(outFile, { flags: "w" });

    let count = 0;
    for (const sessionType of sessionTypes) {
      for (const billNumber of billNumbers) {
        for (const status of statuses) {
          const statusSeg = status ? `/${status}/` : "/";
          const url = `${API_BASE}/Budget.Amendments.2.ListOfAllItems/${year}/${sessionType}/${billNumber}/${billType}${status ? `/${status}` : ""}/`;
          try {
            const data = await getJson(url);
            const amendments = data?.Amendments || data?.amendments || [];
            if (!Array.isArray(amendments)) continue;
            for (const part of amendments) {
              const secs = part?.SecretariatList || part?.secretariatList || [];
              for (const sec of secs || []) {
                const agencies = sec?.AgencyList || sec?.agencyList || [];
                for (const a of agencies || []) {
                  const member = String(a?.ChiefPatron || "").trim();
                  if (!member) continue; // only keep items we can attribute to a patron
                  const gf1 = toNumber(a?.GeneralFundYear1Change);
                  const gf2 = toNumber(a?.GeneralFundYear2Change);
                  const ngf1 = toNumber(a?.NonGeneralFundYear1Change);
                  const ngf2 = toNumber(a?.NonGeneralFundYear2Change);
                  const total = sumNonNull([gf1, gf2, ngf1, ngf2]);
                  const amendmentId = String(a?.AmendmentItemNumber || a?.ExpenseItemNumber || `${sec?.Secretariat || ""}-${a?.Agency || ""}-${a?.Description || ""}`);
                  const detailUrl = `https://budget.lis.virginia.gov/amendment/${year}/${sessionType}/${billNumber}/${billType}/${status || "ALL"}/${a?.ExpenseItemNumber || ""}/`;
                  const row = {
                    amendmentId,
                    sessionYear: year,
                    chamber: billNumber.startsWith("HB") ? "House" : "Senate",
                    member,
                    memberUrl: "",
                    agency: a?.Agency || undefined,
                    program: undefined,
                    fund: undefined,
                    action: status || "Unknown",
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
            // swallow and continue
          }
        }
      }
    }

    stream.end();
    if (count > 0) {
      return { year, count, file: outFile };
    } else {
      // remove empty file to avoid confusion
      try { fs.unlinkSync(outFile); } catch {}
    }
  }
  return null;
}

async function main() {
  const args = process.argv.slice(2);
  const cfgPathIdx = args.findIndex(a => a === "--config");
  const yearsIdx = args.findIndex(a => a === "--years");
  const years = parseYearsArg(yearsIdx >= 0 ? args[yearsIdx + 1] : undefined);
  const cfg = readConfig(cfgPathIdx >= 0 ? args[cfgPathIdx + 1] : undefined);

  const res = await runForYears(years, cfg);
  if (!res) {
    console.error("[fatal] API returned no patron-attributed items for any tried year/session/bill/status combo.");
    process.exit(1);
  }
  console.log(`[ok] Wrote ${res.count} rows → ${res.file}`);
}

main().catch(e => {
  console.error(`[fatal] ${e.stack || e.message}`);
  process.exit(1);
});
