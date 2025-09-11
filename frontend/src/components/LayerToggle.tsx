import React from 'react';
import { Card, Typography, FormControlLabel, Switch, Stack, useTheme } from '@mui/material';

interface LayerToggleProps {
  districtChecked: boolean;
  precinctChecked: boolean;
  onDistricts: (checked: boolean) => void;
  onPrecincts: (checked: boolean) => void;
}

export function LayerToggle({
  districtChecked,
  precinctChecked,
  onDistricts,
  onPrecincts
}: LayerToggleProps) {
  const theme = useTheme();

  return (
    <Card
      sx={{
        position: 'absolute',
        top: 16,
        right: 16,
        backgroundColor: theme.palette.background.paper,
        borderRadius: 2,
        padding: 2,
        minWidth: 140,
        maxWidth: 160,
        boxShadow: theme.shadows[4],
        zIndex: 1200,
        pointerEvents: 'auto',
      }}
      aria-label="Layer visibility controls"
    >
      <Typography
        variant="subtitle2"
        sx={{
          fontWeight: 600,
          mb: 1,
          color: theme.palette.text.primary
        }}
      >
        Layers
      </Typography>
      <Stack spacing={0.5}>
        <FormControlLabel
          control={
            <Switch
              checked={districtChecked}
              onChange={(e) => onDistricts(e.target.checked)}
              size="small"
              sx={{
                '& .MuiSwitch-switchBase.Mui-checked': {
                  color: theme.palette.primary.main,
                },
                '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                  backgroundColor: theme.palette.primary.main,
                },
              }}
            />
          }
          label={
            <Typography
              variant="caption"
              sx={{
                color: theme.palette.text.primary,
                fontSize: '0.75rem',
              }}
            >
              Districts
            </Typography>
          }
          sx={{ m: 0 }}
          aria-label="Toggle district boundaries visibility"
        />
        <FormControlLabel
          control={
            <Switch
              checked={precinctChecked}
              onChange={(e) => onPrecincts(e.target.checked)}
              size="small"
              sx={{
                '& .MuiSwitch-switchBase.Mui-checked': {
                  color: theme.palette.primary.main,
                },
                '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                  backgroundColor: theme.palette.primary.main,
                },
              }}
            />
          }
          label={
            <Typography
              variant="caption"
              sx={{
                color: theme.palette.text.primary,
                fontSize: '0.75rem',
              }}
            >
              Precincts
            </Typography>
          }
          sx={{ m: 0 }}
          aria-label="Toggle precinct boundaries visibility"
        />
      </Stack>
    </Card>
  );
}
