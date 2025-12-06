'use client';

/**
 * Legislator Amendment Focus Pie Chart
 * Shows spending focus grouped by human-friendly story buckets
 */

import { useMemo } from 'react';

import { Box, Stack, Typography } from '@mui/material';

import type { StoryBucketId } from 'src/data/spendingStoryBuckets';
import { STORY_BUCKET_LABELS, STORY_BUCKET_COLORS } from 'src/data/spendingStoryBuckets';

import { Chart, useChart } from 'src/components/chart';

// ----------------------------------------------------------------------

export interface LegislatorAmendmentFocusSlice {
  bucketId: StoryBucketId;
  totalAmount: number; // total dollar impact for this story bucket
}

export interface LegislatorFocusPieProps {
  slices: LegislatorAmendmentFocusSlice[];
}

// ----------------------------------------------------------------------

const OTHER_COLOR = "#B0BEC5"; // neutral gray-ish for "Other"
const MIN_PERCENT = 5; // slices smaller than this percent get grouped into "Other"

// ----------------------------------------------------------------------

const formatDollars = (value: number): string =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);

const formatPercent = (value: number): string => `${value.toFixed(1)}%`;

// ----------------------------------------------------------------------

interface ChartSlice {
  label: string;
  value: number;
  percent: number;
  color: string;
  isOther: boolean;
}

// ----------------------------------------------------------------------

export function LegislatorFocusPie({ slices }: LegislatorFocusPieProps) {
  const chartData = useMemo(() => {
    // Compute total
    const total = slices.reduce((sum, s) => sum + s.totalAmount, 0);

    if (total <= 0) {
      return null;
    }

    // Compute raw percentages
    const slicesWithPercent = slices.map((s) => ({
      ...s,
      percent: (s.totalAmount / total) * 100,
    }));

    // Partition into major and minor
    const major = slicesWithPercent.filter((s) => s.percent >= MIN_PERCENT);
    const minor = slicesWithPercent.filter((s) => s.percent < MIN_PERCENT);

    // Sum minor values
    const otherAmount = minor.reduce((sum, s) => sum + s.totalAmount, 0);
    const hasOther = otherAmount > 0;

    // Build chart slices
    const chartSlices: ChartSlice[] = major.map((s) => ({
      label: STORY_BUCKET_LABELS[s.bucketId],
      value: s.totalAmount,
      percent: s.percent,
      color: STORY_BUCKET_COLORS[s.bucketId],
      isOther: false,
    }));

    if (hasOther) {
      chartSlices.push({
        label: "Other",
        value: otherAmount,
        percent: (otherAmount / total) * 100,
        color: OTHER_COLOR,
        isOther: true,
      });
    }

    return {
      total,
      slices: chartSlices,
    };
  }, [slices]);

  const chartOptions = useChart({
    labels: chartData?.slices.map((s) => s.label) || [],
    colors: chartData?.slices.map((s) => s.color) || [],
    legend: { show: false },
    plotOptions: {
      pie: {
        donut: {
          size: '70%',
          labels: {
            show: true,
            value: {
              fontSize: '32px',
              fontWeight: 700,
              formatter: (val: string) => formatDollars(Number(val)),
            },
            total: {
              show: true,
              label: 'Total requested (second-year dollars)',
              fontSize: '14px',
              fontWeight: 600,
              formatter: () => formatDollars(chartData?.total || 0),
            },
          },
        },
      },
    },
    dataLabels: {
      enabled: false,
    },
    tooltip: {
      y: {
        formatter: (value: number, opts) => {
          const sliceIndex = opts.seriesIndex;
          const slice = chartData?.slices[sliceIndex];
          if (!slice) return formatDollars(value);
          return `${formatDollars(value)} • ${formatPercent(slice.percent)} of amendment dollars`;
        },
      },
    },
  });

  if (!chartData) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="body2" color="text.secondary">
          No amendment data yet for this legislator.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', alignItems: 'center' }}>
      {/* Chart - doubled in size */}
      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: 400 }}>
        <Chart
          type="donut"
          series={chartData.slices.map((s) => s.value)}
          options={chartOptions}
          sx={{ height: 400, width: 400 }}
        />
      </Box>

      {/* Legend - moved to bottom with doubled font sizes, constrained to chart width */}
      <Stack spacing={1} sx={{ mt: 2, width: 400 }}>
        {chartData.slices.map((slice, index) => (
          <Box
            key={index}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
            }}
          >
            <Box
              sx={{
                width: 16,
                height: 16,
                borderRadius: '50%',
                backgroundColor: slice.color,
                flexShrink: 0,
              }}
            />
            <Typography variant="body2" sx={{ flex: 1 }}>
              {slice.label}
            </Typography>
            <Typography variant="body2" fontWeight={600}>
              {formatPercent(slice.percent)}
            </Typography>
          </Box>
        ))}
      </Stack>
    </Box>
  );
}

