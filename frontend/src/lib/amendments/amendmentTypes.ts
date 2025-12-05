/**
 * Amendment Vault - Canonical Type Definitions
 * 
 * This module defines the canonical schema for Member Request amendments
 * parsed from HB1600 and SB800 Member Request PDFs.
 * 
 * Purpose: Enable aggregation of legislator amendment focus by spending category
 * for the Spotlight Map legislator pie chart.
 */

import type { SpendingCategoryId } from 'src/data/spendingCategories';

// ----------------------------------------------------------------------

/**
 * Amendment stage/lifecycle phase
 * Currently only "member_request" is supported (pre-committee amendments)
 */
export type AmendmentStage = "member_request";

/**
 * Canonical Amendment Vault Record
 * 
 * Represents a single budget amendment from Member Request PDFs.
 * Designed to support the query: "For legislator X, sum netAmount by spendingCategoryId"
 */
export interface AmendmentVaultRecord {
  // ===== Identity =====
  /** Stable unique ID (e.g., "HB1600-2025-member-135-001") */
  id: string;
  
  /** Amendment lifecycle stage */
  stage: AmendmentStage;
  
  /** Bill number (HB1600 or SB800) */
  billNumber: "HB1600" | "SB800";
  
  /** Legislative session year (e.g., 2025) */
  sessionYear: number;
  
  /** Chamber (House or Senate) */
  chamber: "House" | "Senate";

  // ===== Legislator Attribution =====
  /** Patron name as it appears in the PDF (e.g., "H. Otto Wachsmann, Jr.") */
  patronName: string;
  
  /** LIS Member ID if available (for cross-referencing) */
  patronLISId?: string;
  
  /** Internal legislator ID used by Spotlight Map dataset */
  legislatorId?: string;
  
  /** District code (e.g., "HD075" for House District 75) */
  districtCode?: string;

  // ===== Budget Item Details =====
  /** LIS item number (e.g., "135") */
  itemNumber: string;
  
  /** Sub-item identifier if present */
  subItem?: string;
  
  /** DPB/LIS agency code if available */
  agencyCode?: string;
  
  /** Human-readable agency name */
  agencyName?: string;

  // ===== Spending Category Mapping =====
  /** 
   * Secretariat or functional area code (optional intermediate mapping key)
   * e.g., "education", "health", "transportation"
   */
  secretariatCode?: string;
  
  /** 
   * REQUIRED: Canonical spending category ID
   * This is the key field for pie chart aggregation
   */
  spendingCategoryId: SpendingCategoryId;

  // ===== Dollar Amounts =====
  /** Fiscal year if per-year amounts are specified; null if biennial only */
  fiscalYear: number | null;
  
  /** Change in General Fund dollars */
  deltaGF: number;
  
  /** Change in Non-General Fund dollars */
  deltaNGF: number;
  
  /** 
   * Primary metric for charts
   * Rule: GF + NGF (total impact)
   * This is what gets summed for the pie chart
   */
  netAmount: number;

  // ===== Metadata Flags =====
  /** True if netAmount > 0 (increase), false if netAmount < 0 (decrease) */
  isIncrease: boolean;
  
  /** True if amendment has no numeric change (language-only modification) */
  isLanguageOnly: boolean;

  // ===== Descriptions =====
  /** Short summary if available */
  descriptionShort: string;

  /** Full LIS text / explanation if parsed */
  descriptionFull: string;

  // ===== Funding Recipient Extraction =====
  /**
   * Intended funding recipient extracted from the amendment explanation text.
   * Example: "City of Norfolk", "Virginia Tech", "Foodbank of Southeastern Virginia and the Eastern Shore".
   */
  primaryRecipientName?: string | null;

  /**
   * Raw text snippet from which the recipient was extracted (for debugging/auditing).
   */
  recipientRawText?: string | null;

  /**
   * Confidence score (0–1) that primaryRecipientName is a valid funding recipient.
   * If omitted, treat as unknown/medium confidence.
   */
  recipientConfidence?: number | null;

  // ===== Source Tracking =====
  /** Path to source PDF (repo-relative or absolute) */
  sourcePdfPath: string;
  
  /** Page number in PDF (1-based) */
  sourcePage?: number;
  
  /** Optional snippet from the line for debugging */
  sourceLineHint?: string;

  // ===== Timestamps =====
  /** ISO timestamp when record was generated */
  createdAt?: string;
  
  /** ISO timestamp for last update */
  updatedAt?: string;
}

