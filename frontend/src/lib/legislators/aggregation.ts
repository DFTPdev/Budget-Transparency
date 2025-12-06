/**
 * LIS Data Aggregation Functions
 *
 * Compute spending focus slices and other aggregations from LIS Member Request data.
 */

import type { LegislatorCardData, AmendmentSummary } from './cardTypes';
import type { SpendingCategoryId } from 'src/data/spendingCategories';
import type { StoryBucketId } from 'src/data/spendingStoryBuckets';
import { getStoryBucketForCategory } from 'src/data/spendingStoryBuckets';

export interface LegislatorFocusSlice {
  categoryId: SpendingCategoryId;
  totalAmount: number;
}

/**
 * Story bucket slice for human-friendly spending focus display
 */
export interface StoryBucketSlice {
  bucketId: StoryBucketId;
  totalAmount: number;
}

/**
 * Compute legislator spending focus slices from LIS data for pie chart
 * 
 * This function:
 * 1. Extracts all amendments for the specified year
 * 2. Excludes language-only and zero-amount amendments
 * 3. Groups by spending category
 * 4. Sums fySecond (second-year amount) per category
 * 
 * @param lisData - Legislator card data from LIS
 * @param year - Session year (2024 or 2025)
 * @returns Array of slices (categoryId + totalAmount) for pie chart
 */
export function computeLisSpendingFocusSlices(
  lisData: LegislatorCardData | null,
  year: 2024 | 2025
): LegislatorFocusSlice[] {
  if (!lisData) {
    return [];
  }

  // Get the appropriate bill code for the year
  const billCode = year === 2024 ? 'HB30' : 'HB1600';
  const mrData = lisData.amendments[billCode]?.MR;

  if (!mrData || !mrData.items || mrData.items.length === 0) {
    return [];
  }

  // Group by category and sum amounts
  const categoryTotals = new Map<string, number>();

  for (const item of mrData.items) {
    // Skip language-only amendments (no dollar impact)
    if (item.amountType === 'language-only') {
      continue;
    }

    // Skip if no second-year amount
    if (item.fySecond === null || item.fySecond === 0) {
      continue;
    }

    // Skip if no category (shouldn't happen, but be safe)
    if (!item.spendingCategoryId) {
      continue;
    }

    const categoryId = item.spendingCategoryId;
    const currentTotal = categoryTotals.get(categoryId) || 0;
    categoryTotals.set(categoryId, currentTotal + item.fySecond);
  }

  // Convert to array and sort by absolute amount (descending)
  const slices: LegislatorFocusSlice[] = Array.from(categoryTotals.entries())
    .map(([categoryId, totalAmount]) => ({
      categoryId: categoryId as SpendingCategoryId,
      totalAmount,
    }))
    .sort((a, b) => Math.abs(b.totalAmount) - Math.abs(a.totalAmount));

  return slices;
}

/**
 * Compute legislator spending focus slices grouped by STORY BUCKETS
 *
 * This function groups amendments by human-friendly story buckets instead of
 * technical spending categories. It:
 * 1. Extracts all amendments for the specified year
 * 2. Excludes language-only and zero-amount amendments
 * 3. Maps each amendment's category to a story bucket
 * 4. Groups by story bucket
 * 5. Sums fySecond (second-year amount) per bucket
 *
 * @param lisData - Legislator card data from LIS
 * @param year - Session year (2024 or 2025)
 * @returns Array of slices (bucketId + totalAmount) for pie chart
 */
export function computeLisStoryBucketSlices(
  lisData: LegislatorCardData | null,
  year: 2024 | 2025
): StoryBucketSlice[] {
  if (!lisData) {
    return [];
  }

  // Get the appropriate bill code for the year
  const billCode = year === 2024 ? 'HB30' : 'HB1600';
  const mrData = lisData.amendments[billCode]?.MR;

  if (!mrData || !mrData.items || mrData.items.length === 0) {
    return [];
  }

  // Group by story bucket and sum amounts
  const bucketTotals = new Map<StoryBucketId, number>();

  for (const item of mrData.items) {
    // Skip language-only amendments (no dollar impact)
    if (item.amountType === 'language-only') {
      continue;
    }

    // Skip if no second-year amount
    if (item.fySecond === null || item.fySecond === 0) {
      continue;
    }

    // Map category to story bucket
    // If no category, default to 'unclassified'
    const categoryId = (item.spendingCategoryId as SpendingCategoryId) || 'unclassified';
    const bucketId = getStoryBucketForCategory(categoryId);
    const currentTotal = bucketTotals.get(bucketId) || 0;
    bucketTotals.set(bucketId, currentTotal + item.fySecond);
  }

  // Convert to array and sort by absolute amount (descending)
  const slices: StoryBucketSlice[] = Array.from(bucketTotals.entries())
    .map(([bucketId, totalAmount]) => ({
      bucketId,
      totalAmount,
    }))
    .sort((a, b) => Math.abs(b.totalAmount) - Math.abs(a.totalAmount));

  return slices;
}

/**
 * Compute total requested amount from LIS data
 *
 * @param lisData - Legislator card data from LIS
 * @param year - Session year (2024 or 2025)
 * @returns Total second-year amount (excluding language-only)
 */
export function computeLisTotalRequested(
  lisData: LegislatorCardData | null,
  year: 2024 | 2025
): number {
  const slices = computeLisSpendingFocusSlices(lisData, year);
  return slices.reduce((sum, slice) => sum + slice.totalAmount, 0);
}

