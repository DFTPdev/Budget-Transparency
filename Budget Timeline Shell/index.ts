/**
 * Budget Timeline Shell - Main Export File
 * 
 * This file provides convenient exports for all components, hooks, and types
 * in the Budget Timeline package.
 */

// Main Page Component
export { default as BudgetTimelinePage } from './BudgetTimelinePage';

// Timeline Components
export { TimelineAxis } from './components/TimelineAxis';
export { StageChips } from './components/StageChips';
export { MilestoneList } from './components/MilestoneList';
export { WatchNextCard } from './components/WatchNextCard';
export { SourcesFooter } from './components/SourcesFooter';

// Hooks
export { useTimeline, getCurrentStage, getMilestonesByStage } from './hooks/useTimeline';

// Types (re-exported from hooks)
export type {
  Biennium,
  Stage,
  Milestone,
  WatchNext,
  Source,
  TimelineData,
} from './hooks/useTimeline';

