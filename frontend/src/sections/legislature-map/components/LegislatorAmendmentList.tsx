'use client';

/**
 * Legislator Amendment List Component
 * Displays a clean, LIS-style list of amendments for a legislator
 * WITHOUT showing Item Numbers anywhere in the UI
 */

import type { LegislatorAmendmentSummary } from 'src/lib/amendments';

import { Box, Card, Stack, Typography, CardContent } from '@mui/material';

import { getSpendingCategoryById } from 'src/data/spendingCategories';

// ----------------------------------------------------------------------

interface LegislatorAmendmentListProps {
  selectedYear: number;
  patronNameForVault: string;
  summaries: LegislatorAmendmentSummary[];
}

// ----------------------------------------------------------------------

/**
 * Format currency value
 */
const formatCurrency = (value: number): string =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);

// ----------------------------------------------------------------------

export function LegislatorAmendmentList({
  selectedYear,
  patronNameForVault,
  summaries,
}: LegislatorAmendmentListProps) {
  return (
    <Box sx={{ mt: 3 }}>
      {/* Section Heading */}
      <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
        {selectedYear} Member Request amendments
      </Typography>
      
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        A breakdown of this legislator&apos;s {selectedYear} Member Request amendments in the state budget, showing the programs and entities they tried to fund.
      </Typography>

      {/* Amendment List */}
      {summaries.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No Member Request amendments with second-year funding increases were found for {selectedYear}.
        </Typography>
      ) : (
        <Stack spacing={1.5}>
          {summaries.map((summary) => {
            // Get category label
            const categoryLabel = getSpendingCategoryById(summary.spendingCategoryId).label;

            // Determine recipient text
            const hasHighConfidenceRecipient =
              summary.primaryRecipientName &&
              (summary.recipientConfidence ?? 0) >= 0.9;

            const recipientText = hasHighConfidenceRecipient
              ? summary.primaryRecipientName
              : "Not specified";

            // Truncate description to ~180 chars and add ellipsis if needed
            const maxDescLength = 180;
            const description = summary.descriptionShort.length > maxDescLength
              ? `${summary.descriptionShort.slice(0, maxDescLength)}…`
              : summary.descriptionShort;

            return (
              <Card
                key={summary.id}
                variant="outlined"
                sx={{
                  bgcolor: 'background.paper',
                  '&:hover': {
                    boxShadow: 2,
                  },
                }}
              >
                <CardContent>
                  {/* Amendment Description */}
                  <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 500 }}>
                    {description}
                  </Typography>

                  {/* Amendment Details */}
                  <Stack
                    direction="row"
                    spacing={2}
                    sx={{ mt: 1 }}
                    flexWrap="wrap"
                    useFlexGap
                  >
                    <Typography variant="body2">
                      <strong>Funding (second year):</strong> {formatCurrency(summary.netAmount)}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Funding area:</strong> {categoryLabel}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        color: hasHighConfidenceRecipient ? 'text.primary' : 'text.secondary',
                      }}
                    >
                      <strong>Intended recipient:</strong> {recipientText}
                    </Typography>
                  </Stack>
                </CardContent>
              </Card>
            );
          })}
        </Stack>
      )}
    </Box>
  );
}

