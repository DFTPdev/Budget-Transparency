'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import { Box, Typography, Card, CardContent, Button, List, ListItem, ListItemText, Drawer } from '@mui/material';
import { fetchDistrictGeoJSON, fetchPrecinctGeoJSON, type DistrictFeature, type PrecinctFeature, type DistrictGeoJSON, type PrecinctGeoJSON } from 'src/lib/vaPipelineClient';
import { MapLegend } from './MapLegend';
import { LayerToggle } from './LayerToggle';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default markers
if (typeof window !== 'undefined') {
  const L = require('leaflet');
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  });
}

// Color scale for budget visualization
const BUDGET_COLORS = ['#f0f9ff', '#bae6fd', '#7dd3fc', '#38bdf8', '#0ea5e9'];
const NO_DATA_COLOR = '#f5f5f5';

// Helper function to create quantile thresholds
function createQuantileThresholds(values: number[], buckets: number = 5): number[] {
  const sorted = values.filter(v => v > 0).sort((a, b) => a - b);
  if (sorted.length === 0) return [];

  const thresholds: number[] = [];
  for (let i = 1; i < buckets; i++) {
    const index = Math.floor((i / buckets) * sorted.length);
    thresholds.push(sorted[Math.min(index, sorted.length - 1)]);
  }
  return thresholds;
}

// Helper function to get color for budget value
function getBudgetColor(budgetTotal: number, thresholds: number[]): string {
  if (!budgetTotal || budgetTotal <= 0) return NO_DATA_COLOR;

  for (let i = 0; i < thresholds.length; i++) {
    if (budgetTotal <= thresholds[i]) {
      return BUDGET_COLORS[i];
    }
  }
  return BUDGET_COLORS[BUDGET_COLORS.length - 1];
}

// Helper function to format currency
function formatCurrency(amount: number): string {
  if (amount >= 1000000000) {
    return `$${(amount / 1000000000).toFixed(1)}B`;
  } else if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(1)}M`;
  } else if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(0)}K`;
  }
  return `$${amount.toLocaleString()}`;
}

// Component to fit map bounds to district data
function FitBounds({ data }: { data: DistrictGeoJSON | null }) {
  const map = useMap();

  useEffect(() => {
    if (data && data.features && data.features.length > 0) {
      try {
        const L = require('leaflet');
        const geoJsonLayer = L.geoJSON(data);
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
  }, [data, map]);

  return null;
}

export function SpotlightMap() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [districtData, setDistrictData] = useState<DistrictGeoJSON | null>(null);
  const [precinctData, setPrecinctData] = useState<PrecinctGeoJSON | null>(null);
  const [budgetData, setBudgetData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDistricts, setShowDistricts] = useState(true);
  const [showPrecincts, setShowPrecincts] = useState(true);
  const [budgetThresholds, setBudgetThresholds] = useState<number[]>([]);
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);
  const [showDistrictPanel, setShowDistrictPanel] = useState(false);

  // Get district from URL params
  const districtParam = searchParams.get('district');

  // Fetch district, precinct, and budget data
  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('Fetching map data...');
        const [districts, precincts, budgetResponse] = await Promise.all([
          fetchDistrictGeoJSON(),
          fetchPrecinctGeoJSON(),
          fetch('/data/budget_by_district_2025.json').then(r => r.json())
        ]);

        console.log('Data loaded:', districts.features.length, 'districts,', precincts.features.length, 'precincts', budgetResponse.length, 'budget rows');

        // Create budget thresholds for color scale
        const budgetValues = districts.features
          .map(f => f.properties.budget_total || 0)
          .filter(v => v > 0);
        const thresholds = createQuantileThresholds(budgetValues, 5);

        setDistrictData(districts);
        setPrecinctData(precincts);
        setBudgetData(budgetResponse);
        setBudgetThresholds(thresholds);
        setError(null);
      } catch (err) {
        console.error('Error loading map data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load map data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Handle district parameter from URL
  useEffect(() => {
    if (districtParam) {
      setSelectedDistrict(districtParam);
      setShowDistrictPanel(true);
    }
  }, [districtParam]);

  // Style function for district features
  const getDistrictStyle = (feature: DistrictFeature) => {
    try {
      const budgetTotal = feature.properties.budget_total || 0;
      const fillColor = getBudgetColor(budgetTotal, budgetThresholds);
      const districtId = feature.properties?.district?.toString() || '';
      const isSelected = selectedDistrict && districtId === selectedDistrict;

      return {
        fillColor: fillColor || '#f5f5f5',
        color: isSelected ? '#ff6b35' : '#2b4a67',
        weight: isSelected ? 4 : 2,
        fillOpacity: isSelected ? 0.9 : (budgetTotal > 0 ? 0.7 : 0.3),
        opacity: 1,
        stroke: true,
      };
    } catch (error) {
      console.error('Error in getDistrictStyle:', error);
      return {
        fillColor: '#f5f5f5',
        color: '#2b4a67',
        weight: 2,
        fillOpacity: 0.3,
        opacity: 1,
      };
    }
  };

  // Style function for precinct features
  const getPrecinctStyle = (feature: PrecinctFeature) => {
    return {
      fillColor: '#f8f9fa',
      color: '#dee2e6',
      weight: 0.5,
      fillOpacity: 0.3,
      opacity: 0.6,
    };
  };

  // Event handlers for district features
  const onEachDistrictFeature = (feature: DistrictFeature, layer: any) => {
    const { district, NAMELSAD, budget_total = 0 } = feature.properties;
    const districtName = NAMELSAD || `District ${district}`;

    // Add hover effects with error handling
    layer.on({
      mouseover: (e: any) => {
        try {
          if (e.target && e.target.setStyle) {
            e.target.setStyle({
              weight: 4,
              fillOpacity: 0.9,
            });
          }

          // Show tooltip
          const tooltip = `<div style="font-size: 12px; font-weight: bold;">
            ${districtName}<br/>
            Budget: ${formatCurrency(budget_total)}
          </div>`;
          if (layer.bindTooltip) {
            layer.bindTooltip(tooltip, { permanent: false, sticky: true }).openTooltip();
          }
        } catch (error) {
          console.error('Mouseover error:', error);
        }
      },
      mouseout: (e: any) => {
        try {
          if (e.target && e.target.setStyle) {
            const style = getDistrictStyle(feature);
            e.target.setStyle(style);
          }
          if (layer.closeTooltip) {
            layer.closeTooltip();
          }
        } catch (error) {
          console.error('Mouseout error:', error);
        }
      },
      click: (e: any) => {
        console.log(`Clicked district: ${district}`);
      },
    });

    // Create popup content
    const popupContent = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; min-width: 220px;">
        <h3 style="margin: 0 0 8px 0; color: #1a1a1a; font-size: 16px; font-weight: bold;">
          ${districtName}
        </h3>
        <div style="margin: 8px 0; font-size: 14px;">
          <p style="margin: 4px 0;"><strong>Budget Total:</strong> ${formatCurrency(budget_total)}</p>
          ${budget_total > 0 ? `
            <div style="margin-top: 12px;">
              <a href="/budget-decoder?district=HD-${district}"
                 style="color: #1976d2; text-decoration: none; font-size: 13px;">
                → View Budget Details
              </a>
            </div>
          ` : `
            <p style="margin: 4px 0; color: #666; font-size: 13px;">No budget data available</p>
          `}
        </div>
      </div>
    `;

    layer.bindPopup(popupContent);
  };

  // Event handlers for precinct features
  const onEachPrecinctFeature = (feature: PrecinctFeature, layer: any) => {
    const { precinct, has_data, sp_amt = 0, sr_amt = 0 } = feature.properties;
    const totalSpending = sp_amt + sr_amt;

    if (has_data && totalSpending > 0) {
      const popupContent = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; min-width: 180px;">
          <h4 style="margin: 0 0 6px 0; color: #1a1a1a; font-size: 13px; font-weight: bold;">
            ${precinct}
          </h4>
          <p style="margin: 2px 0; font-size: 12px;">
            <strong>Total:</strong> ${formatCurrency(totalSpending)}
          </p>
        </div>
      `;
      layer.bindPopup(popupContent);
    }
  };

  // Create legend buckets - let MapLegend handle formatting with fmtMoney
  const legendBuckets = budgetThresholds.map((threshold, index) => {
    const prevThreshold = index === 0 ? 0 : budgetThresholds[index - 1];
    const nextThreshold = budgetThresholds[index + 1];

    // Don't provide pre-formatted label - let MapLegend formatter handle it
    const label = nextThreshold ? 'Range' : 'Max+';

    return {
      color: BUDGET_COLORS[index],
      label,
      min: prevThreshold,
      max: threshold
    };
  });

  // Error state
  if (error) {
    return (
      <Card sx={{ height: { xs: 400, sm: 500, md: 600 } }}>
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
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <Card sx={{ height: { xs: 400, sm: 500, md: 600 } }}>
        <CardContent sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%'
        }}>
          <Typography variant="h6" color="text.secondary">
            Loading Virginia Districts Map...
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box sx={{ position: 'relative' }}>
      {/* Map Info Banner */}
      <Card sx={{ mb: 2, bgcolor: '#f8f9fa', border: '1px solid #e9ecef' }}>
        <CardContent sx={{ py: 1.5 }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#2b4a67' }}>
            Virginia House Districts Budget Map
          </Typography>
          <Typography variant="body2" sx={{ color: '#6c757d' }}>
            District budget totals • Hover for details • Click for budget decoder link
          </Typography>
        </CardContent>
      </Card>

      {/* Map Container */}
      <Card sx={{ height: { xs: 400, sm: 500, md: 600 }, overflow: 'hidden', position: 'relative' }}>
        <MapContainer
          center={[37.5407, -78.8406]}
          zoom={7}
          style={{ height: '100%', width: '100%' }}
          zoomControl={true}
          scrollWheelZoom={true}
          preferCanvas={true}
          aria-label="Virginia House Districts Budget Map"
        >
          <TileLayer
            attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png"
            subdomains="abcd"
          />

          {/* Precincts Layer (underneath) */}
          {showPrecincts && precinctData && (
            <GeoJSON
              key="precincts"
              data={precinctData}
              style={getPrecinctStyle}
              onEachFeature={onEachPrecinctFeature}
            />
          )}

          {/* Districts Layer (on top) */}
          {showDistricts && districtData && (
            <GeoJSON
              key="districts"
              data={districtData}
              style={getDistrictStyle}
              onEachFeature={onEachDistrictFeature}
            />
          )}

          {districtData && <FitBounds data={districtData} />}
        </MapContainer>

        {/* Layer Toggle */}
        <LayerToggle
          districtChecked={showDistricts}
          precinctChecked={showPrecincts}
          onDistricts={setShowDistricts}
          onPrecincts={setShowPrecincts}
        />

        {/* Legend */}
        {legendBuckets.length > 0 && (
          <MapLegend
            buckets={legendBuckets}
            title="District Budget"
            noDataLabel="Gray: No budget data"
          />
        )}

        {/* District Details Panel */}
        <Drawer
          anchor="right"
          open={showDistrictPanel}
          onClose={() => setShowDistrictPanel(false)}
          sx={{
            '& .MuiDrawer-paper': {
              width: 400,
              padding: 2,
            },
          }}
        >
          {selectedDistrict && (
            <Box>
              <Typography variant="h6" gutterBottom>
                District {selectedDistrict} Budget Details
              </Typography>

              {budgetData
                .filter(row => row.district?.toString() === selectedDistrict)
                .map((row, index) => (
                  <Card key={index} sx={{ mb: 1, p: 1 }}>
                    <Typography variant="body2" fontWeight="bold">
                      {row.agency || 'Unknown Agency'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      ${(row.total_amount || 0).toLocaleString()}
                    </Typography>
                  </Card>
                ))}

              <Button
                variant="outlined"
                fullWidth
                sx={{ mt: 2 }}
                onClick={() => router.push(`/budget-decoder?district=${selectedDistrict}`)}
              >
                View Full Budget Details
              </Button>
            </Box>
          )}
        </Drawer>
      </Card>
    </Box>
  );
}
