/**
 * Amendment Vault - Aggregation Logic
 *
 * This module provides functions to aggregate amendment data for the
 * Spotlight Map legislator pie chart.
 *
 * Core query: "For legislator X, sum netAmount by spendingCategoryId"
 */

import type { AmendmentVaultRecord } from './amendmentTypes';

import type { SpendingCategoryId } from 'src/data/spendingCategories';

// ----------------------------------------------------------------------

/**
 * Legislator amendment focus slice
 * This is the data structure consumed by LegislatorFocusPie component
 */
export interface LegislatorAmendmentFocusSlice {
  categoryId: SpendingCategoryId;
  totalAmount: number;
}

/**
 * Parameters for filtering amendments when computing legislator focus
 */
export interface LegislatorFocusParams {
  /** Legislative session year (e.g., 2025) - for backward compatibility */
  sessionYear?: number;

  /** Multiple session years (e.g., [2024, 2025]) - for multi-year aggregation */
  sessionYears?: number[];

  /** Internal legislator ID (preferred if available) */
  legislatorId?: string;

  /** Patron name (fallback if legislatorId not available) */
  patronName?: string;

  /** Optional filter by bill number pattern */
  billNumberFilter?: "house" | "senate" | "all" | "both";

  /** Optional filter by chamber */
  chamberFilter?: "House" | "Senate" | "both";

  /**
   * Deduplication mode for handling duplicate amendments
   * - "all"    → use all filtered records (default behavior)
   * - "unique" → collapse records by fingerprint (bill + item + patron + GF/NGF + description)
   */
  dedupeMode?: "all" | "unique";
}

/**
 * Compute legislator amendment focus slices for pie chart
 *
 * This function:
 * 1. Filters amendments by legislator and session(s)
 * 2. Excludes language-only, zero-amount, and negative-amount amendments
 * 3. Optionally deduplicates by fingerprint (if dedupeMode: "unique")
 * 4. Groups by spending category
 * 5. Sums netAmount per category
 *
 * dedupeMode:
 *  - "all"    → use all filtered records (current default behavior)
 *  - "unique" → collapse records by fingerprint (bill + item + patron + GF/NGF + description)
 *
 * @param records - Array of amendment vault records
 * @param params - Filter parameters
 * @returns Array of slices (categoryId + totalAmount) for pie chart
 */
export function computeLegislatorAmendmentFocusSlices(
  records: AmendmentVaultRecord[],
  params: LegislatorFocusParams
): LegislatorAmendmentFocusSlice[] {
  // Step 1: Filter records
  const filtered = records.filter((record) => {
    // Must be member_request stage
    if (record.stage !== "member_request") return false;

    // Match session year(s)
    const { sessionYear, sessionYears } = params;
    const matchesSession =
      Array.isArray(sessionYears) && sessionYears.length > 0
        ? sessionYears.includes(record.sessionYear)
        : typeof sessionYear === "number"
        ? record.sessionYear === sessionYear
        : true; // if neither provided, accept all years

    if (!matchesSession) return false;

    // Match legislator (by ID or name)
    const matchesLegislator = params.legislatorId
      ? record.legislatorId === params.legislatorId
      : params.patronName
      ? normalizePatronName(record.patronName) === normalizePatronName(params.patronName)
      : false;

    if (!matchesLegislator) return false;

    // Apply bill number filter
    const { billNumberFilter } = params;
    const matchesBill =
      billNumberFilter === "house"
        ? record.billNumber?.startsWith("HB")
        : billNumberFilter === "senate"
        ? record.billNumber?.startsWith("SB")
        : true; // "all" / "both" / undefined -> no restriction

    if (!matchesBill) return false;

    // Apply chamber filter
    if (params.chamberFilter && params.chamberFilter !== "both") {
      if (record.chamber !== params.chamberFilter) return false;
    }

    // Exclude language-only amendments (no dollar impact)
    if (record.isLanguageOnly) return false;

    // Exclude zero-amount amendments
    if (record.netAmount === 0) return false;

    // Exclude negative amounts (cuts) - only show increases for pie chart
    if (record.netAmount < 0) return false;

    return true;
  });

  // Step 2: Apply deduplication if requested
  const recordsForAggregation = params.dedupeMode === "unique"
    ? dedupeByFingerprint(filtered)
    : filtered;

  // Step 3: Group by spending category and sum amounts
  const categoryTotals = new Map<SpendingCategoryId, number>();

  for (const record of recordsForAggregation) {
    const categoryId = record.spendingCategoryId;
    const currentTotal = categoryTotals.get(categoryId) || 0;
    categoryTotals.set(categoryId, currentTotal + record.netAmount);
  }

  // Step 4: Convert to array of slices
  const slices: LegislatorAmendmentFocusSlice[] = [];

  for (const [categoryId, totalAmount] of categoryTotals.entries()) {
    slices.push({ categoryId, totalAmount });
  }

  // Step 5: Sort by totalAmount descending (largest categories first)
  slices.sort((a, b) => Math.abs(b.totalAmount) - Math.abs(a.totalAmount));

  return slices;
}

// ----------------------------------------------------------------------
// Internal Helper Functions
// ----------------------------------------------------------------------

/**
 * Build a stable fingerprint for an amendment record
 *
 * Uses the same strategy as the Python trust-analysis scripts:
 * - billNumber
 * - itemNumber
 * - normalized patronName (lowercased, trimmed, collapsed spaces)
 * - rounded deltaGF
 * - rounded deltaNGF
 * - normalized/truncated description (first 200 chars)
 *
 * @param record - Amendment record to fingerprint
 * @returns Fingerprint string for deduplication
 */
function buildRecordFingerprint(record: AmendmentVaultRecord): string {
  // Normalize text helper
  const normalize = (value: string | null | undefined): string =>
    (value ?? "")
      .toLowerCase()
      .trim()
      .replace(/\s+/g, " ");

  // Use descriptionShort if available, otherwise descriptionFull
  const descSource =
    (record.descriptionShort && record.descriptionShort.length > 0
      ? record.descriptionShort
      : record.descriptionFull) ?? "";

  const normalizedDescription = normalize(descSource).slice(0, 200);
  const normalizedPatron = normalize(record.patronName);
  const bill = record.billNumber ?? "";
  const item = record.itemNumber ?? "";

  const roundedGF = Math.round(record.deltaGF ?? 0);
  const roundedNGF = Math.round(record.deltaNGF ?? 0);

  // Build fingerprint by joining key fields with pipe separator
  return [
    bill,
    item,
    normalizedPatron,
    roundedGF.toString(),
    roundedNGF.toString(),
    normalizedDescription,
  ].join("|");
}

/**
 * Deduplicate records by fingerprint
 *
 * Keeps only the first occurrence of each unique fingerprint.
 * This matches the deduplication strategy used in the trust-analysis scripts.
 *
 * @param records - Array of amendment records to deduplicate
 * @returns Array with duplicates removed (first occurrence kept)
 */
function dedupeByFingerprint(
  records: AmendmentVaultRecord[]
): AmendmentVaultRecord[] {
  const seen = new Map<string, AmendmentVaultRecord>();

  for (const record of records) {
    const fp = buildRecordFingerprint(record);

    if (!seen.has(fp)) {
      // Keep the first occurrence; later duplicates are ignored
      seen.set(fp, record);
    }
  }

  return Array.from(seen.values());
}

/**
 * Normalize patron name for case-insensitive matching
 * Removes extra whitespace, converts to lowercase
 */
function normalizePatronName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

// ----------------------------------------------------------------------
// Top Funding Recipients Aggregation
// ----------------------------------------------------------------------

/**
 * Legislator top funding recipient
 * Represents a single recipient with aggregated amendment data
 */
export interface LegislatorTopRecipient {
  recipientName: string;
  totalAmount: number;
  amendmentCount: number;
  categories: SpendingCategoryId[];
}

/**
 * Parameters for computing top funding recipients
 * Extends LegislatorFocusParams with recipient-specific options
 */
export interface LegislatorTopRecipientsParams extends LegislatorFocusParams {
  /**
   * Minimum confidence required to treat a parsed recipient as valid.
   * Default: 0.9 (tightened for accuracy)
   */
  minRecipientConfidence?: number;
  /**
   * Maximum number of recipients to return. Default: 5.
   */
  limit?: number;
}

/**
 * Compute top funding recipients for a legislator
 *
 * This function:
 * 1. Filters amendments using the same logic as computeLegislatorAmendmentFocusSlices
 * 2. Filters to records with valid primaryRecipientName
 * 3. Applies minimum confidence threshold
 * 4. Groups by normalized recipient name
 * 5. Aggregates total amount, count, and categories
 * 6. Sorts by total amount descending
 * 7. Returns top N recipients
 *
 * @param records - Array of amendment vault records
 * @param params - Filter parameters including minRecipientConfidence and limit
 * @returns Array of top recipients with aggregated data
 */
export function computeLegislatorTopRecipients(
  records: AmendmentVaultRecord[],
  params: LegislatorTopRecipientsParams
): LegislatorTopRecipient[] {
  // Step 1: Filter records using same logic as focus slices
  const filtered = records.filter((record) => {
    // Must be member_request stage
    if (record.stage !== "member_request") return false;

    // Match session year(s)
    const { sessionYear, sessionYears } = params;
    const matchesSession =
      Array.isArray(sessionYears) && sessionYears.length > 0
        ? sessionYears.includes(record.sessionYear)
        : typeof sessionYear === "number"
        ? record.sessionYear === sessionYear
        : true;

    if (!matchesSession) return false;

    // Match legislator (by ID or name)
    const matchesLegislator = params.legislatorId
      ? record.legislatorId === params.legislatorId
      : params.patronName
      ? normalizePatronName(record.patronName) === normalizePatronName(params.patronName)
      : false;

    if (!matchesLegislator) return false;

    // Apply bill number filter
    const { billNumberFilter } = params;
    const matchesBill =
      billNumberFilter === "house"
        ? record.billNumber?.startsWith("HB")
        : billNumberFilter === "senate"
        ? record.billNumber?.startsWith("SB")
        : true;

    if (!matchesBill) return false;

    // Apply chamber filter
    if (params.chamberFilter && params.chamberFilter !== "both") {
      if (record.chamber !== params.chamberFilter) return false;
    }

    // Exclude language-only amendments
    if (record.isLanguageOnly) return false;

    // Exclude zero-amount amendments
    if (record.netAmount === 0) return false;

    // Exclude negative amounts (cuts)
    if (record.netAmount < 0) return false;

    return true;
  });

  // Step 2: Apply deduplication if requested
  const recordsForAggregation = params.dedupeMode === "unique"
    ? dedupeByFingerprint(filtered)
    : filtered;

  // Step 3: Filter to records with valid recipient names
  const minConfidence = params.minRecipientConfidence ?? 0.9; // Tightened default from 0.6 to 0.9

  // Blacklist of obvious junk patterns (same as Python parser)
  const START_BLACKLIST = [
    "this ", "that ", "these ", "those ", "such ",
    "the cost of ", "the cost ", "the provision of "
  ];

  const withRecipients = recordsForAggregation.filter((record) => {
    // Must have a recipient name
    if (!record.primaryRecipientName || record.primaryRecipientName.trim() === "") {
      return false;
    }

    const recipientName = record.primaryRecipientName.trim();

    // Exclude recipients that are too short
    if (recipientName.length < 3) {
      return false;
    }

    // Exclude recipients starting with blacklisted phrases
    const recipientLower = recipientName.toLowerCase();
    if (START_BLACKLIST.some(bl => recipientLower.startsWith(bl))) {
      return false;
    }

    // Must meet minimum confidence threshold
    const confidence = record.recipientConfidence ?? 0;
    if (confidence < minConfidence) {
      return false;
    }

    return true;
  });

  // Step 4: Group by normalized recipient name
  const recipientMap = new Map<string, {
    displayName: string;
    totalAmount: number;
    amendmentCount: number;
    categorySet: Set<SpendingCategoryId>;
  }>();

  for (const record of withRecipients) {
    const recipientName = record.primaryRecipientName!;
    const normalizedKey = recipientName.toLowerCase().trim();

    if (!recipientMap.has(normalizedKey)) {
      recipientMap.set(normalizedKey, {
        displayName: recipientName, // Use first occurrence for display
        totalAmount: 0,
        amendmentCount: 0,
        categorySet: new Set(),
      });
    }

    const entry = recipientMap.get(normalizedKey)!;
    entry.totalAmount += record.netAmount;
    entry.amendmentCount += 1;
    entry.categorySet.add(record.spendingCategoryId);
  }

  // Step 5: Convert to array and sort by total amount descending
  const recipients: LegislatorTopRecipient[] = Array.from(recipientMap.values()).map(
    (entry) => ({
      recipientName: entry.displayName,
      totalAmount: entry.totalAmount,
      amendmentCount: entry.amendmentCount,
      categories: Array.from(entry.categorySet),
    })
  );

  recipients.sort((a, b) => b.totalAmount - a.totalAmount);

  // Step 6: Return top N
  const limit = params.limit ?? 5;
  return recipients.slice(0, limit);
}

// ----------------------------------------------------------------------
// Amendment Summary List (for detailed amendment display)
// ----------------------------------------------------------------------

/**
 * Legislator amendment summary
 * Represents a single amendment for display in the amendment list
 */
export interface LegislatorAmendmentSummary {
  id: string;
  billNumber: string;
  sessionYear: number;
  descriptionShort: string;
  netAmount: number;
  spendingCategoryId: SpendingCategoryId;
  primaryRecipientName?: string | null;
  recipientConfidence?: number | null;
}

/**
 * Parameters for computing amendment summaries
 */
export interface LegislatorAmendmentSummaryParams {
  sessionYear: number;
  patronName?: string;
  legislatorId?: string;
  billNumberFilter?: "all" | "house" | "senate" | "HB-only" | "SB-only";
  dedupeMode?: "all" | "unique";
  minRecipientConfidence?: number; // used only to annotate; not for filtering the list
}

/**
 * Compute legislator amendment summaries for display
 *
 * This function:
 * 1. Filters amendments using the same logic as computeLegislatorAmendmentFocusSlices
 * 2. Excludes language-only, zero-amount, and negative-amount amendments
 * 3. Optionally deduplicates by fingerprint
 * 4. Maps to summary objects for display
 * 5. Sorts by netAmount descending
 *
 * @param records - Array of amendment vault records
 * @param params - Filter parameters
 * @returns Array of amendment summaries sorted by amount
 */
export function computeLegislatorAmendmentSummaries(
  records: AmendmentVaultRecord[],
  params: LegislatorAmendmentSummaryParams
): LegislatorAmendmentSummary[] {
  // Step 1: Filter records using same logic as focus slices
  const filtered = records.filter((record) => {
    // Must be member_request stage
    if (record.stage !== "member_request") return false;

    // Match session year
    if (record.sessionYear !== params.sessionYear) return false;

    // Match legislator (by ID or name)
    const matchesLegislator = params.legislatorId
      ? record.legislatorId === params.legislatorId
      : params.patronName
      ? normalizePatronName(record.patronName) === normalizePatronName(params.patronName)
      : false;

    if (!matchesLegislator) return false;

    // Apply bill number filter
    const { billNumberFilter } = params;
    const matchesBill =
      billNumberFilter === "house" || billNumberFilter === "HB-only"
        ? record.billNumber?.startsWith("HB")
        : billNumberFilter === "senate" || billNumberFilter === "SB-only"
        ? record.billNumber?.startsWith("SB")
        : true; // "all" / undefined -> no restriction

    if (!matchesBill) return false;

    // Exclude language-only amendments (no dollar impact)
    if (record.isLanguageOnly) return false;

    // Exclude zero-amount amendments
    if (record.netAmount === 0) return false;

    // Exclude negative amounts (cuts) - only show increases
    if (record.netAmount < 0) return false;

    return true;
  });

  // Step 2: Apply deduplication if requested
  const recordsForSummary = params.dedupeMode === "unique"
    ? dedupeByFingerprint(filtered)
    : filtered;

  // Step 3: Map to summary objects
  const summaries: LegislatorAmendmentSummary[] = recordsForSummary.map((record) => {
    // Use descriptionShort if available, otherwise descriptionFull, truncated to 200 chars
    const descSource = record.descriptionShort && record.descriptionShort.length > 0
      ? record.descriptionShort
      : record.descriptionFull || "";

    const descriptionShort = descSource.slice(0, 200);

    return {
      id: record.id,
      billNumber: record.billNumber,
      sessionYear: record.sessionYear,
      descriptionShort,
      netAmount: record.netAmount,
      spendingCategoryId: record.spendingCategoryId,
      primaryRecipientName: record.primaryRecipientName,
      recipientConfidence: record.recipientConfidence,
    };
  });

  // Step 4: Sort by netAmount descending (largest first)
  summaries.sort((a, b) => b.netAmount - a.netAmount);

  return summaries;
}

// ----------------------------------------------------------------------

/**
 * Load amendment records from JSON file
 *
 * NOTE: This is a placeholder for future implementation.
 * In production, this would either:
 * - Fetch from an API endpoint
 * - Import from a static JSON file in public/
 * - Load from a database
 *
 * For now, returns empty array (use direct array passing instead)
 */
export async function loadAmendmentRecords(
  sessionYear: number
): Promise<AmendmentVaultRecord[]> {
  // TODO: Implement actual data loading
  // Example: const response = await fetch(`/api/amendments/${sessionYear}`);
  // return response.json();

  console.warn('loadAmendmentRecords not yet implemented - returning empty array');
  return [];
}

