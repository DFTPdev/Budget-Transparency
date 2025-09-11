// Unused legacy component — districts now rendered in leaflet-districts-map.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { Box, useTheme, Typography, Card, CardContent } from '@mui/material';
import dynamic from 'next/dynamic';

// Dynamically import Leaflet to prevent SSR issues
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const GeoJSON = dynamic(() => import('react-leaflet').then(mod => mod.GeoJSON), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false });

interface DistrictData {
  id: string;
  name: string;
  representative: string;
  party: 'R' | 'D' | 'I';
  totalBudget: number;
  population: number;
  perCapitaSpending: number;
}

interface VirginiaLeafletMapProps {
  districts: DistrictData[];
  selectedDistrict: DistrictData | null;
  hoveredDistrict: DistrictData | null;
  onDistrictClick: (district: DistrictData) => void;
  onDistrictHover: (district: DistrictData | null) => void;
  filteredDistricts?: string[];
}

export function VirginiaLeafletMap({
  districts,
  selectedDistrict,
  hoveredDistrict,
  onDistrictClick,
  onDistrictHover,
  filteredDistricts
}: VirginiaLeafletMapProps) {
  const theme = useTheme();
  const [geoJsonData, setGeoJsonData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [L, setL] = useState<any>(null);
  const [mapInstance, setMapInstance] = useState<any>(null);

  // Load Leaflet CSS and GeoJSON data
  useEffect(() => {
    const loadMapData = async () => {
      try {
        // Load Leaflet CSS and custom styles
        if (typeof window !== 'undefined') {
          const leafletCSS = document.createElement('link');
          leafletCSS.rel = 'stylesheet';
          leafletCSS.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
          leafletCSS.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
          leafletCSS.crossOrigin = '';
          document.head.appendChild(leafletCSS);

          // Add custom CSS for district labels and interactions
          const customCSS = document.createElement('style');
          customCSS.textContent = `
            .district-popup .leaflet-popup-content-wrapper {
              border-radius: 8px;
              box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            }
            .district-tooltip {
              background: rgba(0,0,0,0.8) !important;
              border: none !important;
              border-radius: 4px !important;
              color: white !important;
              font-size: 12px !important;
              padding: 4px 8px !important;
            }
            .district-hover {
              filter: drop-shadow(0 0 8px rgba(76, 175, 80, 0.6));
            }
            .district-selected {
              filter: drop-shadow(0 0 12px rgba(76, 175, 80, 0.8));
            }
            .leaflet-container {
              font-family: inherit;
            }
            /* Ensure district labels are visible */
            .leaflet-overlay-pane svg {
              pointer-events: auto;
            }
            .leaflet-interactive {
              cursor: pointer;
            }
          `;
          document.head.appendChild(customCSS);

          // Fix for default markers in Leaflet
          const LeafletLib = await import('leaflet');
          delete (LeafletLib.Icon.Default.prototype as any)._getIconUrl;
          LeafletLib.Icon.Default.mergeOptions({
            iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
            iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
          });

          setL(LeafletLib);
          setLeafletLoaded(true);
        }

        // Fetch Virginia House District GeoJSON data from local file
        const response = await fetch('/data/virginia-districts.geojson');

        if (!response.ok) {
          throw new Error(`Failed to fetch GeoJSON data: ${response.status}`);
        }

        const data = await response.json();
        setGeoJsonData(data);
        setIsLoading(false);
      } catch (err) {
        console.error('Error loading map data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load map data');
        setIsLoading(false);
      }
    };

    loadMapData();
  }, []);

  // Fit map bounds to Virginia when GeoJSON data loads
  useEffect(() => {
    if (mapInstance && geoJsonData && L) {
      try {
        // Calculate bounds from GeoJSON data
        const geoJsonLayer = L.geoJSON(geoJsonData);
        const bounds = geoJsonLayer.getBounds();

        // Fit bounds with padding for better visualization
        mapInstance.fitBounds(bounds, {
          padding: [20, 20],
          maxZoom: 8, // Don't zoom too close on initial load
        });
      } catch (err) {
        console.warn('Failed to fit bounds to Virginia:', err);
        // Fallback to manual Virginia bounds
        mapInstance.fitBounds([
          [36.5, -83.7], // Southwest corner of Virginia
          [39.5, -75.2]   // Northeast corner of Virginia
        ], {
          padding: [20, 20],
          maxZoom: 8,
        });
      }
    }
  }, [mapInstance, geoJsonData, L]);

  // Get district style based on state
  const getDistrictStyle = (feature: any) => {
    const districtNumber = feature.properties.DISTRICT;
    const districtId = `district-${districtNumber}`;
    const district = districts.find(d => d.id === districtId);

    const isSelected = selectedDistrict?.id === districtId;
    const isHovered = hoveredDistrict?.id === districtId;
    const isFiltered = filteredDistricts && !filteredDistricts.includes(districtId);

    // Default styling: light stroke and fill with higher contrast
    let fillColor = theme.palette.grey[50]; // Very light fill for better visibility
    let color = theme.palette.grey[700]; // Darker border for higher contrast
    let weight = 1.5; // Moderate border weight
    let fillOpacity = 0.2; // Light opacity for subtle fill
    let opacity = 0.8; // Slightly transparent border

    // Party colors - distinct color palette
    if (district?.party === 'D') {
      fillColor = theme.palette.info.light;
      color = theme.palette.info.main;
      fillOpacity = 0.3;
      opacity = 0.9;
    } else if (district?.party === 'R') {
      fillColor = theme.palette.error.light;
      color = theme.palette.error.main;
      fillOpacity = 0.3;
      opacity = 0.9;
    }

    // Hover state - lighter fill with outline for desktop
    if (isHovered) {
      fillColor = theme.palette.primary.light;
      color = theme.palette.primary.main;
      weight = 3;
      fillOpacity = 0.4;
      opacity = 1;
    }

    // Selected state - glowing border highlighting
    if (isSelected) {
      fillColor = theme.palette.success.light;
      color = theme.palette.success.main;
      weight = 4;
      fillOpacity = 0.5;
      opacity = 1;
    }

    // Filtered state - dimmed appearance
    if (isFiltered) {
      fillOpacity = 0.05;
      fillColor = theme.palette.grey[100];
      color = theme.palette.grey[300];
      weight = 1;
      opacity = 0.4;
    }

    return {
      fillColor,
      color,
      weight,
      fillOpacity,
      opacity,
      // Add CSS class for additional styling
      className: isHovered ? 'district-hover' : isSelected ? 'district-selected' : '',
    };
  };

  // Handle district interactions with onEachFeature
  const onEachFeature = (feature: any, layer: any) => {
    const districtNumber = feature.properties.DISTRICT;
    const districtId = `district-${districtNumber}`;
    const district = districts.find(d => d.id === districtId);

    if (!district) {
      // If district not found in our data, still make it interactive but with basic info
      console.warn(`District ${districtNumber} not found in district data`);

      // Basic interaction for unmapped districts
      layer.on({
        mouseover: (e: any) => {
          e.target.setStyle({
            weight: 3,
            color: theme.palette.warning.main,
            fillColor: theme.palette.warning.light,
            fillOpacity: 0.4,
            opacity: 1,
          });
        },
        mouseout: (e: any) => {
          const currentStyle = getDistrictStyle(feature);
          e.target.setStyle(currentStyle);
        },
      });

      // Bind basic popup for unmapped districts
      layer.bindPopup(`
        <div style="font-family: ${theme.typography.fontFamily}; text-align: center;">
          <h3 style="margin: 0 0 8px 0; color: ${theme.palette.text.primary};">
            District ${districtNumber}
          </h3>
          <p style="margin: 0; color: ${theme.palette.text.secondary};">
            District data not available
          </p>
        </div>
      `);

      return;
    }

    // Mouse and touch events for mapped districts
    layer.on({
      mouseover: (e: any) => {
        // Apply hover effect with lighter fill/outline
        onDistrictHover(district);
        e.target.setStyle({
          weight: 3,
          color: theme.palette.primary.main,
          fillColor: theme.palette.primary.light,
          fillOpacity: 0.4,
          opacity: 1,
        });

        // Bring to front for better visibility
        e.target.bringToFront();
      },

      mouseout: (e: any) => {
        // Reset to original style unless selected
        onDistrictHover(null);
        const currentStyle = getDistrictStyle(feature);
        e.target.setStyle(currentStyle);
      },

      click: (e: any) => {
        // Trigger same selection logic as clicking district card
        onDistrictClick(district);

        // Zoom to feature bounds with proper Virginia fitting
        const map = e.target._map;
        map.fitBounds(e.target.getBounds(), {
          padding: [30, 30], // Generous padding around the district
          maxZoom: 12, // Allow closer zoom for district details
          duration: 0.8, // Smooth zoom animation
        });

        // Bring selected district to front
        e.target.bringToFront();
      },

      // Touch events for mobile support
      touchstart: (e: any) => {
        onDistrictHover(district);
        e.target.setStyle({
          weight: 3,
          color: theme.palette.primary.main,
          fillColor: theme.palette.primary.light,
          fillOpacity: 0.4,
        });
      },

      touchend: (e: any) => {
        // Small delay to allow for tap vs drag distinction
        setTimeout(() => {
          onDistrictClick(district);
        }, 150);
      },
    });

    // Bind rich popup with district information
    layer.bindPopup(`
      <div style="
        font-family: ${theme.typography.fontFamily};
        max-width: 250px;
        padding: 8px;
      ">
        <h3 style="
          margin: 0 0 12px 0;
          color: ${theme.palette.text.primary};
          font-size: 16px;
          font-weight: 600;
          border-bottom: 2px solid ${theme.palette.primary.main};
          padding-bottom: 4px;
        ">
          ${district.name}
        </h3>
        <div style="display: flex; flex-direction: column; gap: 6px;">
          <p style="margin: 0; color: ${theme.palette.text.secondary}; font-size: 14px;">
            <strong style="color: ${theme.palette.text.primary};">Representative:</strong> ${district.representative}
          </p>
          <p style="margin: 0; color: ${theme.palette.text.secondary}; font-size: 14px;">
            <strong style="color: ${theme.palette.text.primary};">Party:</strong>
            <span style="color: ${district.party === 'D' ? theme.palette.info.main : theme.palette.error.main}; font-weight: 600;">
              ${district.party === 'D' ? 'Democrat' : 'Republican'}
            </span>
          </p>
          <p style="margin: 0; color: ${theme.palette.text.secondary}; font-size: 14px;">
            <strong style="color: ${theme.palette.text.primary};">Total Budget:</strong>
            <span style="color: ${theme.palette.success.main}; font-weight: 600;">
              $${(district.totalBudget / 1000000).toFixed(1)}M
            </span>
          </p>
          <p style="margin: 0; color: ${theme.palette.text.secondary}; font-size: 14px;">
            <strong style="color: ${theme.palette.text.primary};">Population:</strong> ${district.population.toLocaleString()}
          </p>
          <p style="margin: 0; color: ${theme.palette.text.secondary}; font-size: 14px;">
            <strong style="color: ${theme.palette.text.primary};">Per Capita:</strong>
            <span style="color: ${theme.palette.warning.main}; font-weight: 600;">
              $${district.perCapitaSpending.toLocaleString()}
            </span>
          </p>
        </div>
        <div style="
          margin-top: 8px;
          padding-top: 8px;
          border-top: 1px solid ${theme.palette.divider};
          text-align: center;
        ">
          <small style="color: ${theme.palette.text.disabled}; font-size: 12px;">
            Click district to select and view details
          </small>
        </div>
      </div>
    `, {
      maxWidth: 300,
      className: 'district-popup'
    });

    // Add tooltip for quick info on hover
    layer.bindTooltip(`
      <div style="font-family: ${theme.typography.fontFamily}; text-align: center;">
        <strong>${district.name}</strong><br/>
        Rep. ${district.representative} (${district.party})
      </div>
    `, {
      permanent: false,
      direction: 'top',
      offset: [0, -10],
      className: 'district-tooltip'
    });
  };

  if (error) {
    return (
      <Card sx={{ height: { xs: 350, sm: 450, md: 500 } }}>
        <CardContent sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          textAlign: 'center',
          gap: 2
        }}>
          <Box sx={{ color: theme.palette.error.main, mb: 1 }}>
            <Iconify icon="material-symbols:error-outline" width={48} height={48} />
          </Box>
          <Typography color="error" variant="h6" gutterBottom>
            Failed to Load Virginia Districts Map
          </Typography>
          <Typography color="text.secondary" variant="body2" sx={{ maxWidth: 400 }}>
            {error.includes('Failed to fetch')
              ? 'Unable to load district boundary data. Please check your internet connection and try again.'
              : `Error: ${error}`
            }
          </Typography>
          <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              onClick={() => {
                setError(null);
                setIsLoading(true);
                // Retry loading
                window.location.reload();
              }}
              style={{
                padding: '8px 16px',
                backgroundColor: theme.palette.primary.main,
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              Retry Loading
            </button>
            <button
              onClick={() => {
                // Fallback to basic district list view
                setError(null);
                setGeoJsonData({ type: 'FeatureCollection', features: [] });
                setIsLoading(false);
              }}
              style={{
                padding: '8px 16px',
                backgroundColor: theme.palette.grey[500],
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              Continue Without Map
            </button>
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (isLoading || !leafletLoaded || !geoJsonData) {
    return (
      <Card sx={{ height: { xs: 350, sm: 450, md: 500 } }}>
        <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
          <Typography variant="h6" color="text.secondary">
            Loading Virginia Districts Map...
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box sx={{ position: 'relative' }}>
      {/* Selected District Banner */}
      {selectedDistrict && (
        <Card sx={{ mb: 2, bgcolor: theme.palette.success.light, color: theme.palette.success.contrastText }}>
          <CardContent sx={{ py: 1.5 }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              Selected: {selectedDistrict.name}, Rep. {selectedDistrict.representative}
            </Typography>
            <Typography variant="body2">
              {selectedDistrict.party === 'D' ? 'Democrat' : 'Republican'} • 
              Budget: ${(selectedDistrict.totalBudget / 1000000).toFixed(1)}M • 
              Population: {selectedDistrict.population.toLocaleString()}
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* Map Container */}
      <Card sx={{ height: { xs: 350, sm: 450, md: 500 }, overflow: 'hidden' }}>
        <MapContainer
          center={[37.5, -78.6]} // Center of Virginia
          zoom={7} // Initial zoom level for Virginia
          style={{ height: '100%', width: '100%' }}
          zoomControl={true}
          scrollWheelZoom={true}
          bounds={[
            [36.5, -83.7], // Southwest corner of Virginia
            [39.5, -75.2]   // Northeast corner of Virginia
          ]}
          boundsOptions={{
            padding: [20, 20], // Padding around Virginia bounds
            maxZoom: 10, // Prevent over-zooming on initial load
          }}
          whenCreated={(map) => setMapInstance(map)}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {geoJsonData && (
            <>
              {/* District boundaries */}
              <GeoJSON
                data={geoJsonData}
                style={getDistrictStyle}
                onEachFeature={onEachFeature}
              />

              {/* District labels - always visible */}
              {L && geoJsonData.features.map((feature: any) => {
                const districtNumber = feature.properties.DISTRICT;
                const districtId = `district-${districtNumber}`;
                const district = districts.find(d => d.id === districtId);

                if (!district) return null;

                // Calculate centroid of the polygon for label placement
                const coordinates = feature.geometry.coordinates[0];
                const centroid = coordinates.reduce(
                  (acc: [number, number], coord: [number, number]) => [
                    acc[0] + coord[0] / coordinates.length,
                    acc[1] + coord[1] / coordinates.length,
                  ],
                  [0, 0]
                );

                const isSelected = selectedDistrict?.id === districtId;
                const isHovered = hoveredDistrict?.id === districtId;

                return (
                  <Marker
                    key={`label-${districtId}`}
                    position={[centroid[1], centroid[0]]}
                    icon={L ? new L.DivIcon({
                      html: `
                        <div style="
                          background: ${isSelected ? theme.palette.success.main :
                                      isHovered ? theme.palette.primary.main :
                                      'rgba(255,255,255,0.9)'};
                          color: ${isSelected || isHovered ? 'white' : theme.palette.text.primary};
                          border: 2px solid ${isSelected ? theme.palette.success.dark :
                                             isHovered ? theme.palette.primary.dark :
                                             theme.palette.grey[400]};
                          border-radius: 50%;
                          width: 24px;
                          height: 24px;
                          display: flex;
                          align-items: center;
                          justify-content: center;
                          font-weight: bold;
                          font-size: 12px;
                          font-family: ${theme.typography.fontFamily};
                          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                          cursor: pointer;
                          transition: all 0.3s ease;
                          transform: ${isSelected ? 'scale(1.2)' : isHovered ? 'scale(1.1)' : 'scale(1)'};
                        ">
                          ${districtNumber}
                        </div>
                      `,
                      className: 'district-label',
                      iconSize: [24, 24],
                      iconAnchor: [12, 12],
                    }) : undefined}
                    eventHandlers={{
                      click: () => onDistrictClick(district),
                      mouseover: () => onDistrictHover(district),
                      mouseout: () => onDistrictHover(null),
                    }}
                  >
                    <Popup>
                      <div style={{ fontFamily: theme.typography.fontFamily }}>
                        <strong>{district.name}</strong><br/>
                        Rep. {district.representative} ({district.party})<br/>
                        Budget: ${(district.totalBudget / 1000000).toFixed(1)}M
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </>
          )}
        </MapContainer>
      </Card>
    </Box>
  );
}
