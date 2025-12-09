'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { m } from 'framer-motion';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
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
import IconButton from '@mui/material/IconButton';
import Collapse from '@mui/material/Collapse';
import CircularProgress from '@mui/material/CircularProgress';
import Chip from '@mui/material/Chip';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Tooltip from '@mui/material/Tooltip';
import { alpha, useTheme } from '@mui/material/styles';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import FlagIcon from '@mui/icons-material/Flag';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';

import { fCurrency, fPercent } from 'src/utils/format-number';
import { loadProgramRollups, loadVendorRecords, filterVendorsByProgram, loadAgencyBudgets, loadProgramBudgets, loadTransferPayments, type ProgramRollup, type VendorRecord, type AgencyBudget, type ProgramBudget, type TransferPaymentRecord } from 'src/lib/decoderDataLoader';
import { loadVendorIRSMatches, getVerificationBadge, getVerificationTooltip, type VendorIRSMatches, type IRSNonprofit } from 'src/lib/irsVerification';

import { varFade, MotionViewport } from 'src/components/animate';
import { Scrollbar } from 'src/components/scrollbar';

// Story bucket imports
import { mapSecretariatToStoryBucket } from 'src/data/secretariatToStoryBucket';
import { STORY_BUCKET_LABELS, STORY_BUCKET_COLORS, type StoryBucketId } from 'src/data/spendingStoryBuckets';

// Budget data types
import type { BudgetRow } from 'src/lib/budgetDrillDown';

// Budget Overview component
import { BudgetOverview } from '../budget-overview';

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
  // New fields from rollup data
  rollup?: ProgramRollup;
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

// Classify entity type based on vendor name patterns
type EntityType = 'NGO' | 'Local Government' | 'Authority' | 'Private Company' | 'Other';

function classifyEntityType(vendorName: string): EntityType {
  const name = vendorName.toUpperCase();

  // Local Government patterns (check first - most specific)
  if (name.includes('COUNTY') || name.includes('CITY OF') ||
      name.includes('TOWN OF') || name.includes('TREASURER') ||
      name.includes('DIRECTOR OF FINANCE') || name.includes('COMMONWEALTH')) {
    return 'Local Government';
  }

  // Authority patterns
  if (name.includes('AUTHORITY') || name.includes('COMMISSION') ||
      name.includes('BOARD')) {
    return 'Authority';
  }

  // Private Company patterns (check before NGO to avoid false positives)
  // Strong indicators of for-profit companies
  const isPrivateCompany = (
    name.includes(' LLC') || name.includes(' L.L.C') ||
    name.includes(' CORP') || name.includes(' CORPORATION') ||
    name.includes(' LTD') || name.includes(' LIMITED') ||
    name.includes(' LP') || name.includes(' L.P.') ||
    name.includes(' COMPANY') || name.includes(' CO.') ||
    name.includes(' USA') || name.includes(' INTERNATIONAL') ||
    name.includes(' TECHNOLOGIES') || name.includes(' SOLUTIONS') ||
    name.includes(' SERVICES') || name.includes(' SYSTEMS') ||
    name.includes(' ENTERPRISES') || name.includes(' INDUSTRIES') ||
    name.includes(' PARTNERS') || name.includes(' GROUP')
  );

  // Also check for "Inc" with corporate indicators (e.g., "Amazon.com Inc", "Walmart Inc")
  const hasIncWithCorporateIndicator = (
    (name.includes(' INC') || name.includes('.COM')) &&
    (name.includes('.COM') || name.includes('WALMART') || name.includes('AMAZON') ||
     name.includes('GOOGLE') || name.includes('APPLE') || name.includes('MICROSOFT'))
  );

  if (isPrivateCompany || hasIncWithCorporateIndicator) {
    return 'Private Company';
  }

  // NGO patterns (more refined to avoid for-profit companies)
  // Use "INC." with period or ", INC" with comma to be more specific
  if (name.includes(' INC.') || name.includes(', INC') ||
      name.includes('FOUNDATION') || name.includes('COALITION') ||
      name.includes('SOCIETY') || name.includes('ASSOCIATION') ||
      name.includes('INSTITUTE') || name.includes('CENTER FOR') ||
      name.includes('COUNCIL') || name.includes('ALLIANCE') ||
      name.includes('NONPROFIT') || name.includes('NON-PROFIT') ||
      name.includes('CHARITY') || name.includes('CHARITABLE')) {
    return 'NGO';
  }

  return 'Other';
}

// NGO Tracker aggregated record type
type NGOTrackerRecord = {
  vendorName: string;
  totalAmount: number;
  paymentCount: number;
  avgPayment: number;
  secretariats: string[];
  redFlagScore: number;
  redFlags: string[];
  fiscalYears: string[];
};

// Calculate red flag score for pass-through entities
function calculateRedFlagScore(
  totalAmount: number,
  paymentCount: number,
  avgPayment: number,
  secretariatCount: number,
  amounts: number[]
): { score: number; flags: string[] } {
  let score = 0;
  const flags: string[] = [];

  // +5 points: Single payment >$500K
  if (paymentCount === 1 && totalAmount > 500000) {
    score += 5;
    flags.push('Single lump-sum >$500K');
  }

  // +3 points: <5 total payments (non-competitive indicator)
  if (paymentCount < 5 && paymentCount > 0) {
    score += 3;
    flags.push(`Only ${paymentCount} payment${paymentCount > 1 ? 's' : ''}`);
  }

  // +3 points: Identical payment amounts (formula allocation)
  if (amounts.length > 1) {
    const uniqueAmounts = new Set(amounts.map(a => Math.round(a * 100) / 100));
    if (uniqueAmounts.size === 1) {
      score += 3;
      flags.push('Identical payment amounts');
    }
  }

  // +2 points: Average payment >$100K
  if (avgPayment > 100000) {
    score += 2;
    flags.push('Avg payment >$100K');
  }

  // +1 point: Only one secretariat (limited scope)
  if (secretariatCount === 1) {
    score += 1;
    flags.push('Single secretariat');
  }

  return { score, flags };
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

// Transform program rollup data to budget items (NEW - MVP data source)
function transformRollupData(rollups: ProgramRollup[]): BudgetItem[] {
  if (!rollups || rollups.length === 0) return [];

  const totalBudget = rollups.reduce((sum, row) => sum + row.total_spent_ytd, 0);

  return rollups.map((row, index) => {
    // Map secretariat to story bucket for citizen-friendly categorization
    const storyBucketId = mapSecretariatToStoryBucket(row.secretariat);
    const category = STORY_BUCKET_LABELS[storyBucketId];

    // Calculate change (execution rate as proxy for now - no historical data)
    const change = NaN; // No YoY data in rollup

    // Determine priority based on spending
    let priority: 'high' | 'medium' | 'low' = 'low';
    if (row.total_spent_ytd > 100000000) priority = 'high';
    else if (row.total_spent_ytd > 10000000) priority = 'medium';

    return {
      id: `rollup-${row.fiscal_year}-${index}`,
      category,
      subcategory: row.program,
      amount: row.total_spent_ytd,
      percentage: totalBudget > 0 ? (row.total_spent_ytd / totalBudget) * 100 : 0,
      description: `${row.agency} | ${row.number_of_unique_recipients} recipients | ${fPercent(row.execution_rate * 100)} executed`,
      change,
      priority,
      rollup: row, // Store full rollup data for expand/collapse
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
  const [filterFiscalYear, setFilterFiscalYear] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  // Flat table sorting state
  const [flatTableOrder, setFlatTableOrder] = useState<Order>('desc');
  const [flatTableOrderBy, setFlatTableOrderBy] = useState<'category' | 'agency' | 'program' | 'amount' | 'percentage'>('amount');

  // Expenditure table sorting state
  const [expenditureOrder, setExpenditureOrder] = useState<Order>('desc');
  const [expenditureOrderBy, setExpenditureOrderBy] = useState<'category' | 'vendor' | 'amount' | 'fiscal_year'>('amount');

  // NGO Tracker filter state
  const [ngoRedFlagFilter, setNgoRedFlagFilter] = useState<'All' | 'High' | 'Medium' | 'Low'>('All');
  const [ngoEntityTypeFilter, setNgoEntityTypeFilter] = useState<'All' | 'Nonprofit' | 'For-Profit' | 'Unknown'>('All');

  // NGO Tracker sorting state
  const [ngoOrder, setNgoOrder] = useState<Order>('desc');
  const [ngoOrderBy, setNgoOrderBy] = useState<'recipient' | 'irsStatus' | 'entityType' | 'ein' | 'totalAmount' | 'payments' | 'avgPayment' | 'secretariats' | 'redFlagScore'>('redFlagScore');

  // IRS verification data
  const [irsMatches, setIrsMatches] = useState<VendorIRSMatches>({});

  // Drill-down state for vendor expansion
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [vendorDataCache, setVendorDataCache] = useState<Record<string, VendorRecord[]>>({});
  const [loadingVendors, setLoadingVendors] = useState<Set<string>>(new Set());

  // Pagination state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(30);

  // View toggle state: 'appropriations', 'expenditures', or 'ngo-tracker'
  const [viewMode, setViewMode] = useState<'appropriations' | 'expenditures' | 'ngo-tracker'>('appropriations');

  // NEW: Decoder data state
  const [rollupData, setRollupData] = useState<ProgramRollup[]>([]);
  const [vendorData, setVendorData] = useState<VendorRecord[]>([]);
  const [transferPayments, setTransferPayments] = useState<TransferPaymentRecord[]>([]);

  // Flat table data (no drill-down)
  const [agencyData, setAgencyData] = useState<AgencyBudget[]>([]);
  const [programData, setProgramData] = useState<ProgramBudget[]>([]);
  const [flatTableRows, setFlatTableRows] = useState<BudgetRow[]>([]);

  // Legacy: Keep district data for existing features
  const [districtData, setDistrictData] = useState<any[] | null>(null);

  // Load decoder CSV data on component mount
  useEffect(() => {
    const loadDecoderData = async () => {
      try {
        console.log('🔄 Starting to load decoder data...');
        console.log('🔄 Filter fiscal year:', filterFiscalYear);
        const fiscalYear = filterFiscalYear ? parseInt(filterFiscalYear) : 2025;
        console.log('🔄 Using fiscal year:', fiscalYear);

        const [rollups, vendors, districts, agencies, programs, transfers, irsData] = await Promise.all([
          loadProgramRollups(),
          loadVendorRecords(),
          fetch('/data/budget_by_district_2025.json').then(r => r.json()).catch(() => null),
          loadAgencyBudgets(fiscalYear),
          loadProgramBudgets(fiscalYear),
          loadTransferPayments(),
          loadVendorIRSMatches()
        ]);

        console.log('✅ Loaded rollup data:', rollups.length, 'programs');
        console.log('✅ Loaded vendor data:', vendors.length, 'recipients');
        console.log('✅ Loaded agency data:', agencies.length, 'agencies');
        console.log('✅ Loaded program data:', programs.length, 'programs');
        console.log('✅ Loaded transfer payments:', transfers.length, 'records');
        console.log('✅ Loaded IRS verification data:', Object.keys(irsData).length, 'verified nonprofits');

        setRollupData(rollups);
        setVendorData(vendors);
        setAgencyData(agencies);
        setProgramData(programs);
        setTransferPayments(transfers);
        setIrsMatches(irsData);

        // Create flat table with all agencies and programs
        console.log('🔄 Creating flat table...');
        const flatRows: BudgetRow[] = [];

        // Add all agencies
        agencies.forEach((agency, index) => {
          flatRows.push({
            id: `agency-${agency.fiscal_year}-${agency.story_bucket_id}-${agency.agency}-${index}`,
            level: 'detail' as DrillDownLevel,
            type: 'agency',
            name: agency.agency,
            amount: agency.amount,
            percentage: agency.percentage,
            storyBucketId: agency.story_bucket_id,
            storyBucketLabel: agency.story_bucket_label,
            hasChildren: false,
          });
        });

        // Helper function to normalize program names for fuzzy matching
        const normalizeProgram = (name: string): string => {
          return name
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, '') // Remove special chars
            .replace(/\s+/g, ' ')         // Normalize whitespace
            .trim();
        };

        // Helper function to calculate similarity score (0-1)
        const calculateSimilarity = (str1: string, str2: string): number => {
          const norm1 = normalizeProgram(str1);
          const norm2 = normalizeProgram(str2);

          // Exact match after normalization
          if (norm1 === norm2) return 1.0;

          // Check if one contains the other
          if (norm1.includes(norm2) || norm2.includes(norm1)) return 0.8;

          // Calculate word overlap
          const words1 = new Set(norm1.split(' '));
          const words2 = new Set(norm2.split(' '));
          const intersection = new Set([...words1].filter(w => words2.has(w)));
          const union = new Set([...words1, ...words2]);

          return intersection.size / union.size; // Jaccard similarity
        };

        // Add all programs with rollup data for drill-down
        programs.forEach((program, index) => {
          // Find matching rollup data for this program
          // Try exact match first
          let matchingRollup = rollups.find(r =>
            r.fiscal_year === program.fiscal_year &&
            r.agency === program.agency &&
            r.program === program.program
          );

          // If no exact match, try fuzzy matching
          if (!matchingRollup) {
            const candidates = rollups.filter(r =>
              r.fiscal_year === program.fiscal_year &&
              r.agency === program.agency
            );

            if (candidates.length > 0) {
              // Find best match by similarity score
              const scored = candidates.map(r => ({
                rollup: r,
                score: calculateSimilarity(program.program, r.program)
              }));

              // Use match if similarity > 0.6 (60% similar)
              const bestMatch = scored.reduce((best, curr) =>
                curr.score > best.score ? curr : best
              );

              if (bestMatch.score > 0.6) {
                matchingRollup = bestMatch.rollup;
              }
            }
          }

          flatRows.push({
            id: `program-${program.fiscal_year}-${program.story_bucket_id}-${program.agency}-${program.program}-${index}`,
            level: 'detail' as DrillDownLevel,
            type: 'program',
            name: program.program,
            amount: program.amount,
            percentage: program.percentage,
            storyBucketId: program.story_bucket_id,
            storyBucketLabel: program.story_bucket_label,
            agency: program.agency,
            hasChildren: false,
            rollup: matchingRollup, // Attach rollup data for vendor drill-down
          });
        });

        console.log('✅ Flat table created:', flatRows.length, 'rows');

        // Debug: Check how many program rows have rollup data
        const programsWithRollup = flatRows.filter(r => r.type === 'program' && r.rollup).length;
        const totalPrograms = flatRows.filter(r => r.type === 'program').length;
        console.log(`✅ Programs with rollup data: ${programsWithRollup} / ${totalPrograms}`);
        console.log(`📊 Match rate: ${((programsWithRollup / totalPrograms) * 100).toFixed(1)}%`);

        // Debug: Show sample program names from both sources
        if (programs.length > 0 && rollups.length > 0) {
          console.log('📋 Sample program budget names:', programs.slice(0, 3).map(p => `"${p.program}"`));
          console.log('📋 Sample rollup program names:', rollups.slice(0, 3).map(r => `"${r.program}"`));
        }

        setFlatTableRows(flatRows);

        // Keep district data for existing features
        if (Array.isArray(districts) && districts.length > 0) {
          console.log('✅ District data loaded:', districts.length, 'records');
          setDistrictData(districts);
        } else {
          console.warn('❌ District data is empty or invalid');
          setDistrictData(null);
        }
      } catch (error) {
        console.error('❌ Failed to load decoder data:', error);
        setRollupData([]);
        setVendorData([]);
        setAgencyData([]);
        setProgramData([]);
        setDistrictData(null);
      } finally {
        console.log('✅ Setting isLoading to false');
        setIsLoading(false);
      }
    };

    loadDecoderData();
  }, [filterFiscalYear]);

  // Combine rollup data (primary) and district data (legacy)
  const budgetData = useMemo(() => {
    try {
      let combinedData: BudgetItem[] = [];

      // PRIMARY: Add program rollup data (Chapter 725)
      if (rollupData && rollupData.length > 0) {
        combinedData = [...combinedData, ...transformRollupData(rollupData)];
        console.log('✅ Added rollup data:', combinedData.length, 'programs');
      }

      // LEGACY: Add district-level data if available
      if (districtData && districtData.length > 0) {
        const districtItems = transformDistrictData(districtData);
        console.log('✅ Adding district data:', districtItems.length, 'items');
        combinedData = [...combinedData, ...districtItems];
      }

      // Fallback to mock data only if no data loaded
      if (combinedData.length === 0) {
        console.warn('No decoder data loaded, using mock data');
        return MOCK_BUDGET_DATA;
      }

      return combinedData;
    } catch (error) {
      console.error('Error transforming budget data:', error);
      return MOCK_BUDGET_DATA;
    }
  }, [rollupData, districtData]);

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

    if (filterFiscalYear) {
      data = data.filter(item => {
        if (item.rollup) {
          return item.rollup.fiscal_year.toString() === filterFiscalYear;
        }
        return true; // Keep non-rollup items (districts)
      });
    }

    return data;
  }, [budgetData, filterName, filterCategory, filterFiscalYear]);

  // Generate dynamic insights based on current filtered data
  const insights = useMemo(() => generateInsights(filteredData), [filteredData]);

  const handleSort = (property: keyof BudgetItem) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  // Flat table sorting handler
  const handleFlatTableSort = (property: 'category' | 'agency' | 'program' | 'amount' | 'percentage') => {
    const isAsc = flatTableOrderBy === property && flatTableOrder === 'asc';
    setFlatTableOrder(isAsc ? 'desc' : 'asc');
    setFlatTableOrderBy(property);
  };

  // Expenditure table sorting handler
  const handleExpenditureSort = (property: 'category' | 'vendor' | 'amount' | 'fiscal_year') => {
    const isAsc = expenditureOrderBy === property && expenditureOrder === 'asc';
    setExpenditureOrder(isAsc ? 'desc' : 'asc');
    setExpenditureOrderBy(property);
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

  // NEW: Handle expand/collapse for vendor details
  const handleToggleExpand = (itemId: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  // Get vendors for expanded row
  const getVendorsForItem = (item: BudgetItem): VendorRecord[] => {
    if (!item.rollup) return [];

    const vendors = filterVendorsByProgram(
      vendorData,
      item.rollup.fiscal_year,
      item.rollup.agency,
      item.rollup.program,
      item.rollup.service_area
    );

    // Sort by spent amount descending
    return vendors.sort((a, b) => b.spent_amount_ytd - a.spent_amount_ytd);
  };

  // Get available fiscal years from rollup data
  const availableFiscalYears = useMemo(() => {
    const years = new Set(rollupData.map(r => r.fiscal_year));
    return Array.from(years).sort((a, b) => b - a); // Descending
  }, [rollupData]);



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

  // Paginated data
  const paginatedData = useMemo(() => {
    const startIndex = page * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    return sortedData.slice(startIndex, endIndex);
  }, [sortedData, page, rowsPerPage]);

  // Pagination handlers
  const handleChangePage = (newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (newRowsPerPage: number) => {
    setRowsPerPage(newRowsPerPage);
    setPage(0); // Reset to first page when changing rows per page
  };

  // Flat table filtering and sorting
  const sortedAndFilteredRows = useMemo(() => {
    let rows = [...flatTableRows];

    // Filter by category if selected (filterCategory contains the label like "Schools & Kids")
    if (filterCategory && filterCategory !== 'all' && filterCategory !== '') {
      rows = rows.filter(row => row.storyBucketLabel === filterCategory);
    }

    // Sort by selected column
    rows.sort((a, b) => {
      if (flatTableOrderBy === 'amount' || flatTableOrderBy === 'percentage') {
        return flatTableOrder === 'asc'
          ? a[flatTableOrderBy] - b[flatTableOrderBy]
          : b[flatTableOrderBy] - a[flatTableOrderBy];
      }

      if (flatTableOrderBy === 'category') {
        const aVal = a.storyBucketLabel || '';
        const bVal = b.storyBucketLabel || '';
        return flatTableOrder === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      if (flatTableOrderBy === 'agency') {
        const aVal = a.agency || '';
        const bVal = b.agency || '';
        return flatTableOrder === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      if (flatTableOrderBy === 'program') {
        const aVal = a.type === 'program' ? a.name : '';
        const bVal = b.type === 'program' ? b.name : '';
        return flatTableOrder === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      return 0;
    });

    return rows;
  }, [flatTableRows, filterCategory, flatTableOrder, flatTableOrderBy]);

  // Expenditure table filtering and sorting
  const sortedAndFilteredExpenditures = useMemo(() => {
    let vendors = vendorData
      .filter(v => !v.is_placeholder && !v.is_expected_unmatched)
      .filter(v => filterFiscalYear ? v.fiscal_year.toString() === filterFiscalYear : true)
      .filter(v => filterName ?
        v.vendor_name.toLowerCase().includes(filterName.toLowerCase()) ||
        v.secretariat.toLowerCase().includes(filterName.toLowerCase())
        : true
      );

    // Apply category filter (using secretariat mapping)
    if (filterCategory && filterCategory !== 'all' && filterCategory !== '') {
      vendors = vendors.filter(v => {
        const storyBucketId = mapSecretariatToStoryBucket(v.secretariat);
        const storyBucketLabel = STORY_BUCKET_LABELS[storyBucketId];
        return storyBucketLabel === filterCategory;
      });
    }

    // Sort by selected column
    vendors.sort((a, b) => {
      if (expenditureOrderBy === 'amount') {
        return expenditureOrder === 'asc'
          ? a.spent_amount_ytd - b.spent_amount_ytd
          : b.spent_amount_ytd - a.spent_amount_ytd;
      }

      if (expenditureOrderBy === 'fiscal_year') {
        return expenditureOrder === 'asc'
          ? a.fiscal_year - b.fiscal_year
          : b.fiscal_year - a.fiscal_year;
      }

      if (expenditureOrderBy === 'category') {
        // Map secretariat to story bucket for sorting
        const aStoryBucketId = mapSecretariatToStoryBucket(a.secretariat);
        const bStoryBucketId = mapSecretariatToStoryBucket(b.secretariat);
        const aVal = STORY_BUCKET_LABELS[aStoryBucketId] || '';
        const bVal = STORY_BUCKET_LABELS[bStoryBucketId] || '';
        return expenditureOrder === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      if (expenditureOrderBy === 'vendor') {
        return expenditureOrder === 'asc'
          ? a.vendor_name.localeCompare(b.vendor_name)
          : b.vendor_name.localeCompare(a.vendor_name);
      }

      return 0;
    });

    return vendors;
  }, [vendorData, rollupData, filterFiscalYear, filterName, filterCategory, expenditureOrder, expenditureOrderBy]);

  // Helper function to classify entity type based on name patterns
  const classifyEntityType = useCallback((vendorName: string, irsVerified: boolean): { type: 'nonprofit' | 'for-profit' | 'unknown', label: string } => {
    const nameUpper = vendorName.toUpperCase();

    // If IRS verified, it's definitely a nonprofit
    if (irsVerified) {
      return { type: 'nonprofit', label: 'Nonprofit' };
    }

    // Check for obvious for-profit indicators
    const forProfitKeywords = [
      'LLC', 'L.L.C.', 'L L C',
      'INC.', 'INC', 'INCORPORATED',
      'CORP.', 'CORP', 'CORPORATION',
      'COMPANY', 'CO.', 'CO ',
      'LTD', 'LIMITED',
      'LP', 'L.P.', 'L P',
      'ELECTRIC', 'GAS & ELECTRIC', 'POWER COMPANY', 'ENERGY COMPANY',
      'INSURANCE CO', 'LIFE INSURANCE', 'HEALTH INSURANCE',
      'HEALTHKEEPERS', 'CIGNA', 'AETNA', 'ANTHEM', 'OPTIMA', 'OPTIMUM',
      'BANK ', ' BANK', 'FINANCIAL SERVICES',
      'REALTY', 'PROPERTIES LLC', 'PROPERTIES INC',
      'CONSTRUCTION CO', 'BUILDERS INC', 'CONTRACTORS',
      'CONSULTING LLC', 'CONSULTANTS INC',
      'TECHNOLOGY LLC', 'SOLUTIONS LLC', 'SERVICES LLC',
      'MERCK', 'PFIZER', 'PHARMACEUTICAL'
    ];

    // Check if name contains for-profit indicators
    const hasForProfitIndicator = forProfitKeywords.some(keyword => {
      // Use word boundary matching for better accuracy
      const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      return regex.test(nameUpper);
    });

    if (hasForProfitIndicator) {
      return { type: 'for-profit', label: 'For-Profit Company' };
    }

    // If not verified and no for-profit indicators, it's unknown
    // (could be a nonprofit that didn't match IRS database, or misclassified)
    return { type: 'unknown', label: 'Unknown' };
  }, []);

  // NGO Tracker data processing - aggregate comprehensive transfer payments by vendor
  const ngoTrackerData = useMemo(() => {
    // FOCUS: Community nonprofit pass-through recipients
    // Criteria:
    // 1. Receives "Grnt-Nongovernmental Org" expense type (direct nonprofit grants)
    // 2. Total < $30M (excludes big quasi-governmental entities)
    // 3. NOT authorities, insurance companies, universities, airports, railroads

    const ngoGrantExpenseType = 'Grnt-Nongovernmental Org';
    const maxNonprofitTotal = 30000000; // $30M threshold

    // Exclude quasi-governmental entities that aren't true community nonprofits
    const excludeFromNGOKeywords = [
      'AUTHORITY', 'COMMISSION', 'AIRPORT', 'RAILROAD',
      'INSURANCE', 'HEALTH PLAN', 'HMO', 'CIGNA', 'SENTARA', 'KAISER', 'HEALTHKEEPERS', 'OPTIMA', 'OPTIMUM',
      'UNIVERSITY', 'COLLEGE', 'INSTITUTE OF TECHNOLOGY',
      'ECONOMIC DEVELOPMENT PARTNERSHIP', 'TOURISM',
      'RAIL AUTHORITY', 'COMMERCIAL SPACE',
      'DETAILED DATA NOT YET AVAILABLE',
      'HUNTINGTON INGALLS'  // Defense contractor
    ];

    // Local government patterns (more specific to avoid false positives)
    const localGovtPatterns = [
      'CITY OF', 'TOWN OF', 'COUNTY OF',
      'BOARD OF SUPERVISORS', 'CIRCUIT COURT', 'PUBLIC SCHOOLS',
      'COMMUNITY SERVICES BOARD',
      'DIRECTOR OF FINANCE',
      'MISCELLANEOUS ADJUSTMENT',
      '** CONTACT AGENCY FOR MORE INFO **'
    ];

    // Helper function to check if vendor should be excluded from NGO classification
    const shouldExcludeFromNGO = (vendorName: string): boolean => {
      const nameUpper = vendorName.toUpperCase();

      // Check general exclusion keywords
      if (excludeFromNGOKeywords.some(keyword => nameUpper.includes(keyword))) {
        return true;
      }

      // Check local government patterns
      if (localGovtPatterns.some(pattern => nameUpper.includes(pattern))) {
        return true;
      }

      // Check if it's a standalone county/city name (starts with county/city name)
      // Pattern: "CountyName County:" or "City of CityName:"
      const countyPattern = /^[A-Z\s]+ COUNTY:/i;
      const cityPattern = /^CITY /i;
      if (countyPattern.test(nameUpper) || cityPattern.test(nameUpper)) {
        return true;
      }

      return false;
    };

    // Group by vendor name
    const vendorMap = new Map<string, TransferPaymentRecord[]>();
    transferPayments.forEach(record => {
      const existing = vendorMap.get(record.vendor_name) || [];
      existing.push(record);
      vendorMap.set(record.vendor_name, existing);
    });

    // Debug: Count vendors at each filter stage
    let ngoGrantVendors = 0;
    let afterExclusionVendors = 0;
    let afterAmountFilterVendors = 0;
    let vendorsOver30M: string[] = [];

    // Aggregate and calculate red flags
    // ONLY include actual community nonprofits (not all transfer payment recipients)
    const aggregated: NGOTrackerRecord[] = [];
    vendorMap.forEach((records, vendorName) => {
      // Filter 1: Must receive "Grnt-Nongovernmental Org" expense type
      const hasNGOGrant = records.some(r => r.expense_type === ngoGrantExpenseType);
      if (!hasNGOGrant) return;
      ngoGrantVendors++;

      // Filter 2: Exclude quasi-governmental entities
      if (shouldExcludeFromNGO(vendorName)) return;
      afterExclusionVendors++;

      const totalAmount = records.reduce((sum, r) => sum + r.amount, 0);

      // Filter 3: Total must be < $30M (excludes big foundations/authorities)
      if (totalAmount >= maxNonprofitTotal) {
        vendorsOver30M.push(`${vendorName}: $${(totalAmount / 1000000).toFixed(2)}M`);
        return;
      }
      afterAmountFilterVendors++;

      const paymentCount = records.length;
      const avgPayment = totalAmount / paymentCount;
      const secretariats = Array.from(new Set(records.map(r => r.secretariat)));
      const fiscalYears = Array.from(new Set(records.map(r => r.fiscal_year.toString())));
      const amounts = records.map(r => r.amount);
      const expenseTypes = Array.from(new Set(records.map(r => r.expense_type)));

      const { score, flags } = calculateRedFlagScore(
        totalAmount,
        paymentCount,
        avgPayment,
        secretariats.length,
        amounts
      );

      // All entities in this list are confirmed community nonprofits
      // Boost score to prioritize them
      const adjustedScore = score + 5;

      aggregated.push({
        vendorName,
        totalAmount,
        paymentCount,
        avgPayment,
        secretariats,
        redFlagScore: adjustedScore,
        redFlags: [`✓ Community Nonprofit (Grnt-Nongovernmental Org)`, ...flags],
        fiscalYears
      });
    });

    // Debug logging
    console.log('📊 NGO Tracker Filter Stages:');
    console.log(`  Total unique vendors in transfer payments: ${vendorMap.size}`);
    console.log(`  After Filter 1 (has NGO grant): ${ngoGrantVendors}`);
    console.log(`  After Filter 2 (exclude keywords): ${afterExclusionVendors}`);
    console.log(`  After Filter 3 (<$30M): ${afterAmountFilterVendors}`);
    console.log(`  Final aggregated vendors: ${aggregated.length}`);
    console.log(`  Vendors filtered out by $30M threshold (${vendorsOver30M.length}):`, vendorsOver30M);

    // Sort by red flag score (highest first), then by total amount
    return aggregated.sort((a, b) => {
      if (b.redFlagScore !== a.redFlagScore) {
        return b.redFlagScore - a.redFlagScore;
      }
      return b.totalAmount - a.totalAmount;
    });
  }, [transferPayments]);

  // Filtered and sorted NGO tracker data
  const filteredNGOData = useMemo(() => {
    let filtered = ngoTrackerData;

    // Debug: Count entity types in base data
    if (ngoTrackerData.length > 0) {
      const nonprofitCount = ngoTrackerData.filter(ngo => {
        const irsVerified = !!irsMatches[ngo.vendorName];
        const classification = classifyEntityType(ngo.vendorName, irsVerified);
        return classification.type === 'nonprofit';
      }).length;

      const forProfitCount = ngoTrackerData.filter(ngo => {
        const irsVerified = !!irsMatches[ngo.vendorName];
        const classification = classifyEntityType(ngo.vendorName, irsVerified);
        return classification.type === 'for-profit';
      }).length;

      const unknownCount = ngoTrackerData.filter(ngo => {
        const irsVerified = !!irsMatches[ngo.vendorName];
        const classification = classifyEntityType(ngo.vendorName, irsVerified);
        return classification.type === 'unknown';
      }).length;

      console.log('🔍 NGO Entity Type Breakdown:');
      console.log(`  Total NGO vendors: ${ngoTrackerData.length}`);
      console.log(`  Nonprofit (IRS verified): ${nonprofitCount}`);
      console.log(`  For-Profit Company: ${forProfitCount}`);
      console.log(`  Unknown: ${unknownCount}`);
      console.log(`  IRS matches loaded: ${Object.keys(irsMatches).length}`);
    }

    // Filter by red flag score
    if (ngoRedFlagFilter !== 'All') {
      filtered = filtered.filter(ngo => {
        if (ngoRedFlagFilter === 'High') return ngo.redFlagScore >= 7;
        if (ngoRedFlagFilter === 'Medium') return ngo.redFlagScore >= 4 && ngo.redFlagScore < 7;
        if (ngoRedFlagFilter === 'Low') return ngo.redFlagScore < 4;
        return true;
      });
    }

    // Filter by entity type
    if (ngoEntityTypeFilter !== 'All') {
      filtered = filtered.filter(ngo => {
        const irsVerified = !!irsMatches[ngo.vendorName];
        const classification = classifyEntityType(ngo.vendorName, irsVerified);

        if (ngoEntityTypeFilter === 'Nonprofit') return classification.type === 'nonprofit';
        if (ngoEntityTypeFilter === 'For-Profit') return classification.type === 'for-profit';
        if (ngoEntityTypeFilter === 'Unknown') return classification.type === 'unknown';
        return true;
      });
    }

    // Apply search filter
    if (filterName) {
      filtered = filtered.filter(ngo =>
        ngo.vendorName.toLowerCase().includes(filterName.toLowerCase()) ||
        ngo.secretariats.some(s => s.toLowerCase().includes(filterName.toLowerCase()))
      );
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (ngoOrderBy) {
        case 'recipient':
          aValue = a.vendorName.toLowerCase();
          bValue = b.vendorName.toLowerCase();
          break;
        case 'irsStatus':
          // Sort by IRS verification status (verified first)
          aValue = !!irsMatches[a.vendorName] ? 1 : 0;
          bValue = !!irsMatches[b.vendorName] ? 1 : 0;
          break;
        case 'entityType':
          // Sort by entity type (nonprofit, for-profit, unknown)
          const aClassification = classifyEntityType(a.vendorName, !!irsMatches[a.vendorName]);
          const bClassification = classifyEntityType(b.vendorName, !!irsMatches[b.vendorName]);
          const typeOrder = { 'nonprofit': 0, 'for-profit': 1, 'unknown': 2 };
          aValue = typeOrder[aClassification.type];
          bValue = typeOrder[bClassification.type];
          break;
        case 'ein':
          // Sort by EIN (verified with EIN first)
          aValue = irsMatches[a.vendorName]?.ein || '';
          bValue = irsMatches[b.vendorName]?.ein || '';
          break;
        case 'totalAmount':
          aValue = a.totalAmount;
          bValue = b.totalAmount;
          break;
        case 'payments':
          aValue = a.paymentCount;
          bValue = b.paymentCount;
          break;
        case 'avgPayment':
          aValue = a.avgPayment;
          bValue = b.avgPayment;
          break;
        case 'secretariats':
          aValue = a.secretariats.join(', ').toLowerCase();
          bValue = b.secretariats.join(', ').toLowerCase();
          break;
        case 'redFlagScore':
          aValue = a.redFlagScore;
          bValue = b.redFlagScore;
          break;
        default:
          aValue = a.redFlagScore;
          bValue = b.redFlagScore;
      }

      // Handle string vs number comparison
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return ngoOrder === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return ngoOrder === 'asc' ? aValue - bValue : bValue - aValue;
    });

    return sorted;
  }, [ngoTrackerData, ngoRedFlagFilter, ngoEntityTypeFilter, filterName, irsMatches, classifyEntityType, ngoOrder, ngoOrderBy]);

  // NGO Tracker sorting handler
  const handleNgoSort = (property: 'recipient' | 'irsStatus' | 'entityType' | 'ein' | 'totalAmount' | 'payments' | 'avgPayment' | 'secretariats' | 'redFlagScore') => {
    const isAsc = ngoOrderBy === property && ngoOrder === 'asc';
    setNgoOrder(isAsc ? 'desc' : 'asc');
    setNgoOrderBy(property);
  };

  const totalBudget = budgetData.reduce((sum, item) => sum + item.amount, 0);

  // Debug: Log current view mode
  console.log('🎯 Current viewMode:', viewMode);
  console.log('🎯 VendorData length:', vendorData.length);
  console.log('🎯 SortedAndFilteredExpenditures length:', sortedAndFilteredExpenditures.length);

  // Load categories from flat table data (only story bucket categories)
  const categories = useMemo(() => {
    // Get unique story bucket labels from the flat table
    const uniqueLabels = Array.from(new Set(
      flatTableRows
        .map(row => row.storyBucketLabel)
        .filter(label => label) // Remove undefined/null
    )).sort();

    console.log('Flat table categories:', uniqueLabels);

    return uniqueLabels;
  }, [flatTableRows]);

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

  // Get story bucket color for a category label
  const getCategoryColor = (categoryLabel: string): string => {
    // Find the story bucket ID that matches this label
    const bucketEntry = Object.entries(STORY_BUCKET_LABELS).find(
      ([_, label]) => label === categoryLabel
    );

    if (bucketEntry) {
      const bucketId = bucketEntry[0] as StoryBucketId;
      return STORY_BUCKET_COLORS[bucketId];
    }

    // Fallback to primary color
    return theme.palette.primary.main;
  };

  // Handle row expansion for vendor drill-down
  const handleRowExpand = async (row: any) => {
    const rowId = row.id;
    const isExpanded = expandedRows.has(rowId);

    // Toggle expansion
    const newExpandedRows = new Set(expandedRows);
    if (isExpanded) {
      newExpandedRows.delete(rowId);
      setExpandedRows(newExpandedRows);
      return;
    }

    // Expand row
    newExpandedRows.add(rowId);
    setExpandedRows(newExpandedRows);

    // Check if we already have vendor data cached
    if (vendorDataCache[rowId]) {
      return;
    }

    // Load vendor data for this program
    if (row.type === 'program' && row.rollup) {
      const newLoadingVendors = new Set(loadingVendors);
      newLoadingVendors.add(rowId);
      setLoadingVendors(newLoadingVendors);

      try {
        const vendors = filterVendorsByProgram(
          vendorData,
          row.rollup.fiscal_year,
          row.rollup.agency,
          row.rollup.program,
          row.rollup.service_area
        );

        console.log(`🔍 Vendors for "${row.name}":`, {
          total: vendors.length,
          placeholders: vendors.filter(v => v.is_placeholder).length,
          unmatched: vendors.filter(v => v.is_expected_unmatched).length,
          valid: vendors.filter(v => !v.is_placeholder && !v.is_expected_unmatched).length
        });

        // Sort by spent amount descending
        const sortedVendors = vendors
          .filter(v => !v.is_placeholder && !v.is_expected_unmatched)
          .sort((a, b) => b.spent_amount_ytd - a.spent_amount_ytd);

        console.log(`✅ Final vendors for "${row.name}":`, sortedVendors.length);

        setVendorDataCache(prev => ({
          ...prev,
          [rowId]: sortedVendors
        }));
      } catch (error) {
        console.error('Failed to load vendors:', error);
      } finally {
        const newLoadingVendors = new Set(loadingVendors);
        newLoadingVendors.delete(rowId);
        setLoadingVendors(newLoadingVendors);
      }
    }
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

        </Box>

        {/* Budget Overview with Pie Chart */}
        <m.div variants={varFade('inUp')}>
          <BudgetOverview
            fiscalYear={filterFiscalYear ? parseInt(filterFiscalYear) : 2025}
            onCategoryClick={(storyBucketId) => {
              // Find the category label for this story bucket
              const categoryLabel = STORY_BUCKET_LABELS[storyBucketId];
              if (categoryLabel) {
                setFilterCategory(categoryLabel);
                setPage(0); // Reset to first page
              }
            }}
            onFiscalYearChange={(year) => {
              // Sync fiscal year selection from BudgetOverview tabs to main filter
              setFilterFiscalYear(year.toString());
              setPage(0); // Reset to first page
            }}
          />
        </m.div>

        {/* Filters */}
        <m.div variants={varFade('inUp')}>
          <Card sx={{ mb: 3, p: 3 }}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
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
              <Grid item xs={12} md={4}>
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
              <Grid item xs={12} md={3}>
                <TextField
                  select
                  fullWidth
                  value={filterFiscalYear}
                  onChange={(e) => setFilterFiscalYear(e.target.value)}
                  SelectProps={{ native: true }}
                >
                  <option value="">All Fiscal Years</option>
                  {availableFiscalYears.map((year) => (
                    <option key={year} value={year.toString()}>
                      FY{year}
                    </option>
                  ))}
                </TextField>
              </Grid>
            </Grid>
          </Card>
        </m.div>

        {/* View Toggle */}
        <m.div variants={varFade('inUp')}>
          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'center' }}>
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={(e, newValue) => {
                if (newValue !== null) {
                  setViewMode(newValue);
                  setPage(0); // Reset pagination when switching views
                }
              }}
              sx={{
                bgcolor: 'background.paper',
                boxShadow: 1,
                '& .MuiToggleButton-root': {
                  px: 3,
                  py: 1.5,
                  border: 1,
                  borderColor: 'divider',
                  '&.Mui-selected': {
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText',
                    '&:hover': {
                      bgcolor: 'primary.dark',
                    },
                  },
                },
              }}
            >
              <ToggleButton value="appropriations">
                <AccountBalanceIcon sx={{ mr: 1 }} />
                Budget Appropriations
              </ToggleButton>
              <ToggleButton value="expenditures">
                <ReceiptLongIcon sx={{ mr: 1 }} />
                Actual Expenditures
              </ToggleButton>
              <ToggleButton value="ngo-tracker">
                <FlagIcon sx={{ mr: 1 }} />
                Pass-Through NGO Tracker
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>
        </m.div>

        {/* Budget Appropriations Table */}
        {viewMode === 'appropriations' && (
          <m.div variants={varFade('inUp')}>
            <Card sx={{ mb: 5 }}>
              <Scrollbar>
                <TableContainer sx={{ minWidth: 1000 }}>
                  <Table>
                    <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                      <TableRow>
                        <TableCell sx={{ bgcolor: '#f5f5f5', color: '#000' }}>
                        <TableSortLabel
                          active={flatTableOrderBy === 'category'}
                          direction={flatTableOrderBy === 'category' ? flatTableOrder : 'asc'}
                          onClick={() => handleFlatTableSort('category')}
                          sx={{
                            color: '#000 !important',
                            '&.Mui-active': { color: '#000 !important' },
                            '& .MuiTableSortLabel-icon': { color: '#000 !important' }
                          }}
                        >
                          Category
                        </TableSortLabel>
                      </TableCell>
                      <TableCell sx={{ bgcolor: '#f5f5f5', color: '#000' }}>
                        <TableSortLabel
                          active={flatTableOrderBy === 'agency'}
                          direction={flatTableOrderBy === 'agency' ? flatTableOrder : 'asc'}
                          onClick={() => handleFlatTableSort('agency')}
                          sx={{
                            color: '#000 !important',
                            '&.Mui-active': { color: '#000 !important' },
                            '& .MuiTableSortLabel-icon': { color: '#000 !important' }
                          }}
                        >
                          Agency
                        </TableSortLabel>
                      </TableCell>
                      <TableCell sx={{ bgcolor: '#f5f5f5', color: '#000' }}>
                        <TableSortLabel
                          active={flatTableOrderBy === 'program'}
                          direction={flatTableOrderBy === 'program' ? flatTableOrder : 'asc'}
                          onClick={() => handleFlatTableSort('program')}
                          sx={{
                            color: '#000 !important',
                            '&.Mui-active': { color: '#000 !important' },
                            '& .MuiTableSortLabel-icon': { color: '#000 !important' }
                          }}
                        >
                          Program
                        </TableSortLabel>
                      </TableCell>
                      <TableCell align="right" sx={{ bgcolor: '#f5f5f5', color: '#000' }}>
                        <TableSortLabel
                          active={flatTableOrderBy === 'amount'}
                          direction={flatTableOrderBy === 'amount' ? flatTableOrder : 'asc'}
                          onClick={() => handleFlatTableSort('amount')}
                          sx={{
                            color: '#000 !important',
                            '&.Mui-active': { color: '#000 !important' },
                            '& .MuiTableSortLabel-icon': { color: '#000 !important' }
                          }}
                        >
                          Amount
                        </TableSortLabel>
                      </TableCell>
                      <TableCell align="right" sx={{ bgcolor: '#f5f5f5', color: '#000' }}>
                        <TableSortLabel
                          active={flatTableOrderBy === 'percentage'}
                          direction={flatTableOrderBy === 'percentage' ? flatTableOrder : 'asc'}
                          onClick={() => handleFlatTableSort('percentage')}
                          sx={{
                            color: '#000 !important',
                            '&.Mui-active': { color: '#000 !important' },
                            '& .MuiTableSortLabel-icon': { color: '#000 !important' }
                          }}
                        >
                          % of Total
                        </TableSortLabel>
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {sortedAndFilteredRows.slice(page * rowsPerPage, (page + 1) * rowsPerPage).map((row) => {
                      const categoryColor = row.storyBucketId ? STORY_BUCKET_COLORS[row.storyBucketId] : theme.palette.primary.main;
                      const isExpanded = expandedRows.has(row.id);
                      const isLoading = loadingVendors.has(row.id);
                      const vendors = vendorDataCache[row.id] || [];
                      const canExpand = row.type === 'program' && row.rollup;

                      return (
                        <React.Fragment key={row.id}>
                          {/* Main Row */}
                          <TableRow
                            sx={{
                              '&:hover': {
                                backgroundColor: alpha(theme.palette.primary.main, 0.04),
                              }
                            }}
                          >
                            {/* Category Column */}
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Box
                                  sx={{
                                    width: 12,
                                    height: 12,
                                    borderRadius: '50%',
                                    backgroundColor: categoryColor,
                                    flexShrink: 0
                                  }}
                                />
                                <Typography variant="body2">
                                  {row.storyBucketLabel || '-'}
                                </Typography>
                              </Box>
                            </TableCell>

                            {/* Agency Column */}
                            <TableCell>
                              <Typography variant="body2">
                                {row.type === 'agency' ? row.name : (row.agency || '-')}
                              </Typography>
                            </TableCell>

                            {/* Program Column */}
                            <TableCell>
                              <Typography variant="body2">
                                {row.type === 'program' ? row.name : '-'}
                              </Typography>
                            </TableCell>

                            {/* Amount Column */}
                            <TableCell align="right">
                              <Typography variant="body2" fontWeight="medium">
                                {fCurrency(row.amount)}
                              </Typography>
                            </TableCell>

                            {/* Percentage Column */}
                            <TableCell align="right">
                              <Typography variant="body2">
                                {fPercent(row.percentage)}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        </React.Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Scrollbar>

            {/* Pagination Controls */}
            <Box sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              p: 2,
              borderTop: 1,
              borderColor: 'divider'
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Rows per page:
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  {[10, 30, 50].map((option) => (
                    <Button
                      key={option}
                      size="small"
                      variant={rowsPerPage === option ? 'contained' : 'outlined'}
                      onClick={() => handleChangeRowsPerPage(option)}
                      sx={{ minWidth: 50 }}
                    >
                      {option}
                    </Button>
                  ))}
                </Box>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  {`${page * rowsPerPage + 1}-${Math.min((page + 1) * rowsPerPage, sortedAndFilteredRows.length)} of ${sortedAndFilteredRows.length}`}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => handleChangePage(page - 1)}
                    disabled={page === 0}
                  >
                    Previous
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => handleChangePage(page + 1)}
                    disabled={(page + 1) * rowsPerPage >= sortedAndFilteredRows.length}
                  >
                    Next
                  </Button>
                </Box>
              </Box>
            </Box>
            </Card>
          </m.div>
        )}

        {/* Actual Expenditures Table */}
        {viewMode === 'expenditures' && (
          <Box>
            <Card sx={{ mb: 5 }}>
              <Scrollbar>
                <TableContainer sx={{ minWidth: 1000 }}>
                  <Table>
                    <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                      <TableRow>
                        <TableCell sx={{ bgcolor: '#f5f5f5', color: '#000' }}>
                          <TableSortLabel
                            active={expenditureOrderBy === 'category'}
                            direction={expenditureOrderBy === 'category' ? expenditureOrder : 'asc'}
                            onClick={() => handleExpenditureSort('category')}
                            sx={{
                              color: '#000 !important',
                              '&.Mui-active': { color: '#000 !important' },
                              '& .MuiTableSortLabel-icon': { color: '#000 !important' }
                            }}
                          >
                            Category
                          </TableSortLabel>
                        </TableCell>
                        <TableCell sx={{ bgcolor: '#f5f5f5', color: '#000' }}>
                          <TableSortLabel
                            active={expenditureOrderBy === 'vendor'}
                            direction={expenditureOrderBy === 'vendor' ? expenditureOrder : 'asc'}
                            onClick={() => handleExpenditureSort('vendor')}
                            sx={{
                              color: '#000 !important',
                              '&.Mui-active': { color: '#000 !important' },
                              '& .MuiTableSortLabel-icon': { color: '#000 !important' }
                            }}
                          >
                            Vendor/Recipient
                          </TableSortLabel>
                        </TableCell>
                        <TableCell align="right" sx={{ bgcolor: '#f5f5f5', color: '#000' }}>
                          <TableSortLabel
                            active={expenditureOrderBy === 'amount'}
                            direction={expenditureOrderBy === 'amount' ? expenditureOrder : 'asc'}
                            onClick={() => handleExpenditureSort('amount')}
                            sx={{
                              color: '#000 !important',
                              '&.Mui-active': { color: '#000 !important' },
                              '& .MuiTableSortLabel-icon': { color: '#000 !important' }
                            }}
                          >
                            Amount
                          </TableSortLabel>
                        </TableCell>
                        <TableCell sx={{ bgcolor: '#f5f5f5', color: '#000' }}>
                          <TableSortLabel
                            active={expenditureOrderBy === 'fiscal_year'}
                            direction={expenditureOrderBy === 'fiscal_year' ? expenditureOrder : 'asc'}
                            onClick={() => handleExpenditureSort('fiscal_year')}
                            sx={{
                              color: '#000 !important',
                              '&.Mui-active': { color: '#000 !important' },
                              '& .MuiTableSortLabel-icon': { color: '#000 !important' }
                            }}
                          >
                            Fiscal Year
                          </TableSortLabel>
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {sortedAndFilteredExpenditures
                        .slice(page * rowsPerPage, (page + 1) * rowsPerPage)
                        .map((vendor, idx) => {
                          // Map secretariat to story bucket
                          const storyBucketId = mapSecretariatToStoryBucket(vendor.secretariat);
                          const storyBucketLabel = STORY_BUCKET_LABELS[storyBucketId];
                          const categoryColor = STORY_BUCKET_COLORS[storyBucketId] || theme.palette.primary.main;

                          return (
                            <TableRow
                              key={`${vendor.fiscal_year}-${vendor.agency}-${vendor.program}-${vendor.vendor_name}-${idx}`}
                              sx={{
                                '&:hover': {
                                  backgroundColor: alpha(theme.palette.primary.main, 0.04),
                                }
                              }}
                            >
                              <TableCell>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Box
                                    sx={{
                                      width: 12,
                                      height: 12,
                                      borderRadius: '50%',
                                      backgroundColor: categoryColor,
                                      flexShrink: 0
                                    }}
                                  />
                                  <Typography variant="body2">
                                    {storyBucketLabel || 'Unclassified'}
                                  </Typography>
                                </Box>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2">
                                  {vendor.vendor_name}
                                </Typography>
                              </TableCell>
                              <TableCell align="right">
                                <Typography variant="body2" fontWeight="medium">
                                  {fCurrency(vendor.spent_amount_ytd)}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2">
                                  FY{vendor.fiscal_year}
                                </Typography>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Scrollbar>

              {/* Pagination Controls */}
              <Box sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                p: 2,
                borderTop: 1,
                borderColor: 'divider'
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Rows per page:
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    {[10, 30, 50].map((option) => (
                      <Button
                        key={option}
                        size="small"
                        variant={rowsPerPage === option ? 'contained' : 'outlined'}
                        onClick={() => handleChangeRowsPerPage(option)}
                        sx={{ minWidth: 50 }}
                      >
                        {option}
                      </Button>
                    ))}
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    {`${page * rowsPerPage + 1}-${Math.min((page + 1) * rowsPerPage, sortedAndFilteredExpenditures.length)} of ${sortedAndFilteredExpenditures.length}`}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => handleChangePage(page - 1)}
                      disabled={page === 0}
                    >
                      Previous
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => handleChangePage(page + 1)}
                      disabled={(page + 1) * rowsPerPage >= sortedAndFilteredExpenditures.length}
                    >
                      Next
                    </Button>
                  </Box>
                </Box>
              </Box>
            </Card>
          </Box>
        )}

        {/* Pass-Through NGO Tracker Table */}
        {viewMode === 'ngo-tracker' && (
          <Box>
            {/* Filter Controls */}
            <Card sx={{ mb: 3, p: 3 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <TextField
                    select
                    fullWidth
                    label="Entity Type"
                    value={ngoEntityTypeFilter}
                    onChange={(e) => setNgoEntityTypeFilter(e.target.value as 'All' | 'Nonprofit' | 'For-Profit' | 'Unknown')}
                    SelectProps={{ native: true }}
                  >
                    <option value="All">All Types</option>
                    <option value="Nonprofit">Nonprofit</option>
                    <option value="For-Profit">For-Profit Company</option>
                    <option value="Unknown">Unknown</option>
                  </TextField>
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    select
                    fullWidth
                    label="Red Flag Level"
                    value={ngoRedFlagFilter}
                    onChange={(e) => setNgoRedFlagFilter(e.target.value as 'All' | 'High' | 'Medium' | 'Low')}
                    SelectProps={{ native: true }}
                  >
                    <option value="All">All Levels</option>
                    <option value="High">High (Score ≥7)</option>
                    <option value="Medium">Medium (Score 4-6)</option>
                    <option value="Low">Low (Score &lt;4)</option>
                  </TextField>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Total Recipients: {filteredNGOData.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Amount: {fCurrency(filteredNGOData.reduce((sum, ngo) => sum + ngo.totalAmount, 0))}
                  </Typography>
                </Grid>
              </Grid>
            </Card>

            {/* NGO Tracker Table */}
            <Card sx={{ mb: 5 }}>
              <Scrollbar>
                <TableContainer sx={{ minWidth: 1200 }}>
                  <Table>
                    <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                      <TableRow>
                        <TableCell sx={{ bgcolor: '#f5f5f5', color: '#000' }}>
                          <TableSortLabel
                            active={ngoOrderBy === 'recipient'}
                            direction={ngoOrderBy === 'recipient' ? ngoOrder : 'asc'}
                            onClick={() => handleNgoSort('recipient')}
                          >
                            Recipient
                          </TableSortLabel>
                        </TableCell>
                        <TableCell align="center" sx={{ bgcolor: '#f5f5f5', color: '#000' }}>
                          <TableSortLabel
                            active={ngoOrderBy === 'irsStatus'}
                            direction={ngoOrderBy === 'irsStatus' ? ngoOrder : 'asc'}
                            onClick={() => handleNgoSort('irsStatus')}
                          >
                            IRS Status
                          </TableSortLabel>
                        </TableCell>
                        <TableCell sx={{ bgcolor: '#f5f5f5', color: '#000' }}>
                          <TableSortLabel
                            active={ngoOrderBy === 'entityType'}
                            direction={ngoOrderBy === 'entityType' ? ngoOrder : 'asc'}
                            onClick={() => handleNgoSort('entityType')}
                          >
                            Entity Type
                          </TableSortLabel>
                        </TableCell>
                        <TableCell sx={{ bgcolor: '#f5f5f5', color: '#000' }}>
                          <TableSortLabel
                            active={ngoOrderBy === 'ein'}
                            direction={ngoOrderBy === 'ein' ? ngoOrder : 'asc'}
                            onClick={() => handleNgoSort('ein')}
                          >
                            EIN/990
                          </TableSortLabel>
                        </TableCell>
                        <TableCell align="right" sx={{ bgcolor: '#f5f5f5', color: '#000' }}>
                          <TableSortLabel
                            active={ngoOrderBy === 'totalAmount'}
                            direction={ngoOrderBy === 'totalAmount' ? ngoOrder : 'asc'}
                            onClick={() => handleNgoSort('totalAmount')}
                          >
                            Total Amount
                          </TableSortLabel>
                        </TableCell>
                        <TableCell align="center" sx={{ bgcolor: '#f5f5f5', color: '#000' }}>
                          <TableSortLabel
                            active={ngoOrderBy === 'payments'}
                            direction={ngoOrderBy === 'payments' ? ngoOrder : 'asc'}
                            onClick={() => handleNgoSort('payments')}
                          >
                            Payments
                          </TableSortLabel>
                        </TableCell>
                        <TableCell align="right" sx={{ bgcolor: '#f5f5f5', color: '#000' }}>
                          <TableSortLabel
                            active={ngoOrderBy === 'avgPayment'}
                            direction={ngoOrderBy === 'avgPayment' ? ngoOrder : 'asc'}
                            onClick={() => handleNgoSort('avgPayment')}
                          >
                            Avg Payment
                          </TableSortLabel>
                        </TableCell>
                        <TableCell sx={{ bgcolor: '#f5f5f5', color: '#000' }}>
                          <TableSortLabel
                            active={ngoOrderBy === 'secretariats'}
                            direction={ngoOrderBy === 'secretariats' ? ngoOrder : 'asc'}
                            onClick={() => handleNgoSort('secretariats')}
                          >
                            Secretariats
                          </TableSortLabel>
                        </TableCell>
                        <TableCell align="center" sx={{ bgcolor: '#f5f5f5', color: '#000' }}>
                          <TableSortLabel
                            active={ngoOrderBy === 'redFlagScore'}
                            direction={ngoOrderBy === 'redFlagScore' ? ngoOrder : 'asc'}
                            onClick={() => handleNgoSort('redFlagScore')}
                          >
                            Red Flag Score
                          </TableSortLabel>
                        </TableCell>
                        <TableCell sx={{ bgcolor: '#f5f5f5', color: '#000' }}>Red Flags</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredNGOData
                        .slice(page * rowsPerPage, (page + 1) * rowsPerPage)
                        .map((ngo, idx) => {
                          // Determine red flag color
                          const scoreColor = ngo.redFlagScore >= 7 ? 'error.main' :
                                           ngo.redFlagScore >= 4 ? 'warning.main' :
                                           'success.main';

                          // Check IRS verification
                          const irsVerification = irsMatches[ngo.vendorName];
                          const verificationBadge = irsVerification ? getVerificationBadge(irsVerification) : null;
                          const verificationTooltip = irsVerification ? getVerificationTooltip(irsVerification) : '';

                          // Classify entity type
                          const entityClassification = classifyEntityType(ngo.vendorName, !!irsVerification);

                          return (
                            <TableRow key={`${ngo.vendorName}-${idx}`} hover>
                              <TableCell>
                                <Box>
                                  <Typography variant="body2" fontWeight="medium">
                                    {ngo.vendorName}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    FY {ngo.fiscalYears.join(', ')}
                                  </Typography>
                                </Box>
                              </TableCell>
                              <TableCell align="center">
                                {entityClassification.type === 'nonprofit' ? (
                                  <Tooltip title={verificationTooltip} arrow>
                                    <CheckCircleIcon
                                      sx={{
                                        color: 'success.main',
                                        fontSize: 24
                                      }}
                                    />
                                  </Tooltip>
                                ) : entityClassification.type === 'for-profit' ? (
                                  <Tooltip title="For-profit company - not a 501(c)(3) nonprofit" arrow>
                                    <WarningIcon
                                      sx={{
                                        color: 'warning.main',
                                        fontSize: 24
                                      }}
                                    />
                                  </Tooltip>
                                ) : (
                                  <Tooltip title="Unable to verify nonprofit status - may be a nonprofit not in IRS database or misclassified by state" arrow>
                                    <HelpOutlineIcon
                                      sx={{
                                        color: 'text.secondary',
                                        fontSize: 24
                                      }}
                                    />
                                  </Tooltip>
                                )}
                              </TableCell>
                              <TableCell>
                                <Typography
                                  variant="body2"
                                  color={entityClassification.type === 'nonprofit' ? 'success.main' :
                                         entityClassification.type === 'for-profit' ? 'warning.main' :
                                         'text.secondary'}
                                  fontWeight={entityClassification.type === 'for-profit' ? 'bold' : 'normal'}
                                >
                                  {entityClassification.label}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                {irsVerification ? (
                                  <Typography variant="body2" fontFamily="monospace">
                                    {irsVerification.ein}
                                  </Typography>
                                ) : (
                                  <Typography variant="caption" color="text.secondary">
                                    —
                                  </Typography>
                                )}
                              </TableCell>
                              <TableCell align="right">
                                <Typography variant="body2" fontWeight="medium">
                                  {fCurrency(ngo.totalAmount)}
                                </Typography>
                              </TableCell>
                              <TableCell align="center">
                                <Typography variant="body2">
                                  {ngo.paymentCount}
                                </Typography>
                              </TableCell>
                              <TableCell align="right">
                                <Typography variant="body2">
                                  {fCurrency(ngo.avgPayment)}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="caption" color="text.secondary">
                                  {ngo.secretariats.slice(0, 2).join(', ')}
                                  {ngo.secretariats.length > 2 && ` +${ngo.secretariats.length - 2} more`}
                                </Typography>
                              </TableCell>
                              <TableCell align="center">
                                <Chip
                                  label={ngo.redFlagScore}
                                  size="small"
                                  sx={{
                                    bgcolor: scoreColor,
                                    color: 'white',
                                    fontWeight: 'bold'
                                  }}
                                />
                              </TableCell>
                              <TableCell>
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                  {ngo.redFlags.map((flag, i) => (
                                    <Chip
                                      key={i}
                                      label={flag}
                                      size="small"
                                      variant="outlined"
                                      sx={{ fontSize: '0.7rem' }}
                                    />
                                  ))}
                                </Box>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Scrollbar>

              {/* Pagination Controls */}
              <Box sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                p: 2,
                borderTop: 1,
                borderColor: 'divider'
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Rows per page:
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    {[10, 30, 50].map((option) => (
                      <Button
                        key={option}
                        size="small"
                        variant={rowsPerPage === option ? 'contained' : 'outlined'}
                        onClick={() => handleChangeRowsPerPage(option)}
                        sx={{ minWidth: 50 }}
                      >
                        {option}
                      </Button>
                    ))}
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    {`${page * rowsPerPage + 1}-${Math.min((page + 1) * rowsPerPage, filteredNGOData.length)} of ${filteredNGOData.length}`}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => handleChangePage(page - 1)}
                      disabled={page === 0}
                    >
                      Previous
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => handleChangePage(page + 1)}
                      disabled={(page + 1) * rowsPerPage >= filteredNGOData.length}
                    >
                      Next
                    </Button>
                  </Box>
                </Box>
              </Box>
            </Card>
          </Box>
        )}

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
