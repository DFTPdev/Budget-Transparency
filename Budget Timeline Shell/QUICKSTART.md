# Quick Start Guide

Get the Budget Timeline running in your project in 5 minutes!

## Step 1: Install Dependencies

```bash
npm install @mui/material @mui/lab @emotion/react @emotion/styled
```

## Step 2: Copy Files

Copy this entire folder to your project:

```bash
cp -r "Budget Timeline Shell" /path/to/your/project/src/features/budget-timeline
```

## Step 3: Place Data File

Copy the data file to your public directory:

```bash
mkdir -p /path/to/your/project/public/data/official
cp "Budget Timeline Shell/data/budgetTimeline.2024_2026.json" \
   /path/to/your/project/public/data/official/
```

## Step 4: Update BudgetTimelinePage.tsx

Edit `BudgetTimelinePage.tsx` and update the imports at the top:

```typescript
// Remove these lines:
import { useSnapshots } from 'src/lib/hooks/useSnapshots';
import { useTimeline, getCurrentStage, getMilestonesByStage } from 'src/lib/hooks/useTimeline';
import { StageChips } from 'src/components/overview/StageChips';
import { TimelineAxis } from 'src/components/overview/TimelineAxis';
import { MilestoneList } from 'src/components/overview/MilestoneList';
import { WatchNextCard } from 'src/components/overview/WatchNextCard';
import { SourcesFooter } from 'src/components/overview/SourcesFooter';
import { TopAgenciesBar } from 'src/components/overview/charts/TopAgenciesBar';
import { OperatingStackedGFNGF } from 'src/components/overview/charts/OperatingStackedGFNGF';
import { RequestsVsEnactedBars } from 'src/components/overview/charts/RequestsVsEnactedBars';

// Replace with these:
import { useTimeline, getCurrentStage, getMilestonesByStage } from './hooks/useTimeline';
import { StageChips } from './components/StageChips';
import { TimelineAxis } from './components/TimelineAxis';
import { MilestoneList } from './components/MilestoneList';
import { WatchNextCard } from './components/WatchNextCard';
import { SourcesFooter } from './components/SourcesFooter';
```

## Step 5: Simplify the Component (Optional)

If you only want the Timeline tab (not the charts), make these changes in `BudgetTimelinePage.tsx`:

### Remove the useSnapshots hook:
```typescript
// DELETE THIS LINE:
const { operatingSummary, capitalSummary, capitalRequests, loading: snapshotsLoading, error: snapshotsError } = useSnapshots();
```

### Update the loading check:
```typescript
// CHANGE FROM:
if (timelineLoading || snapshotsLoading) {

// TO:
if (timelineLoading) {
```

### Update the error check:
```typescript
// CHANGE FROM:
if (timelineError || snapshotsError) {
  return (
    <Container maxWidth="lg" sx={{ py: 8 }}>
      <Alert severity="error">
        {timelineError || snapshotsError}
      </Alert>
    </Container>
  );
}

// TO:
if (timelineError) {
  return (
    <Container maxWidth="lg" sx={{ py: 8 }}>
      <Alert severity="error">
        {timelineError}
      </Alert>
    </Container>
  );
}
```

### Remove the "Key Visuals" tab:
```typescript
// DELETE THIS TAB:
<Tab label="Key Visuals" id="overview-tab-1" aria-controls="overview-tabpanel-1" />
```

### Remove the second TabPanel:
```typescript
// DELETE THIS ENTIRE SECTION:
{/* Key Visuals Tab */}
<TabPanel value={tabValue} index={1}>
  <Stack spacing={3}>
    <OperatingStackedGFNGF data={operatingSummary} />
    <TopAgenciesBar data={operatingSummary} />
    <RequestsVsEnactedBars requestsData={capitalRequests} enactedData={capitalSummary} />
  </Stack>
</TabPanel>
```

## Step 6: Use the Component

In your app or router:

```typescript
import BudgetTimelinePage from './features/budget-timeline/BudgetTimelinePage';

function App() {
  return (
    <ThemeProvider theme={yourMuiTheme}>
      <BudgetTimelinePage />
    </ThemeProvider>
  );
}
```

## Step 7: Test It!

Start your dev server and navigate to the page. You should see:
- ✅ Biennium banner
- ✅ Interactive timeline axis
- ✅ Stage selector chips
- ✅ Milestones list
- ✅ Watch Next card
- ✅ Sources footer

## Troubleshooting

### "Failed to load timeline" error
- Check that the data file is at `/public/data/official/budgetTimeline.2024_2026.json`
- Check browser console for the exact fetch error

### Styling looks wrong
- Make sure you have a MUI ThemeProvider wrapping your app
- Check that @emotion/react and @emotion/styled are installed

### Import errors
- Verify all import paths match your project structure
- Check that all dependencies are installed

## Next Steps

- Customize the data in `budgetTimeline.2024_2026.json`
- Adjust styling by modifying the `sx` props in components
- Add your own stages, milestones, and watch items

That's it! You now have a fully functional Budget Timeline in your project. 🎉

