/**
 * Legislator details display component
 * Clean version for Next.js migration - NO amendment stats or tables
 * 
 * NEXT.JS MIGRATION NOTE:
 * - This is a client component, add 'use client' directive
 * - MUI imports remain the same
 */

import {
  Box,
  Card,
  Chip,
  Link,
  Stack,
  Avatar,
  Button,
  Typography,
  CardContent,
} from '@mui/material';
import { Phone as PhoneIcon, Email as EmailIcon, OpenInNew as OpenInNewIcon } from '@mui/icons-material';

import type { Legislator, DistrictProperties } from '../types';

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
 * LegislatorDetails component
 * Displays information about selected legislator(s)
 */
export function LegislatorDetails({
  district,
  legislators,
  chamber,
}: LegislatorDetailsProps) {
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

  return (
    <Stack spacing={2}>
      <Box>
        <Typography variant="h6" sx={{ mb: 1 }}>
          {districtLabel}
        </Typography>
        <Typography variant="body2" color="textSecondary">
          {legislators.length} representative{legislators.length !== 1 ? 's' : ''}
        </Typography>
      </Box>

      <Stack spacing={2}>
        {legislators.map((legislator, idx) => {
          const partyCode = getPartyCode(legislator.party);
          const partyColor = PARTY_COLORS[partyCode] || '#999';
          const partyLabel = PARTY_LABELS[partyCode] || legislator.party || 'Unknown';

          return (
            <Card key={idx} sx={{ bgcolor: 'background.paper' }}>
              <CardContent>
                <Stack spacing={3}>
                  {/* Avatar - Large with curved corners */}
                  <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                    <Avatar
                      src={legislator.photoUrl}
                      alt={legislator.name}
                      sx={{
                        width: 120,
                        height: 120,
                        borderRadius: 2,
                        border: '3px solid',
                        borderColor: partyColor,
                      }}
                    />
                  </Box>

                  {/* Name and Party */}
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
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
                  <Stack spacing={1.5}>
                    {legislator.phone && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <PhoneIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
                        <Link href={`tel:${legislator.phone}`} underline="hover">
                          {legislator.phone}
                        </Link>
                      </Box>
                    )}

                    {legislator.email && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <EmailIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
                        <Link href={`mailto:${legislator.email}`} underline="hover">
                          {legislator.email}
                        </Link>
                      </Box>
                    )}
                  </Stack>

                  {/* Profile Link */}
                  {legislator.url && (
                    <Button
                      variant="outlined"
                      endIcon={<OpenInNewIcon />}
                      href={legislator.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      fullWidth
                    >
                      View Full Profile
                    </Button>
                  )}
                </Stack>
              </CardContent>
            </Card>
          );
        })}
      </Stack>
    </Stack>
  );
}

