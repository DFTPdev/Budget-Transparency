import { useState, useEffect } from 'react';

import { hacDashboardData } from 'src/data/hacDashboardData';

// ----------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------

export interface AgencyBudgetData {
  agency: string;
  total_amount: number;
  items: number;
  sources: string[];
}

export interface BudgetDataResult {
  topAgencies: AgencyBudgetData[];
  hacData: typeof hacDashboardData;
  loading: boolean;
  error: string | null;
}

// ----------------------------------------------------------------------
// Hook
// ----------------------------------------------------------------------

export function useBudgetData(): BudgetDataResult {
  const [topAgencies, setTopAgencies] = useState<AgencyBudgetData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch recipients data (top agencies)
        const response = await fetch('/data/recipients_2025.json');
        if (!response.ok) {
          throw new Error(`Failed to fetch recipients data: ${response.statusText}`);
        }

        const data: AgencyBudgetData[] = await response.json();
        
        // Sort by total_amount descending and take top 10
        const sorted = [...data].sort((a, b) => b.total_amount - a.total_amount).slice(0, 10);
        
        setTopAgencies(sorted);
      } catch (err) {
        console.error('Error fetching budget data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load budget data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return {
    topAgencies,
    hacData: hacDashboardData,
    loading,
    error,
  };
}

