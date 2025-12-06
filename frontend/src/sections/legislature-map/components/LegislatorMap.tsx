'use client';

/**
 * Interactive map component for Virginia districts - MichiganVotes style
 * Uses react-map-gl (Mapbox GL) for rendering with party-based coloring
 * No basemap - only district polygons on neutral background
 *
 * NEXT.JS MIGRATION NOTE:
 * - This is a client component, add 'use client' directive
 * - Mapbox CSS must be imported in layout or global CSS
 * - MAPBOX_TOKEN should come from process.env.NEXT_PUBLIC_MAPBOX_TOKEN
 * - Map component requires 'use client' and window object
 */

import 'mapbox-gl/dist/mapbox-gl.css';

import { useRef, useMemo, useState, useCallback } from 'react';
import Map, { Layer, Source } from 'react-map-gl/mapbox';

import { Box, Typography, CircularProgress, Paper, Chip } from '@mui/material';

import { getVirginiaCenter, extractLegislatorInfo } from '../lib/geojson';
import { createMinimalMapStyle, createDistrictFillLayer, createDistrictLineLayer } from '../lib/mapStyle';
import { getLisMemberRequestsForYear } from 'src/lib/legislators';
import { computeLisTotalRequested } from 'src/lib/legislators/aggregation';

import type { GeoPoint, DistrictGeoJSON, DistrictFeature } from '../types';

interface LegislatorMapProps {
  chamber: 'house' | 'senate';
  geoJSON: DistrictGeoJSON | null;
  selectedPoint?: GeoPoint | null;
  onDistrictClick?: (feature: DistrictFeature) => void;
  isLoading?: boolean;
  mapboxToken: string; // Pass token as prop for Next.js
}

/**
 * LegislatorMap component
 * Renders Virginia districts with interactive selection
 */
export function LegislatorMap({
  chamber,
  geoJSON,
  selectedPoint,
  onDistrictClick,
  isLoading = false,
  mapboxToken,
}: LegislatorMapProps) {
  const mapRef = useRef<any>(null);
  const [hoveredFeature, setHoveredFeature] = useState<DistrictFeature | null>(null);
  const [selectedFeature, setSelectedFeature] = useState<DistrictFeature | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const hoveredDistrictIdRef = useRef<string | null>(null);
  const selectedDistrictIdRef = useRef<string | null>(null);

  // Helper function to safely set feature state
  const setFeatureState = (districtId: string, state: { hover?: boolean; selected?: boolean }) => {
    if (!mapRef.current || !mapLoaded) return;

    const map = mapRef.current.getMap();
    if (!map || !map.getSource(`districts-${chamber}`)) return;

    try {
      map.setFeatureState(
        { source: `districts-${chamber}`, id: districtId },
        state
      );
    } catch (error) {
      // Silently fail if source doesn't exist yet
      console.debug('Feature state update skipped:', error);
    }
  };

  // Check if Mapbox token is available
  if (!mapboxToken || mapboxToken.length === 0) {
    return (
      <Box
        sx={{
          width: '100%',
          height: '600px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
        }}
      >
        <Typography color="error">
          Mapbox token not configured. Please set NEXT_PUBLIC_MAPBOX_TOKEN environment variable.
        </Typography>
      </Box>
    );
  }

  const handleMapClick = useCallback((event: any) => {
    if (!onDistrictClick || !geoJSON) return;

    const features = event.features;
    if (features && features.length > 0) {
      const clickedFeature = features[0];

      // Find the matching feature from our GeoJSON
      const matchedFeature = geoJSON.features.find(
        (f) => String(f.properties.districtId) === String(clickedFeature.properties.districtId)
      );

      if (matchedFeature) {
        const newDistrictId = String(matchedFeature.properties.districtId);

        // Clear previous selection state
        if (selectedDistrictIdRef.current && selectedDistrictIdRef.current !== newDistrictId) {
          setFeatureState(selectedDistrictIdRef.current, { selected: false });
        }

        // Set new selection state
        setFeatureState(newDistrictId, { selected: true });
        selectedDistrictIdRef.current = newDistrictId;

        setSelectedFeature(matchedFeature);
        onDistrictClick(matchedFeature);
      }
    }
  }, [onDistrictClick, geoJSON]);

  const handleMouseMove = useCallback((event: any) => {
    if (!geoJSON) return;

    const features = event.features;
    if (features && features.length > 0) {
      const hoveredMapFeature = features[0];

      // Find the matching feature from our GeoJSON
      const matchedFeature = geoJSON.features.find(
        (f) => String(f.properties.districtId) === String(hoveredMapFeature.properties.districtId)
      );

      if (matchedFeature) {
        const newDistrictId = String(matchedFeature.properties.districtId);

        // Only update if we're hovering over a different district
        if (hoveredDistrictIdRef.current !== newDistrictId) {
          // Clear previous hover state
          if (hoveredDistrictIdRef.current) {
            setFeatureState(hoveredDistrictIdRef.current, { hover: false });
          }

          // Set new hover state
          setFeatureState(newDistrictId, { hover: true });
          hoveredDistrictIdRef.current = newDistrictId;
          setHoveredFeature(matchedFeature);
        }
      }
    } else {
      // Clear hover when not over any district
      if (hoveredDistrictIdRef.current) {
        setFeatureState(hoveredDistrictIdRef.current, { hover: false });
        hoveredDistrictIdRef.current = null;
      }
      setHoveredFeature(null);
    }
  }, [geoJSON]);

  const handleMouseLeave = useCallback(() => {
    if (hoveredDistrictIdRef.current) {
      setFeatureState(hoveredDistrictIdRef.current, { hover: false });
      hoveredDistrictIdRef.current = null;
    }
    setHoveredFeature(null);
  }, []);

  const mapStyle = useMemo(() => createMinimalMapStyle(), []);
  // Memoize sourceId to prevent "source id changed" error when chamber changes
  const sourceId = useMemo(() => `districts-${chamber}`, [chamber]);

  // Memoize layer configs to prevent re-creation on every render
  const fillLayer = useMemo(() => createDistrictFillLayer(chamber, sourceId), [chamber, sourceId]);
  const lineLayer = useMemo(() => createDistrictLineLayer(chamber, sourceId), [chamber, sourceId]);

  return (
    <Box
      sx={{
        width: '100%',
        height: { xs: '400px', sm: '500px', md: '600px' },
        maxWidth: '100%',
        position: 'relative',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        overflow: 'hidden',
      }}
    >
      {isLoading && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'rgba(255, 255, 255, 0.8)',
            zIndex: 1000,
          }}
        >
          <CircularProgress />
        </Box>
      )}

      <Map
        ref={mapRef}
        mapboxAccessToken={mapboxToken}
        initialViewState={{
          longitude: getVirginiaCenter()[1],
          latitude: getVirginiaCenter()[0],
          zoom: 6.5,
        }}
        style={{ width: '100%', height: '100%' }}
        mapStyle={mapStyle}
        interactiveLayerIds={geoJSON ? [`districts-fill-${chamber}`] : []}
        onClick={handleMapClick}
        onMouseMove={handleMouseMove}
        onLoad={() => setMapLoaded(true)}
        cursor="pointer"
      >
        {geoJSON && (
          <Source
            key={sourceId}
            id={sourceId}
            type="geojson"
            data={geoJSON}
            promoteId="districtId"
          >
            <Layer {...fillLayer} />
            <Layer {...lineLayer} />
          </Source>
        )}

        {selectedPoint && (
          <Source
            key="selected-point"
            id="selected-point"
            type="geojson"
            data={{
              type: 'Feature',
              geometry: {
                type: 'Point',
                coordinates: [selectedPoint.lng, selectedPoint.lat],
              },
              properties: {},
            }}
          >
            <Layer
              id="point-layer"
              type="circle"
              paint={{
                'circle-radius': 8,
                'circle-color': '#FF0000',
                'circle-stroke-width': 2,
                'circle-stroke-color': '#FFFFFF',
              }}
            />
          </Source>
        )}
      </Map>

      {/* District Info Overlay - Shows selected or hovered district */}
      {(selectedFeature || hoveredFeature) && (() => {
        const feature = selectedFeature || hoveredFeature;
        const chamberLabel = chamber === 'house' ? 'House' : 'Senate';
        const districtLabel = `${chamberLabel} District ${feature.properties.districtId}`;
        const memberName = feature.properties.memberName;

        // Use the same extraction logic as the legislator cards
        const legislator = extractLegislatorInfo(feature.properties);
        const lisId = legislator.lisId;

        // Get LIS data for 2024 and 2025
        const lisData2024 = lisId ? getLisMemberRequestsForYear(lisId, 2024) : null;
        const lisData2025 = lisId ? getLisMemberRequestsForYear(lisId, 2025) : null;

        // Compute totals
        const total2024 = computeLisTotalRequested(lisData2024, 2024);
        const total2025 = computeLisTotalRequested(lisData2025, 2025);

        // Format currency
        const formatCurrency = (value: number): string =>
          new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            maximumFractionDigits: 0,
          }).format(value);

        return (
          <Paper
            elevation={3}
            sx={{
              position: 'absolute',
              top: 16,
              right: 16,
              p: 2,
              minWidth: 260,
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(8px)',
              zIndex: 1000,
              borderRadius: 2,
              transition: 'all 0.3s ease',
            }}
          >
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 0.5, fontSize: '1rem' }}>
                {districtLabel}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.primary', mb: 1.5, fontWeight: 500 }}>
                {memberName}
              </Typography>

              {/* Total Amounts */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                    2024 Total:
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {total2024 > 0 ? formatCurrency(total2024) : 'N/A'}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                    2025 Total:
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {total2025 > 0 ? formatCurrency(total2025) : 'N/A'}
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Paper>
        );
      })()}
    </Box>
  );
}

