# Changelog

## Version 1.0.0 (2024-11-22)

### Initial Release

Extracted Budget Timeline feature from DFTP Hub project as a standalone, reusable package.

### Included Components

- **BudgetTimelinePage.tsx**: Main page component with tabs for Timeline and Key Visuals
- **TimelineAxis.tsx**: Visual timeline axis showing budget process stages over time
- **StageChips.tsx**: Interactive chips for selecting budget stages
- **MilestoneList.tsx**: Displays milestones for the selected stage
- **WatchNextCard.tsx**: Card showing upcoming events to monitor
- **SourcesFooter.tsx**: Footer with data sources and last updated timestamp

### Included Hooks

- **useTimeline.ts**: React hook for loading and managing timeline data
  - `useTimeline()`: Main hook with caching
  - `getCurrentStage()`: Utility to get current/next stage based on today's date
  - `getMilestonesByStage()`: Utility to filter milestones by stage

### Included Data

- **budgetTimeline.2024_2026.json**: Complete timeline data for FY 2024-2026 biennium
  - Biennium period definition
  - 7 budget process stages with date windows
  - Milestones for each stage
  - "Watch Next" items
  - Data sources and last refreshed date

### TypeScript Types

All types exported from `hooks/useTimeline.ts`:
- `Biennium`: Budget biennium period
- `Stage`: Budget process stage with date window
- `Milestone`: Key milestone/event
- `WatchNext`: Upcoming item to monitor
- `Source`: Data source reference
- `TimelineData`: Complete timeline data structure

### Features

- ✅ Fully typed with TypeScript
- ✅ Responsive design (mobile, tablet, desktop)
- ✅ Material-UI components
- ✅ Data caching (1 hour TTL)
- ✅ Error handling
- ✅ Loading states
- ✅ Interactive stage selection
- ✅ Date-based current stage detection
- ✅ Sorted milestones by date

### Dependencies

- React 18+
- Material-UI (@mui/material) 5.x, 6.x, or 7.x
- Material-UI Lab (@mui/lab) 5.x, 6.x, or 7.x
- Emotion (for MUI styling)

### Documentation

- **README.md**: Complete integration guide
- **QUICKSTART.md**: 5-minute quick start guide
- **package.json**: Dependency specifications
- **index.ts**: Convenient exports for all components and types

### Known Limitations

- The main page component includes a "Key Visuals" tab that requires additional hooks (`useSnapshots`) not included in this package. See QUICKSTART.md for instructions to remove this tab.
- Data path is hardcoded to `/data/official/budgetTimeline.2024_2026.json` - can be customized in `hooks/useTimeline.ts`

### Migration Notes

When integrating into a new project:
1. Update import paths in `BudgetTimelinePage.tsx`
2. Place data file in public directory or update fetch path
3. Optionally remove "Key Visuals" tab if not needed
4. Ensure MUI theme provider wraps the component

### Source

Extracted from: DFTP Hub project
Original location: `budget-decoder-dpb/src/pages/overview/`
Extraction date: November 22, 2024

