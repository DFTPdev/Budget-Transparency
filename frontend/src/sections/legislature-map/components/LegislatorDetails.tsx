'use client';

/**
 * Legislator details display component
 * Clean version for Next.js migration - NO amendment stats or tables
 */

import type { Legislator, DistrictProperties } from '../types';
import type { LegislatorCardData, AmendmentSummary } from 'src/lib/legislators';

import { useState } from 'react';

// Helper function to capitalize first letter of a string
function capitalizeFirstLetter(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

import {
  Box,
  Card,
  Chip,
  Grid,
  Link,
  Stack,
  Button,
  Typography,
  CardContent,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';

import { getLisMemberRequestsForYear } from 'src/lib/legislators';
import { computeLisStoryBucketSlices, computeLisTotalRequested } from 'src/lib/legislators/aggregation';

import { Iconify } from 'src/components/iconify';

import { LegislatorFocusPie } from './LegislatorFocusPie';

/**
 * Format currency value
 */
const formatCurrency = (value: number): string =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);

interface LegislatorDetailsProps {
  district: DistrictProperties | null;
  legislators: Legislator[];
  chamber: 'house' | 'senate';
}

const PARTY_COLORS: Record<string, string> = {
  D: '#1976d2', // Blue
  R: '#d32f2f', // Red
  I: '#f57c00', // Orange
};

const PARTY_LABELS: Record<string, string> = {
  D: 'Democrat',
  R: 'Republican',
  I: 'Independent',
};

/**
 * Get party code from full name
 */
function getPartyCode(party?: string): string {
  if (!party) return 'I';
  if (party.includes('Democrat')) return 'D';
  if (party.includes('Republican')) return 'R';
  return 'I';
}

/**
 * LIS Member Requests Inline Component
 * Compact version for embedding in the Funding Recipients section
 */
interface LisMemberRequestsInlineProps {
  lisId: string | undefined;
  year: 2024 | 2025;
}

function LisMemberRequestsInline({ lisId, year }: LisMemberRequestsInlineProps) {
  if (!lisId) {
    return (
      <Box>
        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
          Member Requests from LIS ({year})
        </Typography>
        <Box
          sx={{
            p: 2,
            border: '2px dashed',
            borderColor: 'divider',
            borderRadius: 1,
            textAlign: 'center',
          }}
        >
          <Typography variant="body2" color="text.secondary">
            No LIS ID available for this legislator.
          </Typography>
        </Box>
      </Box>
    );
  }

  const lisData = getLisMemberRequestsForYear(lisId, year);

  if (!lisData) {
    return (
      <Box>
        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
          Member Requests from LIS ({year})
        </Typography>
        <Box
          sx={{
            p: 2,
            border: '2px dashed',
            borderColor: 'divider',
            borderRadius: 1,
            textAlign: 'center',
          }}
        >
          <Typography variant="body2" color="text.secondary">
            No LIS data found for this legislator in {year}.
          </Typography>
        </Box>
      </Box>
    );
  }

  const billCode = year === 2024 ? 'HB30' : 'HB1600';
  const mrData = lisData.amendments[billCode]?.MR;

  if (!mrData || mrData.items.length === 0) {
    return (
      <Box>
        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
          Member Requests from LIS ({year})
        </Typography>
        <Box
          sx={{
            p: 2,
            border: '2px dashed',
            borderColor: 'divider',
            borderRadius: 1,
            textAlign: 'center',
          }}
        >
          <Typography variant="body2" color="text.secondary">
            No Member Request amendments found for {year} ({billCode}).
          </Typography>
        </Box>
      </Box>
    );
  }

  const { totals, items } = mrData;

  return (
    <Box>
      <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
        Member Requests from LIS ({year})
      </Typography>

      {/* Summary Stats */}
      <Box sx={{ mb: 1.5, p: 1.5, bgcolor: 'grey.100', borderRadius: 1 }}>
        <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
              Total Requests
            </Typography>
            <Typography variant="body2" fontWeight={600}>{totals.count}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
              Second Year Total
            </Typography>
            <Typography variant="body2" fontWeight={600}>{formatCurrency(totals.fySecondTotal)}</Typography>
          </Box>
        </Stack>
      </Box>

      {/* Amendment List - Compact */}
      <Stack spacing={1} sx={{ maxHeight: 300, overflowY: 'auto', pr: 0.5 }}>
        {items.map((item, idx) => (
          <Box
            key={`${item.item}-${idx}`}
            sx={{
              p: 1.5,
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1,
              '&:hover': {
                boxShadow: 1,
              },
            }}
          >
            <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 500, fontSize: '0.85rem' }}>
              {item.title}
            </Typography>
            <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
              {item.fyFirst !== null && (
                <Typography variant="caption" color="text.secondary">
                  <strong>FY1:</strong> {formatCurrency(item.fyFirst)}
                </Typography>
              )}
              {item.fySecond !== null && (
                <Typography variant="caption" color="text.secondary">
                  <strong>FY2:</strong> {formatCurrency(item.fySecond)}
                </Typography>
              )}
              {item.amountType === 'language-only' && (
                <Typography variant="caption" color="text.secondary">
                  <strong>Language-only</strong>
                </Typography>
              )}
              {item.lisUrl && (
                <Link
                  href={item.lisUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="caption"
                  sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}
                >
                  LIS
                  <Iconify icon="eva:external-link-outline" width={12} />
                </Link>
              )}
            </Stack>
          </Box>
        ))}
      </Stack>
    </Box>
  );
}

/**
 * LIS Member Requests Section for a Single Year
 * Displays member requests from LIS for a specific year
 */
interface LisMemberRequestsYearSectionProps {
  lisId: string;
  year: 2024 | 2025;
}

function LisMemberRequestsYearSection({ lisId, year }: LisMemberRequestsYearSectionProps) {
  // Fetch LIS data for this legislator and year
  const lisData = getLisMemberRequestsForYear(lisId, year);

  // If no data found, don't show anything (keeps UI clean)
  if (!lisData) {
    return null;
  }

  // Get the appropriate bill code for the year
  const billCode = year === 2024 ? 'HB30' : 'HB1600';
  const mrData = lisData.amendments[billCode]?.MR;

  if (!mrData || mrData.items.length === 0) {
    return null;
  }

  const { totals, items } = mrData;

  return (
    <Box sx={{ mt: 3 }}>
      {/* Section Heading */}
      <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
        Member Requests from LIS ({year})
      </Typography>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Official Member Request amendments as shown on the Virginia LIS website for {year} ({billCode}).
      </Typography>

      {/* Summary Stats */}
      <Box sx={{ mb: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
        <Stack direction="row" spacing={3} flexWrap="wrap" useFlexGap>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Total Requests
            </Typography>
            <Typography variant="h6">{totals.count}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Second Year Total
            </Typography>
            <Typography variant="h6">{formatCurrency(totals.fySecondTotal)}</Typography>
          </Box>
          {totals.languageOnlyCount > 0 && (
            <Box>
              <Typography variant="caption" color="text.secondary">
                Language-Only
              </Typography>
              <Typography variant="h6">{totals.languageOnlyCount}</Typography>
            </Box>
          )}
        </Stack>
      </Box>

      {/* Amendment Rows */}
      <Stack spacing={1.5}>
        {items.map((item, idx) => (
          <Card
            key={`${item.item}-${idx}`}
            variant="outlined"
            sx={{
              bgcolor: 'background.paper',
              '&:hover': {
                boxShadow: 2,
              },
            }}
          >
            <CardContent>
              {/* Title */}
              <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 500 }}>
                {item.title}
              </Typography>

              {/* Details */}
              <Stack
                direction="row"
                spacing={2}
                sx={{ mt: 1 }}
                flexWrap="wrap"
                useFlexGap
              >
                {item.fyFirst !== null && (
                  <Typography variant="body2">
                    <strong>First Year:</strong> {formatCurrency(item.fyFirst)}
                  </Typography>
                )}
                {item.fySecond !== null && (
                  <Typography variant="body2">
                    <strong>Second Year:</strong> {formatCurrency(item.fySecond)}
                  </Typography>
                )}
                {item.amountType === 'language-only' && (
                  <Typography variant="body2" color="text.secondary">
                    <strong>Language-only amendment</strong>
                  </Typography>
                )}
                {item.lisUrl && (
                  <Link
                    href={item.lisUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    variant="body2"
                    sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                  >
                    View on LIS
                    <Iconify icon="eva:external-link-outline" width={16} />
                  </Link>
                )}
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Stack>
    </Box>
  );
}

/**
 * LIS Member Requests Sections
 * Displays member requests from LIS for both 2024 and 2025
 */
interface LisMemberRequestsSectionsProps {
  lisId: string | undefined;
}

function LisMemberRequestsSections({ lisId }: LisMemberRequestsSectionsProps) {
  // If no LIS ID, can't fetch data
  if (!lisId) {
    return null;
  }

  return (
    <>
      {/* 2025 Section */}
      <LisMemberRequestsYearSection lisId={lisId} year={2025} />

      {/* 2024 Section */}
      <LisMemberRequestsYearSection lisId={lisId} year={2024} />
    </>
  );
}

/**
 * LegislatorDetails component
 * Displays information about selected legislator(s)
 */
export function LegislatorDetails({
  district,
  legislators,
  chamber,
}: LegislatorDetailsProps) {
  // State for year toggle (default to 2025 only)
  const [selectedYear, setSelectedYear] = useState<2024 | 2025>(2025);

  if (!district) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography color="textSecondary">
          Enter an address or click a district on the map to see legislator details
        </Typography>
      </Box>
    );
  }

  const chamberLabel = chamber === 'house' ? 'House' : 'Senate';
  const districtLabel = `${chamberLabel} District ${district.districtId}`;

  const handleYearChange = (event: React.MouseEvent<HTMLElement>, newYear: 2024 | 2025 | null) => {
    if (newYear !== null) {
      setSelectedYear(newYear);
    }
  };

  return (
    <Stack spacing={2}>
      <Stack spacing={2}>
        {legislators.map((legislator, idx) => {
          const partyCode = getPartyCode(legislator.party);
          const partyColor = PARTY_COLORS[partyCode] || '#999';
          const partyLabel = PARTY_LABELS[partyCode] || legislator.party || 'Unknown';

          // ===== AMENDMENT DATA WIRING =====
          // Get LIS data for this legislator
          const lisData = getLisMemberRequestsForYear(legislator.lisId, selectedYear);

          // Compute spending focus slices from LIS data using story buckets
          const slices = computeLisStoryBucketSlices(lisData, selectedYear);

          // Compute total requested from LIS data
          const totalRequested = computeLisTotalRequested(lisData, selectedYear);

          return (
            <Card key={idx} sx={{ bgcolor: 'background.paper' }}>
              <CardContent>
                <Grid container spacing={3}>
                  {/* LEFT: Profile (25%) */}
                  <Grid item xs={12} sm={12} md={3} lg={3} sx={{ flexBasis: { lg: '25%' }, maxWidth: { lg: '25%' } }}>
                    <Stack spacing={2}>
                      {/* District Number */}
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        {districtLabel}
                      </Typography>

                      {/* Large Portrait Photo */}
                      <Box
                        component="img"
                        src={legislator.photoUrl}
                        alt={legislator.name}
                        sx={{
                          width: '100%',
                          height: 'auto',
                          objectFit: 'contain',
                          borderRadius: 2,
                          boxShadow: 6,
                          border: '3px solid',
                          borderColor: partyColor,
                        }}
                      />

                      {/* Name and Party */}
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                          {legislator.name}
                        </Typography>
                        <Chip
                          label={partyLabel}
                          size="small"
                          sx={{
                            bgcolor: partyColor,
                            color: 'white',
                            fontWeight: 600,
                          }}
                        />
                      </Box>

                      {/* Contact Information */}
                      <Stack spacing={1}>
                        {legislator.phone && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Iconify icon="solar:phone-bold" width={18} sx={{ color: 'text.secondary' }} />
                            <Link href={`tel:${legislator.phone}`} underline="hover" variant="body2">
                              {legislator.phone}
                            </Link>
                          </Box>
                        )}

                        {legislator.email && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Iconify icon="solar:letter-bold" width={18} sx={{ color: 'text.secondary' }} />
                            <Link href={`mailto:${legislator.email}`} underline="hover" variant="body2">
                              {legislator.email}
                            </Link>
                          </Box>
                        )}
                      </Stack>

                      {/* Profile Link */}
                      {legislator.url && (
                        <Button
                          variant="outlined"
                          size="small"
                          endIcon={<Iconify icon="solar:arrow-right-up-linear" />}
                          href={legislator.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          fullWidth
                        >
                          View Full Profile
                        </Button>
                      )}
                    </Stack>
                  </Grid>

                  {/* MIDDLE: Spending Focus (33% - centered) */}
                  <Grid item xs={12} sm={12} md={4} lg={4} sx={{ flexBasis: { lg: '33.33%' }, maxWidth: { lg: '33.33%' } }}>
                    <Stack spacing={0.5} sx={{ height: '100%', alignItems: 'center' }}>
                      {/* Header - centered */}
                      <Typography variant="h6" sx={{ lineHeight: 1.3, fontWeight: 600, mb: 0.5 }}>
                        Spending Focus
                      </Typography>

                      {/* Year Toggle below header */}
                      <ToggleButtonGroup
                        value={selectedYear}
                        exclusive
                        onChange={handleYearChange}
                        size="medium"
                        sx={{
                          height: 40,
                          mb: 0.5,
                          border: 'none',
                          '& .MuiToggleButtonGroup-grouped': {
                            border: 'none !important',
                            '&.Mui-selected': {
                              borderRadius: 1,
                            },
                            '&:not(:first-of-type)': {
                              borderRadius: 1,
                              marginLeft: 1,
                            },
                            '&:first-of-type': {
                              borderRadius: 1,
                            },
                          },
                        }}
                      >
                        <ToggleButton
                          value={2024}
                          sx={{
                            px: 2,
                            py: 0.5,
                            fontSize: '0.875rem',
                            minWidth: 60,
                            border: 'none !important',
                          }}
                        >
                          2024
                        </ToggleButton>
                        <ToggleButton
                          value={2025}
                          sx={{
                            px: 2,
                            py: 0.5,
                            fontSize: '0.875rem',
                            minWidth: 60,
                            border: 'none !important',
                          }}
                        >
                          2025
                        </ToggleButton>
                      </ToggleButtonGroup>

                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5, lineHeight: 1.4, textAlign: 'center', maxWidth: 400 }}>
                        {selectedYear} Member Request amendments grouped into story buckets (Schools & Kids, Health & Care, etc.).
                      </Typography>
                      {slices.length > 0 ? (
                        <LegislatorFocusPie slices={slices} />
                      ) : (
                        <Box
                          sx={{
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minHeight: 200,
                          }}
                        >
                          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
                            No amendments found
                          </Typography>
                        </Box>
                      )}
                    </Stack>
                  </Grid>

                  {/* RIGHT: Funding Recipients (33%) */}
                  <Grid item xs={12} sm={12} md={4} lg={4} sx={{ flexBasis: { lg: '33.33%' }, maxWidth: { lg: '33.33%' } }}>
                    <Stack spacing={2} sx={{ height: '100%' }}>
                      {/* Header */}
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                          Funding Recipients
                        </Typography>

                        {/* Year Toggle for Funding Recipients */}
                        <ToggleButtonGroup
                          value={selectedYear}
                          exclusive
                          onChange={handleYearChange}
                          size="small"
                          sx={{
                            mb: 1,
                            border: 'none',
                            '& .MuiToggleButtonGroup-grouped': {
                              border: 'none !important',
                              '&.Mui-selected': {
                                borderRadius: 1,
                              },
                              '&:not(:first-of-type)': {
                                borderRadius: 1,
                                marginLeft: 1,
                              },
                              '&:first-of-type': {
                                borderRadius: 1,
                              },
                            },
                          }}
                        >
                          <ToggleButton
                            value={2024}
                            sx={{
                              px: 2,
                              py: 0.5,
                              fontSize: '0.875rem',
                              minWidth: 60,
                              border: 'none !important',
                            }}
                          >
                            2024
                          </ToggleButton>
                          <ToggleButton
                            value={2025}
                            sx={{
                              px: 2,
                              py: 0.5,
                              fontSize: '0.875rem',
                              minWidth: 60,
                              border: 'none !important',
                            }}
                          >
                            2025
                          </ToggleButton>
                        </ToggleButtonGroup>

                        <Typography variant="body2" color="text.secondary" sx={{ display: 'block' }}>
                          Official Member Requests from the Virginia LIS website for {selectedYear}.
                        </Typography>
                      </Box>

                      {/* LIS Member Requests */}
                      <LisMemberRequestsInline lisId={legislator.lisId} year={selectedYear} />
                    </Stack>
                  </Grid>
                </Grid>

                {/* Disclaimer */}
                <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="caption" color="text.secondary">
                    Figures show what this legislator requested in budget amendments for the selected year. They do not guarantee final adoption or funding.
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          );
        })}
      </Stack>
    </Stack>
  );
}

