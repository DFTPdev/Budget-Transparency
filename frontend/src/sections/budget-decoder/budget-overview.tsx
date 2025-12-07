import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Box,
  Card,
  Typography,
  Grid,
  LinearProgress,
  useTheme,
  alpha,
  Tabs,
  Tab,
  ToggleButtonGroup,
  ToggleButton,
  IconButton,
  Tooltip as MuiTooltip,
  Collapse,
  Divider,
  Button,
} from '@mui/material';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { m, AnimatePresence } from 'framer-motion';
import DownloadIcon from '@mui/icons-material/Download';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import PieChartIcon from '@mui/icons-material/PieChart';

import { fCurrency } from 'src/utils/format-number';
import { STORY_BUCKET_COLORS, type StoryBucketId } from 'src/data/spendingStoryBuckets';
import { varFade } from 'src/components/animate';

// ----------------------------------------------------------------------

type BudgetCategory = {
  secretariat: string;
  story_bucket_id: StoryBucketId;
  story_bucket_label: string;
  amount: number;
  percentage: number;
};

type BudgetSummary = {
  fiscal_year: number;
  total_budget: number;
  source: string;
  last_updated: string;
  note?: string | null;
  categories: BudgetCategory[];
};

type BudgetOverviewProps = {
  fiscalYear: number;
  onCategoryClick?: (storyBucketId: StoryBucketId) => void;
  onFiscalYearChange?: (year: number) => void;
};

// ----------------------------------------------------------------------

export function BudgetOverview({ fiscalYear, onCategoryClick, onFiscalYearChange }: BudgetOverviewProps) {
  const theme = useTheme();
  const chartRef = useRef<HTMLDivElement>(null);

  // State management
  const [selectedYear, setSelectedYear] = useState(fiscalYear);
  const [budgetData, setBudgetData] = useState<BudgetSummary | null>(null);
  const [allYearsData, setAllYearsData] = useState<Record<number, BudgetSummary>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'single' | 'comparison'>('single');
  const [expandedBuckets, setExpandedBuckets] = useState<Set<StoryBucketId>>(new Set());

  // Sync with parent fiscal year changes
  useEffect(() => {
    setSelectedYear(fiscalYear);
  }, [fiscalYear]);

  // Load all fiscal years data on mount
  useEffect(() => {
    const loadAllYearsData = async () => {
      setIsLoading(true);
      try {
        // Only load FY2025 and FY2026 (current biennium FY2024-2026)
        const years = [2025, 2026];
        const promises = years.map(async (year) => {
          const response = await fetch(`/data/budget_summary_${year}.json`);
          if (!response.ok) {
            throw new Error(`Failed to load budget summary for FY${year}`);
          }
          return { year, data: await response.json() };
        });

        const results = await Promise.all(promises);
        const dataMap: Record<number, BudgetSummary> = {};
        results.forEach(({ year, data }) => {
          dataMap[year] = data;
        });

        setAllYearsData(dataMap);
        setBudgetData(dataMap[selectedYear]);
      } catch (error) {
        console.error('Error loading budget summary:', error);
        setBudgetData(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadAllYearsData();
  }, []);

  // Update budget data when selected year changes
  useEffect(() => {
    if (allYearsData[selectedYear]) {
      setBudgetData(allYearsData[selectedYear]);
    }
  }, [selectedYear, allYearsData]);

  // Handle fiscal year tab change
  const handleYearChange = (event: React.SyntheticEvent, newYear: number) => {
    setSelectedYear(newYear);
    onFiscalYearChange?.(newYear);
  };

  // Handle view mode toggle
  const handleViewModeChange = (event: React.MouseEvent<HTMLElement>, newMode: 'single' | 'comparison' | null) => {
    if (newMode !== null) {
      setViewMode(newMode);
    }
  };

  // Handle bucket expansion for drill-down
  const toggleBucketExpansion = (bucketId: StoryBucketId) => {
    setExpandedBuckets((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(bucketId)) {
        newSet.delete(bucketId);
      } else {
        newSet.add(bucketId);
      }
      return newSet;
    });
  };

  // Export chart as image
  const handleExportChart = async () => {
    if (!chartRef.current) return;

    try {
      // Dynamically import html2canvas
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(chartRef.current, {
        backgroundColor: theme.palette.background.paper,
        scale: 2,
      });

      // Convert to blob and download
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `budget-overview-fy${selectedYear}.png`;
          link.click();
          URL.revokeObjectURL(url);
        }
      });
    } catch (error) {
      console.error('Error exporting chart:', error);
    }
  };

  // Aggregate categories by story bucket for pie chart
  const aggregatedData = useMemo(() => {
    if (!budgetData) return [];

    const bucketTotals = new Map<string, { label: string; amount: number; id: StoryBucketId; secretariats: BudgetCategory[] }>();

    budgetData.categories.forEach((cat) => {
      const existing = bucketTotals.get(cat.story_bucket_id);
      if (existing) {
        existing.amount += cat.amount;
        existing.secretariats.push(cat);
      } else {
        bucketTotals.set(cat.story_bucket_id, {
          label: cat.story_bucket_label,
          amount: cat.amount,
          id: cat.story_bucket_id,
          secretariats: [cat],
        });
      }
    });

    // Convert to array and sort by amount
    return Array.from(bucketTotals.values())
      .map((bucket) => ({
        name: bucket.label,
        value: bucket.amount,
        id: bucket.id,
        percentage: (bucket.amount / budgetData.total_budget) * 100,
        secretariats: bucket.secretariats.sort((a, b) => b.amount - a.amount),
      }))
      .sort((a, b) => b.value - a.value);
  }, [budgetData]);

  // Comparison data for all years
  const comparisonData = useMemo(() => {
    if (Object.keys(allYearsData).length === 0) return [];

    // Only compare FY2025 and FY2026 (current biennium)
    const years = [2025, 2026];
    const bucketIds = new Set<StoryBucketId>();

    // Collect all unique bucket IDs
    years.forEach((year) => {
      const data = allYearsData[year];
      if (data) {
        data.categories.forEach((cat) => bucketIds.add(cat.story_bucket_id));
      }
    });

    // Build comparison data
    return Array.from(bucketIds).map((bucketId) => {
      const result: any = { bucketId };

      years.forEach((year) => {
        const data = allYearsData[year];
        if (data) {
          const total = data.categories
            .filter((cat) => cat.story_bucket_id === bucketId)
            .reduce((sum, cat) => sum + cat.amount, 0);
          result[`FY${year}`] = total;
        } else {
          result[`FY${year}`] = 0;
        }
      });

      // Get label from first available year
      const firstYear = years.find((year) => allYearsData[year]);
      if (firstYear) {
        const cat = allYearsData[firstYear].categories.find((c) => c.story_bucket_id === bucketId);
        result.name = cat?.story_bucket_label || bucketId;
      }

      return result;
    }).sort((a, b) => (b.FY2025 || 0) - (a.FY2025 || 0));
  }, [allYearsData]);

  // Custom tooltip for pie chart
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <Card sx={{ p: 2, boxShadow: theme.shadows[8] }}>
          <Typography variant="subtitle2" gutterBottom>
            {data.name}
          </Typography>
          <Typography variant="h6" color="primary">
            {fCurrency(data.value)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {data.percentage.toFixed(2)}% of total
          </Typography>
        </Card>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <Card sx={{ p: 3, mb: 3 }}>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Loading budget overview...
        </Typography>
        <LinearProgress />
      </Card>
    );
  }

  if (!budgetData) {
    return (
      <Card sx={{ p: 3, mb: 3 }}>
        <Typography variant="body2" color="error">
          Failed to load budget data for FY{selectedYear}
        </Typography>
      </Card>
    );
  }

  return (
    <Card sx={{ p: 3, mb: 3 }} ref={chartRef}>
      {/* Header with Controls */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
          <Typography variant="h5">Budget Overview</Typography>

          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            {/* View Mode Toggle */}
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={handleViewModeChange}
              size="small"
              aria-label="view mode"
            >
              <ToggleButton value="single" aria-label="pie chart view">
                <MuiTooltip title="Pie Chart View">
                  <PieChartIcon fontSize="small" />
                </MuiTooltip>
              </ToggleButton>
              <ToggleButton value="comparison" aria-label="comparison view">
                <MuiTooltip title="Bar Chart Comparison">
                  <CompareArrowsIcon fontSize="small" />
                </MuiTooltip>
              </ToggleButton>
            </ToggleButtonGroup>

            {/* Export Button */}
            <MuiTooltip title="Export as Image">
              <IconButton onClick={handleExportChart} size="small" color="primary">
                <DownloadIcon />
              </IconButton>
            </MuiTooltip>
          </Box>
        </Box>

        {/* Source Attribution */}
        <Typography variant="caption" color="text.secondary" display="block" sx={{ textAlign: 'center' }}>
          Source: Virginia Auditor of Public Accounts - Data Point
        </Typography>
      </Box>

      {/* Single Year View - Three Pie Charts */}
      {viewMode === 'single' && (
        <AnimatePresence mode="wait">
          <m.div
            key="triple-pie-view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              {/* Only show FY2025 and FY2026 (current biennium) */}
              {[2025, 2026].map((year) => {
                const yearData = allYearsData[year];
                if (!yearData) return null;

                // Aggregate data for this year
                const bucketMap = new Map<StoryBucketId, {
                  name: string;
                  value: number;
                  secretariats: Array<{ secretariat: string; amount: number }>;
                }>();

                yearData.categories.forEach((category) => {
                  const bucketId = category.story_bucket_id;

                  if (!bucketMap.has(bucketId)) {
                    bucketMap.set(bucketId, {
                      name: category.story_bucket_label,
                      value: 0,
                      secretariats: [],
                    });
                  }

                  const bucketData = bucketMap.get(bucketId)!;
                  bucketData.value += category.amount;
                  bucketData.secretariats.push({
                    secretariat: category.secretariat,
                    amount: category.amount,
                  });
                });

                const yearAggregatedData = Array.from(bucketMap.entries()).map(([id, data]) => ({
                  id,
                  name: data.name,
                  value: data.value,
                  percentage: (data.value / yearData.total_budget) * 100,
                  secretariats: data.secretariats.sort((a, b) => b.amount - a.amount),
                }));

                yearAggregatedData.sort((a, b) => b.value - a.value);

                return (
                  <Box
                    key={year}
                    sx={{
                      flex: '1 1 calc(33.333% - 11px)',
                      minWidth: { xs: '100%', md: 'calc(33.333% - 11px)' },
                      display: 'flex',
                    }}
                  >
                    <Box
                      sx={{
                        p: 3,
                        borderRadius: 2,
                        bgcolor: 'background.paper',
                        border: '1px solid',
                        borderColor: 'divider',
                        width: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                      }}
                    >
                      {/* Year Header */}
                      <Typography variant="h6" gutterBottom align="center">
                        FY {year}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" align="center" gutterBottom>
                        {fCurrency(yearData.total_budget)}
                      </Typography>

                      {/* Pie Chart */}
                      <Box sx={{ flexGrow: 1, minHeight: 320, mb: 2, width: '100%' }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={yearAggregatedData}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              outerRadius="80%"
                              fill="#8884d8"
                              dataKey="value"
                            >
                              {yearAggregatedData.map((entry, index) => (
                                <Cell
                                  key={`cell-${year}-${index}`}
                                  fill={STORY_BUCKET_COLORS[entry.id]}
                                  style={{ cursor: 'pointer' }}
                                  onClick={() => onCategoryClick?.(entry.id)}
                                />
                              ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                          </PieChart>
                        </ResponsiveContainer>
                      </Box>

                      {/* Category List */}
                      <Box sx={{ mt: 'auto' }}>
                        {yearAggregatedData.map((category) => (
                          <Box
                            key={category.id}
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              cursor: 'pointer',
                              p: 1,
                              borderRadius: 1,
                              mb: 0.5,
                              '&:hover': {
                                bgcolor: alpha(theme.palette.primary.main, 0.04),
                              },
                            }}
                            onClick={() => onCategoryClick?.(category.id)}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
                              <Box
                                sx={{
                                  width: 12,
                                  height: 12,
                                  borderRadius: '50%',
                                  bgcolor: STORY_BUCKET_COLORS[category.id],
                                  mr: 1,
                                  flexShrink: 0,
                                }}
                              />
                              <Typography variant="caption" noWrap sx={{ flex: 1 }}>
                                {category.name}
                              </Typography>
                            </Box>
                            <Typography variant="caption" sx={{ fontWeight: 600, ml: 1 }}>
                              {category.percentage.toFixed(1)}%
                            </Typography>
                          </Box>
                        ))}
                      </Box>
                    </Box>
                  </Box>
                );
              })}
            </Box>
          </m.div>
        </AnimatePresence>
      )}

      {/* Comparison View */}
      {viewMode === 'comparison' && (
        <AnimatePresence mode="wait">
          <m.div
            key="comparison"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom sx={{ mb: 2 }}>
                Multi-Year Budget Comparison
              </Typography>

              {/* Comparison Bar Chart */}
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={comparisonData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name"
                    angle={-45}
                    textAnchor="end"
                    height={120}
                    interval={0}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis
                    tickFormatter={(value) => `$${(value / 1e9).toFixed(1)}B`}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip
                    formatter={(value: number) => fCurrency(value)}
                    contentStyle={{
                      backgroundColor: theme.palette.background.paper,
                      border: `1px solid ${theme.palette.divider}`,
                      borderRadius: theme.shape.borderRadius,
                    }}
                  />
                  <Legend />
                  <Bar dataKey="FY2025" fill={theme.palette.primary.main} name="FY 2025" />
                  <Bar dataKey="FY2026" fill={theme.palette.secondary.main} name="FY 2026" />
                </BarChart>
              </ResponsiveContainer>
            </Box>

            {/* Comparison Table */}
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle2" gutterBottom sx={{ mb: 2 }}>
                Year-over-Year Changes
              </Typography>

              <Box sx={{ overflowX: 'auto' }}>
                <Box sx={{ minWidth: 600 }}>
                  {/* Header */}
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr',
                      gap: 2,
                      p: 2,
                      backgroundColor: alpha(theme.palette.primary.main, 0.08),
                      borderRadius: 1,
                      mb: 1,
                    }}
                  >
                    <Typography variant="caption" fontWeight="bold">
                      Category
                    </Typography>
                    <Typography variant="caption" fontWeight="bold" textAlign="right">
                      FY 2025
                    </Typography>
                    <Typography variant="caption" fontWeight="bold" textAlign="right">
                      FY 2026
                    </Typography>
                    <Typography variant="caption" fontWeight="bold" textAlign="right">
                      Change (25→26)
                    </Typography>
                  </Box>

                  {/* Rows */}
                  {comparisonData.map((item) => {
                    const change = ((item.FY2026 - item.FY2025) / item.FY2025) * 100;
                    const changeColor = change > 0 ? theme.palette.success.main : change < 0 ? theme.palette.error.main : theme.palette.text.secondary;

                    return (
                      <Box
                        key={item.bucketId}
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr',
                          gap: 2,
                          p: 2,
                          borderBottom: `1px solid ${theme.palette.divider}`,
                          '&:hover': {
                            backgroundColor: alpha(theme.palette.primary.main, 0.04),
                          },
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box
                            sx={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              backgroundColor: STORY_BUCKET_COLORS[item.bucketId as StoryBucketId],
                              flexShrink: 0,
                            }}
                          />
                          <Typography variant="body2">{item.name}</Typography>
                        </Box>
                        <Typography variant="body2" textAlign="right">
                          ${(item.FY2025 / 1e9).toFixed(2)}B
                        </Typography>
                        <Typography variant="body2" textAlign="right">
                          ${(item.FY2026 / 1e9).toFixed(2)}B
                        </Typography>
                        <Typography
                          variant="body2"
                          textAlign="right"
                          sx={{ color: changeColor, fontWeight: 'medium' }}
                        >
                          {change > 0 ? '+' : ''}
                          {change.toFixed(1)}%
                        </Typography>
                      </Box>
                    );
                  })}
                </Box>
              </Box>
            </Box>
          </m.div>
        </AnimatePresence>
      )}
    </Card>
  );
}

