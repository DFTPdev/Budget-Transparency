'use client';

import { useEffect, useRef, useState } from 'react';
import { Box, useTheme } from '@mui/material';

import { VIRGINIA_DISTRICTS, getDistrictCentroids } from '../data/virginia-districts';

interface DistrictData {
  id: string;
  name: string;
  representative: string;
  party: 'R' | 'D' | 'I';
  totalBudget: number;
  population: number;
  perCapitaSpending: number;
}

interface InteractiveMapProps {
  districts: DistrictData[];
  selectedDistrict: DistrictData | null;
  onDistrictClick: (district: DistrictData) => void;
  onDistrictHover?: (district: DistrictData | null) => void;
}

export function InteractiveMap({
  districts,
  selectedDistrict,
  onDistrictClick,
  onDistrictHover
}: InteractiveMapProps) {
  const theme = useTheme();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const districtLayersRef = useRef<{ [key: string]: any }>({});
  const circleMarkersRef = useRef<{ [key: string]: any }>({});
  const [isClient, setIsClient] = useState(false);
  const [leafletLoaded, setLeafletLoaded] = useState(false);

  // Handle client-side rendering and Leaflet loading
  useEffect(() => {
    setIsClient(true);

    // Dynamically import Leaflet only on client side
    const loadLeaflet = async () => {
      if (typeof window !== 'undefined') {
        const L = await import('leaflet');
        await import('leaflet/dist/leaflet.css');

        // Fix for default markers in Next.js
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        });

        setLeafletLoaded(true);
        return L;
      }
    };

    loadLeaflet();
  }, []);

  // Initialize map
  useEffect(() => {
    if (!isClient || !leafletLoaded || !mapRef.current || mapInstanceRef.current) return;

    const initializeMap = async () => {
      const L = await import('leaflet');

      // Create map instance
      const map = L.map(mapRef.current!, {
        center: [38.9, -77.1], // Center on Virginia
        zoom: 10,
        zoomControl: true,
        scrollWheelZoom: true,
        doubleClickZoom: true,
        dragging: true,
      });

      // Add dark tile layer to match theme
      const tileLayer = theme.palette.mode === 'dark'
        ? L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: 'abcd',
            maxZoom: 19
          })
        : L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          });

      tileLayer.addTo(map);
      mapInstanceRef.current = map;

      // Add district polygons
      VIRGINIA_DISTRICTS.features.forEach(feature => {
        const polygon = L.geoJSON(feature, {
          style: {
            fillColor: theme.palette.primary.main,
            fillOpacity: 0.1,
            color: theme.palette.primary.main,
            weight: 2,
            opacity: 0.6,
          }
        });

        polygon.addTo(map);
        districtLayersRef.current[feature.properties.id] = polygon;
      });
    };

    initializeMap();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [isClient, leafletLoaded, theme]);

  // Add district circle markers
  useEffect(() => {
    if (!mapInstanceRef.current || !isClient || !leafletLoaded) return;

    const addCircleMarkers = async () => {
      const L = await import('leaflet');
      const map = mapInstanceRef.current;

      // Clear existing markers
      Object.values(circleMarkersRef.current).forEach(marker => {
        map.removeLayer(marker);
      });
      circleMarkersRef.current = {};

      // Get district centroids
      const centroids = getDistrictCentroids();

      // Add circle markers for each district
      districts.forEach(district => {
        const centroid = centroids.find(c => c.id === district.id);
        if (!centroid) return;

        const isSelected = selectedDistrict?.id === district.id;
        const partyColor = district.party === 'D' ? '#1976d2' : district.party === 'R' ? '#d32f2f' : '#757575';

        const circleMarker = L.circleMarker([centroid.centroid[1], centroid.centroid[0]], {
          radius: isSelected ? 12 : 8,
          fillColor: partyColor,
          color: theme.palette.common.white,
          weight: isSelected ? 3 : 2,
          opacity: 1,
          fillOpacity: 0.8,
        });

      // Add tooltip
      const tooltipContent = `
        <div style="font-family: ${theme.typography.fontFamily}; color: ${theme.palette.text.primary};">
          <strong>${district.name}</strong><br/>
          <strong>Total Budget:</strong> $${(district.totalBudget / 1000000).toFixed(1)}M<br/>
          <strong>Population:</strong> ${district.population.toLocaleString()}<br/>
          <strong>Per Capita:</strong> $${district.perCapitaSpending.toLocaleString()}
        </div>
      `;

      circleMarker.bindTooltip(tooltipContent, {
        permanent: false,
        direction: 'top',
        offset: [0, -10],
        className: 'custom-tooltip'
      });

      // Add click handler
      circleMarker.on('click', () => {
        onDistrictClick(district);
      });

      // Add hover handlers
      circleMarker.on('mouseover', () => {
        onDistrictHover?.(district);
        circleMarker.openTooltip();
      });

      circleMarker.on('mouseout', () => {
        onDistrictHover?.(null);
      });

        circleMarker.addTo(map);
        circleMarkersRef.current[district.id] = circleMarker;
      });
    };

    addCircleMarkers();
  }, [districts, selectedDistrict, onDistrictClick, onDistrictHover, theme, isClient, leafletLoaded]);

  // Update selected district highlighting
  useEffect(() => {
    if (!mapInstanceRef.current || !isClient || !leafletLoaded) return;

    const updateHighlighting = async () => {
      const L = await import('leaflet');

      // Reset all district polygons
      Object.entries(districtLayersRef.current).forEach(([id, layer]) => {
        if (layer && layer.setStyle) {
          layer.setStyle({
            fillColor: theme.palette.primary.main,
            fillOpacity: 0.1,
            color: theme.palette.primary.main,
            weight: 2,
            opacity: 0.6,
          });
        }
      });

      // Highlight selected district
      if (selectedDistrict && districtLayersRef.current[selectedDistrict.id]) {
        const selectedLayer = districtLayersRef.current[selectedDistrict.id];
        if (selectedLayer && selectedLayer.setStyle) {
          selectedLayer.setStyle({
            fillColor: theme.palette.warning.main,
            fillOpacity: 0.3,
            color: theme.palette.warning.main,
            weight: 4,
            opacity: 1,
          });
        }
      }
    };

    updateHighlighting();
  }, [selectedDistrict, theme, isClient, leafletLoaded]);

  if (!isClient || !leafletLoaded) {
    return (
      <Box
        sx={{
          width: '100%',
          height: 500,
          bgcolor: theme.palette.background.paper,
          borderRadius: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: `1px solid ${theme.palette.divider}`,
        }}
      >
        Loading interactive map...
      </Box>
    );
  }

  return (
    <>
      <style jsx global>{`
        .custom-tooltip {
          background: ${theme.palette.background.paper} !important;
          border: 1px solid ${theme.palette.divider} !important;
          border-radius: 8px !important;
          box-shadow: ${theme.shadows[8]} !important;
        }
        .custom-tooltip .leaflet-tooltip-content {
          margin: 8px !important;
        }
      `}</style>
      <Box
        ref={mapRef}
        sx={{
          width: '100%',
          height: 500,
          borderRadius: 2,
          overflow: 'hidden',
          border: `1px solid ${theme.palette.divider}`,
          '& .leaflet-control-container': {
            '& .leaflet-control': {
              backgroundColor: theme.palette.background.paper,
              border: `1px solid ${theme.palette.divider}`,
              '& a': {
                color: theme.palette.text.primary,
                '&:hover': {
                  backgroundColor: theme.palette.action.hover,
                },
              },
            },
          },
        }}
      />
    </>
  );
}
