# Budget Timeline Shell

A standalone, reusable Budget Timeline component package for visualizing Virginia's budget process timeline with interactive stages, milestones, and key dates.

## 📦 Package Contents

```
Budget Timeline Shell/
├── BudgetTimelinePage.tsx          # Main page component
├── components/                      # UI components
│   ├── TimelineAxis.tsx            # Visual timeline axis with stages
│   ├── StageChips.tsx              # Interactive stage selector chips
│   ├── MilestoneList.tsx           # List of milestones for selected stage
│   ├── WatchNextCard.tsx           # "What to watch next" card
│   └── SourcesFooter.tsx           # Data sources and last updated info
├── hooks/                           # React hooks
│   └── useTimeline.ts              # Hook for loading and managing timeline data
├── data/                            # Data files
│   └── budgetTimeline.2024_2026.json  # Timeline data (biennium, stages, milestones)
├── types/                           # TypeScript types (empty - types are in hooks)
└── README.md                        # This file
```

## 🎯 Features

- **Interactive Timeline Axis**: Visual representation of budget process stages over time
- **Stage Selection**: Click chips to view milestones for specific stages
- **Milestones**: Key dates and events for each stage with explanations
- **Watch Next**: Upcoming events to monitor
- **Data Sources**: Transparent sourcing with last updated timestamp
- **Responsive Design**: Works on mobile, tablet, and desktop
- **TypeScript**: Fully typed for type safety

## 📋 Dependencies

### Required Packages

```json
{
  "@mui/material": "^5.x or ^6.x or ^7.x",
  "@mui/lab": "^5.x or ^6.x or ^7.x",
  "react": "^18.x",
  "react-dom": "^18.x"
}
```

### Peer Dependencies

The components use Material-UI (MUI) components. Make sure your project has:
- `@mui/material` installed
- `@mui/lab` installed (for Timeline components if needed elsewhere)
- A MUI theme provider wrapping your app

## 🚀 Integration Steps

### 1. Install Dependencies

```bash
npm install @mui/material @mui/lab @emotion/react @emotion/styled
# or
yarn add @mui/material @mui/lab @emotion/react @emotion/styled
# or
pnpm add @mui/material @mui/lab @emotion/react @emotion/styled
```

### 2. Copy Files to Your Project

Copy the entire `Budget Timeline Shell` folder into your project:

```bash
cp -r "Budget Timeline Shell" /path/to/your/project/src/features/budget-timeline
```

### 3. Place Data File in Public Directory

The `useTimeline` hook fetches data from `/data/official/budgetTimeline.2024_2026.json`.

**Option A**: Place the data file in your public directory:
```bash
mkdir -p /path/to/your/project/public/data/official
cp "Budget Timeline Shell/data/budgetTimeline.2024_2026.json" /path/to/your/project/public/data/official/
```

**Option B**: Update the data path in `hooks/useTimeline.ts` (line 75):
```typescript
const response = await fetch('/your/custom/path/budgetTimeline.2024_2026.json');
```

### 4. Update Import Paths

The components use relative imports. You may need to update import paths based on your project structure.

**In `BudgetTimelinePage.tsx`**, update these imports:
```typescript
// Change from:
import { useSnapshots } from 'src/lib/hooks/useSnapshots';
import { useTimeline, getCurrentStage, getMilestonesByStage } from 'src/lib/hooks/useTimeline';
import { StageChips } from 'src/components/overview/StageChips';
// ... etc

// To:
import { useTimeline, getCurrentStage, getMilestonesByStage } from './hooks/useTimeline';
import { StageChips } from './components/StageChips';
import { TimelineAxis } from './components/TimelineAxis';
import { MilestoneList } from './components/MilestoneList';
import { WatchNextCard } from './components/WatchNextCard';
import { SourcesFooter } from './components/SourcesFooter';
```

**Note**: The page also uses `useSnapshots` hook for the "Key Visuals" tab. If you don't need that tab, you can remove it (see Customization section below).

### 5. Use the Component

```typescript
import BudgetTimelinePage from './features/budget-timeline/BudgetTimelinePage';

function App() {
  return (
    <BudgetTimelinePage />
  );
}
```

## 🎨 Customization

### Remove "Key Visuals" Tab (Simplified Version)

If you only want the Timeline tab without the charts, edit `BudgetTimelinePage.tsx`:

1. Remove the `useSnapshots` import and hook call
2. Remove the "Key Visuals" tab from the Tabs component
3. Remove the second TabPanel (index 1)
4. Remove chart imports (OperatingStackedGFNGF, TopAgenciesBar, RequestsVsEnactedBars)

### Update Data Source

To use your own timeline data, update `data/budgetTimeline.2024_2026.json` following this structure:

```json
{
  "biennium": {
    "start": "2024-07-01",
    "end": "2026-06-30",
    "label": "2024-2026"
  },
  "stages": [
    {
      "id": "stage-1",
      "label": "Stage Name",
      "window": { "start": "2024-07-01", "end": "2024-12-15" },
      "keyDate": "2024-12-15",
      "explainer": "Description of this stage"
    }
  ],
  "milestones": [
    {
      "date": "2024-08-15",
      "stageId": "stage-1",
      "title": "Milestone Title",
      "why": "Why this milestone matters"
    }
  ],
  "watchNext": [
    {
      "title": "What to watch",
      "why": "Why it matters"
    }
  ],
  "sources": [
    {
      "label": "Source Name",
      "url": "https://example.com"
    }
  ],
  "lastRefreshed": "2024-11-22"
}
```

## 📝 TypeScript Types

All types are defined in `hooks/useTimeline.ts`:
- `Biennium`: Budget biennium period
- `Stage`: Budget process stage
- `Milestone`: Key milestone/event
- `WatchNext`: Upcoming item to monitor
- `Source`: Data source reference
- `TimelineData`: Complete timeline data structure

## 🔧 Troubleshooting

### Data Not Loading
- Check that the data file is in the correct public directory path
- Check browser console for fetch errors
- Verify the data file is valid JSON

### Styling Issues
- Ensure MUI theme provider is wrapping your app
- Check that @emotion/react and @emotion/styled are installed

### Import Errors
- Verify all import paths are correct for your project structure
- Check that all dependencies are installed

## 📄 License

This component package is extracted from the DFTP Hub project for reuse in other applications.

## 🤝 Support

For questions or issues, refer to the main DFTP Hub project documentation.

