'use client';

import dynamic from 'next/dynamic';
import { Box, Container, CircularProgress } from '@mui/material';

// Dynamic import to avoid SSR issues with Mapbox
const LegislatureMapPage = dynamic(
  () => import('../components/LegislatureMapPage').then((mod) => ({ default: mod.LegislatureMapPage })),
  {
    ssr: false,
    loading: () => (
      <Box
        sx={{
          height: 600,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <CircularProgress />
      </Box>
    ),
  }
);

export function LegislatureMapView() {
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

  return (
    <Container maxWidth={false} disableGutters>
      <LegislatureMapPage mapboxToken={mapboxToken} />
    </Container>
  );
}

