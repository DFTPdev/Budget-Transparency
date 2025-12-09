/**
 * IRS Nonprofit Verification
 * 
 * This module provides functionality to verify if CARDINAL vendors are
 * IRS-registered 501(c)(3) nonprofit organizations.
 */

export interface IRSNonprofit {
  ein: string;
  name: string;
  normalized_name: string;
  city: string;
  state: string;
  zip: string;
  ntee_code: string;
  asset_amount: number;
  income_amount: number;
  status: string;
  subsection: string;
  match_score: number;
  match_type: 'exact' | 'fuzzy';
}

export interface VendorIRSMatches {
  [vendorName: string]: IRSNonprofit;
}

/**
 * Load IRS verification data for CARDINAL vendors
 */
export async function loadVendorIRSMatches(): Promise<VendorIRSMatches> {
  try {
    const response = await fetch('/data/vendor_irs_matches.json');
    if (!response.ok) {
      throw new Error(`Failed to load IRS matches: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error loading IRS verification data:', error);
    return {};
  }
}

/**
 * Check if a vendor is IRS-verified nonprofit
 */
export function isIRSVerified(vendorName: string, irsMatches: VendorIRSMatches): boolean {
  return vendorName in irsMatches;
}

/**
 * Get IRS verification details for a vendor
 */
export function getIRSVerification(vendorName: string, irsMatches: VendorIRSMatches): IRSNonprofit | null {
  return irsMatches[vendorName] || null;
}

/**
 * Get verification badge text
 */
export function getVerificationBadge(verification: IRSNonprofit | null): string {
  if (!verification) {
    return '';
  }
  
  if (verification.match_type === 'exact') {
    return 'IRS Verified ✓';
  } else {
    return `IRS Verified ✓ (${Math.round(verification.match_score * 100)}% match)`;
  }
}

/**
 * Get verification tooltip text
 */
export function getVerificationTooltip(verification: IRSNonprofit | null): string {
  if (!verification) {
    return '';
  }
  
  return `IRS-registered 501(c)(3) nonprofit\nEIN: ${verification.ein}\nOfficial Name: ${verification.name}\nCity: ${verification.city}, ${verification.state}`;
}

