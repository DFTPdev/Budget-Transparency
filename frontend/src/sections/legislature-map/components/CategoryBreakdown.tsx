'use client';

/**
 * Category Breakdown Quick Reference
 * Shows all story buckets with color-coded chips and descriptions
 */

import { Box, Chip, Stack, Typography } from '@mui/material';

import type { StoryBucketId } from 'src/data/spendingStoryBuckets';
import { STORY_BUCKET_LABELS, STORY_BUCKET_COLORS } from 'src/data/spendingStoryBuckets';

// ----------------------------------------------------------------------

// Story bucket descriptions for quick reference
const STORY_BUCKET_DESCRIPTIONS: Record<StoryBucketId, string> = {
  schools_kids: 'K-12 education, colleges, universities, and student support programs',
  health_care: 'Healthcare, mental health, social services, and support for vulnerable populations',
  safety_justice: 'Law enforcement, courts, corrections, emergency response, and public safety',
  roads_transit: 'Highways, bridges, public transit, rail, and transportation infrastructure',
  jobs_business_innovation: 'Economic development, workforce training, agriculture, and business support',
  parks_environment_energy: 'State parks, environmental protection, conservation, and clean energy',
  veterans_military: 'Veterans benefits, military family support, and services for those who served',
  government_overhead: 'Administration, legislature, finance, employee benefits, and government operations',
  debt_reserves: 'Debt service, bond payments, and financial reserves for emergencies',
};

// Order for display (most common first)
const DISPLAY_ORDER: StoryBucketId[] = [
  'schools_kids',
  'health_care',
  'safety_justice',
  'roads_transit',
  'jobs_business_innovation',
  'parks_environment_energy',
  'veterans_military',
  'government_overhead',
  'debt_reserves',
];

// ----------------------------------------------------------------------

export interface CategoryBreakdownProps {
  // No props needed - this is a static reference guide
}

// ----------------------------------------------------------------------

export function CategoryBreakdown({}: CategoryBreakdownProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        px: 2,
        py: 1,
      }}
    >
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ mb: 2, lineHeight: 1.4, textAlign: 'center' }}
      >
        Quick reference guide to the 9 story bucket categories used to group budget amendments.
      </Typography>

      <Stack spacing={2} sx={{ flex: 1, overflowY: 'auto' }}>
        {DISPLAY_ORDER.map((bucketId) => (
          <Box
            key={bucketId}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 0.5,
            }}
          >
            {/* Category chip with color */}
            <Chip
              label={STORY_BUCKET_LABELS[bucketId]}
              sx={{
                backgroundColor: STORY_BUCKET_COLORS[bucketId],
                color: '#fff',
                fontWeight: 600,
                fontSize: '0.875rem',
                height: 32,
                alignSelf: 'flex-start',
                '& .MuiChip-label': {
                  px: 2,
                },
              }}
            />

            {/* Description */}
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                fontSize: '0.8125rem',
                lineHeight: 1.5,
                pl: 0.5,
              }}
            >
              {STORY_BUCKET_DESCRIPTIONS[bucketId]}
            </Typography>
          </Box>
        ))}
      </Stack>

      <Box
        sx={{
          mt: 2,
          pt: 2,
          borderTop: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{
            display: 'block',
            textAlign: 'center',
            fontStyle: 'italic',
          }}
        >
          Categories group 17 technical budget areas into 9 human-friendly narratives
        </Typography>
      </Box>
    </Box>
  );
}

