'use client';

import { useState, useCallback, useEffect } from 'react';
import { m } from 'framer-motion';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import { alpha, useTheme } from '@mui/material/styles';

import { fCurrency } from 'src/utils/format-number';

import { varFade, MotionViewport } from 'src/components/animate';
import { Iconify } from 'src/components/iconify';
import { LeafletDistrictsMap } from '../components/leaflet-districts-map';

// ----------------------------------------------------------------------

// 🛠️ UTILITY: Normalize district IDs for consistent mapping
function normalizeDistrictId(name: string): string {
  // Attempt to extract a numeric ID from names like "District 1", "DISTRICT-01", etc.
  const match = name.match(/(\d+)/);
  return match ? match[1] : name.toLowerCase().replace(/\s+/g, '-');
}

// 🎨 UTILITY: Get card styling based on hover/selection state
function getCardSx(hovered: boolean, selected: boolean, theme: any) {
  return {
    p: 3,
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    borderWidth: '2px',
    borderStyle: 'solid',
    borderColor: selected ? theme.palette.success.main :
                 hovered ? theme.palette.primary.main : theme.palette.grey[200],
    backgroundColor: selected ? theme.palette.success.light :
                     hovered ? theme.palette.primary.light : theme.palette.background.paper,
    '&:hover': {
      transform: 'translateY(-4px)',
      boxShadow: theme.shadows[8],
    },
    // Add subtle glow effect for selected state
    ...(selected && {
      boxShadow: `0 0 0 1px ${theme.palette.success.main}, ${theme.shadows[4]}`,
    }),
    // Add subtle glow effect for hovered state
    ...(hovered && !selected && {
      boxShadow: `0 0 0 1px ${theme.palette.primary.main}, ${theme.shadows[2]}`,
    }),
  };
}

type DistrictData = {
  id: string;
  name: string;
  representative: string;
  party: 'R' | 'D' | 'I';
  totalBudget: number;
  population: number;
  perCapitaSpending: number;
  topCategories: Array<{
    category: string;
    amount: number;
    percentage: number;
  }>;
  recentProjects: Array<{
    name: string;
    amount: number;
    status: 'completed' | 'in-progress' | 'planned';
  }>;
  coordinates: { x: number; y: number };
};

// Mock district data
const DISTRICT_DATA: DistrictData[] = [
  {
    id: 'district-1',
    name: 'District 1 - Northern Virginia',
    representative: 'Rep. Sarah Johnson',
    party: 'D',
    totalBudget: 125000000,
    population: 85000,
    perCapitaSpending: 1470,
    topCategories: [
      { category: 'Education', amount: 45000000, percentage: 36 },
      { category: 'Transportation', amount: 30000000, percentage: 24 },
      { category: 'Healthcare', amount: 25000000, percentage: 20 },
    ],
    recentProjects: [
      { name: 'Metro Extension Project', amount: 15000000, status: 'in-progress' },
      { name: 'School Technology Upgrade', amount: 3500000, status: 'completed' },
      { name: 'Community Health Center', amount: 8000000, status: 'planned' },
    ],
    coordinates: { x: 20, y: 15 },
  },
  {
    id: 'district-2',
    name: 'District 2 - Richmond Metro',
    representative: 'Rep. Michael Chen',
    party: 'R',
    totalBudget: 98000000,
    population: 72000,
    perCapitaSpending: 1361,
    topCategories: [
      { category: 'Education', amount: 35000000, percentage: 36 },
      { category: 'Public Safety', amount: 20000000, percentage: 20 },
      { category: 'Infrastructure', amount: 18000000, percentage: 18 },
    ],
    recentProjects: [
      { name: 'Police Station Renovation', amount: 4500000, status: 'completed' },
      { name: 'Highway 64 Improvements', amount: 12000000, status: 'in-progress' },
      { name: 'New Elementary School', amount: 18000000, status: 'planned' },
    ],
    coordinates: { x: 45, y: 40 },
  },
  {
    id: 'district-3',
    name: 'District 3 - Hampton Roads',
    representative: 'Rep. Lisa Rodriguez',
    party: 'D',
    totalBudget: 110000000,
    population: 78000,
    perCapitaSpending: 1410,
    topCategories: [
      { category: 'Transportation', amount: 35000000, percentage: 32 },
      { category: 'Education', amount: 33000000, percentage: 30 },
      { category: 'Environment', amount: 22000000, percentage: 20 },
    ],
    recentProjects: [
      { name: 'Port Infrastructure Upgrade', amount: 25000000, status: 'in-progress' },
      { name: 'Coastal Protection Project', amount: 8000000, status: 'planned' },
      { name: 'STEM Education Initiative', amount: 5500000, status: 'completed' },
    ],
    coordinates: { x: 70, y: 65 },
  },
  {
    id: 'district-4',
    name: 'District 4 - Shenandoah Valley',
    representative: 'Rep. David Thompson',
    party: 'R',
    totalBudget: 75000000,
    population: 58000,
    perCapitaSpending: 1293,
    topCategories: [
      { category: 'Agriculture', amount: 22000000, percentage: 29 },
      { category: 'Education', amount: 21000000, percentage: 28 },
      { category: 'Environment', amount: 15000000, percentage: 20 },
    ],
    recentProjects: [
      { name: 'Rural Broadband Expansion', amount: 6000000, status: 'in-progress' },
      { name: 'Agricultural Research Center', amount: 4500000, status: 'planned' },
      { name: 'Park Trail System', amount: 2800000, status: 'completed' },
    ],
    coordinates: { x: 25, y: 30 },
  },
  {
    id: 'district-5',
    name: 'District 5 - Southwest Virginia',
    representative: 'Rep. Amanda Wilson',
    party: 'D',
    totalBudget: 68000000,
    population: 52000,
    perCapitaSpending: 1308,
    topCategories: [
      { category: 'Healthcare', amount: 20000000, percentage: 29 },
      { category: 'Education', amount: 19000000, percentage: 28 },
      { category: 'Economic Development', amount: 12000000, percentage: 18 },
    ],
    recentProjects: [
      { name: 'Regional Medical Center', amount: 15000000, status: 'in-progress' },
      { name: 'Job Training Center', amount: 3500000, status: 'completed' },
      { name: 'Small Business Incubator', amount: 2200000, status: 'planned' },
    ],
    coordinates: { x: 15, y: 55 },
  },
];

export function SpotlightMapView() {
  const theme = useTheme();

  // Test normalization utility on component mount
  useEffect(() => {
    console.log('🧪 Testing district ID normalization:');
    const testCases = [
      'District 1 - Northern Virginia',
      'District 2 - Richmond Metro',
      'District 25',
      'Senate District 40',
      'Unknown District',
      '15'
    ];

    testCases.forEach(testCase => {
      const normalized = normalizeDistrictId(testCase);
      console.log(`  "${testCase}" → "${normalized}"`);
    });

    console.log("✅ normalizeDistrictId active and used across aggregation + card sync flow.");

    // Test visual feedback system after a delay
    setTimeout(() => {
      console.log('🧪 Testing card visual feedback system...');
      console.log('🎨 getCardSx function available:', typeof getCardSx === 'function');

      // Test the styling function with different states
      const testStates = [
        { hovered: false, selected: false, label: 'default' },
        { hovered: true, selected: false, label: 'hovered' },
        { hovered: false, selected: true, label: 'selected' },
        { hovered: true, selected: true, label: 'hovered + selected' }
      ];

      testStates.forEach(state => {
        const styles = getCardSx(state.hovered, state.selected, theme);
        console.log(`🎨 ${state.label} styles:`, {
          borderColor: styles.borderColor,
          backgroundColor: styles.backgroundColor,
          hasGlow: !!styles.boxShadow
        });
      });
    }, 2000);
  }, []);

  const [selectedDistrict, setSelectedDistrict] = useState<DistrictData | null>(null);
  const [hoveredDistrict, setHoveredDistrict] = useState<DistrictData | null>(null);
  const [filterCategory, setFilterCategory] = useState('');
  const [sortBy, setSortBy] = useState('totalBudget');
  const [aggregatedData, setAggregatedData] = useState<Map<string, { total: number; sp_amt: number; sr_amt: number; count: number }> | null>(null);

  // New state for normalized ID-based interactions
  const [hoveredDistrictId, setHoveredDistrictId] = useState<string | null>(null);
  const [selectedDistrictId, setSelectedDistrictId] = useState<string | null>(null);

  const categories = ['Education', 'Transportation', 'Healthcare', 'Public Safety', 'Environment', 'Agriculture', 'Economic Development'];

  // Handle aggregated data from the map (memoized to prevent re-renders)
  const handleAggregationReady = useCallback((totalsByDistrict: Map<string, { total: number; sp_amt: number; sr_amt: number; count: number }>) => {
    console.log('📊 Received aggregated district data from map:', {
      districtsCount: totalsByDistrict.size,
      sampleData: Array.from(totalsByDistrict.entries()).slice(0, 3).map(([name, data]) => ({
        district: name,
        total: `$${data.total.toLocaleString()}`,
        precincts: data.count
      }))
    });
    setAggregatedData(totalsByDistrict);
  }, []);

  // Create a mapping from district number to mock district data
  const getDistrictById = (districtNumber: string): DistrictData | null => {
    // Map district numbers to our mock district IDs
    const districtMapping: { [key: string]: string } = {
      '1': 'district-1',
      '2': 'district-2',
      '3': 'district-3',
      '4': 'district-4',
      '5': 'district-5',
    };

    const mockId = districtMapping[districtNumber];
    return DISTRICT_DATA.find(d => d.id === mockId) || null;
  };

  // Get updated district data with real totals using normalized IDs
  const getUpdatedDistricts = (): DistrictData[] => {
    if (!aggregatedData) return DISTRICT_DATA;

    return DISTRICT_DATA.map(district => {
      const districtId = normalizeDistrictId(district.name);
      const realData = aggregatedData.get(districtId);

      if (realData) {
        console.log(`📊 Updating ${district.name} with real data`, realData);
        return {
          ...district,
          totalBudget: realData.total,
          perCapitaSpending: district.population > 0
            ? Math.round(realData.total / district.population)
            : 0,
        };
      }

      console.warn(`⚠️ No real data found for ${district.name} (ID: ${districtId})`);
      return district;
    });
  };

  const getPartyColor = (party: string) => {
    switch (party) {
      case 'D': return theme.palette.info.main;
      case 'R': return theme.palette.error.main;
      case 'I': return theme.palette.warning.main;
      default: return theme.palette.grey[500];
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'in-progress': return 'warning';
      case 'planned': return 'info';
      default: return 'default';
    }
  };

  const updatedDistricts = getUpdatedDistricts();

  const filteredDistricts = updatedDistricts.filter(district => {
    if (!filterCategory) return true;
    return district.topCategories.some(cat => cat.category === filterCategory);
  });

  const sortedDistricts = [...filteredDistricts].sort((a, b) => {
    switch (sortBy) {
      case 'totalBudget': return b.totalBudget - a.totalBudget;
      case 'perCapitaSpending': return b.perCapitaSpending - a.perCapitaSpending;
      case 'population': return b.population - a.population;
      case 'name': return a.name.localeCompare(b.name);
      default: return 0;
    }
  });

  const handleDistrictClick = (district: DistrictData) => {
    console.log('🎯 District clicked:', district.name);
    setSelectedDistrict(district);
    setSelectedDistrictId(normalizeDistrictId(district.name));

    // Scroll to the corresponding District Comparison card
    setTimeout(() => {
      const cardElement = document.getElementById(`district-card-${district.id}`);
      if (cardElement) {
        cardElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });

        // Add brief highlight effect
        cardElement.style.transform = 'scale(1.02)';
        cardElement.style.transition = 'transform 0.3s ease';
        setTimeout(() => {
          cardElement.style.transform = 'scale(1)';
        }, 300);
      }
    }, 100);
  };

  // New handlers for normalized ID-based interactions
  const handleDistrictCardHover = useCallback((district: DistrictData | null) => {
    if (district) {
      const districtId = normalizeDistrictId(district.name);
      console.log(`🖱️ Card hover: ${district.name} (ID: ${districtId})`);
      setHoveredDistrictId(districtId);
    } else {
      setHoveredDistrictId(null);
    }
  }, []);

  const handlePrecinctClick = useCallback((rawDistrictName: string) => {
    const districtId = normalizeDistrictId(rawDistrictName);
    const matched = updatedDistricts.find(d =>
      normalizeDistrictId(d.name) === districtId
    );

    console.log(`🗺️ Precinct clicked in district: ${rawDistrictName} (ID: ${districtId})`);

    if (matched) {
      setSelectedDistrict(matched);
      setSelectedDistrictId(districtId);

      // Scroll to the corresponding card
      setTimeout(() => {
        const cardElement = document.getElementById(`district-card-${matched.id}`);
        if (cardElement) {
          cardElement.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
          });
        }
      }, 100);
    } else {
      console.warn(`⚠️ No matching district found for: ${rawDistrictName} (ID: ${districtId})`);
    }
  }, [updatedDistricts]);

  const renderInteractiveMap = () => (
    <Card sx={{ p: 4, mb: 4, position: 'relative', minHeight: 600 }}>
      <Typography variant="h5" sx={{ mb: 3, textAlign: 'center' }}>
        Virginia Legislative Districts - Interactive Map
      </Typography>

      {selectedDistrict && (
        <Box sx={{ mb: 3, textAlign: 'center', p: 2, bgcolor: alpha(theme.palette.success.main, 0.1), borderRadius: 2 }}>
          <Typography variant="h6" sx={{ color: 'primary.main' }}>
            ✅ Selected: {selectedDistrict.name}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
            {selectedDistrict.representative} ({selectedDistrict.party === 'D' ? 'Democrat' : 'Republican'})
          </Typography>
          {aggregatedData && (
            <Typography variant="caption" sx={{ color: 'success.main', fontStyle: 'italic' }}>
              ✅ Real spending data loaded ({aggregatedData.size} districts) • Normalized ID system active
            </Typography>
          )}
          <Button
            size="small"
            variant="outlined"
            onClick={() => setSelectedDistrict(null)}
            sx={{ mt: 1 }}
          >
            Clear Selection
          </Button>
        </Box>
      )}

      {/* Virginia Districts & Precincts Leaflet Map */}
      <LeafletDistrictsMap
        districts={sortedDistricts}
        selectedDistrict={selectedDistrict}
        hoveredDistrict={hoveredDistrict}
        onDistrictClick={handleDistrictClick}
        onDistrictHover={setHoveredDistrict}
        filteredDistricts={filteredDistricts}
        onLeafletAggregationReady={handleAggregationReady}
        hoveredDistrictId={hoveredDistrictId}
        selectedDistrictId={selectedDistrictId}
        onPrecinctClick={handlePrecinctClick}
      />

      <Typography variant="body2" sx={{ textAlign: 'center', mt: 2, color: 'text.secondary' }}>
        {selectedDistrict
          ? `Showing details for ${selectedDistrict.name} below ↓`
          : 'Click on any district circle above to view detailed spending information ↑'
        }
      </Typography>
    </Card>
  );

  const renderDistrictDetails = () => {
    if (!selectedDistrict) return null;

    return (
      <Card sx={{ p: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
          <Box>
            <Typography variant="h5" sx={{ mb: 1 }}>
              {selectedDistrict.name}
            </Typography>
            <Typography variant="subtitle1" sx={{ color: 'text.secondary', mb: 1 }}>
              {selectedDistrict.representative}
            </Typography>
            <Chip 
              label={selectedDistrict.party === 'D' ? 'Democrat' : 'Republican'}
              color={selectedDistrict.party === 'D' ? 'info' : 'error'}
              size="small"
            />
          </Box>
          <Button
            variant="outlined"
            size="small"
            onClick={() => setSelectedDistrict(null)}
            startIcon={<Iconify icon="solar:close-circle-bold" />}
          >
            Close
          </Button>
        </Box>

        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Card sx={{ p: 3, textAlign: 'center', bgcolor: alpha(theme.palette.primary.main, 0.04) }}>
              <Typography variant="h4" sx={{ color: 'primary.main', mb: 1 }}>
                {fCurrency(selectedDistrict.totalBudget)}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Total Budget
              </Typography>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card sx={{ p: 3, textAlign: 'center', bgcolor: alpha(theme.palette.info.main, 0.04) }}>
              <Typography variant="h4" sx={{ color: 'info.main', mb: 1 }}>
                {selectedDistrict.population.toLocaleString()}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Population
              </Typography>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card sx={{ p: 3, textAlign: 'center', bgcolor: alpha(theme.palette.success.main, 0.04) }}>
              <Typography variant="h4" sx={{ color: 'success.main', mb: 1 }}>
                {fCurrency(selectedDistrict.perCapitaSpending)}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Per Capita Spending
              </Typography>
            </Card>
          </Grid>
        </Grid>

        <Grid container spacing={3} sx={{ mt: 2 }}>
          <Grid item xs={12} md={6}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Top Spending Categories
            </Typography>
            {selectedDistrict.topCategories.map((category, index) => (
              <Box key={index} sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">{category.category}</Typography>
                  <Typography variant="body2" fontWeight="medium">
                    {fCurrency(category.amount)} ({category.percentage}%)
                  </Typography>
                </Box>
                <Box
                  sx={{
                    height: 8,
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                    borderRadius: 1,
                    overflow: 'hidden',
                  }}
                >
                  <Box
                    sx={{
                      height: '100%',
                      width: `${category.percentage}%`,
                      bgcolor: theme.palette.primary.main,
                      transition: 'width 0.5s ease',
                    }}
                  />
                </Box>
              </Box>
            ))}
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Recent Projects
            </Typography>
            {selectedDistrict.recentProjects.map((project, index) => (
              <Box key={index} sx={{ mb: 2, p: 2, border: `1px solid ${alpha(theme.palette.grey[500], 0.2)}`, borderRadius: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="subtitle2">{project.name}</Typography>
                  <Chip 
                    label={project.status.replace('-', ' ')}
                    color={getStatusColor(project.status) as any}
                    size="small"
                  />
                </Box>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Budget: {fCurrency(project.amount)}
                </Typography>
              </Box>
            ))}
          </Grid>
        </Grid>
      </Card>
    );
  };

  return (
    <Container maxWidth="lg">
      <MotionViewport>
        {/* Hero Section */}
        <Box sx={{ py: 8, textAlign: 'center' }}>
          <m.div variants={varFade('inUp')}>
            <Typography variant="h2" sx={{ mb: 3 }}>
              District Spotlight Map
            </Typography>
          </m.div>

          <m.div variants={varFade('inUp')}>
            <Typography
              variant="h5"
              sx={{
                color: 'text.secondary',
                maxWidth: 800,
                mx: 'auto',
                lineHeight: 1.6,
                mb: 4,
              }}
            >
              Explore how public funds are allocated across Virginia's legislative districts. 
              Compare spending priorities and see where your tax dollars make the biggest impact 
              in your community.
            </Typography>
          </m.div>
        </Box>

        {/* Filters */}
        <m.div variants={varFade('inUp')}>
          <Card sx={{ p: 3, mb: 4 }}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Filter by Category</InputLabel>
                  <Select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    label="Filter by Category"
                  >
                    <MenuItem value="">All Categories</MenuItem>
                    {categories.map((category) => (
                      <MenuItem key={category} value={category}>
                        {category}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Sort by</InputLabel>
                  <Select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    label="Sort by"
                  >
                    <MenuItem value="totalBudget">Total Budget</MenuItem>
                    <MenuItem value="perCapitaSpending">Per Capita Spending</MenuItem>
                    <MenuItem value="population">Population</MenuItem>
                    <MenuItem value="name">District Name</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Card>
        </m.div>

        {/* Interactive Map */}
        <m.div variants={varFade('inUp')}>
          {renderInteractiveMap()}
        </m.div>

        {/* District Details */}
        {selectedDistrict && (
          <m.div variants={varFade('inUp')}>
            {renderDistrictDetails()}
          </m.div>
        )}

        {/* District Comparison Table */}
        <m.div variants={varFade('inUp')}>
          <Card sx={{ p: 4 }}>
            <Typography variant="h5" sx={{ mb: 3 }}>
              District Comparison
            </Typography>
            <Grid container spacing={2}>
              {sortedDistricts.map((district) => {
                const districtId = normalizeDistrictId(district.name);
                const isHovered = hoveredDistrictId === districtId;
                const isSelected = selectedDistrictId === districtId;

                // Debug logging for card state (only when state changes)
                if (isHovered || isSelected) {
                  console.log(`🃏 Card ${districtId}: hovered=${isHovered}, selected=${isSelected}`);
                }

                return (
                  <Grid item xs={12} sm={6} md={4} key={district.id}>
                    <Card
                      id={`district-card-${district.id}`}
                      sx={getCardSx(isHovered, isSelected, theme)}
                      onClick={() => handleDistrictClick(district)}
                      onMouseEnter={() => handleDistrictCardHover(district)}
                      onMouseLeave={() => handleDistrictCardHover(null)}
                    >
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Box
                          sx={{
                            width: 12,
                            height: 12,
                            borderRadius: '50%',
                            bgcolor: getPartyColor(district.party),
                            mr: 1,
                          }}
                        />
                        <Typography variant="subtitle2">{district.name}</Typography>
                      </Box>
                      <Chip
                        label={district.party}
                        size="small"
                        sx={{
                          bgcolor: getPartyColor(district.party),
                          color: 'white',
                          fontWeight: 'bold',
                          fontSize: '0.7rem',
                          height: 20,
                        }}
                      />
                    </Box>
                    <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1, fontSize: '0.85rem' }}>
                      {district.representative}
                    </Typography>
                    <Typography variant="h6" sx={{ color: 'primary.main', mb: 1 }}>
                      {fCurrency(district.totalBudget)}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
                      Population: {district.population.toLocaleString()}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      Per Capita: {fCurrency(district.perCapitaSpending)}
                    </Typography>
                  </Card>
                </Grid>
                );
              })}
            </Grid>
          </Card>
        </m.div>

        {/* Call to Action */}
        <m.div variants={varFade('inUp')}>
          <Card sx={{ p: 4, mt: 4, mb: 4, textAlign: 'center', bgcolor: alpha(theme.palette.primary.main, 0.04) }}>
            <Typography variant="h5" sx={{ mb: 2 }}>
              Want More Detailed Information?
            </Typography>
            <Typography variant="body1" sx={{ mb: 3, color: 'text.secondary' }}>
              Request specific budget documents and spending details for any district through our FOIA toolkit.
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                startIcon={<Iconify icon="solar:document-add-bold" />}
                href="/foia"
              >
                Request District Records
              </Button>
              <Button
                variant="outlined"
                startIcon={<Iconify icon="solar:chart-bold" />}
                href="/budget-decoder"
              >
                View State Budget
              </Button>
            </Box>
          </Card>
        </m.div>
      </MotionViewport>
    </Container>
  );
}
