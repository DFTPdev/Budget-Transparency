#!/usr/bin/env ts-node
/**
 * LIS Member Requests Scraper
 * 
 * Fetches and parses Member Request amendment pages from the Virginia LIS website
 * for all configured legislators for 2024 (HB30) and 2025 (HB1600).
 * 
 * Outputs JSON files compatible with LegislatorCardData interface.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as cheerio from 'cheerio';
import { classifyAmendmentCategory } from './category_classifier';

// Types matching the frontend contract
type Chamber = "House" | "Senate";
type Party = "D" | "R" | "I" | "Other";
type AmendmentStage = "MR" | "CA" | "FR" | "FA" | "CR" | "GR" | "GV" | "KR";

interface AmendmentSummary {
  bill: "HB30" | "HB1600" | string;
  stage: AmendmentStage;
  item: string;
  title: string;
  lisUrl: string;
  fyFirst: number | null;
  fySecond: number | null;
  amountType: "increase" | "decrease" | "language-only";
  spendingCategoryId?: string;
  tags?: string[];
}

interface AmendmentTotals {
  count: number;
  languageOnlyCount: number;
  fyFirstTotal: number;
  fySecondTotal: number;
  largestAmendment?: {
    item: string;
    title: string;
    amount: number;
    lisUrl: string;
  };
}

interface LegislatorCardData {
  id: string;
  fullName: string;
  lastName: string;
  chamber: Chamber;
  district?: string;
  party?: Party;
  locality?: string;
  photoUrl?: string;
  profileUrl?: string;
  committees?: string[];
  amendments: {
    [billCode: string]: {
      [stage in AmendmentStage]?: {
        totals: AmendmentTotals;
        items: AmendmentSummary[];
        featured?: AmendmentSummary[];
      }
    }
  };
  display: {
    headline?: string;
    subhead?: string;
    badges?: string[];
  };
  updatedAt: string;
}

interface LisMember {
  id: string;
  fullName: string;
  lastName: string;
  chamber: Chamber;
  district?: string;
  party?: Party;
}

// Configuration
const SCRIPT_DIR = __dirname;
const REPO_ROOT = path.resolve(SCRIPT_DIR, '../..');
const MEMBERS_FILE = path.join(SCRIPT_DIR, 'lis_members.json');
const DATA_DIR = path.join(REPO_ROOT, 'data');
const FRONTEND_DATA_DIR = path.join(REPO_ROOT, 'frontend/src/data');

const YEARS = [
  { year: 2024, bill: 'HB30' as const, session: 1 },
  { year: 2025, bill: 'HB1600' as const, session: 1 }
];

const SLEEP_MS = 750; // Delay between requests to avoid hammering LIS

// Helper to sleep
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper to parse currency strings
function parseCurrency(value: string): number | null {
  if (!value || value.trim() === '' || value === '—' || value === '-') {
    return null;
  }
  
  // Remove $, commas, and whitespace
  const cleaned = value.replace(/[$,\s]/g, '');
  
  // Handle parentheses as negative
  const isNegative = cleaned.startsWith('(') && cleaned.endsWith(')');
  const numStr = isNegative ? cleaned.slice(1, -1) : cleaned;
  
  const parsed = parseFloat(numStr);
  if (isNaN(parsed)) {
    return null;
  }
  
  return isNegative ? -parsed : parsed;
}

// Helper to determine amount type
function getAmountType(fyFirst: number | null, fySecond: number | null): "increase" | "decrease" | "language-only" {
  const first = fyFirst ?? 0;
  const second = fySecond ?? 0;
  const total = first + second;
  
  if (total === 0 && fyFirst === null && fySecond === null) {
    return "language-only";
  }
  
  return total >= 0 ? "increase" : "decrease";
}

// Fetch HTML from LIS
async function fetchLisPage(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }
  return response.text();
}

// Parse LIS Member Request page
async function parseMemberRequestPage(
  memberCode: string,
  year: number,
  bill: "HB30" | "HB1600"
): Promise<AmendmentSummary[]> {
  const url = `https://budget.lis.virginia.gov/mbramendment/${year}/1/${memberCode}`;

  console.log(`  Fetching ${url}...`);

  try {
    const html = await fetchLisPage(url);
    const $ = cheerio.load(html);

    const amendments: AmendmentSummary[] = [];

    // LIS uses tables for amendment data
    // Find the table that contains amendment rows
    // Look for rows with 6 cells: checkbox, item, amendment#, description, fy1, fy2
    const tables = $('table');

    for (let i = 0; i < tables.length; i++) {
      const table = tables.eq(i);
      const rows = table.find('tr');

      rows.each((_, row) => {
        const $row = $(row);
        const cells = $row.find('td');

        // Look for rows with exactly 6 cells (the amendment data rows)
        if (cells.length !== 6) return;

        // Check if this looks like an amendment row
        // Cell 1 should have class "child" (item number)
        // Cell 2 should have class "num" (amendment number like #4h)
        // Cell 3 should have class "td-description" (title)
        const itemCell = cells.eq(1);
        const amendNumCell = cells.eq(2);
        const titleCell = cells.eq(3);
        const fy1Cell = cells.eq(4);
        const fy2Cell = cells.eq(5);

        if (!itemCell.hasClass('child') || !amendNumCell.hasClass('num')) {
          return;
        }

        // Extract data
        const item = itemCell.text().trim();
        const amendNum = amendNumCell.text().trim();
        const title = titleCell.text().trim();

        // Try to find link in title cell
        const titleLink = titleCell.find('a').first();
        const lisUrl = titleLink.length > 0
          ? new URL(titleLink.attr('href') || '', 'https://budget.lis.virginia.gov').toString()
          : '';

        // Extract amounts
        const fyFirst = parseCurrency(fy1Cell.text());
        const fySecond = parseCurrency(fy2Cell.text());

        // Skip if no item or title
        if (!item || !title) return;

        // Classify amendment into spending category
        const spendingCategoryId = classifyAmendmentCategory(title);

        amendments.push({
          bill,
          stage: "MR",
          item: `${item} ${amendNum}`, // Combine item number and amendment number
          title,
          lisUrl,
          fyFirst,
          fySecond,
          amountType: getAmountType(fyFirst, fySecond),
          spendingCategoryId
        });
      });

      // If we found amendments, we're done
      if (amendments.length > 0) {
        break;
      }
    }

    console.log(`    Found ${amendments.length} amendments`);
    return amendments;

  } catch (error) {
    console.error(`    Error fetching ${url}:`, error);
    return [];
  }
}

// Compute totals from amendments
function computeTotals(items: AmendmentSummary[]): AmendmentTotals {
  let fyFirstTotal = 0;
  let fySecondTotal = 0;
  let languageOnlyCount = 0;

  for (const item of items) {
    if (item.amountType === "language-only") {
      languageOnlyCount++;
    }
    fyFirstTotal += item.fyFirst ?? 0;
    fySecondTotal += item.fySecond ?? 0;
  }

  // Find largest amendment
  let largestAmendment: AmendmentTotals['largestAmendment'];
  let maxAmount = 0;

  for (const item of items) {
    const amount = Math.max(Math.abs(item.fyFirst ?? 0), Math.abs(item.fySecond ?? 0));
    if (amount > maxAmount) {
      maxAmount = amount;
      largestAmendment = {
        item: item.item,
        title: item.title,
        amount,
        lisUrl: item.lisUrl
      };
    }
  }

  return {
    count: items.length,
    languageOnlyCount,
    fyFirstTotal,
    fySecondTotal,
    largestAmendment
  };
}

// Format currency for display
function formatCurrency(value: number): string {
  const absValue = Math.abs(value);
  if (absValue >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`;
  } else if (absValue >= 1_000) {
    return `$${(value / 1_000).toFixed(0)}K`;
  } else {
    return `$${value.toFixed(0)}`;
  }
}

// Build LegislatorCardData for a member
async function buildLegislatorCardData(
  member: LisMember,
  year: number,
  bill: "HB30" | "HB1600"
): Promise<LegislatorCardData> {
  const amendments = await parseMemberRequestPage(member.id, year, bill);
  const totals = computeTotals(amendments);

  // Get top 3 for featured
  const featured = amendments
    .slice()
    .sort((a, b) => {
      const aMax = Math.max(Math.abs(a.fyFirst ?? 0), Math.abs(a.fySecond ?? 0));
      const bMax = Math.max(Math.abs(b.fyFirst ?? 0), Math.abs(b.fySecond ?? 0));
      return bMax - aMax;
    })
    .slice(0, 3);

  // Build display headline
  const headline = totals.count > 0
    ? `${totals.count} member request${totals.count !== 1 ? 's' : ''} • ${formatCurrency(totals.fySecondTotal)} second-year`
    : 'No member requests found';

  const profileUrl = `https://budget.lis.virginia.gov/mbramendment/${year}/1/${member.id}`;

  return {
    id: member.id,
    fullName: member.fullName,
    lastName: member.lastName,
    chamber: member.chamber,
    district: member.district,
    party: member.party,
    profileUrl,
    amendments: {
      [bill]: {
        MR: {
          totals,
          items: amendments,
          featured
        }
      }
    },
    display: {
      headline,
      subhead: '',
      badges: []
    },
    updatedAt: new Date().toISOString()
  };
}

// Main scraper function
async function scrapeAllMembers() {
  console.log('LIS Member Requests Scraper');
  console.log('============================\n');

  // Load members config
  if (!fs.existsSync(MEMBERS_FILE)) {
    console.error(`Error: Members file not found at ${MEMBERS_FILE}`);
    console.error('Please create lis_members.json with legislator data.');
    process.exit(1);
  }

  const members: LisMember[] = JSON.parse(fs.readFileSync(MEMBERS_FILE, 'utf-8'));
  console.log(`Loaded ${members.length} members from config\n`);

  // Create output directories
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(FRONTEND_DATA_DIR, { recursive: true });

  // Process each year
  for (const { year, bill } of YEARS) {
    console.log(`\nProcessing ${year} (${bill})...`);
    console.log('─'.repeat(50));

    const results: Record<string, LegislatorCardData> = {};

    for (const member of members) {
      console.log(`\n${member.fullName} (${member.id}):`);

      const cardData = await buildLegislatorCardData(member, year, bill);
      results[member.id] = cardData;

      // Sleep to avoid hammering the server
      await sleep(SLEEP_MS);
    }

    // Write output files
    const outputFile = `lis_member_requests_${year}.json`;
    const dataPath = path.join(DATA_DIR, outputFile);
    const frontendPath = path.join(FRONTEND_DATA_DIR, outputFile);

    fs.writeFileSync(dataPath, JSON.stringify(results, null, 2));
    fs.writeFileSync(frontendPath, JSON.stringify(results, null, 2));

    console.log(`\n✓ Wrote ${Object.keys(results).length} records to:`);
    console.log(`  - ${dataPath}`);
    console.log(`  - ${frontendPath}`);
  }

  console.log('\n✓ Scraping complete!\n');
}

// Run the scraper
scrapeAllMembers().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

