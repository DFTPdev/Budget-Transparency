'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { m } from 'framer-motion';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Container from '@mui/material/Container';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import TableContainer from '@mui/material/TableContainer';
import TableSortLabel from '@mui/material/TableSortLabel';
import InputAdornment from '@mui/material/InputAdornment';
import { alpha, useTheme } from '@mui/material/styles';

import { fCurrency, fPercent } from 'src/utils/format-number';
import type { BudgetRow, RecipientRow, DPBRow } from 'src/lib/vaPipelineClient';
import { fetchPipelineArtifact, fetchRecipientsData, fetchDPBData } from 'src/lib/vaPipelineClient';

import { varFade, MotionViewport } from 'src/components/animate';
import { Scrollbar } from 'src/components/scrollbar';

// ----------------------------------------------------------------------

type BudgetItem = {
  id: string;
  category: string;
  subcategory: string;
  amount: number;
  percentage: number;
  description: string;
  change: number;
  priority: 'high' | 'medium' | 'low';
};

type Order = 'asc' | 'desc';

// Categorize agencies into programmatic categories
function categorizeAgency(agency: string): string {
  const agencyLower = agency.toLowerCase();

  if (agencyLower.includes('education') || agencyLower.includes('school') || agencyLower.includes('university') || agencyLower.includes('college')) {
    return 'Education';
  }
  if (agencyLower.includes('health') || agencyLower.includes('medical') || agencyLower.includes('medicaid') || agencyLower.includes('medicare')) {
    return 'Healthcare';
  }
  if (agencyLower.includes('transport') || agencyLower.includes('highway') || agencyLower.includes('road') || agencyLower.includes('motor vehicle')) {
    return 'Transportation';
  }
  if (agencyLower.includes('public safety') || agencyLower.includes('police') || agencyLower.includes('fire') || agencyLower.includes('emergency') || agencyLower.includes('corrections')) {
    return 'Public Safety';
  }
  if (agencyLower.includes('environment') || agencyLower.includes('natural resources') || agencyLower.includes('conservation') || agencyLower.includes('forestry')) {
    return 'Environment';
  }
  if (agencyLower.includes('social services') || agencyLower.includes('human services') || agencyLower.includes('welfare') || agencyLower.includes('aging')) {
    return 'Social Services';
  }
  if (agencyLower.includes('economic') || agencyLower.includes('commerce') || agencyLower.includes('business') || agencyLower.includes('development')) {
    return 'Economic Development';
  }
  if (agencyLower.includes('general') || agencyLower.includes('administration') || agencyLower.includes('management') || agencyLower.includes('finance')) {
    return 'General Government';
  }

  return 'Other';
}

// Calculate YoY change with proper fallback logic
function calculateYoYChange(current: number, previous?: number, yoyChange?: number): number {
  // If yoy_change or pct_change exists, use it
  if (typeof yoyChange === 'number' && !isNaN(yoyChange)) {
    return yoyChange;
  }

  // If previous_amount exists, compute: ((current - prev)/prev)*100
  if (typeof previous === 'number' && !isNaN(previous) && previous !== 0) {
    return ((current - previous) / previous) * 100;
  }

  // Return NaN to indicate no data available (will display as "—")
  return NaN;
}

// Transform recipients data to budget items with programmatic categories
function transformRecipientsData(recipientsData: RecipientRow[], dpbData: DPBRow[]): BudgetItem[] {
  if (!recipientsData || recipientsData.length === 0) return [];

  const totalBudget = recipientsData.reduce((sum, row) => sum + row.total_amount, 0);

  return recipientsData.map((row, index) => {
    // Categorize agencies into programmatic categories
    const category = categorizeAgency(row.agency);

    // Calculate YoY change (will be NaN since no historical data exists)
    const change = calculateYoYChange(
      row.total_amount,
      (row as any).previous_amount || (row as any).prev_amount,
      (row as any).yoy_change || (row as any).pct_change
    );

    return {
      id: `recipient-${index}`,
      category,
      subcategory: row.agency,
      amount: row.total_amount,
      percentage: totalBudget > 0 ? (row.total_amount / totalBudget) * 100 : 0,
      description: `${row.items} budget items from ${row.sources.join(', ')} sources`,
      change,
      priority: row.total_amount > 1000000000 ? 'high' : row.total_amount > 100000000 ? 'medium' : 'low'
    };
  });
}

// Transform district budget data to budget items
function transformDistrictData(districtData: any[]): BudgetItem[] {
  if (!districtData || districtData.length === 0) return [];

  const totalBudget = districtData.reduce((sum, row) => sum + (row.total_amount || 0), 0);

  return districtData.map((row, index) => {
    const change = calculateYoYChange(
      row.total_amount,
      row.previous_amount || 0,
      row.yoy_change
    );

    return {
      id: `district-${row.district || index}`,
      category: 'Legislative Districts',
      subcategory: `District ${row.district} - ${row.delegate_name || 'Unknown'}`,
      amount: row.total_amount || 0,
      percentage: totalBudget > 0 ? ((row.total_amount || 0) / totalBudget) * 100 : 0,
      description: `${row.amendments_count || 0} amendments, Add: ${fCurrency(row.add_amount || 0)}, Reduce: ${fCurrency(row.reduce_amount || 0)}`,
      change,
      priority: (row.total_amount || 0) > 500000000 ? 'high' : (row.total_amount || 0) > 100000000 ? 'medium' : 'low'
    };
  });
}

// Mock budget data with detailed breakdown
const MOCK_BUDGET_DATA: BudgetItem[] = [
  {
    id: '1',
    category: 'Education',
    subcategory: 'K-12 Schools',
    amount: 1850000000,
    percentage: 26.6,
    description: 'Public elementary and secondary education funding, teacher salaries, school operations',
    change: 5.2,
    priority: 'high',
  },
  {
    id: '2',
    category: 'Education',
    subcategory: 'Higher Education',
    amount: 600000000,
    percentage: 8.6,
    description: 'State universities, community colleges, and higher education support',
    change: 2.1,
    priority: 'high',
  },
  {
    id: '3',
    category: 'Healthcare',
    subcategory: 'Medicaid',
    amount: 1200000000,
    percentage: 17.2,
    description: 'Healthcare coverage for low-income individuals and families',
    change: 8.7,
    priority: 'high',
  },
  {
    id: '4',
    category: 'Healthcare',
    subcategory: 'Public Health',
    amount: 480000000,
    percentage: 6.9,
    description: 'Disease prevention, health monitoring, and community health programs',
    change: 12.3,
    priority: 'medium',
  },
  {
    id: '5',
    category: 'Transportation',
    subcategory: 'Highway Maintenance',
    amount: 650000000,
    percentage: 9.3,
    description: 'Road repairs, highway construction, and infrastructure maintenance',
    change: -2.1,
    priority: 'medium',
  },
  {
    id: '6',
    category: 'Transportation',
    subcategory: 'Public Transit',
    amount: 240000000,
    percentage: 3.4,
    description: 'Bus systems, rail transport, and public transportation subsidies',
    change: 15.6,
    priority: 'medium',
  },
  {
    id: '7',
    category: 'Public Safety',
    subcategory: 'Law Enforcement',
    amount: 420000000,
    percentage: 6.0,
    description: 'Police departments, state patrol, and law enforcement operations',
    change: 3.8,
    priority: 'high',
  },
  {
    id: '8',
    category: 'Public Safety',
    subcategory: 'Corrections',
    amount: 300000000,
    percentage: 4.3,
    description: 'Prison operations, rehabilitation programs, and correctional facilities',
    change: -1.2,
    priority: 'medium',
  },
  {
    id: '9',
    category: 'Social Services',
    subcategory: 'Child Services',
    amount: 350000000,
    percentage: 5.0,
    description: 'Child protective services, foster care, and family support programs',
    change: 7.4,
    priority: 'high',
  },
  {
    id: '10',
    category: 'Social Services',
    subcategory: 'Welfare Programs',
    amount: 230000000,
    percentage: 3.3,
    description: 'TANF, food assistance, and temporary financial support programs',
    change: 4.1,
    priority: 'medium',
  },
  {
    id: '11',
    category: 'Environment',
    subcategory: 'Conservation',
    amount: 280000000,
    percentage: 4.0,
    description: 'Parks, wildlife protection, and natural resource conservation',
    change: 9.2,
    priority: 'low',
  },
  {
    id: '12',
    category: 'Environment',
    subcategory: 'Sustainability',
    amount: 140000000,
    percentage: 2.0,
    description: 'Renewable energy initiatives and environmental protection programs',
    change: 22.5,
    priority: 'low',
  },
  {
    id: '13',
    category: 'Administration',
    subcategory: 'Government Operations',
    amount: 180000000,
    percentage: 2.6,
    description: 'Administrative costs, government facilities, and operational expenses',
    change: 1.8,
    priority: 'low',
  },
  {
    id: '14',
    category: 'Administration',
    subcategory: 'Technology',
    amount: 50000000,
    percentage: 0.7,
    description: 'IT infrastructure, digital services, and technology modernization',
    change: 18.9,
    priority: 'medium',
  },
];

// Insights generation functions
type InsightData = {
  keyFindings: string[];
  notableChanges: string[];
};

function generateInsights(budgetData: BudgetItem[]): InsightData {
  if (budgetData.length === 0) {
    return {
      keyFindings: ['No budget data available for analysis.'],
      notableChanges: ['No budget changes to report.']
    };
  }

  // Calculate category totals
  const categoryTotals = budgetData.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = { amount: 0, percentage: 0, items: [] };
    }
    acc[item.category].amount += item.amount;
    acc[item.category].percentage += item.percentage;
    acc[item.category].items.push(item);
    return acc;
  }, {} as Record<string, { amount: number; percentage: number; items: BudgetItem[] }>);

  // Sort categories by percentage for top spending
  const topCategories = Object.entries(categoryTotals)
    .sort(([, a], [, b]) => b.percentage - a.percentage)
    .slice(0, 3);

  // Find largest increases and decreases (filter out NaN values)
  const sortedByChange = [...budgetData]
    .filter(item => !isNaN(item.change))
    .sort((a, b) => b.change - a.change);
  const increases = sortedByChange.filter(item => item.change > 0);
  const decreases = sortedByChange.filter(item => item.change < 0);

  // Calculate total budget
  const totalBudget = budgetData.reduce((sum, item) => sum + item.amount, 0);

  // Generate key findings
  const keyFindings: string[] = [];

  if (topCategories.length >= 1) {
    const [topCategory, topData] = topCategories[0];
    const topSubcategory = topData.items.sort((a, b) => b.amount - a.amount)[0];
    keyFindings.push(
      `${topCategory} represents the largest portion of the budget at ${topData.percentage.toFixed(1)}%, with ${topSubcategory.subcategory} being the primary focus area.`
    );
  }

  if (topCategories.length >= 2) {
    const [secondCategory, secondData] = topCategories[1];
    keyFindings.push(
      `${secondCategory} accounts for ${secondData.percentage.toFixed(1)}% of the budget, demonstrating significant state investment in this sector.`
    );
  }

  // Add insight about high-priority items
  const highPriorityItems = budgetData.filter(item => item.priority === 'high');
  if (highPriorityItems.length > 0) {
    const highPriorityTotal = highPriorityItems.reduce((sum, item) => sum + item.percentage, 0);
    keyFindings.push(
      `High-priority programs represent ${highPriorityTotal.toFixed(1)}% of the total budget, reflecting critical state commitments.`
    );
  }

  // Generate notable changes
  const notableChanges: string[] = [];

  if (increases.length > 0) {
    const largestIncrease = increases[0];
    notableChanges.push(
      `The largest increase is in ${largestIncrease.subcategory} (+${largestIncrease.change.toFixed(1)}%), showing significant investment in ${largestIncrease.category.toLowerCase()}.`
    );

    if (increases.length > 1) {
      const secondIncrease = increases[1];
      notableChanges.push(
        `${secondIncrease.subcategory} also saw substantial growth (+${secondIncrease.change.toFixed(1)}%), indicating continued expansion in this area.`
      );
    }
  }

  if (decreases.length > 0) {
    const largestDecrease = decreases[decreases.length - 1];
    notableChanges.push(
      `${largestDecrease.subcategory} experienced a decrease of ${largestDecrease.change.toFixed(1)}%, reflecting budget reallocation priorities.`
    );
  }

  // If no changes, provide context
  if (increases.length === 0 && decreases.length === 0) {
    const hasChangeData = budgetData.some(item => !isNaN(item.change));
    if (hasChangeData) {
      notableChanges.push('All budget categories maintained stable funding levels year-over-year.');
    } else {
      notableChanges.push('Year-over-year change data is not available for the current dataset.');
    }
  }

  return { keyFindings, notableChanges };
}

export function BudgetDecoderView() {
  const theme = useTheme();
  const router = useRouter();
  const [order, setOrder] = useState<Order>('desc');
  const [orderBy, setOrderBy] = useState<keyof BudgetItem>('amount');
  const [filterName, setFilterName] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [recipientsData, setRecipientsData] = useState<RecipientRow[] | null>(null);
  const [dpbData, setDPBData] = useState<DPBRow[] | null>(null);
  const [districtData, setDistrictData] = useState<any[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load pipeline data on component mount
  useEffect(() => {
    const loadPipelineData = async () => {
      try {
        const [recipients, dpb, districts] = await Promise.all([
          fetchRecipientsData(),
          fetchDPBData(),
          fetch('/data/budget_by_district_2025.json').then(r => r.json()).catch(() => null)
        ]);

        // Validate data before setting state
        if (Array.isArray(recipients) && recipients.length > 0) {
          setRecipientsData(recipients);
        } else {
          console.warn('Recipients data is empty or invalid');
          setRecipientsData(null);
        }

        if (Array.isArray(dpb)) {
          setDPBData(dpb);
        } else {
          console.warn('DPB data is invalid');
          setDPBData(null);
        }

        if (Array.isArray(districts) && districts.length > 0) {
          console.log('✅ District data loaded:', districts.length, 'records');
          setDistrictData(districts);
        } else {
          console.warn('❌ District data is empty or invalid:', districts);
          setDistrictData(null);
        }
      } catch (error) {
        console.warn('Pipeline artifacts not found, using fallback data:', error);
        setRecipientsData(null);
        setDPBData(null);
        setDistrictData(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadPipelineData();
  }, []);

  // Combine pipeline data (programmatic) and district data
  const budgetData = useMemo(() => {
    try {
      let combinedData: BudgetItem[] = [];

      // Add programmatic data from recipients
      if (recipientsData && recipientsData.length > 0) {
        combinedData = [...combinedData, ...transformRecipientsData(recipientsData, dpbData || [])];
      }

      // Add district-level data
      if (districtData && districtData.length > 0) {
        const districtItems = transformDistrictData(districtData);
        console.log('✅ Adding district data:', districtItems.length, 'items');
        combinedData = [...combinedData, ...districtItems];
      } else {
        console.log('❌ No district data to add');
      }

      // If no pipeline data, use mock data
      if (combinedData.length === 0) {
        return MOCK_BUDGET_DATA;
      }

      return combinedData;
    } catch (error) {
      console.error('Error transforming budget data:', error);
      return MOCK_BUDGET_DATA;
    }
  }, [recipientsData, dpbData, districtData]);

  // Generate dynamic insights based on current data and filters
  const filteredData = useMemo(() => {
    let data = budgetData;

    if (filterName) {
      data = data.filter(item =>
        item.subcategory.toLowerCase().includes(filterName.toLowerCase()) ||
        item.description.toLowerCase().includes(filterName.toLowerCase())
      );
    }

    if (filterCategory) {
      data = data.filter(item => item.category === filterCategory);
    }

    return data;
  }, [filterName, filterCategory]);

  // Generate dynamic insights based on current filtered data
  const insights = useMemo(() => generateInsights(filteredData), [filteredData]);

  const handleSort = (property: keyof BudgetItem) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const handleViewOnMap = (item: BudgetItem) => {
    try {
      // Extract district number from subcategory (e.g., "District 33" -> "33")
      const districtMatch = item.subcategory.match(/\d+/);
      if (districtMatch) {
        const districtNum = districtMatch[0];
        router.push(`/spotlight-map?district=${districtNum}`);
      } else {
        // No district found, go to general map
        router.push('/spotlight-map');
      }
    } catch (error) {
      console.error('Error navigating to spotlight map:', error);
    }
  };



  const sortedData = useMemo(() => {
    const comparator = (a: BudgetItem, b: BudgetItem) => {
      if (orderBy === 'amount' || orderBy === 'percentage') {
        return order === 'asc' ? a[orderBy] - b[orderBy] : b[orderBy] - a[orderBy];
      }
      if (orderBy === 'change') {
        // Handle NaN values in change sorting - put them at the end
        const aChange = isNaN(a.change) ? (order === 'asc' ? Infinity : -Infinity) : a.change;
        const bChange = isNaN(b.change) ? (order === 'asc' ? Infinity : -Infinity) : b.change;
        return order === 'asc' ? aChange - bChange : bChange - aChange;
      }
      if (orderBy === 'category' || orderBy === 'subcategory') {
        return order === 'asc'
          ? a[orderBy].localeCompare(b[orderBy])
          : b[orderBy].localeCompare(a[orderBy]);
      }
      return 0;
    };

    return [...filteredData].sort(comparator);
  }, [filteredData, order, orderBy]);

  const totalBudget = budgetData.reduce((sum, item) => sum + item.amount, 0);

  // Load categories from budget data (program/agency categories AND districts)
  const categories = useMemo(() => {
    // Always include all categories from the combined budget data
    const allCategories = Array.from(new Set(budgetData.map(item => item.category)))
      .sort();

    // Temporary debugging
    console.log('Budget data length:', budgetData.length);
    console.log('Categories found:', allCategories);
    console.log('Has Legislative Districts:', allCategories.includes('Legislative Districts'));

    return allCategories;
  }, [budgetData]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  const getChangeColor = (change: number) => {
    if (isNaN(change)) return theme.palette.text.secondary;
    if (change > 0) return theme.palette.success.main;
    if (change < 0) return theme.palette.error.main;
    return theme.palette.text.secondary;
  };

  // Show loading state while fetching data
  if (isLoading) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ py: 8, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary">
            Loading Budget Data...
          </Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <MotionViewport>
        {/* Hero Section */}
        <Box sx={{ py: 8, textAlign: 'center' }}>
          <m.div variants={varFade('inUp')}>
            <Typography variant="h2" sx={{ mb: 3 }}>
              Budget Decoder
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
                mb: 2,
              }}
            >
              Explore how your tax dollars are allocated across different government programs and services.
              Each line item represents a detailed breakdown of state spending.
            </Typography>
          </m.div>

          <m.div variants={varFade('inUp')}>
            <Typography variant="h6" sx={{ color: 'primary.main' }}>
              Total Budget: {fCurrency(totalBudget)}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', mt: 1, display: 'block' }}>
              Data Source: {recipientsData && recipientsData.length > 0 ? 'VA Budget Pipeline (Live)' : 'Sample Data'}
            </Typography>
          </m.div>
        </Box>

        {/* Filters */}
        <m.div variants={varFade('inUp')}>
          <Card sx={{ mb: 3, p: 3 }}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  value={filterName}
                  onChange={(e) => setFilterName(e.target.value)}
                  placeholder="Search programs or descriptions..."
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <span style={{ color: 'rgba(0,0,0,0.4)' }}>🔍</span>
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  select
                  fullWidth
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  SelectProps={{ native: true }}
                >
                  <option value="">All Categories</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </TextField>
              </Grid>
            </Grid>
          </Card>
        </m.div>

        {/* Budget Table */}
        <m.div variants={varFade('inUp')}>
          <Card sx={{ mb: 5 }}>
            <Scrollbar>
              <TableContainer sx={{ minWidth: 1000 }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>
                        <TableSortLabel
                          active={orderBy === 'category'}
                          direction={orderBy === 'category' ? order : 'asc'}
                          onClick={() => handleSort('category')}
                        >
                          Category
                        </TableSortLabel>
                      </TableCell>
                      <TableCell>
                        <TableSortLabel
                          active={orderBy === 'subcategory'}
                          direction={orderBy === 'subcategory' ? order : 'asc'}
                          onClick={() => handleSort('subcategory')}
                        >
                          Program
                        </TableSortLabel>
                      </TableCell>
                      <TableCell align="right">
                        <TableSortLabel
                          active={orderBy === 'amount'}
                          direction={orderBy === 'amount' ? order : 'asc'}
                          onClick={() => handleSort('amount')}
                        >
                          Amount
                        </TableSortLabel>
                      </TableCell>
                      <TableCell align="right">
                        <TableSortLabel
                          active={orderBy === 'percentage'}
                          direction={orderBy === 'percentage' ? order : 'asc'}
                          onClick={() => handleSort('percentage')}
                        >
                          % of Budget
                        </TableSortLabel>
                      </TableCell>
                      <TableCell align="right">
                        <TableSortLabel
                          active={orderBy === 'change'}
                          direction={orderBy === 'change' ? order : 'asc'}
                          onClick={() => handleSort('change')}
                        >
                          YoY Change
                        </TableSortLabel>
                      </TableCell>
                      <TableCell align="center">Priority</TableCell>
                      <TableCell>Description</TableCell>
                      <TableCell align="center">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {sortedData.map((item) => (
                      <TableRow
                        key={item.id}
                        data-district={item.subcategory.match(/\d+/) ? item.subcategory.match(/\d+/)?.[0] : ''}
                        sx={{
                          '&:hover': {
                            backgroundColor: alpha(theme.palette.primary.main, 0.04)
                          },
                          cursor: 'default'
                        }}
                      >
                        <TableCell>
                          <Typography variant="subtitle2" sx={{ color: 'primary.main' }}>
                            {item.category}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {item.subcategory}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" fontWeight="medium">
                            {fCurrency(item.amount)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2">
                            {fPercent(item.percentage)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography
                            variant="body2"
                            sx={{
                              color: getChangeColor(item.change),
                              fontWeight: 'medium'
                            }}
                          >
                            {isNaN(item.change) ? '—' : `${item.change > 0 ? '+' : ''}${item.change.toFixed(1)}%`}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={item.priority.toUpperCase()}
                            color={getPriorityColor(item.priority) as any}
                            size="small"
                            variant="soft"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 300 }}>
                            {item.description}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleViewOnMap(item);
                            }}
                            sx={{
                              minWidth: 'auto',
                              '&:hover': {
                                backgroundColor: alpha(theme.palette.primary.main, 0.08)
                              }
                            }}
                          >
                            📍 View on Map
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Scrollbar>
          </Card>
        </m.div>

        {/* Analysis Section */}
        <m.div variants={varFade('inUp')}>
          <Card>
            <CardContent sx={{ p: 4 }}>
              <Typography variant="h4" sx={{ mb: 3 }}>
                Budget Analysis & Insights
              </Typography>

              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" sx={{ mb: 2, color: 'primary.main' }}>
                    Key Findings
                  </Typography>
                  {insights.keyFindings.map((finding, index) => (
                    <Typography key={index} variant="body1" sx={{ mb: 2, lineHeight: 1.7 }}>
                      {finding}
                    </Typography>
                  ))}
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" sx={{ mb: 2, color: 'primary.main' }}>
                    Notable Changes
                  </Typography>
                  {insights.notableChanges.map((change, index) => (
                    <Typography key={index} variant="body1" sx={{ mb: 2, lineHeight: 1.7 }}>
                      {change}
                    </Typography>
                  ))}
                </Grid>
              </Grid>

              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 4 }}>
                <Button
                  variant="contained"
                  href="/downloads/budget-summary.pdf"
                >
                  📥 Download Full Report
                </Button>
                <Button
                  variant="outlined"
                  href="/foia"
                >
                  ❓ Request Detailed Records
                </Button>
                <Button
                  variant="text"
                  href="/spotlight-map"
                >
                  📊 View District Breakdown
                </Button>
              </Box>
            </CardContent>
          </Card>
        </m.div>
      </MotionViewport>
    </Container>
  );
}
