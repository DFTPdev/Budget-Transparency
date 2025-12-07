'use client';

import { useEffect, useState, useCallback } from 'react';
import { Box, useTheme, Typography, Card, CardContent, Chip, Paper } from '@mui/material';

// 🛠️ UTILITY: Normalize district IDs for consistent mapping
function normalizeDistrictId(name: string): string {
  // Attempt to extract a numeric ID from names like "District 1", "DISTRICT-01", etc.
  const match = name.match(/(\d+)/);
  return match ? match[1] : name.toLowerCase().replace(/\s+/g, '-');
}

/**
 * Aggregates precinct spending data by district using spatial joins
 * @param precinctData GeoJSON data containing precinct polygons with spending data
 * @param districtData GeoJSON data containing district polygons
 * @returns Map of district names to aggregated spending totals
 */
async function aggregateDistrictTotals(
  precinctData: GeoJSONData,
  districtData: GeoJSONData
): Promise<Map<string, DistrictAggregation>> {
  console.log('🔄 Starting district aggregation...');
  console.log(`📊 Processing ${precinctData.features.length} precincts across ${districtData.features.length} districts`);

  try {
    // Dynamically import Turf.js functions to keep bundle size small
    const [{ default: centroid }, { default: booleanPointInPolygon }] = await Promise.all([
      import('@turf/centroid'),
      import('@turf/boolean-point-in-polygon')
    ]);

    const totalsByDistrict = new Map<string, DistrictAggregation>();
    let processedCount = 0;
    let skippedCount = 0;
    let noDistrictCount = 0;

    // Process each precinct
    for (const precinct of precinctData.features) {
      if (!precinct || !precinct.geometry || !precinct.properties) {
        skippedCount++;
        continue;
      }

      try {
        // Calculate precinct centroid for point-in-polygon test
        const precinctCentroid = centroid(precinct);

        // Extract spending data from precinct properties
        const precinctProps = precinct.properties as PrecinctProperties;
        const sp_amt = precinctProps.sp_amt || 0;
        const sr_amt = precinctProps.sr_amt || 0;
        const total = sp_amt + sr_amt;

        // Find which district contains this precinct centroid
        let foundDistrict: GeoJSONFeature | null = null;
        for (const district of districtData.features) {
          if (district && district.geometry) {
            try {
              if (booleanPointInPolygon(precinctCentroid, district)) {
                foundDistrict = district;
                break;
              }
            } catch (err) {
              // Skip invalid district geometry
              continue;
            }
          }
        }

        if (foundDistrict && foundDistrict.properties) {
          const districtProps = foundDistrict.properties as DistrictProperties;
          const rawDistrictName = districtProps.NAME || districtProps.NAMELSAD || 'Unknown District';

          // Normalize district ID for consistent mapping
          const districtKey = normalizeDistrictId(rawDistrictName);

          // Initialize district aggregation if not exists
          if (!totalsByDistrict.has(districtKey)) {
            totalsByDistrict.set(districtKey, {
              total: 0,
              sp_amt: 0,
              sr_amt: 0,
              count: 0
            });
          }

          // Add precinct data to district totals
          const districtTotals = totalsByDistrict.get(districtKey)!;
          districtTotals.total += total;
          districtTotals.sp_amt += sp_amt;
          districtTotals.sr_amt += sr_amt;
          districtTotals.count += 1;

          processedCount++;
        } else {
          noDistrictCount++;
        }
      } catch (err) {
        console.warn('⚠️ Error processing precinct:', err);
        skippedCount++;
      }
    }

    // Log aggregation results
    console.log('✅ District aggregation complete!');
    console.log(`📈 Processed: ${processedCount} precincts`);
    console.log(`⚠️ Skipped: ${skippedCount} precincts (invalid data)`);
    console.log(`❌ No district: ${noDistrictCount} precincts (outside district boundaries)`);
    console.log(`🗺️ Districts with data: ${totalsByDistrict.size}`);

    // Log sample district totals for verification
    const sampleEntries = Array.from(totalsByDistrict.entries()).slice(0, 5);
    console.log('📋 Sample district totals:', sampleEntries.map(([name, data]) => ({
      district: name,
      total: `$${data.total.toLocaleString()}`,
      precincts: data.count,
      sp_amt: `$${data.sp_amt.toLocaleString()}`,
      sr_amt: `$${data.sr_amt.toLocaleString()}`
    })));

    return totalsByDistrict;

  } catch (error) {
    console.error('❌ Error during district aggregation:', error);
    throw error;
  }
}

/**
 * Test function to verify aggregation works with sample data
 */
export async function testAggregation() {
  try {
    console.log('🧪 Testing aggregation function...');

    // Fetch the actual data files
    const [precinctResponse, districtResponse] = await Promise.all([
      fetch('/data/vpap-precincts.geojson'),
      fetch('/data/virginia-districts.geojson')
    ]);

    if (!precinctResponse.ok || !districtResponse.ok) {
      throw new Error('Failed to fetch test data');
    }

    const [precinctData, districtData] = await Promise.all([
      precinctResponse.json(),
      districtResponse.json()
    ]);

    // Run aggregation
    const results = await aggregateDistrictTotals(precinctData, districtData);

    console.log('🎉 Test completed successfully!');
    console.log(`📊 Found ${results.size} districts with spending data`);

    return results;

  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

interface DistrictData {
  id: string;
  name: string;
  representative: string;
  party: 'R' | 'D' | 'I';
  totalBudget: number;
  population: number;
  perCapitaSpending: number;
}

// Types for GeoJSON data
interface PrecinctProperties {
  precinct?: string;
  has_data?: boolean;
  sp_nbr?: number;
  sr_nbr?: number;
  sp_amt?: number;
  sr_amt?: number;
}

interface DistrictProperties {
  NAME?: string;
  NAMELSAD?: string;
}

interface GeoJSONFeature {
  type: 'Feature';
  geometry: any;
  properties: PrecinctProperties | DistrictProperties;
}

interface GeoJSONData {
  type: 'FeatureCollection';
  features: GeoJSONFeature[];
}

// Aggregation result type
interface DistrictAggregation {
  total: number;
  sp_amt: number;
  sr_amt: number;
  count: number;
}

interface LeafletDistrictsMapProps {
  districts: DistrictData[];
  selectedDistrict: DistrictData | null;
  hoveredDistrict: DistrictData | null;
  onDistrictClick: (district: DistrictData) => void;
  onDistrictHover: (district: DistrictData | null) => void;
  filteredDistricts?: string[];
  onLeafletAggregationReady?: (totalsByDistrict: Map<string, DistrictAggregation>) => void;
  // New props for normalized ID-based interactions
  hoveredDistrictId?: string | null;
  selectedDistrictId?: string | null;
  onPrecinctClick?: (rawDistrictName: string) => void;
}

export function LeafletDistrictsMap({
  districts,
  selectedDistrict,
  hoveredDistrict,
  onDistrictClick,
  onDistrictHover,
  filteredDistricts,
  onLeafletAggregationReady,
  hoveredDistrictId,
  selectedDistrictId,
  onPrecinctClick
}: LeafletDistrictsMapProps) {
  const theme = useTheme();
  const [geoJsonData, setGeoJsonData] = useState<any>(null);
  const [districtsGeoJson, setDistrictsGeoJson] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAggregating, setIsAggregating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [MapComponents, setMapComponents] = useState<any>(null);

  // Expose test function globally for browser console testing
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).testDistrictAggregation = testAggregation;
      console.log('🧪 Test function available: window.testDistrictAggregation()');
    }
  }, []);

  // Dynamically load React Leaflet components
  useEffect(() => {
    const loadMapComponents = async () => {
      try {
        if (typeof window === 'undefined') return;

        // Load Leaflet CSS
        if (!document.querySelector('link[href*="leaflet.css"]')) {
          const leafletCSS = document.createElement('link');
          leafletCSS.rel = 'stylesheet';
          leafletCSS.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
          document.head.appendChild(leafletCSS);
        }

        // Import React Leaflet components
        const [reactLeaflet, leaflet] = await Promise.all([
          import('react-leaflet'),
          import('leaflet')
        ]);

        // Fix Leaflet default markers
        delete (leaflet.Icon.Default.prototype as any)._getIconUrl;
        leaflet.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
        });

        setMapComponents({
          MapContainer: reactLeaflet.MapContainer,
          TileLayer: reactLeaflet.TileLayer,
          GeoJSON: reactLeaflet.GeoJSON,
          useMap: reactLeaflet.useMap,
          L: leaflet
        });

      } catch (err) {
        console.error('Error loading map components:', err);
        setError('Failed to load map components');
      }
    };

    loadMapComponents();
  }, []);

  // Fetch both precincts and districts GeoJSON data
  useEffect(() => {
    const fetchGeoJSON = async () => {
      try {
        console.log('Fetching GeoJSON data...');

        // Fetch both precincts and districts in parallel
        const [precinctResponse, districtResponse] = await Promise.all([
          fetch('/data/vpap-precincts.geojson'),
          fetch('/data/virginia-districts.geojson')
        ]);

        if (!precinctResponse.ok) {
          throw new Error(`Failed to fetch precincts: ${precinctResponse.status} ${precinctResponse.statusText}`);
        }

        if (!districtResponse.ok) {
          throw new Error(`Failed to fetch districts: ${districtResponse.status} ${districtResponse.statusText}`);
        }

        const [precinctData, districtData] = await Promise.all([
          precinctResponse.json(),
          districtResponse.json()
        ]);

        if (!precinctData || !precinctData.features || !Array.isArray(precinctData.features)) {
          throw new Error('Invalid precinct GeoJSON data format');
        }

        if (!districtData || !districtData.features || !Array.isArray(districtData.features)) {
          throw new Error('Invalid district GeoJSON data format');
        }

        console.log('GeoJSON loaded successfully:', precinctData.features.length, 'precincts,', districtData.features.length, 'districts');
        setGeoJsonData(precinctData);
        setDistrictsGeoJson(districtData);
        setError(null);
      } catch (err) {
        console.error('Error loading GeoJSON:', err);
        setError(err instanceof Error ? err.message : 'Failed to load map data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchGeoJSON();
  }, []);

  // Track if aggregation has been completed to prevent re-runs
  const [aggregationCompleted, setAggregationCompleted] = useState(false);

  // Aggregate precinct data by district using the standalone function
  useEffect(() => {
    console.log('🔍 Aggregation effect triggered:', {
      hasPrecinctData: !!geoJsonData,
      hasDistrictData: !!districtsGeoJson,
      hasCallback: !!onLeafletAggregationReady,
      isCompleted: aggregationCompleted
    });

    // Only run aggregation once when both datasets are loaded
    if (!geoJsonData || !districtsGeoJson || !onLeafletAggregationReady || aggregationCompleted) {
      console.log('⏭️ Skipping aggregation - conditions not met');
      return;
    }

    console.log('🚀 Starting aggregation process...');

    const runAggregation = async () => {
      setIsAggregating(true);

      try {
        // Use the standalone aggregation function
        const totalsByDistrict = await aggregateDistrictTotals(geoJsonData, districtsGeoJson);

        console.log('📤 Passing results to parent component...');
        // Pass results to parent component
        onLeafletAggregationReady(totalsByDistrict);
        setAggregationCompleted(true); // Mark as completed to prevent re-runs

      } catch (err) {
        console.error('❌ Failed to aggregate district totals:', err);
        setError(err instanceof Error ? err.message : 'Failed to aggregate district data');
      } finally {
        setIsAggregating(false);
      }
    };

    // Add a small delay to ensure map is ready
    const timer = setTimeout(runAggregation, 1000);
    return () => clearTimeout(timer);
  }, [geoJsonData, districtsGeoJson, onLeafletAggregationReady, aggregationCompleted]);

  // Reusable function for district state styling
  const getStyleForState = useCallback((isHovered: boolean, isSelected: boolean) => ({
    fillColor: isSelected ? theme.palette.warning.light :
               isHovered ? theme.palette.primary.light : 'transparent',
    color: isSelected ? theme.palette.warning.dark :
           isHovered ? theme.palette.primary.main : theme.palette.grey[400],
    weight: isSelected ? 4 : isHovered ? 3 : 1,
    fillOpacity: isSelected ? 0.5 : isHovered ? 0.25 : 0.1,
    opacity: 1,
    dashArray: isSelected ? '10, 5' : '5, 5',
  }), [theme.palette]);

  // Memoized style function for district features
  const getDistrictStyle = useCallback((feature: any) => {
    const districtId = normalizeDistrictId(feature.properties?.NAME || '');
    const isHovered = hoveredDistrictId === districtId;
    const isSelected = selectedDistrictId === districtId;
    
    // Single, consistent styling logic
    return getStyleForState(isHovered, isSelected);
  }, [hoveredDistrictId, selectedDistrictId, getStyleForState]);

  // Helper function to get party color
  const getPartyColor = useCallback((party: 'D' | 'R' | 'I') => {
    switch (party) {
      case 'D': return theme.palette.info.main;
      case 'R': return theme.palette.error.main;
      case 'I': return theme.palette.warning.main;
      default: return theme.palette.grey[500];
    }
  }, [theme.palette]);

  // Memoized style function for precinct features
  const getFeatureStyle = useCallback((feature: any) => {
    if (!feature || !feature.properties) {
      return {
        fillColor: '#e3f2fd',
        color: '#1976d2',
        weight: 1,
        fillOpacity: 0.6,
        opacity: 0.8,
      };
    }

    const { has_data, sp_amt = 0, sr_amt = 0 } = feature.properties;
    const totalSpending = sp_amt + sr_amt;

    let fillColor = '#e3f2fd';
    let fillOpacity = 0.6;

    if (!has_data) {
      fillColor = '#f5f5f5';
      fillOpacity = 0.3;
    } else if (totalSpending > 10000) {
      fillColor = '#1565c0';
      fillOpacity = 0.8;
    } else if (totalSpending > 5000) {
      fillColor = '#1976d2';
      fillOpacity = 0.7;
    } else if (totalSpending > 1000) {
      fillColor = '#42a5f5';
      fillOpacity = 0.6;
    }

    return {
      fillColor,
      color: '#1976d2',
      weight: 1,
      fillOpacity,
      opacity: 0.8,
    };
  }, []);

  // Memoized event handlers for precinct features
  const onEachFeature = useCallback((feature: any, layer: any) => {
    if (!feature || !feature.properties) return;

    const { precinct = 'Unknown Precinct', has_data, sp_nbr = 0, sr_nbr = 0, sp_amt = 0, sr_amt = 0 } = feature.properties;

    // Add hover effects
    layer.on({
      mouseover: (e: any) => {
        e.target.setStyle({
          weight: 3,
          color: theme.palette.primary.main,
          fillColor: theme.palette.primary.light,
          fillOpacity: 0.8,
        });
      },
      mouseout: (e: any) => {
        const style = getFeatureStyle(feature);
        e.target.setStyle(style);
      },
      click: async (e: any) => {
        console.log(`Clicked precinct: ${precinct}`);

        // Find which district this precinct belongs to
        if (districtsGeoJson && MapComponents?.L) {
          try {
            const [{ default: centroid }, { default: booleanPointInPolygon }] = await Promise.all([
              import('@turf/centroid'),
              import('@turf/boolean-point-in-polygon')
            ]);

            const precinctCentroid = centroid(feature);
            let districtName = 'Unknown District';
            let districtId = 'unassigned';

            for (const district of districtsGeoJson.features) {
              if (district && district.geometry && booleanPointInPolygon(precinctCentroid, district)) {
                const rawName = district.properties?.NAME || district.properties?.NAMELSAD || 'Unknown District';
                districtName = rawName;
                districtId = normalizeDistrictId(rawName);
                break;
              }
            }

            // Trigger district selection callback if provided
            if (onPrecinctClick && districtName !== 'Unknown District') {
              onPrecinctClick(districtName);
            }

            // Update popup with district info
            const popupContent = `
              <div style="font-family: ${theme.typography.fontFamily}; min-width: 200px;">
                <h3 style="margin: 0 0 8px 0; color: ${theme.palette.text.primary}; font-size: 14px;">
                  ${precinct}
                </h3>
                <p style="margin: 4px 0; color: ${theme.palette.text.secondary}; font-size: 12px;">
                  <strong>District:</strong> ${districtName} (ID: ${districtId})
                </p>
                ${has_data ? `
                  <div style="margin: 4px 0; font-size: 12px;">
                    <p style="margin: 2px 0;"><strong>Special Projects:</strong> ${sp_nbr} ($${sp_amt.toLocaleString()})</p>
                    <p style="margin: 2px 0;"><strong>State Requests:</strong> ${sr_nbr} ($${sr_amt.toLocaleString()})</p>
                    <p style="margin: 2px 0;"><strong>Total Spending:</strong> $${(sp_amt + sr_amt).toLocaleString()}</p>
                  </div>
                ` : `
                  <p style="margin: 4px 0; color: ${theme.palette.text.secondary}; font-size: 12px;">
                    No spending data available
                  </p>
                `}
              </div>
            `;

            layer.setPopupContent(popupContent);
          } catch (err) {
            console.warn('Error finding district for precinct:', err);
          }
        }
      },
    });

    // Create initial popup content
    const popupContent = `
      <div style="font-family: ${theme.typography.fontFamily}; min-width: 200px;">
        <h3 style="margin: 0 0 8px 0; color: ${theme.palette.text.primary}; font-size: 14px;">
          ${precinct}
        </h3>
        ${has_data ? `
          <div style="margin: 4px 0; font-size: 12px;">
            <p style="margin: 2px 0;"><strong>Special Projects:</strong> ${sp_nbr} ($${sp_amt.toLocaleString()})</p>
            <p style="margin: 2px 0;"><strong>State Requests:</strong> ${sr_nbr} ($${sr_amt.toLocaleString()})</p>
            <p style="margin: 2px 0;"><strong>Total Spending:</strong> $${(sp_amt + sr_amt).toLocaleString()}</p>
          </div>
        ` : `
          <p style="margin: 4px 0; color: ${theme.palette.text.secondary}; font-size: 12px;">
            No spending data available
          </p>
        `}
      </div>
    `;

    layer.bindPopup(popupContent);
  }, [theme.typography.fontFamily, theme.palette.text.primary, theme.palette.text.secondary, theme.palette.primary.main, theme.palette.primary.light, districtsGeoJson, MapComponents]);

  // Memoized event handlers for district features
  const onEachDistrictFeature = useCallback((feature: any, layer: any) => {
    if (!feature || !feature.properties) return;

    const { NAME = 'Unknown District', NAMELSAD = '' } = feature.properties;
    const districtId = normalizeDistrictId(NAME);

    // Find matching district data for party info
    const matchingDistrict = districts.find(d => normalizeDistrictId(d.name) === districtId);

    // Add hover effects
    layer.on({
      mouseover: (e: any) => {
        const districtIdNormalized = normalizeDistrictId(NAME);

        // Trigger hover callback to show info overlay
        if (matchingDistrict) {
          onDistrictHover(matchingDistrict);
        }

        e.target.setStyle({
          weight: 3,
          color: theme.palette.primary.main,
          fillColor: theme.palette.primary.light,
          fillOpacity: 0.25,
          opacity: 1,
        });

        // Bring to front for better visibility
        e.target.bringToFront();
      },
      mouseout: (e: any) => {
        // Clear hover state
        onDistrictHover(null);

        const style = getDistrictStyle(feature);
        e.target.setStyle(style);
      },
      click: (e: any) => {
        console.log(`Clicked district: ${NAME}`);

        // Trigger click callback if we have matching district data
        if (matchingDistrict) {
          onDistrictClick(matchingDistrict);
        }
      },
    });

    // Create popup content for districts with party info if available
    const popupContent = `
      <div style="font-family: ${theme.typography.fontFamily}; min-width: 150px;">
        <h3 style="margin: 0 0 8px 0; color: ${theme.palette.text.primary}; font-size: 14px;">
          ${NAMELSAD || `District ${NAME}`}
        </h3>
        <p style="margin: 4px 0; color: ${theme.palette.text.secondary}; font-size: 12px;">
          District Number: ${NAME}
        </p>
        ${matchingDistrict ? `
          <p style="margin: 4px 0; color: ${theme.palette.text.secondary}; font-size: 12px;">
            <strong>Representative:</strong> ${matchingDistrict.representative}
          </p>
          <p style="margin: 4px 0; font-size: 12px;">
            <strong>Party:</strong> <span style="color: ${
              matchingDistrict.party === 'D' ? theme.palette.info.main :
              matchingDistrict.party === 'R' ? theme.palette.error.main :
              theme.palette.warning.main
            }; font-weight: bold;">
              ${matchingDistrict.party === 'D' ? 'Democrat' : matchingDistrict.party === 'R' ? 'Republican' : 'Independent'}
            </span>
          </p>
        ` : ''}
      </div>
    `;

    layer.bindPopup(popupContent);
  }, [theme.typography.fontFamily, theme.palette.text.primary, theme.palette.text.secondary, theme.palette.primary.main, theme.palette.primary.light, theme.palette.info.main, theme.palette.error.main, theme.palette.warning.main, districts, onDistrictHover, onDistrictClick, getDistrictStyle]);

  // Component to fit map bounds to districts data
  const FitBounds = ({ districtsData }: { districtsData: any }) => {
    const map = MapComponents?.useMap();

    useEffect(() => {
      if (map && districtsData && districtsData.features && districtsData.features.length > 0 && MapComponents?.L) {
        try {
          const geoJsonLayer = MapComponents.L.geoJSON(districtsData);
          const bounds = geoJsonLayer.getBounds();

          if (bounds && bounds.isValid()) {
            map.fitBounds(bounds, {
              padding: [20, 20],
              maxZoom: 10,
            });
          }
        } catch (error) {
          console.warn('Error fitting bounds:', error);
          // Fallback to Virginia center
          map.setView([37.5, -78.6], 7);
        }
      }
    }, [districtsData, map]);

    return null;
  };

  // Error state
  if (error) {
    return (
      <Box sx={{ position: 'relative' }}>
        <Card sx={{ mb: 2, bgcolor: theme.palette.info.light, color: theme.palette.info.contrastText }}>
          <CardContent sx={{ py: 1.5 }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              Virginia Precincts Map
            </Typography>
            <Typography variant="body2">
              Showing precinct-level spending data • Click precincts for details • Darker blue indicates higher spending
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ height: { xs: 350, sm: 450, md: 500 } }}>
          <CardContent sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            flexDirection: 'column',
            gap: 2
          }}>
            <Typography color="error" variant="h6">
              Map failed to load.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {error}
            </Typography>
          </CardContent>
        </Card>
      </Box>
    );
  }

  // Loading state
  if (isLoading || !MapComponents || !geoJsonData || !districtsGeoJson) {
    return (
      <Box sx={{ position: 'relative' }}>
        <Card sx={{ mb: 2, bgcolor: theme.palette.info.light, color: theme.palette.info.contrastText }}>
          <CardContent sx={{ py: 1.5 }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              Virginia Districts & Precincts Map
            </Typography>
            <Typography variant="body2">
              Showing district boundaries with precinct-level spending data • Click for details • Darker blue indicates higher spending
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ height: { xs: 350, sm: 450, md: 500 } }}>
          <CardContent sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            flexDirection: 'column',
            gap: 2
          }}>
            <Typography variant="h6" color="text.secondary">
              Loading Virginia Districts & Precincts Map...
            </Typography>
            {isAggregating && (
              <Typography variant="body2" color="text.secondary">
                Aggregating district totals...
              </Typography>
            )}
          </CardContent>
        </Card>
      </Box>
    );
  }

  const { MapContainer, TileLayer, GeoJSON } = MapComponents;

  return (
    <Box sx={{ position: 'relative' }}>
      {/* Map Info Banner */}
      <Card sx={{ mb: 2, bgcolor: theme.palette.info.light, color: theme.palette.info.contrastText }}>
        <CardContent sx={{ py: 1.5 }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
            Virginia Districts & Precincts Map
          </Typography>
          <Typography variant="body2">
            Showing district boundaries with precinct-level spending data • Click for details • Darker blue indicates higher spending
          </Typography>
          {isAggregating && (
            <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic' }}>
              Aggregating district totals...
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* Map Container */}
      <Card sx={{ height: { xs: 350, sm: 450, md: 500 }, overflow: 'hidden', position: 'relative' }}>
        <MapContainer
          center={[37.5, -78.6]}
          zoom={7}
          style={{ height: '100%', width: '100%' }}
          zoomControl={true}
          scrollWheelZoom={true}
          onMouseLeave={() => setHoveredDistrictId?.(null)}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Precincts layer (rendered first, underneath districts) */}
          <GeoJSON
            key="precincts-layer"
            data={geoJsonData}
            style={getFeatureStyle}
            onEachFeature={onEachFeature}
          />

          {/* Districts layer (rendered on top with transparent fill) */}
          <GeoJSON
            key="districts-layer"
            data={districtsGeoJson}
            style={getDistrictStyle}
            onEachFeature={onEachDistrictFeature}
          />

          <FitBounds districtsData={districtsGeoJson} />
        </MapContainer>

        {/* District Info Overlay - Shows selected or hovered district */}
        {(selectedDistrict || hoveredDistrict) && (
          <Paper
            elevation={3}
            sx={{
              position: 'absolute',
              top: 16,
              right: 16,
              p: 2,
              minWidth: 220,
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(8px)',
              zIndex: 1000,
              borderRadius: 2,
              transition: 'all 0.3s ease',
            }}
          >
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1, fontSize: '1rem' }}>
                {selectedDistrict?.name || hoveredDistrict?.name}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
                {selectedDistrict?.representative || hoveredDistrict?.representative}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Chip
                  label={
                    (selectedDistrict?.party || hoveredDistrict?.party) === 'D'
                      ? 'Democrat'
                      : (selectedDistrict?.party || hoveredDistrict?.party) === 'R'
                      ? 'Republican'
                      : 'Independent'
                  }
                  color={
                    (selectedDistrict?.party || hoveredDistrict?.party) === 'D'
                      ? 'info'
                      : (selectedDistrict?.party || hoveredDistrict?.party) === 'R'
                      ? 'error'
                      : 'warning'
                  }
                  size="small"
                  sx={{ fontWeight: 'bold' }}
                />
                {selectedDistrict && (
                  <Chip
                    label="Selected"
                    color="warning"
                    size="small"
                    variant="outlined"
                  />
                )}
              </Box>
              <Typography variant="caption" sx={{ display: 'block', mt: 1.5, color: 'text.secondary', fontStyle: 'italic' }}>
                District colors indicate party affiliation
              </Typography>
            </Box>
          </Paper>
        )}
      </Card>
    </Box>
  );
}
