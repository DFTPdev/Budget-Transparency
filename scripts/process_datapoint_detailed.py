#!/usr/bin/env python3
"""
Enhanced Data Point Budget Processor
Extracts detailed agency and program-level data for drill-down functionality
"""

import csv
import json
import glob
from collections import defaultdict
from pathlib import Path
from typing import Dict, List, Any

# Mapping from Virginia Secretariats to Story Buckets
SECRETARIAT_TO_STORY_BUCKET = {
    'EDUCATION': 'schools_kids',
    'HEALTH AND HUMAN RESOURCES': 'health_care',
    'PUBLIC SAFETY': 'safety_justice',
    'PUBLIC SAFETY AND HOMELAND SECURITY': 'safety_justice',
    'TRANSPORTATION': 'roads_transit',
    'COMMERCE AND TRADE': 'jobs_business_innovation',
    'AGRICULTURE AND FORESTRY': 'jobs_business_innovation',
    'NATURAL RESOURCES': 'parks_environment_energy',
    'NATURAL AND HISTORIC RESOURCES': 'parks_environment_energy',
    'VETERANS AND DEFENSE AFFAIRS': 'veterans_military',
    'ADMINISTRATION': 'government_overhead',
    'FINANCE': 'government_overhead',
    'EXECUTIVE OFFICES': 'government_overhead',
    'LEGISLATIVE': 'government_overhead',
    'JUDICIAL': 'government_overhead',
    'CENTRAL APPROPRIATIONS': 'government_overhead',
    'INDEPENDENT AGENCIES': 'unclassified',
    'LABOR': 'unclassified',
}

# Story bucket display names
STORY_BUCKET_LABELS = {
    'schools_kids': 'Education',
    'health_care': 'Healthcare',
    'safety_justice': 'Law Enforcement',
    'roads_transit': 'Transportation',
    'jobs_business_innovation': 'Jobs, Business & Innovation',
    'parks_environment_energy': 'Parks, Environment & Energy',
    'veterans_military': 'Veterans & Military Families',
    'government_overhead': 'Government & Overhead',
    'unclassified': 'Other Services',
}


def process_fiscal_year_detailed(year: int, base_path: str) -> Dict[str, Any]:
    """Process budget data for a single fiscal year with full detail"""
    print(f"\n{'='*80}")
    print(f"Processing FY{year} - Detailed Extraction")
    print(f"{'='*80}")
    
    # Data structures for aggregation
    secretariat_totals = defaultdict(float)
    agency_data = defaultdict(lambda: defaultdict(float))  # {secretariat: {agency: amount}}
    program_data = defaultdict(lambda: defaultdict(lambda: defaultdict(float)))  # {secretariat: {agency: {program: amount}}}
    fund_data = defaultdict(lambda: defaultdict(float))  # {secretariat: {fund_type: amount}}
    
    # Determine file path(s)
    if year == 2024:
        files = [f"{base_path}/All Budget for Fiscal Year 2024/FY2024 Budget.csv"]
    elif year == 2025:
        files = [f"{base_path}/All Budget for Fiscal Year 2025/FY2025 Budget.csv"]
    elif year == 2026:
        files = glob.glob(f"{base_path}/All Budget for Fiscal Year 2026/*.csv")
    else:
        raise ValueError(f"Unsupported fiscal year: {year}")
    
    print(f"Found {len(files)} file(s)")
    
    total_rows = 0
    
    # Process all files
    for filepath in files:
        filename = Path(filepath).name
        print(f"  Processing: {filename}")
        
        with open(filepath, 'r', encoding='latin-1') as f:
            reader = csv.DictReader(f)
            row_count = 0
            
            for row in reader:
                try:
                    secretariat = row.get('SECRETARIAT_NAME', '').strip()
                    agency = row.get('AGENCY_NAME', '').strip()
                    program = row.get('PROGRAM_NAME', '').strip()
                    fund = row.get('FUND_NAME', '').strip()
                    amount_str = row.get('AMOUNT', '0').strip()
                    amount = float(amount_str)
                    
                    if not secretariat or secretariat == 'SECRETARIAT_NAME':
                        continue
                    
                    # Aggregate at all levels
                    secretariat_totals[secretariat] += amount
                    
                    if agency:
                        agency_data[secretariat][agency] += amount
                    
                    if agency and program:
                        program_data[secretariat][agency][program] += amount
                    
                    if fund:
                        fund_data[secretariat][fund] += amount
                    
                    row_count += 1
                    
                except Exception as e:
                    continue
            
            print(f"    Processed {row_count} rows")
            total_rows += row_count
    
    print(f"\nTotal rows processed: {total_rows}")
    
    # Calculate total budget
    total_budget = sum(secretariat_totals.values())
    print(f"Total Budget: ${total_budget:,.2f}")
    
    return {
        'fiscal_year': year,
        'total_budget': total_budget,
        'secretariat_totals': dict(secretariat_totals),
        'agency_data': {k: dict(v) for k, v in agency_data.items()},
        'program_data': {k: {k2: dict(v2) for k2, v2 in v.items()} for k, v in program_data.items()},
        'fund_data': {k: dict(v) for k, v in fund_data.items()},
    }


def build_agency_json(raw_data: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Build agency-level JSON from raw data"""
    year = raw_data['fiscal_year']
    total_budget = raw_data['total_budget']
    agency_data = raw_data['agency_data']

    agencies = []

    for secretariat, agency_dict in agency_data.items():
        story_bucket_id = SECRETARIAT_TO_STORY_BUCKET.get(secretariat, 'unclassified')
        story_bucket_label = STORY_BUCKET_LABELS.get(story_bucket_id, 'Other Services')

        for agency, amount in agency_dict.items():
            percentage = (amount / total_budget * 100) if total_budget > 0 else 0

            agencies.append({
                'fiscal_year': year,
                'secretariat': secretariat,
                'story_bucket_id': story_bucket_id,
                'story_bucket_label': story_bucket_label,
                'agency': agency,
                'amount': round(amount, 2),
                'percentage': round(percentage, 4)
            })

    # Sort by amount descending
    agencies.sort(key=lambda x: x['amount'], reverse=True)

    return agencies


def build_program_json(raw_data: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Build program-level JSON from raw data"""
    year = raw_data['fiscal_year']
    total_budget = raw_data['total_budget']
    program_data = raw_data['program_data']

    programs = []

    for secretariat, agency_dict in program_data.items():
        story_bucket_id = SECRETARIAT_TO_STORY_BUCKET.get(secretariat, 'unclassified')
        story_bucket_label = STORY_BUCKET_LABELS.get(story_bucket_id, 'Other Services')

        for agency, program_dict in agency_dict.items():
            for program, amount in program_dict.items():
                percentage = (amount / total_budget * 100) if total_budget > 0 else 0

                programs.append({
                    'fiscal_year': year,
                    'secretariat': secretariat,
                    'story_bucket_id': story_bucket_id,
                    'story_bucket_label': story_bucket_label,
                    'agency': agency,
                    'program': program,
                    'amount': round(amount, 2),
                    'percentage': round(percentage, 4)
                })

    # Sort by amount descending
    programs.sort(key=lambda x: x['amount'], reverse=True)

    return programs


def main():
    """Main processing function"""
    base_path = '/Users/secretservice/Documents/DataPoint Budget Data'
    output_dir = Path(__file__).parent.parent / 'frontend' / 'public' / 'data'
    output_dir.mkdir(parents=True, exist_ok=True)

    print("Enhanced Data Point Budget Data Processor")
    print("="*80)
    print("Extracting agency and program-level detail for drill-down functionality")
    print("="*80)

    # Process each fiscal year
    for year in [2024, 2025, 2026]:
        try:
            print(f"\n{'='*80}")
            print(f"FISCAL YEAR {year}")
            print(f"{'='*80}")

            # Extract raw data
            raw_data = process_fiscal_year_detailed(year, base_path)

            # Build agency-level JSON
            agencies = build_agency_json(raw_data)
            agency_file = output_dir / f'budget_by_agency_{year}.json'
            with open(agency_file, 'w', encoding='utf-8') as f:
                json.dump(agencies, f, indent=2, ensure_ascii=False)
            print(f"\n✅ Saved {len(agencies)} agencies to: {agency_file}")

            # Build program-level JSON
            programs = build_program_json(raw_data)
            program_file = output_dir / f'budget_by_program_{year}.json'
            with open(program_file, 'w', encoding='utf-8') as f:
                json.dump(programs, f, indent=2, ensure_ascii=False)
            print(f"✅ Saved {len(programs)} programs to: {program_file}")

            # Print summary stats
            print(f"\nSummary for FY{year}:")
            print(f"  Total Budget: ${raw_data['total_budget']:,.2f}")
            print(f"  Secretariats: {len(raw_data['secretariat_totals'])}")
            print(f"  Agencies: {len(agencies)}")
            print(f"  Programs: {len(programs)}")

        except Exception as e:
            print(f"\n❌ Error processing FY{year}: {e}")
            import traceback
            traceback.print_exc()

    print("\n" + "="*80)
    print("✅ Processing complete!")
    print(f"Output directory: {output_dir}")
    print("="*80)


if __name__ == '__main__':
    main()


