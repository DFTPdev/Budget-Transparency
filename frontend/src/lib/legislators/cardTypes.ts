/**
 * Legislator Card Data Types
 * 
 * TypeScript interfaces for LIS-derived legislator card data.
 * These types define the shape of data scraped from LIS Member Request pages
 * and used to display legislator amendment information in the Spotlight Map.
 */

export type Chamber = "House" | "Senate";
export type Party = "D" | "R" | "I" | "Other";

/**
 * Amendment stage/lifecycle phase
 * 
 * - MR: Member Request (pre-committee)
 * - CA: Committee Amendment
 * - FR: Floor Request
 * - FA: Floor Amendment
 * - CR: Conference Report
 * - GR: Governor's Recommendation
 * - GV: Governor's Veto
 * - KR: Kicker (post-session)
 */
export type AmendmentStage = "MR" | "CA" | "FR" | "FA" | "CR" | "GR" | "GV" | "KR";

/**
 * Individual amendment summary
 * Represents a single amendment row from LIS
 */
export interface AmendmentSummary {
  /** Bill code (e.g., "HB30", "HB1600") */
  bill: "HB30" | "HB1600" | string;

  /** Amendment stage */
  stage: AmendmentStage;

  /** Item number/code (e.g., "125 #10h") */
  item: string;

  /** Short title/purpose from LIS */
  title: string;

  /** Deep link to LIS amendment detail page */
  lisUrl: string;

  /** First-year dollar amount (e.g., FY24 or FY25) */
  fyFirst: number | null;

  /** Second-year dollar amount (e.g., FY25 or FY26) */
  fySecond: number | null;

  /** Whether this is an increase, decrease, or language-only */
  amountType: "increase" | "decrease" | "language-only";

  /** Spending category ID (mapped from title/description) */
  spendingCategoryId?: string;

  /** Optional tags for categorization */
  tags?: string[];
}

/**
 * Aggregated totals for a set of amendments
 */
export interface AmendmentTotals {
  /** Total number of amendments */
  count: number;
  
  /** Number of language-only amendments */
  languageOnlyCount: number;
  
  /** Sum of first-year amounts (signed) */
  fyFirstTotal: number;
  
  /** Sum of second-year amounts (signed) */
  fySecondTotal: number;
  
  /** Largest amendment by absolute dollar value */
  largestAmendment?: {
    item: string;
    title: string;
    amount: number; // max(|fyFirst|, |fySecond|)
    lisUrl: string;
  };
}

/**
 * Complete legislator card data
 * This is the top-level structure for a legislator's LIS-derived data
 */
export interface LegislatorCardData {
  /** LIS member code (e.g., "H336") */
  id: string;
  
  /** Full name with title (e.g., "Del. Nadarius Clark") */
  fullName: string;
  
  /** Last name only */
  lastName: string;
  
  /** Chamber */
  chamber: Chamber;
  
  /** District number */
  district?: string;
  
  /** Party affiliation */
  party?: Party;
  
  /** Locality/region */
  locality?: string;
  
  /** Photo URL */
  photoUrl?: string;
  
  /** LIS profile/member-requests page URL */
  profileUrl?: string;
  
  /** Committee assignments */
  committees?: string[];
  
  /**
   * Amendments organized by bill and stage
   * 
   * Example:
   * {
   *   "HB1600": {
   *     "MR": {
   *       totals: { count: 11, ... },
   *       items: [ ... ],
   *       featured: [ ... ]
   *     }
   *   }
   * }
   */
  amendments: {
    [billCode: string]: {
      [stage in AmendmentStage]?: {
        totals: AmendmentTotals;
        items: AmendmentSummary[];
        featured?: AmendmentSummary[];
      }
    }
  };
  
  /** Display metadata for UI */
  display: {
    /** Headline summary (e.g., "11 member requests • $135.4M second-year") */
    headline?: string;
    
    /** Subheadline (e.g., "Education, Housing, Public Safety") */
    subhead?: string;
    
    /** Badge labels */
    badges?: string[];
  };
  
  /** ISO timestamp when data was scraped */
  updatedAt: string;
}

