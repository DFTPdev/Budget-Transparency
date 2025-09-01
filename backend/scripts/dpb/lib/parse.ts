import * as cheerio from "cheerio";

export const clean = (s?: string) => String(s||"").replace(/\s+/g," ").trim();
export const money = (s?: string) => {
  const n = Number(String(s||"").replace(/[^\d.-]/g,""));
  return Number.isFinite(n) ? n : 0;
};

export function parseAgencyTable(html: string) {
  const $ = cheerio.load(html);
  // Heuristic: find the first table that has currency-looking cells
  const tables = $("table");
  const rows: { id: string; title: string; fy: number; amount: number }[] = [];
  tables.each((_, t) => {
    const trs = $(t).find("tr");
    trs.each((__, tr) => {
      const tds = $(tr).find("td,th");
      const cells = tds.map((i, el) => clean($(el).text())).get();
      // Tweak this once you see real markup:
      // Expect something like: ["Item 125", "Some Title", "FY2026 Total", "$1,234,567"]
      if (cells.length >= 4 && /\bItem\s+\d+/i.test(cells[0]) && /\$\d/.test(cells.join(" "))) {
        const id = cells[0].replace(/\s+/g," ");
        const title = cells[1];
        const fyMatch = cells.slice(2).join(" ").match(/FY\s?(\d{4})/i);
        const fy = fyMatch ? Number(fyMatch[1]) : NaN;
        const amtStr = cells.find(c => /\$/.test(c)) || "0";
        rows.push({ id, title, fy, amount: money(amtStr) });
      }
    });
  });
  return rows;
}