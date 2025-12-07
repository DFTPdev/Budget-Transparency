/**
 * Budget Drill-Down Data Structure and Utilities
 * Supports hierarchical navigation: Story Bucket → Secretariat → Agency → Program → Vendor
 */

import type { StoryBucketId } from 'src/data/spendingStoryBuckets';
import type { AgencyBudget, ProgramBudget, VendorRecord, ProgramRollup } from './decoderDataLoader';

// ----------------------------------------------------------------------
// Drill-Down Types
// ----------------------------------------------------------------------

export type DrillDownLevel = 'category' | 'detail';

export type DrillDownPath = {
  level: DrillDownLevel;
  storyBucketId?: StoryBucketId;
};

export type BudgetRow = {
  id: string;
  level: DrillDownLevel;
  type?: 'agency' | 'program'; // For detail level, distinguish between agency and program
  name: string;
  amount: number;
  percentage: number;
  count?: number; // Number of child items (agencies + programs)
  storyBucketId?: StoryBucketId;
  storyBucketLabel?: string; // Human-readable label for the story bucket
  agency?: string; // For program rows, which agency they belong to
  hasChildren: boolean;
  // Additional metadata
  executionRate?: number;
  recipients?: number;
  description?: string;
  rollup?: ProgramRollup; // For program rows, attach rollup data for vendor drill-down
};

// ----------------------------------------------------------------------
// Aggregation Functions
// ----------------------------------------------------------------------

/**
 * Aggregate agencies and programs by story bucket (Level 1: Categories)
 */
export function aggregateByStoryBucket(agencies: AgencyBudget[], programs: ProgramBudget[]): BudgetRow[] {
  const bucketMap = new Map<StoryBucketId, { amount: number; agencyCount: number; programCount: number }>();

  // Count unique agencies per bucket
  const agencySet = new Map<StoryBucketId, Set<string>>();
  agencies.forEach((agency) => {
    const bucketId = agency.story_bucket_id as StoryBucketId;
    if (!bucketMap.has(bucketId)) {
      bucketMap.set(bucketId, { amount: 0, agencyCount: 0, programCount: 0 });
      agencySet.set(bucketId, new Set());
    }
    const bucket = bucketMap.get(bucketId)!;
    bucket.amount += agency.amount;
    agencySet.get(bucketId)!.add(agency.agency);
  });

  // Count programs per bucket
  programs.forEach((program) => {
    const bucketId = program.story_bucket_id as StoryBucketId;
    const bucket = bucketMap.get(bucketId);
    if (bucket) {
      bucket.programCount++;
    }
  });

  // Set agency counts
  agencySet.forEach((agencies, bucketId) => {
    const bucket = bucketMap.get(bucketId)!;
    bucket.agencyCount = agencies.size;
  });

  const totalBudget = Array.from(bucketMap.values()).reduce((sum, b) => sum + b.amount, 0);

  return Array.from(bucketMap.entries()).map(([bucketId, data]) => ({
    id: `bucket-${bucketId}`,
    level: 'category' as DrillDownLevel,
    name: agencies.find((a) => a.story_bucket_id === bucketId)?.story_bucket_label || bucketId,
    amount: data.amount,
    percentage: (data.amount / totalBudget) * 100,
    count: data.agencyCount + data.programCount,
    storyBucketId: bucketId,
    hasChildren: true,
  })).sort((a, b) => b.amount - a.amount);
}

/**
 * Get agencies and programs for a story bucket (Level 2: Details)
 * Returns both agencies and programs in a single flat list
 */
export function getDetailsForCategory(
  agencies: AgencyBudget[],
  programs: ProgramBudget[],
  storyBucketId: StoryBucketId
): BudgetRow[] {
  const rows: BudgetRow[] = [];

  // Filter data for this category
  const filteredAgencies = agencies.filter((a) => a.story_bucket_id === storyBucketId);
  const filteredPrograms = programs.filter((p) => p.story_bucket_id === storyBucketId);

  // Calculate total budget for percentage calculation
  const totalBudget = filteredAgencies.reduce((sum, a) => sum + a.amount, 0);

  // Add agency rows
  filteredAgencies.forEach((agency) => {
    rows.push({
      id: `agency-${storyBucketId}-${agency.agency}`,
      level: 'detail' as DrillDownLevel,
      type: 'agency',
      name: agency.agency,
      amount: agency.amount,
      percentage: (agency.amount / totalBudget) * 100,
      storyBucketId,
      hasChildren: false,
    });
  });

  // Add program rows (grouped under their agencies)
  filteredPrograms.forEach((program) => {
    rows.push({
      id: `program-${storyBucketId}-${program.agency}-${program.program}`,
      level: 'detail' as DrillDownLevel,
      type: 'program',
      name: program.program,
      amount: program.amount,
      percentage: (program.amount / totalBudget) * 100,
      storyBucketId,
      agency: program.agency, // Track which agency this program belongs to
      hasChildren: false,
    });
  });

  // Sort by amount descending
  return rows.sort((a, b) => b.amount - a.amount);
}

