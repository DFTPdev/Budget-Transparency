// scripts/fetch_lis_member_amendments.js
// Crawl the LIS Member Amendments index page, fetch each member page,
// and emit a normalized JSON for aggregation.

const fs = require('fs');
const path = require('path');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');

const cfgPath = path.resolve(__dirname, 'lis.config.json');
const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));

const INDEX_URL = cfg.memberIndexUrl;
const RAW_DIR = path.resolve(__dirname, cfg.downloadDir || './lis_downloads');
const OUT_DIR = path.resolve(__dirname, cfg.outDir || './out');

const OUT_HTML_LIST = path.join(OUT_DIR, 'lis_member_amendments_sources.json');
const OUT_NORMALIZED = path.join(OUT_DIR, 'lis_member_amendments.normalized.json');

function ensureDir(p) { if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }); }
ensureDir(RAW_DIR); ensureDir(OUT_DIR);

function absoluteUrl(base, href) {
  try {
    return new URL(href, base).toString();
  } catch {
    return null;
  }
}

async function get(url) {
  const res = await axios.get(url, {
    timeout: cfg?.http?.timeoutMs || 60000,
    headers: { 'User-Agent': cfg?.http?.userAgent || 'Mozilla/5.0' }
  });
  return res.data;
}

async function discoverMemberPages(indexUrl) {
  const html = await get(indexUrl);
  const $ = cheerio.load(html);
  const out = new Map();

  // Heuristic: any link on the page that looks like a Member Amendments page
  $('a[href]').each((_, a) => {
    const href = $(a).attr('href');
    const text = $(a).text().trim();
    if (!href) return;
    const url = absoluteUrl(indexUrl, href);
    if (!url) return;

    // Only pages in the Amendment/Member path
    if (!/\/Amendment\/Member\//i.test(url)) return;
    if (cfg.strictHouseOnly && !/\/House\//i.test(url)) return;

    // Key by URL to dedupe. Keep the most descriptive link text as a hint.
    const hint = text || url.split('/').slice(-1)[0];
    out.set(url, hint);
  });

  return Array.from(out.entries()).map(([url, hint]) => ({ url, hint }));
}

async function fetchOne({ url, hint }, i) {
  const html = await get(url);
  const fname = `member_${String(i + 1).padStart(3, '0')}.html`;
  const savePath = path.join(RAW_DIR, fname);
  fs.writeFileSync(savePath, html);
  return { url, hint, path: savePath };
}

/**
 * Parser:
 * - Tries to find a member name on the page (header/breadcrumb).
 * - Then finds rows with an Amount column and (optionally) a Description column.
 * - Emits records like { sponsor, amount, desc }.
 * NOTE: LIS markup varies — tweak selectors if zero rows come out.
 */
function parseHtmlToRecords(html, fallbackSponsor) {
  const $ = cheerio.load(html);
  const out = [];

  // Try to infer the sponsor from heading/breadcrumb
  let sponsor =
    $('h1, h2, .page-title, .content h1').first().text().trim() ||
    $('nav.breadcrumb, .breadcrumb').text().trim().split('»').pop()?.trim() ||
    fallbackSponsor || '';

  sponsor = sponsor.replace(/\s+/g, ' ').replace(/member amendments?/i, '').trim();

  // Try table parsing with "Amount" column
  $('table').each((_, table) => {
    const $table = $(table);
    const headers = [];
    $table.find('thead th, tr:first-child th, tr:first-child td').each((i, th) => {
      headers[i] = $(th).text().trim().toLowerCase();
    });

    const amountIdx = headers.findIndex(h => /amount/i.test(h));
    if (amountIdx === -1) return; // not the right table

    let descIdx = headers.findIndex(h => /(item|description|purpose|title)/i.test(h));
    if (descIdx === -1) descIdx = (amountIdx === 0 ? 1 : 0); // guess

    $table.find('tbody tr, tr').each((_, tr) => {
      const tds = $(tr).find('td');
      if (!tds.length) return;
      const amtRaw = $(tds[amountIdx]).text().trim();
      const desc = $(tds[descIdx] || '').text().trim();
      const amount = parseAmount(amtRaw);
      if (Number.isFinite(amount)) {
        out.push({ sponsor, amount, desc });
      }
    });
  });

  // Fallback: bullet/list style "$123,456 – Some program"
  if (out.length === 0) {
    $('li, p').each((_, el) => {
      const txt = $(el).text().replace(/\s+/g, ' ').trim();
      // either "$1,234 for X" or "X — $1,234"
      const m1 = txt.match(/^\$?\s*([\d,]+)\b.*$/);
      const m2 = txt.match(/^(.+?)\s+[-–—]\s+\$?\s*([\d,]+)\b/);
      if (m1) out.push({ sponsor, amount: parseAmount(m1[1]), desc: txt });
      else if (m2) out.push({ sponsor, amount: parseAmount(m2[2]), desc: m2[1] });
    });
  }

  return out;
}

function parseAmount(str) {
  if (!str) return NaN;
  const cleaned = String(str).replace(/[^\d.-]/g, '');
  return Number(cleaned);
}

async function main() {
  console.log(`🔎 Index: ${INDEX_URL}`);
  const discovered = await discoverMemberPages(INDEX_URL);
  console.log(`   Found ${discovered.length} member page(s)`);

  const fetched = [];
  for (let i = 0; i < discovered.length; i++) {
    try {
      const rec = await fetchOne(discovered[i], i);
      fetched.push(rec);
      console.log(`  ✅ Saved ${discovered[i].url} -> ${rec.path}`);
    } catch (err) {
      console.warn(`  ⚠️ Failed ${discovered[i].url}: ${err.message}`);
    }
  }
  fs.writeFileSync(OUT_HTML_LIST, JSON.stringify(fetched, null, 2));

  // Parse all fetched HTML into normalized records
  let normalized = [];
  for (const item of fetched) {
    try {
      const html = fs.readFileSync(item.path, 'utf8');
      const rows = parseHtmlToRecords(html, item.hint);
      normalized = normalized.concat(rows);
      console.log(`  📄 Parsed ${rows.length} rows from ${path.basename(item.path)}`);
    } catch (err) {
      console.warn(`  ⚠️ Parse failed for ${item.path}: ${err.message}`);
    }
  }

  fs.writeFileSync(OUT_NORMALIZED, JSON.stringify(normalized, null, 2));
  console.log(`✅ Wrote normalized records: ${OUT_NORMALIZED} (count=${normalized.length})`);
}

main().catch(err => {
  console.error('❌ Fatal:', err);
  process.exit(1);
});