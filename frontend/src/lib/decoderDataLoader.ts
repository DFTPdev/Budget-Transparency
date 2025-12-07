/**
 * Data loader for Budget Decoder CSV files
 * Loads program rollup and vendor decoder data
 */

import { fetchCSV, toNumber, toInt, parseJSONField, type CSVRow } from './csvLoader';

// ----------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------

export type ProgramRollup = {
  fiscal_year: number;
  secretariat: string;
  agency: string;
  program: string;
  service_area: string;
  appropriated_amount: number;
  total_spent_ytd: number;
  remaining_balance: number;
  execution_rate: number;
  number_of_unique_recipients: number;
  top_10_recipients: string[];
  category_breakdown: Record<string, number>;
  match_type: string;
  match_score: number;
};

export type VendorRecord = {
  fiscal_year: number;
  secretariat: string;
  agency: string;
  program: string;
  service_area: string;
  vendor_name: string;
  recipient_type: string;
  appropriated_amount: number;
  spent_amount_ytd: number;
  remaining_balance: number;
  execution_rate: number;
  top_category_name: string;
  match_type: string;
  match_score: number;
  is_placeholder: boolean;
  is_expected_unmatched: boolean;
};

export type AgencyBudget = {
  fiscal_year: number;
  secretariat: string;
  story_bucket_id: string;
  story_bucket_label: string;
  agency: string;
  amount: number;
  percentage: number;
};

export type ProgramBudget = {
  fiscal_year: number;
  secretariat: string;
  story_bucket_id: string;
  story_bucket_label: string;
  agency: string;
  program: string;
  amount: number;
  percentage: number;
};

export type TransferPaymentRecord = {
  branch: string;
  secretariat: string;
  agency: string;
  function: string;
  program: string;
  service_area: string;
  fund: string;
  fund_detail: string;
  category: string;
  expense_type: string;
  trans_date: string;
  fiscal_year: number;
  amount: number;
  vendor_name: string;
};

// ----------------------------------------------------------------------
// CSV Parsers
// ----------------------------------------------------------------------

function parseRollupRow(row: CSVRow): ProgramRollup {
  return {
    fiscal_year: toInt(row.fiscal_year),
    secretariat: row.secretariat || '',
    agency: row.agency || '',
    program: row.program || '',
    service_area: row.service_area || '',
    appropriated_amount: toNumber(row.appropriated_amount),
    total_spent_ytd: toNumber(row.total_spent_ytd),
    remaining_balance: toNumber(row.remaining_balance),
    execution_rate: toNumber(row.execution_rate),
    number_of_unique_recipients: toInt(row.number_of_unique_recipients),
    top_10_recipients: parseJSONField<string[]>(row.top_10_recipients, []),
    category_breakdown: parseJSONField<Record<string, number>>(row.category_breakdown, {}),
    match_type: row.match_type || '',
    match_score: toNumber(row.match_score),
  };
}

function parseVendorRow(row: CSVRow): VendorRecord {
  return {
    fiscal_year: toInt(row.fiscal_year),
    secretariat: row.secretariat || '',
    agency: row.agency || '',
    program: row.program || '',
    service_area: row.service_area || '',
    vendor_name: row.vendor_name || '',
    recipient_type: row.recipient_type || '',
    appropriated_amount: toNumber(row.appropriated_amount),
    spent_amount_ytd: toNumber(row.spent_amount_ytd),
    remaining_balance: toNumber(row.remaining_balance),
    execution_rate: toNumber(row.execution_rate),
    top_category_name: row.top_category_name || '',
    match_type: row.match_type || '',
    match_score: toNumber(row.match_score),
    is_placeholder: row.is_placeholder === 'True' || row.is_placeholder === 'true',
    is_expected_unmatched: row.is_expected_unmatched === 'True' || row.is_expected_unmatched === 'true',
  };
}

function parseTransferPaymentRow(row: CSVRow): TransferPaymentRecord {
  return {
    branch: row.branch || '',
    secretariat: row.secretariat || '',
    agency: row.agency || '',
    function: row.function || '',
    program: row.program || '',
    service_area: row.service_area || '',
    fund: row.fund || '',
    fund_detail: row.fund_detail || '',
    category: row.category || '',
    expense_type: row.expense_type || '',
    trans_date: row.trans_date || '',
    fiscal_year: toInt(row.fiscal_year),
    amount: toNumber(row.amount),
    vendor_name: row.vendor_name || '',
  };
}

// ----------------------------------------------------------------------
// Data Loaders
// ----------------------------------------------------------------------

let rollupCache: ProgramRollup[] | null = null;
let vendorCache: VendorRecord[] | null = null;
let agencyCache: Record<number, AgencyBudget[]> = {};
let programCache: Record<number, ProgramBudget[]> = {};

export async function loadProgramRollups(): Promise<ProgramRollup[]> {
  if (rollupCache) return rollupCache;

  try {
    const rows = await fetchCSV('/decoder/program_rollup_decoder.csv');
    console.log('✅ Loaded rollup CSV:', rows.length, 'rows');
    rollupCache = rows.map(parseRollupRow);
    console.log('✅ Parsed rollup data:', rollupCache.length, 'programs');
    return rollupCache;
  } catch (error) {
    console.error('Failed to load program rollups:', error);
    return [];
  }
}

export async function loadVendorRecords(): Promise<VendorRecord[]> {
  if (vendorCache) return vendorCache;

  try {
    const rows = await fetchCSV('/decoder/program_vendor_decoder_external.csv');
    console.log('✅ Loaded vendor CSV:', rows.length, 'rows');
    vendorCache = rows.map(parseVendorRow);
    console.log('✅ Parsed vendor data:', vendorCache.length, 'recipients');
    return vendorCache;
  } catch (error) {
    console.error('Failed to load vendor records:', error);
    return [];
  }
}

export async function loadAgencyBudgets(fiscalYear: number): Promise<AgencyBudget[]> {
  if (agencyCache[fiscalYear]) return agencyCache[fiscalYear];

  try {
    const response = await fetch(`/data/budget_by_agency_${fiscalYear}.json`);
    if (!response.ok) {
      throw new Error(`Failed to load agency budgets for FY${fiscalYear}`);
    }
    const data = await response.json();
    agencyCache[fiscalYear] = data;
    console.log(`✅ Loaded ${data.length} agencies for FY${fiscalYear}`);
    return data;
  } catch (error) {
    console.error(`Failed to load agency budgets for FY${fiscalYear}:`, error);
    return [];
  }
}

export async function loadProgramBudgets(fiscalYear: number): Promise<ProgramBudget[]> {
  if (programCache[fiscalYear]) return programCache[fiscalYear];

  try {
    const response = await fetch(`/data/budget_by_program_${fiscalYear}.json`);
    if (!response.ok) {
      throw new Error(`Failed to load program budgets for FY${fiscalYear}`);
    }
    const data = await response.json();
    programCache[fiscalYear] = data;
    console.log(`✅ Loaded ${data.length} programs for FY${fiscalYear}`);
    return data;
  } catch (error) {
    console.error(`Failed to load program budgets for FY${fiscalYear}:`, error);
    return [];
  }
}

// ----------------------------------------------------------------------
// Filtering Helpers
// ----------------------------------------------------------------------

export function filterVendorsByProgram(
  vendors: VendorRecord[],
  fiscalYear: number,
  agency: string,
  program: string,
  serviceArea: string
): VendorRecord[] {
  return vendors.filter(
    v =>
      v.fiscal_year === fiscalYear &&
      v.agency === agency &&
      v.program === program &&
      v.service_area === serviceArea
  );
}

// Load comprehensive transfer payments (all CARDINAL fields)
let transferPaymentsCache: TransferPaymentRecord[] | null = null;

export async function loadTransferPayments(): Promise<TransferPaymentRecord[]> {
  if (transferPaymentsCache) return transferPaymentsCache;

  try {
    // Fetch the gzipped CSV file (8.8MB instead of 96MB)
    console.log('Fetching compressed transfer payments data...');
    const response = await fetch('/decoder/transfer_payments_full.csv.gz');
    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
    }

    // Decompress the gzip data
    const compressedData = await response.arrayBuffer();
    const decompressedStream = new Response(
      new Response(compressedData).body?.pipeThrough(new DecompressionStream('gzip'))
    );
    const csvText = await decompressedStream.text();
    console.log('✅ Decompressed CSV text length:', csvText.length);

    // Parse CSV manually (same logic as fetchCSV)
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length === 0) {
      throw new Error('Empty CSV file');
    }

    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    const rows: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      if (values.length === headers.length) {
        const row: any = {};
        headers.forEach((header, index) => {
          row[header] = values[index];
        });
        rows.push(row);
      }
    }

    console.log('✅ Loaded transfer payments CSV:', rows.length, 'rows');
    transferPaymentsCache = rows.map(parseTransferPaymentRow);
    console.log('✅ Parsed transfer payment data:', transferPaymentsCache.length, 'records');
    return transferPaymentsCache;
  } catch (error) {
    console.error('Failed to load comprehensive transfer payments:', error);
    return [];
  }
}
