import React from 'react';
import { Card, Box, Typography, useTheme } from '@mui/material';

// Compact money formatter for legend display
export function fmtMoney(n: number | null | undefined): string {
  if (n == null) return 'Gray: No budget data';
  if (isNaN(n)) return String(n);
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n}`;
}

interface LegendBucket {
  color: string;
  label: string;
  min?: number;
  max?: number;
}

interface MapLegendProps {
  buckets: LegendBucket[];
  title?: string;
  noDataLabel?: string;
  useFormatter?: boolean; // Whether to apply fmtMoney to bucket labels
}

// Helper function to format bucket labels with ranges
function formatBucketLabel(bucket: LegendBucket, useFormatter: boolean = true): string {
  if (!useFormatter) return bucket.label;

  // If bucket already has a formatted label, use it
  if (!bucket.min && !bucket.max) return bucket.label;

  // Format range labels
  if (bucket.min !== undefined && bucket.max !== undefined) {
    if (bucket.min === bucket.max) {
      return fmtMoney(bucket.min);
    }
    return `${fmtMoney(bucket.min)} - ${fmtMoney(bucket.max)}`;
  }

  if (bucket.min !== undefined) {
    return `${fmtMoney(bucket.min)}+`;
  }

  if (bucket.max !== undefined) {
    return `< ${fmtMoney(bucket.max)}`;
  }

  return bucket.label;
}

export function MapLegend({
  buckets,
  title = 'District Budget',
  noDataLabel = 'Gray: No budget data',
  useFormatter = true
}: MapLegendProps) {
  const theme = useTheme();

  return (
    <Card
      sx={{
        position: 'absolute',
        bottom: 16,
        right: 16,
        backgroundColor: theme.palette.background.paper,
        borderRadius: 2,
        padding: 2,
        minWidth: 160,
        maxWidth: 190,
        boxShadow: theme.shadows[4],
        zIndex: 1200,
        pointerEvents: 'auto',
      }}
      aria-label="Map legend showing budget ranges by color"
    >
      <Typography
        variant="subtitle2"
        sx={{
          fontWeight: 600,
          mb: 1,
          color: theme.palette.text.primary
        }}
      >
        {title}
      </Typography>

      {buckets.map((bucket, index) => (
        <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
          <Box
            sx={{
              width: 16,
              height: 16,
              backgroundColor: bucket.color,
              borderRadius: 0.5,
              mr: 1,
              border: `1px solid ${theme.palette.divider}`,
              flexShrink: 0,
            }}
          />
          <Typography
            variant="caption"
            sx={{
              color: theme.palette.text.primary,
              fontSize: '0.75rem',
              lineHeight: 1.2,
            }}
          >
            {formatBucketLabel(bucket, useFormatter)}
          </Typography>
        </Box>
      ))}

      {noDataLabel && (
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          mt: 1,
          pt: 1,
          borderTop: `1px solid ${theme.palette.divider}`
        }}>
          <Box
            sx={{
              width: 16,
              height: 16,
              backgroundColor: theme.palette.mode === 'dark' ? '#424242' : '#e0e0e0',
              borderRadius: 0.5,
              mr: 1,
              border: `1px solid ${theme.palette.divider}`,
              flexShrink: 0,
            }}
          />
          <Typography
            variant="caption"
            sx={{
              color: theme.palette.text.secondary,
              fontSize: '0.75rem',
              lineHeight: 1.2,
            }}
          >
            {noDataLabel}
          </Typography>
        </Box>
      )}
    </Card>
  );
}
