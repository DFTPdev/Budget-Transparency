/**
 * Legislators Library - Public API
 * 
 * Exports types and functions for working with legislator data
 */

// Types
export type {
  Chamber,
  Party,
  AmendmentStage,
  AmendmentSummary,
  AmendmentTotals,
  LegislatorCardData,
} from './cardTypes';

// Data loaders
export {
  getLisMemberRequestsForYear,
  getAllLisMemberRequestsForYear,
  hasLisMemberRequestData,
} from './getLisMemberRequests';

