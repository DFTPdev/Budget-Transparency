/**
 * Amendment Vault - Public API
 *
 * This module exports all amendment-related types and functions
 * for use throughout the application.
 */

// Aggregation logic
export {
  computeLegislatorAmendmentFocusSlices,
  computeLegislatorAmendmentSummaries,
  computeLegislatorTopRecipients,
  loadAmendmentRecords,
} from './aggregation';

export type {
  LegislatorAmendmentFocusSlice,
  LegislatorAmendmentSummary,
  LegislatorAmendmentSummaryParams,
  LegislatorFocusParams,
  LegislatorTopRecipient,
  LegislatorTopRecipientsParams,
} from './aggregation';

// Type definitions
export type {
  AmendmentStage,
  AmendmentVaultRecord,
} from './amendmentTypes';

