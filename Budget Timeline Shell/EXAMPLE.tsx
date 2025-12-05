/**
 * Example: How to use the Budget Timeline Shell in your React app
 * 
 * This file shows different ways to integrate the Budget Timeline
 * components into your application.
 */

import React from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

// Example 1: Use the complete page component
import BudgetTimelinePage from './BudgetTimelinePage';

// Example 2: Use individual components
import { useTimeline, getCurrentStage } from './hooks/useTimeline';
import { TimelineAxis } from './components/TimelineAxis';
import { StageChips } from './components/StageChips';
import { MilestoneList } from './components/MilestoneList';

// Create a basic MUI theme (customize as needed)
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
  },
});

// ============================================================================
// EXAMPLE 1: Use the complete page component (easiest)
// ============================================================================

export function Example1_CompletePage() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BudgetTimelinePage />
    </ThemeProvider>
  );
}

// ============================================================================
// EXAMPLE 2: Use individual components (more control)
// ============================================================================

export function Example2_CustomLayout() {
  const { data, loading, error } = useTimeline();
  const [selectedStageId, setSelectedStageId] = React.useState<string>();

  // Auto-select current stage
  React.useEffect(() => {
    if (data?.stages && !selectedStageId) {
      const current = getCurrentStage(data.stages);
      if (current) {
        setSelectedStageId(current.id);
      }
    }
  }, [data, selectedStageId]);

  if (loading) return <div>Loading timeline...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!data) return <div>No data available</div>;

  const milestones = data.milestones.filter(m => m.stageId === selectedStageId);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
        <h1>Budget Timeline</h1>
        
        {/* Timeline Axis */}
        <TimelineAxis
          stages={data.stages}
          startDate={data.biennium.start}
          endDate={data.biennium.end}
          highlightedStageId={selectedStageId}
        />

        {/* Stage Selector */}
        <div style={{ marginTop: '2rem' }}>
          <h2>Select a Stage</h2>
          <StageChips
            stages={data.stages}
            selectedStageId={selectedStageId}
            onStageSelect={setSelectedStageId}
          />
        </div>

        {/* Milestones */}
        <div style={{ marginTop: '2rem' }}>
          <h2>Milestones</h2>
          <MilestoneList milestones={milestones} />
        </div>
      </div>
    </ThemeProvider>
  );
}

// ============================================================================
// EXAMPLE 3: Embed in existing app with routing
// ============================================================================

// For Next.js App Router:
export function Example3_NextJS_AppRouter() {
  // In your app/budget-timeline/page.tsx:
  return <BudgetTimelinePage />;
}

// For Next.js Pages Router:
export function Example3_NextJS_PagesRouter() {
  // In your pages/budget-timeline.tsx:
  return (
    <div>
      <h1>Budget Timeline</h1>
      <BudgetTimelinePage />
    </div>
  );
}

// For React Router:
export function Example3_ReactRouter() {
  // In your router configuration:
  /*
  import { BrowserRouter, Routes, Route } from 'react-router-dom';
  import BudgetTimelinePage from './features/budget-timeline/BudgetTimelinePage';

  function App() {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="/budget-timeline" element={<BudgetTimelinePage />} />
        </Routes>
      </BrowserRouter>
    );
  }
  */
}

// ============================================================================
// EXAMPLE 4: Custom data source
// ============================================================================

export function Example4_CustomDataSource() {
  // If you want to use a different data source, you can:
  // 1. Update the fetch URL in hooks/useTimeline.ts, OR
  // 2. Create your own hook:

  const [data, setData] = React.useState(null);

  React.useEffect(() => {
    fetch('/api/my-custom-timeline-endpoint')
      .then(res => res.json())
      .then(setData);
  }, []);

  // Then use the components with your custom data
  // (Make sure your data matches the TimelineData interface)
}

// ============================================================================
// EXAMPLE 5: Simplified version (Timeline only, no charts)
// ============================================================================

export function Example5_TimelineOnly() {
  // See QUICKSTART.md for instructions on removing the "Key Visuals" tab
  // from BudgetTimelinePage.tsx to create a simplified version
  return <BudgetTimelinePage />;
}

