'use client';

import dynamic from 'next/dynamic';
import { Container, Typography, Box } from '@mui/material';

const SpotlightMap = dynamic(() => import('src/components/SpotlightMap').then(mod => ({ default: mod.SpotlightMap })), {
  ssr: false,
  loading: () => <Box sx={{ height: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading map...</Box>
});

export function SpotlightMapView() {
  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <Typography variant="h3" sx={{ mb: 2 }}>
          District Spotlight Map
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Interactive map showing district boundaries with budget totals • Hover for details • Click for budget decoder links
        </Typography>
      </Box>
      
      <SpotlightMap />
    </Container>
  );
}
