'use client';

/**
 * Address form component for legislator lookup
 * Clean version for Next.js migration
 */

import { useState } from 'react';

import {
  Box,
  Stack,
  Alert,
  Button,
  TextField,
  Typography,
  CircularProgress,
} from '@mui/material';

import { Iconify } from 'src/components/iconify';

import type { AddressInput } from '../types';

interface AddressFormProps {
  onSubmit: (address: AddressInput) => Promise<void>;
  isLoading?: boolean;
  error?: string | null;
  onClear?: () => void;
}

/**
 * AddressForm component
 * Provides inputs for street, city, and ZIP code
 */
export function AddressForm({ onSubmit, isLoading = false, error, onClear }: AddressFormProps) {
  const [address, setAddress] = useState<AddressInput>({
    street: '',
    city: '',
    zip: '',
  });

  const handleChange = (field: keyof AddressInput) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setAddress((prev) => ({
      ...prev,
      [field]: event.target.value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(address);
  };

  const handleClear = () => {
    setAddress({ street: '', city: '', zip: '' });
    onClear?.();
  };

  const isValid = address.street.trim() || address.zip.trim();

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
      <Stack spacing={2}>
        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
            Find Your Legislators
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Enter your Virginia address to find your House and Senate representatives
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" onClose={handleClear}>
            {error}
          </Alert>
        )}

        <Stack spacing={2}>
          <TextField
            fullWidth
            label="Street Address"
            placeholder="e.g., 123 Main Street"
            value={address.street}
            onChange={handleChange('street')}
            disabled={isLoading}
            size="small"
          />

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              fullWidth
              label="City"
              placeholder="e.g., Richmond"
              value={address.city}
              onChange={handleChange('city')}
              disabled={isLoading}
              size="small"
            />
            <TextField
              fullWidth
              label="ZIP Code"
              placeholder="e.g., 23219"
              value={address.zip}
              onChange={handleChange('zip')}
              disabled={isLoading}
              size="small"
              sx={{ maxWidth: { sm: '150px' } }}
            />
          </Stack>
        </Stack>

        <Stack direction="row" spacing={1}>
          <Button
            type="submit"
            variant="contained"
            startIcon={isLoading ? <CircularProgress size={20} /> : <Iconify icon="solar:map-point-bold" />}
            disabled={!isValid || isLoading}
            sx={{ flex: 1 }}
          >
            {isLoading ? 'Searching...' : 'Find Legislators'}
          </Button>
          {(address.street || address.city || address.zip) && (
            <Button
              variant="outlined"
              onClick={handleClear}
              disabled={isLoading}
            >
              Clear
            </Button>
          )}
        </Stack>
      </Stack>
    </Box>
  );
}

