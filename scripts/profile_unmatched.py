#!/usr/bin/env python3
"""
Unmatched Profiler for Budget Decoder Pipeline

Analyzes unmatched records from the Budget Decoder join pipeline and produces
rollup reports to identify patterns in unmatched data.

Author: DFTP/StateBudgetX Team
Date: 2025-11-24
"""

import pandas as pd
from pathlib import Path
from datetime import datetime

# ============================================================================
# CONFIGURATION
# ============================================================================

BASE_DIR = Path("/Users/secretservice/Documents/Budget Decoder Datasets")
DECODER_OUTPUTS_DIR = BASE_DIR / "decoder_outputs"
UNMATCHED_REPORTS_DIR = DECODER_OUTPUTS_DIR / "unmatched_reports"
PROFILES_OUTPUT_DIR = DECODER_OUTPUTS_DIR / "unmatched_profiles"

DPB_UNMATCHED_FILE = UNMATCHED_REPORTS_DIR / "dpb_programs_unmatched.csv"
EXP_UNMATCHED_FILE = UNMATCHED_REPORTS_DIR / "expenditures_unmatched.csv"

CHUNK_SIZE = 100000  # Process expenditures in chunks


# ============================================================================
# PROFILING FUNCTIONS
# ============================================================================

def profile_unmatched_by_agency(exp_unmatched_file: Path) -> pd.DataFrame:
    """
    Profile unmatched expenditures by agency.
    
    Returns DataFrame with:
        - agency_name
        - total_unmatched_amount
        - unmatched_record_count
    """
    print("\n" + "="*80)
    print("PROFILING UNMATCHED EXPENDITURES BY AGENCY")
    print("="*80)
    
    # Process in chunks and aggregate
    agency_totals = {}
    
    chunk_iter = pd.read_csv(exp_unmatched_file, chunksize=CHUNK_SIZE, encoding='latin-1')
    
    for i, chunk in enumerate(chunk_iter):
        print(f"   Processing chunk {i+1}...")
        
        # Group by agency
        grouped = chunk.groupby('agency_name', dropna=False).agg({
            'amount': ['sum', 'count']
        })
        
        # Accumulate totals
        for agency, row in grouped.iterrows():
            if agency not in agency_totals:
                agency_totals[agency] = {'amount': 0, 'count': 0}
            agency_totals[agency]['amount'] += row[('amount', 'sum')]
            agency_totals[agency]['count'] += row[('amount', 'count')]
    
    # Convert to DataFrame
    result = pd.DataFrame([
        {
            'agency_name': agency,
            'total_unmatched_amount': data['amount'],
            'unmatched_record_count': data['count']
        }
        for agency, data in agency_totals.items()
    ])
    
    # Sort by amount descending
    result = result.sort_values('total_unmatched_amount', ascending=False).reset_index(drop=True)
    
    print(f"   ✓ Profiled {len(result):,} agencies")
    
    return result


def profile_unmatched_by_category(exp_unmatched_file: Path) -> pd.DataFrame:
    """
    Profile unmatched expenditures by category and expense type.

    Note: The unmatched expenditures file may not have category_name or expense_type columns.
    This function will skip profiling if those columns are not available.

    Returns DataFrame with:
        - category_name
        - expense_type
        - total_unmatched_amount
        - unmatched_record_count
    """
    print("\n" + "="*80)
    print("PROFILING UNMATCHED EXPENDITURES BY CATEGORY")
    print("="*80)

    # Check if category_name column exists in the file
    sample = pd.read_csv(exp_unmatched_file, nrows=1, encoding='latin-1')

    if 'category_name' not in sample.columns:
        print("   ⚠️  category_name column not found in unmatched expenditures")
        print("   Skipping category profiling")
        return pd.DataFrame(columns=['category_name', 'expense_type', 'total_unmatched_amount', 'unmatched_record_count'])

    # Process in chunks and aggregate
    category_totals = {}

    chunk_iter = pd.read_csv(exp_unmatched_file, chunksize=CHUNK_SIZE, encoding='latin-1')

    for i, chunk in enumerate(chunk_iter):
        print(f"   Processing chunk {i+1}...")

        # Ensure expense_type column exists (may not be in unmatched output)
        if 'expense_type' not in chunk.columns:
            chunk['expense_type'] = ''

        # Group by category and expense type
        grouped = chunk.groupby(['category_name', 'expense_type'], dropna=False).agg({
            'amount': ['sum', 'count']
        })

        # Accumulate totals
        for (category, exp_type), row in grouped.iterrows():
            key = (category, exp_type)
            if key not in category_totals:
                category_totals[key] = {'amount': 0, 'count': 0}
            category_totals[key]['amount'] += row[('amount', 'sum')]
            category_totals[key]['count'] += row[('amount', 'count')]

    # Convert to DataFrame
    result = pd.DataFrame([
        {
            'category_name': category,
            'expense_type': exp_type,
            'total_unmatched_amount': data['amount'],
            'unmatched_record_count': data['count']
        }
        for (category, exp_type), data in category_totals.items()
    ])

    # Sort by amount descending
    result = result.sort_values('total_unmatched_amount', ascending=False).reset_index(drop=True)

    print(f"   ✓ Profiled {len(result):,} category/expense-type combinations")

    return result


def profile_top_vendors_by_agency(exp_unmatched_file: Path, top_n: int = 10) -> pd.DataFrame:
    """
    Profile top unmatched vendors by agency.

    Returns DataFrame with:
        - agency_name
        - vendor_name
        - total_unmatched_amount
        - unmatched_record_count
        - rank_within_agency
    """
    print("\n" + "="*80)
    print("PROFILING TOP UNMATCHED VENDORS BY AGENCY")
    print("="*80)

    # Process in chunks and aggregate
    agency_vendor_totals = {}

    chunk_iter = pd.read_csv(exp_unmatched_file, chunksize=CHUNK_SIZE, encoding='latin-1')

    for i, chunk in enumerate(chunk_iter):
        print(f"   Processing chunk {i+1}...")

        # Group by agency and vendor
        grouped = chunk.groupby(['agency_name', 'vendor_name'], dropna=False).agg({
            'amount': ['sum', 'count']
        })

        # Accumulate totals
        for (agency, vendor), row in grouped.iterrows():
            key = (agency, vendor)
            if key not in agency_vendor_totals:
                agency_vendor_totals[key] = {'amount': 0, 'count': 0}
            agency_vendor_totals[key]['amount'] += row[('amount', 'sum')]
            agency_vendor_totals[key]['count'] += row[('amount', 'count')]

    # Convert to DataFrame
    result = pd.DataFrame([
        {
            'agency_name': agency,
            'vendor_name': vendor,
            'total_unmatched_amount': data['amount'],
            'unmatched_record_count': data['count']
        }
        for (agency, vendor), data in agency_vendor_totals.items()
    ])

    # Rank within each agency
    result['rank_within_agency'] = result.groupby('agency_name')['total_unmatched_amount'].rank(
        ascending=False, method='dense'
    )

    # Fill any NaN values before converting to int
    result['rank_within_agency'] = result['rank_within_agency'].fillna(0).astype(int)

    # Filter to top N per agency
    result = result[result['rank_within_agency'] <= top_n]

    # Sort by agency and rank
    result = result.sort_values(['agency_name', 'rank_within_agency']).reset_index(drop=True)

    print(f"   ✓ Profiled top {top_n} vendors for {result['agency_name'].nunique():,} agencies")

    return result


# ============================================================================
# MAIN EXECUTION
# ============================================================================

def main():
    """
    Main profiler execution.
    """
    start_time = datetime.now()

    print("\n" + "="*80)
    print("BUDGET DECODER UNMATCHED PROFILER")
    print("="*80)
    print(f"Started at: {start_time.strftime('%Y-%m-%d %H:%M:%S')}")

    # Create output directory
    PROFILES_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # Check input files exist
    if not DPB_UNMATCHED_FILE.exists():
        print(f"❌ Error: {DPB_UNMATCHED_FILE} not found")
        return

    if not EXP_UNMATCHED_FILE.exists():
        print(f"❌ Error: {EXP_UNMATCHED_FILE} not found")
        return

    print(f"\n📊 Input files:")
    print(f"   DPB unmatched: {DPB_UNMATCHED_FILE}")
    print(f"   Expenditures unmatched: {EXP_UNMATCHED_FILE}")

    # Profile 1: By Agency
    by_agency = profile_unmatched_by_agency(EXP_UNMATCHED_FILE)
    output_file = PROFILES_OUTPUT_DIR / "unmatched_expenditures_by_agency.csv"
    by_agency.to_csv(output_file, index=False)
    print(f"   ✓ Saved {output_file}")

    # Profile 2: By Category
    by_category = profile_unmatched_by_category(EXP_UNMATCHED_FILE)
    output_file = PROFILES_OUTPUT_DIR / "unmatched_expenditures_by_category.csv"
    by_category.to_csv(output_file, index=False)
    print(f"   ✓ Saved {output_file}")

    # Profile 3: Top Vendors by Agency
    top_vendors = profile_top_vendors_by_agency(EXP_UNMATCHED_FILE, top_n=10)
    output_file = PROFILES_OUTPUT_DIR / "top_unmatched_vendors_by_agency.csv"
    top_vendors.to_csv(output_file, index=False)
    print(f"   ✓ Saved {output_file}")

    # Summary
    end_time = datetime.now()
    duration = (end_time - start_time).total_seconds()

    print("\n" + "="*80)
    print("PROFILER COMPLETE")
    print("="*80)
    print(f"Duration: {duration:.1f} seconds")
    print(f"\nOutputs saved to: {PROFILES_OUTPUT_DIR}")
    print(f"\nSummary:")
    print(f"   Agencies with unmatched expenditures: {len(by_agency):,}")
    print(f"   Category/expense-type combinations: {len(by_category):,}")
    print(f"   Top vendor records: {len(top_vendors):,}")


if __name__ == "__main__":
    main()


