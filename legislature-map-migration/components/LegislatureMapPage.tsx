/**
 * Main page component for the Legislature Map feature
 * Clean version for Next.js migration - NO budget/amendment logic
 * 
 * NEXT.JS MIGRATION NOTES:
 * - Add 'use client' directive at the top
 * - Replace Helmet with Next.js Head or metadata
 * - Pass MAPBOX_TOKEN from environment via props or context
 * - Consider using Next.js dynamic imports for map (SSR issues)
 */

'use client';

import { useState, useEffect } from 'react';

import {
  Box,
  Stack,
  Container,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';

import { geocodeAddress } from '../lib/geocode';
import { AddressForm } from './AddressForm';
import { LegislatorMap } from './LegislatorMap';
import { LegislatorDetails } from './LegislatorDetails';
import { findDistrictByPoint, loadDistrictGeoJSON, extractLegislatorInfo } from '../lib/geojson';

import type {
  GeoPoint,
  AddressInput,
  DistrictGeoJSON,
  DistrictFeature,
  LegislatorLocatorState,
} from '../types';

interface LegislatureMapPageProps {
  mapboxToken: string; // Pass from Next.js environment
}

/**
 * LegislatureMapPage component
 * Main page for finding Virginia legislators by address
 */
export function LegislatureMapPage({ mapboxToken }: LegislatureMapPageProps) {
  const [state, setState] = useState<LegislatorLocatorState>({
    activeChamber: 'house',
    geoPoint: null,
    selectedDistrict: null,
    selectedLegislators: [],
    statusMessage: null,
    isLoading: false,
    error: null,
  });

  const [geoJSON, setGeoJSON] = useState<DistrictGeoJSON | null>(null);

  // Load GeoJSON when chamber changes
  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        const data = await loadDistrictGeoJSON(state.activeChamber);
        if (isMounted) {
          setGeoJSON(data);
        }
      } catch (err) {
        console.error('Failed to load GeoJSON:', err);
        if (isMounted) {
          setState((prev) => ({
            ...prev,
            error: 'Failed to load district data',
          }));
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [state.activeChamber]);

  // Handle address form submission
  const handleAddressSubmit = async (address: AddressInput) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      // Geocode the address
      const result = await geocodeAddress(address);
      const geoPoint: GeoPoint = { lat: result.lat, lng: result.lng };

      // Find matching district
      if (!geoJSON) {
        throw new Error('District data not loaded');
      }

      const feature = findDistrictByPoint(geoJSON.features, result.lat, result.lng);

      if (!feature) {
        setState((prev) => ({
          ...prev,
          error: 'No district found at this address. Please verify the address is in Virginia.',
          isLoading: false,
        }));
        return;
      }

      const legislator = extractLegislatorInfo(feature.properties);

      setState((prev) => ({
        ...prev,
        geoPoint,
        selectedDistrict: feature.properties,
        selectedLegislators: [legislator],
        statusMessage: `Found ${feature.properties.memberName} in ${state.activeChamber} District ${feature.properties.districtId}`,
        error: null,
        isLoading: false,
      }));
    } catch (err) {
      const errorMessage =
        err && typeof err === 'object' && 'message' in err
          ? (err as any).message
          : 'Failed to geocode address';

      setState((prev) => ({
        ...prev,
        error: errorMessage,
        isLoading: false,
      }));
    }
  };

  // Handle chamber toggle
  const handleChamberChange = (_: React.MouseEvent<HTMLElement>, newChamber: 'house' | 'senate' | null) => {
    if (newChamber) {
      setState((prev) => ({
        ...prev,
        activeChamber: newChamber,
        selectedDistrict: null,
        selectedLegislators: [],
      }));
    }
  };

  // Handle map district click
  const handleDistrictClick = async (feature: DistrictFeature) => {
    const legislator = extractLegislatorInfo(feature.properties);

    setState((prev) => ({
      ...prev,
      selectedDistrict: feature.properties,
      selectedLegislators: [legislator],
    }));
  };

  // Handle clear
  const handleClear = () => {
    setState((prev) => ({
      ...prev,
      geoPoint: null,
      selectedDistrict: null,
      selectedLegislators: [],
      statusMessage: null,
      error: null,
    }));
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Stack spacing={4}>
        {/* Header */}
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
            Virginia Legislature Map
          </Typography>
          <Typography variant="body1" color="textSecondary">
            Find your representatives in the Virginia House of Delegates and Senate
          </Typography>
        </Box>

        {/* Chamber Toggle */}
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <ToggleButtonGroup
            value={state.activeChamber}
            exclusive
            onChange={handleChamberChange}
            aria-label="chamber selection"
          >
            <ToggleButton value="house" aria-label="house">
              House of Delegates
            </ToggleButton>
            <ToggleButton value="senate" aria-label="senate">
              Senate
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {/* Main Content */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' }, gap: 3, alignItems: 'start' }}>
          {/* Left Column - Map */}
          <Stack spacing={2} sx={{ maxHeight: '600px' }}>
            <LegislatorMap
              chamber={state.activeChamber}
              geoJSON={geoJSON}
              selectedPoint={state.geoPoint}
              onDistrictClick={handleDistrictClick}
              isLoading={state.isLoading}
              mapboxToken={mapboxToken}
            />
          </Stack>

          {/* Right Column - Form and Details */}
          <Stack spacing={3}>
            <AddressForm
              onSubmit={handleAddressSubmit}
              isLoading={state.isLoading}
              error={state.error}
              onClear={handleClear}
            />

            <LegislatorDetails
              district={state.selectedDistrict}
              legislators={state.selectedLegislators}
              chamber={state.activeChamber}
            />
          </Stack>
        </Box>
      </Stack>
    </Container>
  );
}

