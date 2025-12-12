'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { m } from 'framer-motion';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
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
import IconButton from '@mui/material/IconButton';
import Collapse from '@mui/material/Collapse';
import CircularProgress from '@mui/material/CircularProgress';
import Chip from '@mui/material/Chip';
import Tooltip from '@mui/material/Tooltip';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import { alpha, useTheme } from '@mui/material/styles';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import CancelIcon from '@mui/icons-material/Cancel';
import InfoIcon from '@mui/icons-material/Info';
import SearchIcon from '@mui/icons-material/Search';

import { fCurrency, fPercent } from 'src/utils/format-number';
import { 
  loadProgramRollups, 
  loadVendorRecords, 
  filterVendorsByProgram, 
  loadProgramBudgets,
  type ProgramRollup, 
  type VendorRecord, 
  type ProgramBudget 
} from 'src/lib/decoderDataLoader';

import { varFade, MotionViewport } from 'src/components/animate';
import { Scrollbar } from 'src/components/scrollbar';
import { STORY_BUCKET_COLORS, type StoryBucketId } from 'src/data/spendingStoryBuckets';

// ----------------------------------------------------------------------

type DataQuality = 'complete' | 'partial' | 'budget-only';

type UnifiedBudgetRow = {
  id: string;
  fiscalYear: number;
  storyBucketId?: StoryBucketId;
  storyBucketLabel?: string;
  agency: string;
  program: string;
  budgetedAmount: number;
  spentYTD: number | null;
  executionRate: number | null;
  vendorCount: number;
  dataQuality: DataQuality;
  rollup?: ProgramRollup;
};

type Order = 'asc' | 'desc';

// ----------------------------------------------------------------------

export function BudgetXView() {
  const theme = useTheme();

  // State
  const [loading, setLoading] = useState(true);
  const [programData, setProgramData] = useState<ProgramBudget[]>([]);
  const [rollupData, setRollupData] = useState<ProgramRollup[]>([]);
  const [vendorData, setVendorData] = useState<VendorRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [orderBy, setOrderBy] = useState<keyof UnifiedBudgetRow>('budgetedAmount');
  const [order, setOrder] = useState<Order>('desc');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [showCompleteOnly, setShowCompleteOnly] = useState(false);

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        console.log('🔄 Loading Budget X data...');

        const [programs, rollups, vendors] = await Promise.all([
          loadProgramBudgets(2025),
          loadProgramRollups(),
          loadVendorRecords()
        ]);

        console.log('✅ Loaded programs:', programs.length);
        console.log('✅ Loaded rollups:', rollups.length);
        console.log('✅ Loaded vendors:', vendors.length);

        setProgramData(programs);
        setRollupData(rollups);
        setVendorData(vendors);
      } catch (error) {
        console.error('❌ Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Aggregate rollups by program (sum across service areas)
  const aggregatedRollups = useMemo(() => {
    const rollupMap = new Map<string, ProgramRollup>();

    rollupData.forEach(rollup => {
      const key = `${rollup.fiscal_year}-${rollup.agency}-${rollup.program}`;

      if (rollupMap.has(key)) {
        const existing = rollupMap.get(key)!;
        existing.total_spent_ytd += rollup.total_spent_ytd;
        existing.number_of_unique_recipients += rollup.number_of_unique_recipients;

        // Merge top recipients
        const allRecipients = [...existing.top_10_recipients, ...rollup.top_10_recipients];
        existing.top_10_recipients = Array.from(new Set(allRecipients)).slice(0, 10);

        // Merge category breakdowns
        Object.entries(rollup.category_breakdown).forEach(([category, count]) => {
          existing.category_breakdown[category] = (existing.category_breakdown[category] || 0) + count;
        });

        // Recalculate execution rate
        existing.execution_rate = existing.appropriated_amount > 0
          ? existing.total_spent_ytd / existing.appropriated_amount
          : 0;
        existing.remaining_balance = existing.appropriated_amount - existing.total_spent_ytd;
      } else {
        rollupMap.set(key, { ...rollup });
      }
    });

    return Array.from(rollupMap.values());
  }, [rollupData]);

  // Create unified budget rows
  const unifiedRows = useMemo(() => {
    const rows: UnifiedBudgetRow[] = [];

    programData.forEach((program, index) => {
      // Find matching rollup
      const matchingRollup = aggregatedRollups.find(r =>
        r.fiscal_year === program.fiscal_year &&
        r.agency === program.agency &&
        r.program === program.program
      );

      // Count vendors for this program
      const vendors = matchingRollup
        ? filterVendorsByProgram(
            vendorData,
            matchingRollup.fiscal_year,
            matchingRollup.agency,
            matchingRollup.program,
            matchingRollup.service_area
          )
        : [];

      // Determine data quality
      let dataQuality: DataQuality = 'budget-only';
      if (matchingRollup) {
        if (matchingRollup.total_spent_ytd > 0 && vendors.length > 0) {
          dataQuality = 'complete';
        } else if (matchingRollup.total_spent_ytd > 0) {
          dataQuality = 'partial';
        }
      }

      rows.push({
        id: `${program.fiscal_year}-${program.agency}-${program.program}-${index}`,
        fiscalYear: program.fiscal_year,
        storyBucketId: program.story_bucket_id,
        storyBucketLabel: program.story_bucket_label,
        agency: program.agency,
        program: program.program,
        budgetedAmount: program.amount,
        spentYTD: matchingRollup?.total_spent_ytd ?? null,
        executionRate: matchingRollup?.execution_rate ?? null,
        vendorCount: vendors.length,
        dataQuality,
        rollup: matchingRollup
      });
    });

    return rows;
  }, [programData, aggregatedRollups, vendorData]);

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    const totalBudget = unifiedRows.reduce((sum, row) => sum + row.budgetedAmount, 0);
    const totalSpent = unifiedRows.reduce((sum, row) => sum + (row.spentYTD ?? 0), 0);
    const completeCount = unifiedRows.filter(r => r.dataQuality === 'complete').length;
    const partialCount = unifiedRows.filter(r => r.dataQuality === 'partial').length;
    const budgetOnlyCount = unifiedRows.filter(r => r.dataQuality === 'budget-only').length;

    return {
      totalBudget,
      totalSpent,
      totalPrograms: unifiedRows.length,
      completeCount,
      partialCount,
      budgetOnlyCount,
      matchRate: unifiedRows.length > 0 ? (completeCount / unifiedRows.length) * 100 : 0
    };
  }, [unifiedRows]);

  // Filter and sort rows
  const filteredRows = useMemo(() => {
    let filtered = unifiedRows;

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(row =>
        row.program.toLowerCase().includes(query) ||
        row.agency.toLowerCase().includes(query) ||
        row.storyBucketLabel?.toLowerCase().includes(query)
      );
    }

    // Apply complete-only filter
    if (showCompleteOnly) {
      filtered = filtered.filter(row => row.dataQuality === 'complete');
    }

    // Sort
    filtered.sort((a, b) => {
      const aValue = a[orderBy];
      const bValue = b[orderBy];

      if (aValue === null && bValue === null) return 0;
      if (aValue === null) return 1;
      if (bValue === null) return -1;

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return order === 'asc' ? aValue - bValue : bValue - aValue;
      }

      const aStr = String(aValue);
      const bStr = String(bValue);
      return order === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
    });

    return filtered;
  }, [unifiedRows, searchQuery, showCompleteOnly, orderBy, order]);

  // Handle sort
  const handleSort = (property: keyof UnifiedBudgetRow) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  // Handle row expand
  const handleExpandRow = (rowId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(rowId)) {
      newExpanded.delete(rowId);
    } else {
      newExpanded.add(rowId);
    }
    setExpandedRows(newExpanded);
  };

  // Get vendors for a row
  const getVendorsForRow = (row: UnifiedBudgetRow): VendorRecord[] => {
    if (!row.rollup) return [];

    const vendors = filterVendorsByProgram(
      vendorData,
      row.rollup.fiscal_year,
      row.rollup.agency,
      row.rollup.program,
      row.rollup.service_area
    );

    return vendors.sort((a, b) => b.spent_amount_ytd - a.spent_amount_ytd);
  };

  // Render data quality badge
  const renderDataQualityBadge = (quality: DataQuality) => {
    switch (quality) {
      case 'complete':
        return (
          <Tooltip title="Complete data: Budget + Spending + Vendor details available">
            <Chip
              icon={<CheckCircleIcon />}
              label="Complete"
              size="small"
              color="success"
              sx={{ fontWeight: 600 }}
            />
          </Tooltip>
        );
      case 'partial':
        return (
          <Tooltip title="Partial data: Budget + Some spending, but no vendor details">
            <Chip
              icon={<WarningIcon />}
              label="Partial"
              size="small"
              color="warning"
              sx={{ fontWeight: 600 }}
            />
          </Tooltip>
        );
      case 'budget-only':
        return (
          <Tooltip title="Budget only: No expenditure data matched from CARDINAL system">
            <Chip
              icon={<CancelIcon />}
              label="Budget Only"
              size="small"
              color="default"
              sx={{ fontWeight: 600 }}
            />
          </Tooltip>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 8 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress size={60} />
        </Box>
      </Container>
    );
  }

  return (
    <Container component={MotionViewport} maxWidth="xl" sx={{ py: { xs: 5, md: 8 } }}>
      {/* Page Header */}
      <m.div variants={varFade('inUp')}>
        <Typography variant="h2" sx={{ mb: 2, textAlign: 'center' }}>
          Budget X
        </Typography>
        <Typography
          variant="body1"
          sx={{
            mb: 5,
            textAlign: 'center',
            color: 'text.secondary',
            maxWidth: 800,
            mx: 'auto'
          }}
        >
          Unified budget and expenditure explorer with transparent data quality indicators.
          See which programs have complete spending data and which are budget-only.
        </Typography>
      </m.div>

      {/* Summary Stats Card - QUICK WIN #2 */}
      <m.div variants={varFade('inUp')}>
        <Card sx={{ mb: 4, bgcolor: alpha(theme.palette.primary.main, 0.08) }}>
          <CardContent>
            <Stack spacing={2}>
              <Box display="flex" alignItems="center" gap={1}>
                <InfoIcon color="primary" />
                <Typography variant="h6">FY2025 Budget Transparency Status</Typography>
              </Box>

              <Divider />

              <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
                <Box flex={1}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Total Budget
                  </Typography>
                  <Typography variant="h4" color="primary.main">
                    {fCurrency(summaryStats.totalBudget)}
                  </Typography>
                </Box>

                <Box flex={1}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    YTD Spending Tracked
                  </Typography>
                  <Typography variant="h4" color="success.main">
                    {fCurrency(summaryStats.totalSpent)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {summaryStats.totalBudget > 0
                      ? fPercent((summaryStats.totalSpent / summaryStats.totalBudget) * 100)
                      : '0%'}{' '}
                    of budget
                  </Typography>
                </Box>

                <Box flex={1}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Programs with Expenditure Data
                  </Typography>
                  <Typography variant="h4">
                    {summaryStats.completeCount} / {summaryStats.totalPrograms}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {fPercent(summaryStats.matchRate)} match rate
                  </Typography>
                </Box>

                <Box flex={1}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Last Updated
                  </Typography>
                  <Typography variant="h6">Nov 24, 2024</Typography>
                  <Typography variant="caption" color="text.secondary">
                    CARDINAL data snapshot
                  </Typography>
                </Box>
              </Stack>

              {/* Data Quality Breakdown */}
              <Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Data Quality Breakdown
                </Typography>
                <Stack direction="row" spacing={2} flexWrap="wrap">
                  <Chip
                    icon={<CheckCircleIcon />}
                    label={`${summaryStats.completeCount} Complete`}
                    color="success"
                    size="small"
                  />
                  <Chip
                    icon={<WarningIcon />}
                    label={`${summaryStats.partialCount} Partial`}
                    color="warning"
                    size="small"
                  />
                  <Chip
                    icon={<CancelIcon />}
                    label={`${summaryStats.budgetOnlyCount} Budget Only`}
                    color="default"
                    size="small"
                  />
                </Stack>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      </m.div>

      {/* Help Text - QUICK WIN #5 */}
      <m.div variants={varFade('inUp')}>
        <Alert severity="info" sx={{ mb: 4 }}>
          <AlertTitle>Understanding Data Completeness</AlertTitle>
          <Typography variant="body2" paragraph>
            <strong>Why do some programs show "Budget Only"?</strong> Virginia's budget data comes
            from legislative appropriations (Chapter 725), while expenditure data comes from the
            CARDINAL accounting system. Not all budget programs have matching expenditure records
            because:
          </Typography>
          <ul style={{ marginTop: 0, paddingLeft: 20 }}>
            <li>
              <Typography variant="body2">
                <strong>Timing:</strong> Some programs spend later in the fiscal year (capital
                projects, seasonal programs)
              </Typography>
            </li>
            <li>
              <Typography variant="body2">
                <strong>Structure:</strong> Budget categories don't always align 1:1 with
                accounting program names
              </Typography>
            </li>
            <li>
              <Typography variant="body2">
                <strong>Type:</strong> Reserves, debt service, and internal transfers may not
                generate vendor transactions
              </Typography>
            </li>
          </ul>
          <Typography variant="body2">
            Use the "Show only complete data" toggle below to focus on the{' '}
            {summaryStats.completeCount} programs with full budget + spending + vendor details.
          </Typography>
        </Alert>
      </m.div>

      {/* Filters and Controls */}
      <m.div variants={varFade('inUp')}>
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Stack spacing={2}>
              {/* Search */}
              <TextField
                fullWidth
                placeholder="Search by program name, agency, or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  )
                }}
              />

              {/* Toggle Filter - QUICK WIN #4 */}
              <Box>
                <FormControlLabel
                  control={
                    <Switch
                      checked={showCompleteOnly}
                      onChange={(e) => setShowCompleteOnly(e.target.checked)}
                      color="primary"
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2" fontWeight={600}>
                        Show only programs with complete data
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Hide {summaryStats.budgetOnlyCount} budget-only programs to focus on{' '}
                        {summaryStats.completeCount} programs with spending details
                      </Typography>
                    </Box>
                  }
                />
              </Box>

              {/* Results count */}
              <Typography variant="body2" color="text.secondary">
                Showing {filteredRows.length} of {summaryStats.totalPrograms} programs
              </Typography>
            </Stack>
          </CardContent>
        </Card>
      </m.div>

      {/* Unified Budget Table - QUICK WIN #1 & #3 */}
      <m.div variants={varFade('inUp')}>
        <Card>
          <Scrollbar>
            <TableContainer sx={{ minWidth: 1200 }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell width={50} />

                    <TableCell>
                      <TableSortLabel
                        active={orderBy === 'program'}
                        direction={orderBy === 'program' ? order : 'asc'}
                        onClick={() => handleSort('program')}
                      >
                        Program
                      </TableSortLabel>
                    </TableCell>

                    <TableCell>
                      <TableSortLabel
                        active={orderBy === 'agency'}
                        direction={orderBy === 'agency' ? order : 'asc'}
                        onClick={() => handleSort('agency')}
                      >
                        Agency
                      </TableSortLabel>
                    </TableCell>

                    <TableCell align="right">
                      <TableSortLabel
                        active={orderBy === 'budgetedAmount'}
                        direction={orderBy === 'budgetedAmount' ? order : 'asc'}
                        onClick={() => handleSort('budgetedAmount')}
                      >
                        Budgeted
                      </TableSortLabel>
                    </TableCell>

                    <TableCell align="right">
                      <TableSortLabel
                        active={orderBy === 'spentYTD'}
                        direction={orderBy === 'spentYTD' ? order : 'asc'}
                        onClick={() => handleSort('spentYTD')}
                      >
                        Spent YTD
                      </TableSortLabel>
                    </TableCell>

                    <TableCell align="right">
                      <TableSortLabel
                        active={orderBy === 'executionRate'}
                        direction={orderBy === 'executionRate' ? order : 'asc'}
                        onClick={() => handleSort('executionRate')}
                      >
                        Execution Rate
                      </TableSortLabel>
                    </TableCell>

                    <TableCell align="center">
                      <TableSortLabel
                        active={orderBy === 'vendorCount'}
                        direction={orderBy === 'vendorCount' ? order : 'asc'}
                        onClick={() => handleSort('vendorCount')}
                      >
                        Vendors
                      </TableSortLabel>
                    </TableCell>

                    <TableCell align="center">
                      <TableSortLabel
                        active={orderBy === 'dataQuality'}
                        direction={orderBy === 'dataQuality' ? order : 'asc'}
                        onClick={() => handleSort('dataQuality')}
                      >
                        Data Status
                      </TableSortLabel>
                    </TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {filteredRows.map((row) => {
                    const isExpanded = expandedRows.has(row.id);
                    const vendors = getVendorsForRow(row);
                    const hasVendors = vendors.length > 0;

                    return (
                      <React.Fragment key={row.id}>
                        {/* Main Row */}
                        <TableRow hover>
                          <TableCell>
                            {hasVendors && (
                              <IconButton
                                size="small"
                                onClick={() => handleExpandRow(row.id)}
                              >
                                {isExpanded ? (
                                  <KeyboardArrowDownIcon />
                                ) : (
                                  <KeyboardArrowRightIcon />
                                )}
                              </IconButton>
                            )}
                          </TableCell>

                          <TableCell>
                            <Box>
                              {/* Story bucket color dot */}
                              {row.storyBucketId && (
                                <Box
                                  component="span"
                                  sx={{
                                    display: 'inline-block',
                                    width: 8,
                                    height: 8,
                                    borderRadius: '50%',
                                    bgcolor: STORY_BUCKET_COLORS[row.storyBucketId],
                                    mr: 1
                                  }}
                                />
                              )}
                              <Typography variant="body2" fontWeight={600}>
                                {row.program}
                              </Typography>
                              {row.storyBucketLabel && (
                                <Typography variant="caption" color="text.secondary">
                                  {row.storyBucketLabel}
                                </Typography>
                              )}
                            </Box>
                          </TableCell>

                          <TableCell>
                            <Typography variant="body2">{row.agency}</Typography>
                          </TableCell>

                          <TableCell align="right">
                            <Typography variant="body2" fontWeight={600}>
                              {fCurrency(row.budgetedAmount)}
                            </Typography>
                          </TableCell>

                          <TableCell align="right">
                            {row.spentYTD !== null ? (
                              <Typography variant="body2" color="success.main">
                                {fCurrency(row.spentYTD)}
                              </Typography>
                            ) : (
                              <Typography variant="body2" color="text.disabled">
                                —
                              </Typography>
                            )}
                          </TableCell>

                          <TableCell align="right">
                            {row.executionRate !== null ? (
                              <Typography
                                variant="body2"
                                fontWeight={600}
                                color={
                                  row.executionRate > 0.9
                                    ? 'success.main'
                                    : row.executionRate > 0.5
                                    ? 'warning.main'
                                    : 'error.main'
                                }
                              >
                                {fPercent(row.executionRate * 100)}
                              </Typography>
                            ) : (
                              <Typography variant="body2" color="text.disabled">
                                —
                              </Typography>
                            )}
                          </TableCell>

                          <TableCell align="center">
                            {row.vendorCount > 0 ? (
                              <Chip
                                label={row.vendorCount}
                                size="small"
                                color="primary"
                                variant="outlined"
                              />
                            ) : (
                              <Typography variant="body2" color="text.disabled">
                                —
                              </Typography>
                            )}
                          </TableCell>

                          <TableCell align="center">
                            {renderDataQualityBadge(row.dataQuality)}
                          </TableCell>
                        </TableRow>

                        {/* Expanded Vendor Details */}
                        {hasVendors && (
                          <TableRow>
                            <TableCell colSpan={8} sx={{ py: 0, bgcolor: 'background.neutral' }}>
                              <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                                <Box sx={{ py: 3, px: 2 }}>
                                  <Typography variant="subtitle2" gutterBottom>
                                    Vendor Details ({vendors.length} vendors)
                                  </Typography>
                                  <TableContainer>
                                    <Table size="small">
                                      <TableHead>
                                        <TableRow>
                                          <TableCell>Vendor Name</TableCell>
                                          <TableCell align="right">Amount Spent</TableCell>
                                          <TableCell>Expense Type</TableCell>
                                          <TableCell align="center">Match Quality</TableCell>
                                        </TableRow>
                                      </TableHead>
                                      <TableBody>
                                        {vendors.slice(0, 10).map((vendor, idx) => (
                                          <TableRow key={idx}>
                                            <TableCell>
                                              <Typography variant="body2">
                                                {vendor.vendor_name}
                                              </Typography>
                                            </TableCell>
                                            <TableCell align="right">
                                              <Typography variant="body2" fontWeight={600}>
                                                {fCurrency(vendor.spent_amount_ytd)}
                                              </Typography>
                                            </TableCell>
                                            <TableCell>
                                              <Typography variant="caption" color="text.secondary">
                                                {vendor.top_category_name || 'N/A'}
                                              </Typography>
                                            </TableCell>
                                            <TableCell align="center">
                                              <Chip
                                                label={vendor.match_type}
                                                size="small"
                                                color={
                                                  vendor.match_type === 'strict'
                                                    ? 'success'
                                                    : vendor.match_type === 'fuzzy'
                                                    ? 'warning'
                                                    : 'default'
                                                }
                                                variant="outlined"
                                              />
                                            </TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  </TableContainer>
                                  {vendors.length > 10 && (
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                      sx={{ mt: 1, display: 'block' }}
                                    >
                                      ... and {vendors.length - 10} more vendors
                                    </Typography>
                                  )}
                                </Box>
                              </Collapse>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Scrollbar>

          {filteredRows.length === 0 && (
            <Box sx={{ py: 8, textAlign: 'center' }}>
              <Typography variant="h6" color="text.secondary">
                No programs found
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Try adjusting your search or filters
              </Typography>
            </Box>
          )}
        </Card>
      </m.div>
    </Container>
  );
}

