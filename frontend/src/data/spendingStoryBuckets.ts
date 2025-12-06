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
  | 'debt_reserves';

// ----------------------------------------------------------------------
// Story Bucket Labels
// ----------------------------------------------------------------------

/**
 * Display labels for story buckets
 */
export const STORY_BUCKET_LABELS: Record<StoryBucketId, string> = {
  schools_kids: 'Schools & Kids',
  health_care: 'Health & Care',
  safety_justice: 'Safety & Justice',
  roads_transit: 'Roads & Transit',
  jobs_business_innovation: 'Jobs, Business & Innovation',
  parks_environment_energy: 'Parks, Environment & Energy',
  veterans_military: 'Veterans & Military Families',
  government_overhead: 'Government & Overhead',
  debt_reserves: 'Debt & Reserves',
};

/**
 * Short labels for story buckets (for compact displays)
 */
export const STORY_BUCKET_SHORT_LABELS: Record<StoryBucketId, string> = {
  schools_kids: 'Schools & Kids',
  health_care: 'Health & Care',
  safety_justice: 'Safety & Justice',
  roads_transit: 'Roads & Transit',
  jobs_business_innovation: 'Jobs & Business',
  parks_environment_energy: 'Parks & Environment',
  veterans_military: 'Veterans',
  government_overhead: 'Government',
  debt_reserves: 'Debt & Reserves',
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
  debt_reserves: '#FF7043',             // Deep orange (finance)
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
  // Education → Schools & Kids
  k12_education: 'schools_kids',
  higher_education: 'schools_kids',

  // Health → Health & Care
  health_and_human_resources: 'health_care',

  // Public Safety + Judicial → Safety & Justice
  public_safety_and_homeland_security: 'safety_justice',
  judicial: 'safety_justice',

  // Transportation → Roads & Transit
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
  unclassified: 'government_overhead',  // Default fallback

  // Finance + Central Appropriations → Government & Overhead (for now)
  // TODO: In the future, we could split out actual debt service and reserves
  // into the 'debt_reserves' bucket with more granular parsing
  finance: 'government_overhead',
  central_appropriations: 'government_overhead',
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

