// scripts/fetch_budget_api.ts (fixed TS18049)
// Fetches budget amendments via the official Virginia Budget Web Service API
// and writes JSONL like the scraper, keyed by ChiefPatron (member).
//
// Usage:
//   npx ts-node scripts/fetch_budget_api.ts --year 2024 [--config ./lis.config.json]

import fs from "fs";
import path from "path";
import axios from "axios";
import { z } from "zod";

const API_BASE = "https://budget.lis.virginia.gov/BudgetPortalWebService";

type Cfg = { outDir: string; };

function readConfig(customPath?: string): Cfg {
  const p = customPath ?? path.resolve("lis.config.json");
  if (!fs.existsSync(p)) throw new Error(`Config not found at: ${p}`);
  const cfg = JSON.parse(fs.readFileSync(p, "utf8"));
  if (!cfg.outDir) cfg.outDir = "./out";
  return cfg as Cfg;
}

async function getJson<T>(url: string): Promise<T> {
  const res = await axios.get(url, {
    timeout: 30_000,
    headers: { "User-Agent": "Mozilla/5.0 (DFTP-budget-pipeline)" },
  });
  return res.data as T;
}

// ---- API Schemas (loose) ----
const YearSessionSchema = z.object({
  Year: z.string(),
  SessionType: z.string(),       // "1", "0", etc
  SessionDesc: z.string().optional(),
  BillStatus: z.string().optional(),
  BillStatusAbbreviation: z.string().optional(), // MR, CA, GR, etc
  BillType: z.string().optional(),               // "Budget Bill"
  HouseBillNumber: z.string().optional(),        // e.g., "HB30"
  SenateBillNumber: z.string().optional(),       // e.g., "SB30"
  BienniumYear1: z.string().optional(),
  BienniumYear2: z.string().optional(),
  BudgetRound: z.string().optional(),
});
const YearSessionResponse = z.object({
  YearsSessionsBillAmendments: z.array(YearSessionSchema),
});

const AgencyWS = z.object({
  Agency: z.string().nullable().optional(),
  Description: z.string().nullable().optional(),
  ExpenseItemNumber: z.string().nullable().optional(),
  AmendmentItemNumber: z.string().nullable().optional(),
  BienniumYear1: z.string().nullable().optional(),
  BienniumYear2: z.string().nullable().optional(),
  GeneralFundYear1Change: z.string().nullable().optional(),
  GeneralFundYear2Change: z.string().nullable().optional(),
  NonGeneralFundYear1Change: z.string().nullable().optional(),
  NonGeneralFundYear2Change: z.string().nullable().optional(),
  Status: z.string().nullable().optional(),
  ChiefPatron: z.string().nullable().optional(),
});
const Secretariats = z.object({
  Secretariat: z.string().nullable().optional(),
  AgencyList: z.array(AgencyWS).nullable().optional(),
});
const PartsWS = z.object({
  PartNumber: z.number().nullable().optional(),
  PartDescription: z.string().nullable().optional(),
  SecretariatList: z.array(Secretariats).nullable().optional(),
});
const AmendmentsResponse = z.object({
  Amendments: z.array(PartsWS).nullable().optional(),
});

function toNumber(x?: string | null): number | null {
  if (x == null) return null;
  const s = (x + "").replace(/[\$,()\s]/g, "").replace(/–|—/g, "-");
  if (s === "" || s.toUpperCase() === "N/A") return null;
  const neg = /\(.*\)/.test(x) || s.startsWith("-");
  const n = Number(s.replace(/^-/, ""));
  if (Number.isNaN(n)) return null;
  return neg ? -n : n;
}

// FIX: explicitly type reducer accumulator as number
function sumNonNull(nums: Array<number | null | undefined>): number {
  return nums.reduce<number>((acc, v) => acc + (typeof v === "number" ? v : 0), 0);
}

type Row = {
  amendmentId: string;
  sessionYear: number;
  chamber?: "House" | "Senate";
  member: string;
  memberUrl: string;
  agency?: string;
  program?: string;
  fund?: string;
  action?: string | null;
  amount?: number | null;
  status?: string;
  title?: string;
  url: string;
  scrapedAt: string;
};

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

  // 1) Discover combos
  const listUrl = `${API_BASE}/Budget.Amendments.1.ListOfYearSessionAmendment/`;
  const listJson = await getJson<any>(listUrl);
  const parsed = YearSessionResponse.safeParse(listJson);
  if (!parsed.success) throw new Error("Failed to parse year/session list from API");
  const combos = parsed.data.YearsSessionsBillAmendments.filter(c => Number(c.Year) === year);

  const MR = combos.filter(c => (c.BillStatusAbbreviation || "").toUpperCase() === "MR");

  const tasks: Array<Promise<void>> = [];
  for (const c of MR) {
    const sessionType = c.SessionType || "1";
    const candidates: Array<{ billNumber: string, chamber: "House" | "Senate" }> = [];
    if (c.HouseBillNumber) candidates.push({ billNumber: c.HouseBillNumber, chamber: "House" });
    if (c.SenateBillNumber) candidates.push({ billNumber: c.SenateBillNumber, chamber: "Senate" });

    for (const { billNumber, chamber } of candidates) {
      const billType = "Introduced";
      const url = `${API_BASE}/Budget.Amendments.2.ListOfAllItems/${year}/${sessionType}/${billNumber}/${billType}/MR/`;
      tasks.push((async () => {
        try {
          const data = await getJson<any>(url);
          const parsed2 = AmendmentsResponse.safeParse(data);
          if (!parsed2.success || !parsed2.data.Amendments) return;
          for (const part of parsed2.data.Amendments) {
            if (!part?.SecretariatList) continue;
            for (const sec of part.SecretariatList) {
              const agencyList = sec?.AgencyList || [];
              for (const a of agencyList || []) {
                const member = (a.ChiefPatron || "").trim();
                if (!member) continue;

                const gf1 = toNumber(a.GeneralFundYear1Change);
                const gf2 = toNumber(a.GeneralFundYear2Change);
                const ngf1 = toNumber(a.NonGeneralFundYear1Change);
                const ngf2 = toNumber(a.NonGeneralFundYear2Change);
                const total = sumNonNull([gf1, gf2, ngf1, ngf2]);

                const amendmentId = (a.AmendmentItemNumber || a.ExpenseItemNumber || `${sec?.Secretariat || ""}-${a.Agency || ""}-${a.Description || ""}`).toString();
                const detailUrl = `https://budget.lis.virginia.gov/amendment/${year}/${sessionType}/${billNumber}/${billType}/MR/${a.ExpenseItemNumber || ""}/`;

                const row: Row = {
                  amendmentId,
                  sessionYear: year,
                  chamber,
                  member,
                  memberUrl: "",
                  agency: a.Agency || undefined,
                  program: undefined,
                  fund: undefined,
                  action: "Member Request",
                  amount: Number.isFinite(total) ? total : null,
                  status: a.Status || undefined,
                  title: a.Description || undefined,
                  url: detailUrl,
                  scrapedAt: new Date().toISOString(),
                };
                stream.write(JSON.stringify(row) + "\n");
              }
            }
          }
        } catch (e: any) {
          console.warn(`[warn] API fetch failed for ${url}: ${e?.message || e}`);
        }
      })());
    }
  }

  await Promise.all(tasks);
  stream.end();
  console.log(`[ok] Wrote ${outFile}`);
}

main().catch(e => {
  console.error(`[fatal] ${e.stack || e.message}`);
  process.exit(1);
});
