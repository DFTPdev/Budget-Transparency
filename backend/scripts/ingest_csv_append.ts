// scripts/ingest_csv_append.ts
// Append LIS-exported CSV files (UTF-16, often tab-delimited) into lis_amendments_<year>.jsonl
import fs from "fs";
import path from "path";

function toNumber(x:any){
  if (x==null) return 0;
  const s = String(x).replace(/[\$,()\s]/g,"").replace(/–|—/g,"-");
  const neg = /\(.*\)/.test(String(x)) || s.startsWith("-");
  const n = Number(s.replace(/^-/, ""));
  return Number.isFinite(n) ? (neg ? -n : n) : 0;
}
function parseArgs(){
  const out:any = {}; const a = process.argv.slice(2);
  for (let i=0;i<a.length;i++){ const k=a[i];
    if (k.startsWith("--")) { const key=k.slice(2); const v=a[i+1]&&!a[i+1].startsWith("--")?a[++i]:true; out[key]=v; }
  }
  return out;
}
function readCsvUtf16(p:string){
  const raw = fs.readFileSync(p, {encoding:"utf16le"});
  const lines = raw.split(/\r?\n/).filter(Boolean);
  // skip first two title lines; many LIS exports are tab-separated after that
  const data = lines.slice(2).map(L=>L.split("\t"));
  const header = data.shift() || [];
  return { header, rows: data };
}
const idx = (header:string[], name:string) =>
  header.findIndex(h => h.trim().toLowerCase() === name.trim().toLowerCase());

function main(){
  const argv = parseArgs();
  const year = Number(argv.year || new Date().getFullYear());
  const glob = String(argv.glob || "./ingest/*.csv");
  const outDir = path.resolve("./out"); fs.mkdirSync(outDir,{recursive:true});
  const outFile = path.join(outDir, `lis_amendments_${year}.jsonl`);
  const stream = fs.createWriteStream(outFile, {flags: fs.existsSync(outFile) ? "a" : "w"});

  const dir = path.dirname(glob);
  const pat = new RegExp("^" + glob.replace(dir+"/","").replace("*",".*") + "$","i");
  const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter(f=>pat.test(f)).map(f=>path.join(dir,f)) : [];

  let wrote=0;
  for (const f of files) {
    const { header, rows } = readCsvUtf16(f);
    const get = (row:string[], key:string) => {
      const i = idx(header, key); return i>=0 ? (row[i] || "") : "";
    };
    for (const r of rows) {
      const gf1 = toNumber(get(r,"GF Dollars FY1"));
      const gf2 = toNumber(get(r,"GF Dollars FY2"));
      const ngf1 = toNumber(get(r,"NGF Dollars FY1"));
      const ngf2 = toNumber(get(r,"NGF Dollars FY2"));
      const amount = gf1+gf2+ngf1+ngf2;
      const bill = get(r,"Budget Bill") || "";
      const member =
        get(r,"Member") || get(r,"Chief Patron") || get(r,"Patron") || "Unknown";
      stream.write(JSON.stringify({
        amendmentId: get(r,"Amendment #") || get(r,"Amendment Number"),
        sessionYear: year,
        chamber: bill.startsWith("HB") ? "House" : (bill.startsWith("SB") ? "Senate" : "House"),
        member,
        memberUrl: "",
        agency: get(r,"Agency") || undefined,
        program: get(r,"Department") || undefined,
        fund: undefined,
        action: get(r,"Amendment Stage") || undefined,
        amount,
        status: undefined,
        title: get(r,"Description") || undefined,
        url: "",
        scrapedAt: new Date().toISOString()
      })+"\n");
      wrote++;
    }
  }
  stream.end();
  console.log(`[ok] Appended ${wrote} rows from ${files.length} CSV file(s) → ${outFile}`);
}
main();