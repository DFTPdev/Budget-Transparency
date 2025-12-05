import { useMemo, useState } from 'react';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

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

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`overview-tabpanel-${index}`}
      aria-labelledby={`overview-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

export default function OverviewPage() {
  const [tabValue, setTabValue] = useState(0);
  const [selectedStageId, setSelectedStageId] = useState<string>();

  const { data: timelineData, loading: timelineLoading, error: timelineError } = useTimeline();
  const { operatingSummary, capitalSummary, capitalRequests, loading: snapshotsLoading, error: snapshotsError } = useSnapshots();

  const currentStage = useMemo(() => {
    if (!timelineData?.stages) return null;
    return getCurrentStage(timelineData.stages);
  }, [timelineData]);

  const activeStageMilestones = useMemo(() => {
    if (!timelineData?.milestones || !selectedStageId) return [];
    return getMilestonesByStage(timelineData.milestones, selectedStageId);
  }, [timelineData, selectedStageId]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Initialize selected stage on load
  useMemo(() => {
    if (currentStage && !selectedStageId) {
      setSelectedStageId(currentStage.id);
    }
  }, [currentStage, selectedStageId]);

  if (timelineLoading || snapshotsLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: 8, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (timelineError || snapshotsError) {
    return (
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Alert severity="error">
          {timelineError || snapshotsError}
        </Alert>
      </Container>
    );
  }

  if (!timelineData) {
    return (
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Alert severity="warning">Timeline data not available</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" sx={{ mb: 1, fontWeight: 600 }}>
          Budget Overview
        </Typography>
        <Typography variant="body1" sx={{ color: 'text.secondary' }}>
          Biennium {timelineData.biennium.label}
        </Typography>
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          aria-label="Budget overview tabs"
          sx={{ '& .MuiTab-root': { textTransform: 'none', fontSize: '1rem' } }}
        >
          <Tab label="Timeline" id="overview-tab-0" aria-controls="overview-tabpanel-0" />
          <Tab label="Key Visuals" id="overview-tab-1" aria-controls="overview-tabpanel-1" />
        </Tabs>
      </Box>

      {/* Timeline Tab */}
      <TabPanel value={tabValue} index={0}>
        <Stack spacing={3}>
          {/* Biennium Banner */}
          <Box
            sx={{
              p: 2,
              bgcolor: 'primary.lighter',
              borderRadius: 1,
              border: '1px solid',
              borderColor: 'primary.light',
            }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              Biennium FY{timelineData.biennium.label}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {new Date(timelineData.biennium.start).toLocaleDateString()} –{' '}
              {new Date(timelineData.biennium.end).toLocaleDateString()}
            </Typography>
          </Box>

          {/* Timeline Axis */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
              Budget Process Timeline
            </Typography>
            <TimelineAxis
              stages={timelineData.stages}
              startDate={timelineData.biennium.start}
              endDate={timelineData.biennium.end}
              highlightedStageId={selectedStageId}
            />
          </Box>

          {/* Stage Chips */}
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
              Select a Stage
            </Typography>
            <StageChips
              stages={timelineData.stages}
              selectedStageId={selectedStageId}
              onStageSelect={setSelectedStageId}
            />
          </Box>

          {/* Milestones */}
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
              Milestones
            </Typography>
            <MilestoneList milestones={activeStageMilestones} />
          </Box>

          {/* Watch Next */}
          <Box>
            <WatchNextCard items={timelineData.watchNext} />
          </Box>

          {/* Sources Footer */}
          <SourcesFooter sources={timelineData.sources} lastRefreshed={timelineData.lastRefreshed} />
        </Stack>
      </TabPanel>

      {/* Key Visuals Tab */}
      <TabPanel value={tabValue} index={1}>
        <Stack spacing={3}>
          <OperatingStackedGFNGF data={operatingSummary} />
          <TopAgenciesBar data={operatingSummary} />
          <RequestsVsEnactedBars requestsData={capitalRequests} enactedData={capitalSummary} />
        </Stack>
      </TabPanel>
    </Container>
  );
}

