'use client';

/**
 * HAC Budget Dashboard
 * 
 * Provides instant insight into Virginia's 2024-26 biennial budget
 * using data from House Appropriations Committee summary documents.
 */

import { useState } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import { alpha, useTheme } from '@mui/material/styles';

import { hacDashboardData } from 'src/data/hacDashboardData';
import { Chart, useChart } from 'src/components/chart';
import { fNumber } from 'src/utils/format-number';
import { BudgetOverview } from 'src/sections/budget-decoder/budget-overview';
import type { StoryBucketId } from 'src/data/spendingStoryBuckets';

// ----------------------------------------------------------------------

const formatBillions = (value: number): string => `$${value.toFixed(1)}B`;
const formatPercent = (value: number): string => `${value.toFixed(0)}%`;
const formatMillions = (value: number): string => {
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}B`;
  return `$${value.toFixed(0)}M`;
};

// ----------------------------------------------------------------------

export function HacBudgetDashboard() {
  const theme = useTheme();
  const [selectedBudget, setSelectedBudget] = useState<'introduced' | 'final'>('final');

  const { globalMetrics, introduced, final, impactCards, gfRevenueComposition, oneTimeInvestments, ongoingCommitments } = hacDashboardData;
  const currentBudget = selectedBudget === 'introduced' ? introduced : final;

  // ============================================================================
  // BAND 1: Hero Stat Strip (Budget Snapshot)
  // ============================================================================

  const renderHeroStats = () => {
    const stats = [
      {
        label: 'Two-Year State Budget (All Funds)',
        value: formatBillions(globalMetrics.totalBiennialBudgetAllFunds),
        subLabel: 'All state dollars over two years',
        description:
          "Virginia's complete spending plan for FY 2024-26 across all funding sources—general fund, federal dollars, fees, and dedicated revenues. This is the total scale of state government operations.",
        color: theme.palette.primary.main,
      },
      {
        label: 'General Fund Resources (Final)',
        value: formatBillions(globalMetrics.totalBiennialGeneralFundResources),
        subLabel: 'Tax-powered, flexible dollars',
        description:
          "The state's core discretionary budget—money raised from state taxes that lawmakers have the most control over. This includes beginning balances, revenues, and transfers available for appropriation.",
        color: theme.palette.secondary.main,
      },
      {
        label: 'New GF Spending Above Last Budget (Final)',
        value: formatBillions(globalMetrics.newGeneralFundSpendingProposed),
        subLabel: 'New spending over Chapter 2',
        description:
          'Additional general-fund spending above the prior base budget (Chapter 2). This represents new policy choices and investments made by the General Assembly in the 2025 session.',
        color: theme.palette.info.main,
      },
      {
        label: 'K-12 + Health & Human Services Share of GF',
        value: formatPercent(globalMetrics.k12AndHhrShareOfGfOperating),
        subLabel: `${globalMetrics.k12AndHhrShareOfGfOperating}¢ of every GF dollar → schools + health care`,
        description:
          "The share of GF operating budget dedicated to Virginia's two largest priorities: public education (K-12) and health & human services (including Medicaid). Together, these consume about three-fifths of the state's core budget.",
        color: theme.palette.success.main,
      },
    ];

    return (
      <Box sx={{ mb: 6 }}>
        <Typography variant="h3" sx={{ mb: 1, textAlign: 'center' }}>
          Virginia Budget at a Glance
        </Typography>
        <Typography variant="body1" sx={{ mb: 4, textAlign: 'center', color: 'text.secondary' }}>
          FY 2024–26 Biennial Budget Overview
        </Typography>

        <Grid container spacing={3}>
          {stats.map((stat, index) => (
            <Grid size={{ xs: 12, sm: 6, md: 3 }} key={index}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'all 0.3s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: theme.shadows[8],
                  },
                }}
              >
                <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                  <Stack spacing={1.5} sx={{ textAlign: 'center', flexGrow: 1 }}>
                    {/* Big Number */}
                    <Typography
                      variant="h3"
                      sx={{
                        fontWeight: 700,
                        color: stat.color,
                        mb: 0.5,
                        minHeight: '48px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {stat.value}
                    </Typography>

                    {/* Title */}
                    <Typography
                      variant="subtitle1"
                      sx={{
                        fontWeight: 600,
                        mb: 0.5,
                        minHeight: '56px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {stat.label}
                    </Typography>

                    {/* Sub-label (HAC story tie-in) */}
                    <Typography
                      variant="caption"
                      sx={{
                        color: stat.color,
                        fontWeight: 600,
                        fontSize: '0.75rem',
                        mb: 1,
                        display: 'block',
                      }}
                    >
                      {stat.subLabel}
                    </Typography>

                    {/* Description */}
                    <Typography
                      variant="caption"
                      sx={{
                        color: 'text.secondary',
                        lineHeight: 1.5,
                        display: 'block',
                        textAlign: 'justify',
                      }}
                    >
                      {stat.description}
                    </Typography>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  };

  // ============================================================================
  // BAND 2: "Where Your $1 Goes" - GF Spending Graphic
  // ============================================================================

  const renderSpendingByArea = () => {
    const chartColors = [
      theme.palette.primary.main,
      theme.palette.secondary.main,
      theme.palette.info.main,
      theme.palette.warning.main,
      theme.palette.success.main,
    ];

    const chartSeries = currentBudget.gfByFunction.map((item) => item.sharePercent);
    const chartLabels = currentBudget.gfByFunction.map((item) => item.label);

    // Calculate K-12 + HHR combined percentage
    const k12Share = currentBudget.gfByFunction.find(f => f.id === 'k12')?.sharePercent || 0;
    const hhrShare = currentBudget.gfByFunction.find(f => f.id === 'hhr')?.sharePercent || 0;
    const k12HhrCombined = k12Share + hhrShare;

    const chartOptions = useChart({
      chart: { sparkline: { enabled: false } },
      colors: chartColors,
      labels: chartLabels,
      stroke: { width: 0 },
      legend: { show: false },
      dataLabels: {
        enabled: true,
        dropShadow: { enabled: false },
        formatter: (val: number) => `${val.toFixed(0)}¢`,
      },
      tooltip: {
        y: {
          formatter: (value: number) => `${value.toFixed(1)}¢ of every dollar`,
          title: { formatter: (seriesName: string) => `${seriesName}:` },
        },
      },
      plotOptions: {
        pie: {
          donut: {
            size: '70%',
            labels: {
              show: true,
              value: {
                fontSize: '24px',
                fontWeight: 700,
                formatter: (val: string) => `${parseFloat(val).toFixed(0)}¢`,
              },
              total: {
                show: true,
                label: 'Per $1',
                fontSize: '14px',
                fontWeight: 600,
                formatter: () => '100¢',
              },
            },
          },
        },
      },
    });

    return (
      <Box sx={{ mb: 6 }}>
        <Typography variant="h4" sx={{ mb: 1, textAlign: 'center' }}>
          If Virginia Collects $1 in General Fund Taxes, Here's Where It Goes
        </Typography>
        <Typography variant="body2" sx={{ mb: 1, textAlign: 'center', color: 'text.secondary' }}>
          Operating budget breakdown by major function
        </Typography>
        <Typography
          variant="caption"
          sx={{
            mb: 3,
            textAlign: 'center',
            color: theme.palette.success.main,
            fontWeight: 600,
            display: 'block',
          }}
        >
          {k12HhrCombined.toFixed(0)}¢ of every GF dollar goes to schools and health & human services
        </Typography>

        <Stack direction="row" justifyContent="center" sx={{ mb: 3 }}>
          <ToggleButtonGroup
            value={selectedBudget}
            exclusive
            onChange={(_, value) => value && setSelectedBudget(value)}
            sx={{
              '& .MuiToggleButton-root': {
                px: 3,
                py: 1,
              },
            }}
          >
            <ToggleButton value="introduced">Introduced</ToggleButton>
            <ToggleButton value="final">Final</ToggleButton>
          </ToggleButtonGroup>
        </Stack>

        <Card>
          <CardContent>
            <Grid container spacing={4} alignItems="center">
              {/* Left: Donut Chart */}
              <Grid size={{ xs: 12, md: 6 }}>
                <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                  <Chart
                    type="donut"
                    series={chartSeries}
                    options={chartOptions}
                    sx={{
                      width: { xs: 280, sm: 320 },
                      height: { xs: 280, sm: 320 },
                    }}
                  />
                </Box>
              </Grid>

              {/* Right: Function List with "cents per dollar" framing */}
              <Grid size={{ xs: 12, md: 6 }}>
                <Stack spacing={2.5}>
                  {currentBudget.gfByFunction.map((func, index) => (
                    <Box key={func.id}>
                      <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Box
                            sx={{
                              width: 12,
                              height: 12,
                              borderRadius: '50%',
                              bgcolor: chartColors[index],
                              flexShrink: 0,
                            }}
                          />
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {func.label}
                          </Typography>
                        </Stack>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: chartColors[index] }}>
                          {func.sharePercent.toFixed(0)}¢
                        </Typography>
                      </Stack>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box
                          sx={{
                            flex: 1,
                            height: 8,
                            borderRadius: 1,
                            bgcolor: alpha(theme.palette.grey[500], 0.12),
                            overflow: 'hidden',
                          }}
                        >
                          <Box
                            sx={{
                              width: `${func.sharePercent}%`,
                              height: '100%',
                              bgcolor: chartColors[index],
                              transition: 'width 0.3s ease',
                            }}
                          />
                        </Box>
                        <Typography variant="caption" sx={{ color: 'text.secondary', minWidth: 50 }}>
                          {func.sharePercent.toFixed(1)}%
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </Stack>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Box>
    );
  };

  // ============================================================================
  // BAND 3: One-Time vs Ongoing - "Big Moves This Session"
  // ============================================================================

  const renderOneTimeVsOngoing = () => {
    const oneTimeTotal = oneTimeInvestments.reduce((sum, item) => sum + item.amountMillions, 0);
    const ongoingTotal = ongoingCommitments.reduce((sum, item) => sum + item.amountMillions, 0);

    const renderColumn = (
      title: string,
      subtitle: string,
      items: typeof oneTimeInvestments,
      total: number,
      color: string
    ) => (
      <Card sx={{ height: '100%' }}>
        <CardContent>
          <Stack spacing={3}>
            {/* Header */}
            <Box>
              <Typography variant="h5" sx={{ mb: 0.5, fontWeight: 700 }}>
                {title}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 2 }}>
                {subtitle}
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, color }}>
                {formatMillions(total)} total
              </Typography>
            </Box>

            {/* Items List */}
            <Stack spacing={2}>
              {items.map((item) => (
                <Box key={item.id}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 0.5 }}>
                    <Typography variant="body2" sx={{ flex: 1, pr: 2 }}>
                      {item.label}
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, color }}>
                      {formatMillions(item.amountMillions)}
                    </Typography>
                  </Stack>
                  {/* Progress bar showing relative size */}
                  <Box
                    sx={{
                      height: 6,
                      borderRadius: 1,
                      bgcolor: alpha(theme.palette.grey[500], 0.12),
                      overflow: 'hidden',
                    }}
                  >
                    <Box
                      sx={{
                        width: `${(item.amountMillions / total) * 100}%`,
                        height: '100%',
                        bgcolor: color,
                        transition: 'width 0.3s ease',
                      }}
                    />
                  </Box>
                </Box>
              ))}
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    );

    return (
      <Box sx={{ mb: 6 }}>
        <Typography variant="h4" sx={{ mb: 1, textAlign: 'center' }}>
          Big Moves This Session: One-Time vs Ongoing
        </Typography>
        <Typography variant="body2" sx={{ mb: 4, textAlign: 'center', color: 'text.secondary' }}>
          Understanding which budget changes are temporary and which are permanent
        </Typography>

        <Grid container spacing={3}>
          {/* Left: One-Time Investments */}
          <Grid size={{ xs: 12, md: 6 }}>
            {renderColumn(
              'One-Time Investments',
              'Do not automatically repeat in future budgets',
              oneTimeInvestments,
              oneTimeTotal,
              theme.palette.info.main
            )}
          </Grid>

          {/* Right: Ongoing Commitments */}
          <Grid size={{ xs: 12, md: 6 }}>
            {renderColumn(
              'Ongoing Commitments',
              'Baked into future budgets as recurring costs',
              ongoingCommitments,
              ongoingTotal,
              theme.palette.warning.main
            )}
          </Grid>
        </Grid>
      </Box>
    );
  };

  // ============================================================================
  // BAND 4: "How We Pay for It" - Revenue Composition
  // ============================================================================

  const renderGfRevenueComposition = () => {
    const chartColors = [
      theme.palette.primary.main,
      theme.palette.secondary.main,
      theme.palette.info.main,
      theme.palette.warning.main,
      theme.palette.success.main,
      theme.palette.error.main,
    ];

    const chartSeries = gfRevenueComposition.map((item) => item.sharePercent);
    const chartLabels = gfRevenueComposition.map((item) => item.label);

    const chartOptions = useChart({
      chart: { sparkline: { enabled: false } },
      colors: chartColors,
      labels: chartLabels,
      stroke: { width: 0 },
      legend: { show: false },
      dataLabels: {
        enabled: true,
        dropShadow: { enabled: false },
        formatter: (val: number) => `${val.toFixed(0)}%`,
      },
      tooltip: {
        y: {
          formatter: (value: number) => `${value.toFixed(1)}% of GF revenue`,
          title: { formatter: (seriesName: string) => `${seriesName}:` },
        },
      },
      plotOptions: {
        pie: {
          donut: {
            size: '70%',
            labels: {
              show: true,
              value: {
                fontSize: '24px',
                fontWeight: 700,
                formatter: (val: string) => `${parseFloat(val).toFixed(0)}%`,
              },
              total: {
                show: true,
                label: 'Total',
                fontSize: '14px',
                fontWeight: 600,
                formatter: () => '100%',
              },
            },
          },
        },
      },
    });

    return (
      <Box sx={{ mb: 6 }}>
        <Typography variant="h4" sx={{ mb: 1, textAlign: 'center' }}>
          Where General Fund Dollars Come From
        </Typography>
        <Typography variant="body2" sx={{ mb: 1, textAlign: 'center', color: 'text.secondary' }}>
          Revenue sources that power Virginia's core budget
        </Typography>
        <Typography
          variant="caption"
          sx={{
            mb: 3,
            textAlign: 'center',
            color: theme.palette.primary.main,
            fontWeight: 600,
            display: 'block',
          }}
        >
          Most GF dollars come from individual income and sales taxes
        </Typography>

        <Card>
          <CardContent>
            <Grid container spacing={4} alignItems="center">
              {/* Left: Donut Chart */}
              <Grid size={{ xs: 12, md: 6 }}>
                <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                  <Chart
                    type="donut"
                    series={chartSeries}
                    options={chartOptions}
                    sx={{
                      width: { xs: 280, sm: 320 },
                      height: { xs: 280, sm: 320 },
                    }}
                  />
                </Box>
              </Grid>

              {/* Right: Revenue Source List */}
              <Grid size={{ xs: 12, md: 6 }}>
                <Stack spacing={2.5}>
                  {gfRevenueComposition.map((source, index) => (
                    <Box key={source.id}>
                      <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Box
                            sx={{
                              width: 12,
                              height: 12,
                              borderRadius: '50%',
                              bgcolor: chartColors[index],
                              flexShrink: 0,
                            }}
                          />
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {source.label}
                          </Typography>
                        </Stack>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: chartColors[index] }}>
                          {source.sharePercent.toFixed(1)}%
                        </Typography>
                      </Stack>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box
                          sx={{
                            flex: 1,
                            height: 8,
                            borderRadius: 1,
                            bgcolor: alpha(theme.palette.grey[500], 0.12),
                            overflow: 'hidden',
                          }}
                        >
                          <Box
                            sx={{
                              width: `${source.sharePercent}%`,
                              height: '100%',
                              bgcolor: chartColors[index],
                              transition: 'width 0.3s ease',
                            }}
                          />
                        </Box>
                      </Box>
                    </Box>
                  ))}
                </Stack>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Box>
    );
  };

  // ============================================================================
  // BAND 5: Budget Evolution (Introduced vs Final)
  // ============================================================================

  const renderBeforeAfter = () => (
    <Box sx={{ mb: 6 }}>
      <Typography variant="h4" sx={{ mb: 1, textAlign: 'center' }}>
        Budget Evolution
      </Typography>
      <Typography variant="body2" sx={{ mb: 3, textAlign: 'center', color: 'text.secondary' }}>
        Compare the Governor's introduced budget with the final budget adopted in May 2025
      </Typography>

      <Stack direction="row" justifyContent="center" sx={{ mb: 3 }}>
        <ToggleButtonGroup
          value={selectedBudget}
          exclusive
          onChange={(_, value) => value && setSelectedBudget(value)}
          sx={{
            '& .MuiToggleButton-root': {
              px: 3,
              py: 1,
            },
          }}
        >
          <ToggleButton value="introduced">Introduced Budget</ToggleButton>
          <ToggleButton value="final">Final Budget</ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      <Card>
        <CardContent>
          <Stack spacing={3}>
            <Box>
              <Typography variant="h5" sx={{ mb: 1 }}>
                {currentBudget.label}
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Box
                    sx={{
                      p: 2,
                      borderRadius: 1,
                      bgcolor: alpha(theme.palette.primary.main, 0.08),
                    }}
                  >
                    <Typography variant="body2" sx={{ color: 'text.secondary', mb: 0.5 }}>
                      General Fund Resources
                    </Typography>
                    <Typography variant="h4">
                      {formatBillions(currentBudget.gfResources)}
                    </Typography>
                  </Box>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Box
                    sx={{
                      p: 2,
                      borderRadius: 1,
                      bgcolor: alpha(theme.palette.secondary.main, 0.08),
                    }}
                  >
                    <Typography variant="body2" sx={{ color: 'text.secondary', mb: 0.5 }}>
                      Total All Funds
                    </Typography>
                    <Typography variant="h4">
                      {formatBillions(currentBudget.totalAllFunds)}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Box>

            <Box>
              <Typography variant="subtitle1" sx={{ mb: 1.5, fontWeight: 600 }}>
                Key Highlights
              </Typography>
              <Stack spacing={1}>
                {currentBudget.highlights.map((highlight, index) => (
                  <Stack key={index} direction="row" spacing={1.5} alignItems="flex-start">
                    <Box
                      sx={{
                        width: 20,
                        height: 20,
                        borderRadius: '50%',
                        bgcolor: alpha(theme.palette.success.main, 0.12),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        mt: 0.25,
                      }}
                    >
                      <Box
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          bgcolor: theme.palette.success.main,
                        }}
                      />
                    </Box>
                    <Typography variant="body2">{highlight}</Typography>
                  </Stack>
                ))}
              </Stack>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );

  // ============================================================================
  // BAND 6: Impact Cards ("What this means on the ground")
  // ============================================================================

  const renderImpactCards = () => (
    <Box sx={{ mb: 6 }}>
      <Typography variant="h4" sx={{ mb: 1, textAlign: 'center' }}>
        What This Means on the Ground
      </Typography>
      <Typography variant="body2" sx={{ mb: 4, textAlign: 'center', color: 'text.secondary' }}>
        Key areas where the final 2025 state budget changes will be felt by Virginians
      </Typography>

      <Grid container spacing={3}>
        {impactCards.map((card) => (
          <Grid size={{ xs: 12, md: 6 }} key={card.id}>
            <Card
              sx={{
                height: '100%',
                transition: 'all 0.3s',
                '&:hover': {
                  boxShadow: theme.shadows[8],
                },
              }}
            >
              <CardContent>
                <Stack spacing={2}>
                  <Typography variant="h6">{card.title}</Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {card.summary}
                  </Typography>
                  <Stack spacing={1}>
                    {card.bullets.map((bullet, index) => (
                      <Stack key={index} direction="row" spacing={1.5} alignItems="flex-start">
                        <Box
                          sx={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            bgcolor: theme.palette.primary.main,
                            mt: 1,
                            flexShrink: 0,
                          }}
                        />
                        <Typography variant="body2">{bullet}</Typography>
                      </Stack>
                    ))}
                  </Stack>
                  <Typography
                    variant="caption"
                    sx={{
                      color: 'text.disabled',
                      fontStyle: 'italic',
                      pt: 1,
                      borderTop: `1px dashed ${alpha(theme.palette.divider, 0.5)}`,
                    }}
                  >
                    Source: {card.sourceNote}
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <Box
      sx={{
        py: { xs: 8, md: 10 },
        bgcolor: alpha(theme.palette.grey[500], 0.04),
      }}
    >
      <Container maxWidth="lg">
        {renderHeroStats()}

        {/* Budget Overview with Pie Charts */}
        <BudgetOverview
          fiscalYear={2025}
          onCategoryClick={(storyBucketId: StoryBucketId) => {
            // Optional: Add navigation to Budget Decoder with category filter
            console.log('Category clicked:', storyBucketId);
          }}
        />

        {renderSpendingByArea()}
        {renderOneTimeVsOngoing()}
        {renderGfRevenueComposition()}
        {renderBeforeAfter()}
        {renderImpactCards()}
      </Container>
    </Box>
  );
}


