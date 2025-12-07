#!/usr/bin/env python3
"""
Process Data Point Budget CSV files into clean JSON for Budget Decoder
Aggregates by secretariat, maps to story buckets, calculates percentages
"""

import csv
import json
import glob
from collections import defaultdict
from pathlib import Path

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
    'schools_kids': 'Schools & Kids',
    'health_care': 'Health & Care',
    'safety_justice': 'Safety & Justice',
    'roads_transit': 'Roads & Transit',
    'jobs_business_innovation': 'Jobs, Business & Innovation',
    'parks_environment_energy': 'Parks, Environment & Energy',
    'veterans_military': 'Veterans & Military Families',
    'government_overhead': 'Government & Overhead',
    'unclassified': 'Other Services',
}


def process_fiscal_year(year: int, base_path: str) -> dict:
    """Process budget data for a single fiscal year"""
    print(f"\n{'='*80}")
    print(f"Processing FY{year}")
    print(f"{'='*80}")
    
    secretariat_totals = defaultdict(float)
    
    # Determine file path(s)
    if year == 2024:
        files = [f"{base_path}/All Budget for Fiscal Year 2024/FY2024 Budget.csv"]
    elif year == 2025:
        files = [f"{base_path}/All Budget for Fiscal Year 2025/FY2025 Budget.csv"]
    elif year == 2026:
        # FY2026 has multiple monthly files
        files = glob.glob(f"{base_path}/All Budget for Fiscal Year 2026/*.csv")
    else:
        raise ValueError(f"Unsupported fiscal year: {year}")
    
    print(f"Found {len(files)} file(s)")
    
    # Process all files
    for filepath in files:
        filename = Path(filepath).name
        print(f"  Processing: {filename}")
        
        with open(filepath, 'r', encoding='latin-1') as f:
            reader = csv.DictReader(f)
            row_count = 0
            
            for row in reader:
                try:
                    secretariat = row.get('SECRETARIAT_NAME', '').strip() if row.get('SECRETARIAT_NAME') else ''
                    amount_str = row.get('AMOUNT', '0').strip() if row.get('AMOUNT') else '0'
                    amount = float(amount_str)
                    
                    if secretariat and secretariat != 'SECRETARIAT_NAME':
                        secretariat_totals[secretariat] += amount
                        row_count += 1
                except Exception as e:
                    continue
            
            print(f"    Processed {row_count} rows")
    
    # Calculate total
    total_budget = sum(secretariat_totals.values())
    print(f"\nTotal Budget: ${total_budget:,.2f}")
    
    # Sort by amount
    sorted_secretariats = sorted(secretariat_totals.items(), key=lambda x: x[1], reverse=True)
    
    # Build categories list with story bucket mapping
    categories = []
    for secretariat, amount in sorted_secretariats:
        if not secretariat or secretariat == 'SECRETARIAT_NAME':
            continue
        
        story_bucket_id = SECRETARIAT_TO_STORY_BUCKET.get(secretariat, 'unclassified')
        story_bucket_label = STORY_BUCKET_LABELS.get(story_bucket_id, 'Other Services')
        percentage = (amount / total_budget * 100) if total_budget > 0 else 0
        
        categories.append({
            'secretariat': secretariat,
            'story_bucket_id': story_bucket_id,
            'story_bucket_label': story_bucket_label,
            'amount': round(amount, 2),
            'percentage': round(percentage, 2)
        })
        
        print(f"  {secretariat:45} ${amount:>18,.2f}  ({percentage:5.2f}%)")
    
    # Build final JSON structure
    result = {
        'fiscal_year': year,
        'total_budget': round(total_budget, 2),
        'source': 'Virginia Auditor of Public Accounts - Data Point',
        'last_updated': '2024-12-07',
        'note': 'FY2026 data is preliminary (partial year)' if year == 2026 else None,
        'categories': categories
    }
    
    return result


def main():
    """Main processing function"""
    base_path = '/Users/secretservice/Documents/DataPoint Budget Data'
    output_dir = Path(__file__).parent.parent / 'frontend' / 'public' / 'data'
    output_dir.mkdir(parents=True, exist_ok=True)

    print("Data Point Budget Data Processor")
    print("="*80)

    # Process each fiscal year
    for year in [2024, 2025, 2026]:
        try:
            result = process_fiscal_year(year, base_path)

            # Write to JSON file
            output_file = output_dir / f'budget_summary_{year}.json'
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(result, f, indent=2, ensure_ascii=False)

            print(f"\n✅ Saved: {output_file}")

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

