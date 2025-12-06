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

import { useRef, useMemo, useEffect } from 'react';
import Map, { Layer, Source } from 'react-map-gl/mapbox';

import { Box, Typography, CircularProgress } from '@mui/material';

import { getVirginiaCenter } from '../lib/geojson';
import { createMinimalMapStyle, createDistrictFillLayer, createDistrictLineLayer } from '../lib/mapStyle';

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
  const containerRef = useRef<HTMLDivElement>(null);

  // Watch container size changes (including CSS breakpoint changes)
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver(() => {
      if (mapRef.current) {
        // Small delay to ensure container has finished resizing
        setTimeout(() => {
          if (mapRef.current) {
            mapRef.current.resize();
          }
        }, 50);
      }
    });

    resizeObserver.observe(containerRef.current);

    // Also trigger initial resize after mount
    const timer = setTimeout(() => {
      if (mapRef.current) {
        mapRef.current.resize();
      }
    }, 100);

    return () => {
      resizeObserver.disconnect();
      clearTimeout(timer);
    };
  }, []);

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

  const handleMapClick = (event: any) => {
    if (!onDistrictClick || !geoJSON) return;

    const features = event.features;
    if (features && features.length > 0) {
      const clickedFeature = features[0];
      
      // Find the matching feature from our GeoJSON
      const matchedFeature = geoJSON.features.find(
        (f) => String(f.properties.districtId) === String(clickedFeature.properties.districtId)
      );

      if (matchedFeature) {
        onDistrictClick(matchedFeature);
      }
    }
  };

  const mapStyle = createMinimalMapStyle();
  // Memoize sourceId to prevent "source id changed" error when chamber changes
  const sourceId = useMemo(() => `districts-${chamber}`, [chamber]);

  return (
    <Box
      ref={containerRef}
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
        cursor="pointer"
      >
        {geoJSON && (
          <Source key={sourceId} id={sourceId} type="geojson" data={geoJSON}>
            <Layer {...createDistrictFillLayer(chamber, sourceId)} />
            <Layer {...createDistrictLineLayer(chamber, sourceId)} />
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
    </Box>
  );
}

