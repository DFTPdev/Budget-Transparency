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

// ----------------------------------------------------------------------
// Data Loaders
// ----------------------------------------------------------------------

let rollupCache: ProgramRollup[] | null = null;
let vendorCache: VendorRecord[] | null = null;

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

