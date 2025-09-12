'use client';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';

import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export function BlankView() {
  return (
    <DashboardContent>
      <Box sx={{ textAlign: 'center', py: 10 }}>
        <Card sx={{ p: 5, maxWidth: 600, mx: 'auto' }}>
          <Iconify icon="eva:file-text-outline" sx={{ width: 64, height: 64, mx: 'auto', mb: 3, color: 'text.disabled' }} />
          <Typography variant="h4" sx={{ mb: 2 }}>
            Blank Page
          </Typography>
          <Typography variant="body1" color="text.secondary">
            This is a blank page template for the civic budget transparency platform.
          </Typography>
        </Card>
      </Box>
    </DashboardContent>
  );
}
