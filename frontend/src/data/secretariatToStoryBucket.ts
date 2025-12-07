/**
 * Secretariat to Story Bucket Mapping
 * 
 * Maps Virginia's 11 Secretariats (official government organizational structure)
 * to the 9 Story Buckets (human-friendly narrative categories).
 * 
 * This enables the Budget Decoder to use the same citizen-friendly categorization
 * as the Legislator Cards, creating visual and conceptual consistency across the site.
 */

import type { StoryBucketId } from './spendingStoryBuckets';

// ----------------------------------------------------------------------
// Secretariat to Story Bucket Mapping
// ----------------------------------------------------------------------

/**
 * Maps Virginia Secretariat names to Story Bucket IDs
 * 
 * Virginia has 11 Secretariats that organize state government:
 * - Administration
 * - Agriculture and Forestry
 * - Commerce and Trade
 * - Education
 * - Finance
 * - Health and Human Resources
 * - Natural and Historic Resources
 * - Public Safety and Homeland Security
 * - Technology
 * - Transportation
 * - Veterans and Defense Affairs
 */
export const SECRETARIAT_TO_STORY_BUCKET: Record<string, StoryBucketId> = {
  // Education → Schools & Kids
  'EDUCATION': 'schools_kids',

  // Health and Human Resources → Health & Care
  'HEALTH AND HUMAN RESOURCES': 'health_care',

  // Public Safety → Safety & Justice
  'PUBLIC SAFETY AND HOMELAND SECURITY': 'safety_justice',
  'PUBLIC SAFETY': 'safety_justice', // Alternative name

  // Transportation → Roads & Transit
  'TRANSPORTATION': 'roads_transit',

  // Commerce, Trade, Agriculture, Labor → Jobs, Business & Innovation
  'COMMERCE AND TRADE': 'jobs_business_innovation',
  'AGRICULTURE AND FORESTRY': 'jobs_business_innovation',
  'LABOR': 'jobs_business_innovation',

  // Natural Resources → Parks, Environment & Energy
  'NATURAL AND HISTORIC RESOURCES': 'parks_environment_energy',
  'NATURAL RESOURCES': 'parks_environment_energy', // Alternative name

  // Veterans → Veterans & Military Families
  'VETERANS AND DEFENSE AFFAIRS': 'veterans_military',

  // Administration, Finance, Technology, Executive Offices → Government & Overhead
  'ADMINISTRATION': 'government_overhead',
  'FINANCE': 'government_overhead',
  'TECHNOLOGY': 'government_overhead',
  'EXECUTIVE OFFICES': 'government_overhead',

  // Judicial → Safety & Justice
  'JUDICIAL': 'safety_justice',

  // Legislative → Government & Overhead
  'LEGISLATIVE': 'government_overhead',

  // Independent Agencies → Unclassified (diverse agencies)
  'INDEPENDENT AGENCIES': 'unclassified',

  // Fallback for unknown secretariats
  'OTHER': 'unclassified',
  '': 'unclassified',
};

// ----------------------------------------------------------------------
// Helper Functions
// ----------------------------------------------------------------------

/**
 * Map a secretariat name to a story bucket ID
 * 
 * @param secretariat - Secretariat name from Budget Decoder data
 * @returns Story bucket ID for categorization
 */
export function mapSecretariatToStoryBucket(secretariat: string): StoryBucketId {
  // Normalize secretariat name (uppercase, trim whitespace)
  const normalized = (secretariat || '').toUpperCase().trim();
  
  // Look up in mapping
  const bucket = SECRETARIAT_TO_STORY_BUCKET[normalized];
  
  // Return mapped bucket or fallback to unclassified
  return bucket || 'unclassified';
}

/**
 * Get all unique story buckets that secretariats map to
 * Useful for generating filter options
 */
export function getSecretariatStoryBuckets(): StoryBucketId[] {
  const buckets = new Set(Object.values(SECRETARIAT_TO_STORY_BUCKET));
  return Array.from(buckets);
}

/**
 * Get the original secretariat name for a given story bucket
 * Returns all secretariats that map to this bucket
 */
export function getSecretariatsForStoryBucket(bucketId: StoryBucketId): string[] {
  return Object.entries(SECRETARIAT_TO_STORY_BUCKET)
    .filter(([_, bucket]) => bucket === bucketId)
    .map(([secretariat, _]) => secretariat);
}

