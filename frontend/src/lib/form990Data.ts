/**
 * IRS Form 990 Filing Data
 * 
 * This module provides functionality to load and access IRS Form 990 filing data
 * from ProPublica Nonprofit Explorer API.
 */

export interface Form990Filing {
  tax_year: number;
  pdf_url: string | null;
  form_type: number;  // 0 = 990, 1 = 990EZ, 2 = 990PF
  total_revenue?: number;
  total_expenses?: number;
  total_assets?: number;
  total_liabilities?: number;
}

export interface Nonprofit990Data {
  ein: string;
  name: string;
  propublica_url: string;
  filings: Form990Filing[];
  filings_count: number;
}

export interface Form990DataMap {
  [vendorName: string]: Nonprofit990Data;
}

/**
 * Load Form 990 filing data for all verified nonprofits
 */
export async function loadForm990Data(): Promise<Form990DataMap> {
  try {
    const response = await fetch('/data/form_990_links.json');
    if (!response.ok) {
      throw new Error(`Failed to load Form 990 data: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error loading Form 990 data:', error);
    return {};
  }
}

/**
 * Get Form 990 data for a specific vendor
 */
export function get990Data(vendorName: string, form990Data: Form990DataMap): Nonprofit990Data | null {
  return form990Data[vendorName] || null;
}

/**
 * Get form type label
 */
export function getFormTypeLabel(formType: number): string {
  switch (formType) {
    case 0:
      return '990';
    case 1:
      return '990-EZ';
    case 2:
      return '990-PF';
    default:
      return '990';
  }
}

/**
 * Check if a nonprofit has any 990 filings available
 */
export function has990Filings(vendorName: string, form990Data: Form990DataMap): boolean {
  const data = form990Data[vendorName];
  return data ? data.filings_count > 0 : false;
}

/**
 * Get the most recent 990 filing for a nonprofit
 */
export function getMostRecent990(vendorName: string, form990Data: Form990DataMap): Form990Filing | null {
  const data = form990Data[vendorName];
  if (!data || data.filings.length === 0) {
    return null;
  }
  
  // Filings are already sorted by tax year descending in the data
  return data.filings[0];
}

