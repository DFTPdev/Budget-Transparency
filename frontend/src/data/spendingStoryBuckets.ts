/**
 * Story Buckets for Legislator Spending Focus
 * 
 * This module provides a human-friendly narrative layer on top of the technical
 * SpendingCategoryId system. Story buckets group the 17 technical categories into
 * 9 narrative buckets that are easier for citizens to understand.
 * 
 * IMPORTANT: This is a presentation-layer aggregation only. The underlying
 * SpendingCategoryId system and scraper logic remain unchanged.
 */

import type { SpendingCategoryId } from './spendingCategories';

// ----------------------------------------------------------------------
// Story Bucket Types
// ----------------------------------------------------------------------

/**
 * Human-friendly story bucket IDs for grouping spending categories
 */
export type StoryBucketId =
  | 'schools_kids'
  | 'health_care'
  | 'safety_justice'
  | 'roads_transit'
  | 'jobs_business_innovation'
  | 'parks_environment_energy'
  | 'veterans_military'
  | 'government_overhead'
  | 'unclassified';

// ----------------------------------------------------------------------
// Story Bucket Labels
// ----------------------------------------------------------------------

/**
 * Display labels for story buckets
 */
export const STORY_BUCKET_LABELS: Record<StoryBucketId, string> = {
  schools_kids: 'Education',
  health_care: 'Healthcare',
  safety_justice: 'Law Enforcement',
  roads_transit: 'Transportation',
  jobs_business_innovation: 'Jobs, Business & Innovation',
  parks_environment_energy: 'Parks, Environment & Energy',
  veterans_military: 'Veterans & Military Families',
  government_overhead: 'Government & Overhead',
  unclassified: 'Unclassified',
};

/**
 * Short labels for story buckets (for compact displays)
 */
export const STORY_BUCKET_SHORT_LABELS: Record<StoryBucketId, string> = {
  schools_kids: 'Education',
  health_care: 'Healthcare',
  safety_justice: 'Law Enforcement',
  roads_transit: 'Transportation',
  jobs_business_innovation: 'Jobs & Business',
  parks_environment_energy: 'Parks & Environment',
  veterans_military: 'Veterans',
  government_overhead: 'Government',
  unclassified: 'Unclassified',
};

// ----------------------------------------------------------------------
// Story Bucket Colors
// ----------------------------------------------------------------------

/**
 * Color palette for story buckets
 * Adapted from existing category colors for visual consistency
 */
export const STORY_BUCKET_COLORS: Record<StoryBucketId, string> = {
  schools_kids: '#4CAF50',              // Green (education)
  health_care: '#EF5350',               // Red (health)
  safety_justice: '#AB47BC',            // Purple (public safety)
  roads_transit: '#42A5F5',             // Blue (transportation)
  jobs_business_innovation: '#FFB300',  // Amber (commerce)
  parks_environment_energy: '#26C6DA',  // Cyan (natural resources)
  veterans_military: '#EC407A',         // Pink (veterans)
  government_overhead: '#78909C',       // Blue-gray (administration)
  unclassified: '#9E9E9E',              // Gray (unclassified)
};

// ----------------------------------------------------------------------
// Mapping: Technical Categories → Story Buckets
// ----------------------------------------------------------------------

/**
 * Maps each technical SpendingCategoryId to a human-friendly StoryBucketId
 * 
 * This mapping is the core of the story bucket system. It groups the 17
 * technical categories into 9 narrative buckets.
 */
export const SPENDING_CATEGORY_TO_BUCKET: Record<SpendingCategoryId, StoryBucketId> = {
  // Education → Education
  k12_education: 'schools_kids',
  higher_education: 'schools_kids',

  // Health → Healthcare
  health_and_human_resources: 'health_care',

  // Public Safety + Judicial → Law Enforcement
  public_safety_and_homeland_security: 'safety_justice',
  judicial: 'safety_justice',

  // Transportation → Transportation
  transportation: 'roads_transit',

  // Commerce + Agriculture → Jobs, Business & Innovation
  commerce_and_trade: 'jobs_business_innovation',
  agriculture_and_forestry: 'jobs_business_innovation',

  // Natural Resources → Parks, Environment & Energy
  natural_resources: 'parks_environment_energy',

  // Veterans → Veterans & Military Families
  veterans_and_defense_affairs: 'veterans_military',

  // Administration + Legislative + Independent Agencies + Capital Outlay → Government & Overhead
  administration: 'government_overhead',
  legislative: 'government_overhead',
  independent_agencies: 'government_overhead',
  capital_outlay: 'government_overhead',

  // Finance + Central Appropriations → Government & Overhead
  finance: 'government_overhead',
  central_appropriations: 'government_overhead',

  // Unclassified → Unclassified (amendments that couldn't be auto-categorized)
  unclassified: 'unclassified',
};

// ----------------------------------------------------------------------
// Helper Functions
// ----------------------------------------------------------------------

/**
 * Get the story bucket ID for a given spending category
 */
export function getStoryBucketForCategory(categoryId: SpendingCategoryId): StoryBucketId {
  return SPENDING_CATEGORY_TO_BUCKET[categoryId];
}

/**
 * Get the display label for a story bucket
 */
export function getStoryBucketLabel(bucketId: StoryBucketId, short: boolean = false): string {
  return short ? STORY_BUCKET_SHORT_LABELS[bucketId] : STORY_BUCKET_LABELS[bucketId];
}

