#!/usr/bin/env python3
"""
Transfer Payments Extractor
Extracts ALL transfer payment records from raw CARDINAL expenditure data
with complete field preservation (all 14 CARDINAL fields).

This creates a comprehensive dataset for NGO tracker analysis without
the budget matching constraints of the main decoder pipeline.

Author: DFTP/StateBudgetX Team
Date: 2025-12-07
"""

import csv
from pathlib import Path
from datetime import datetime
from typing import List, Dict

# ============================================================================
# CONFIGURATION
# ============================================================================

# Source data paths
BASE_DIR = Path("/Users/secretservice/Documents/Budget Decoder Datasets")
EXPENDITURES_FY25_DIR = BASE_DIR / "All Expenditures for Fiscal Year 2025"
EXPENDITURES_FY26_DIR = BASE_DIR / "All Expenditures for Fiscal Year 2026"

# Output paths
OUTPUT_DIR = Path(__file__).parent.parent / "frontend" / "public" / "decoder"
OUTPUT_FILE = OUTPUT_DIR / "transfer_payments_full.csv"

# CARDINAL field mapping (14 core fields)
CARDINAL_FIELDS = [
    'BRANCH_NAME',
    'SECRETARIAT_NAME',
    'AGENCY_NAME',
    'FUNCTION_NAME',
    'PROGRAM_NAME',
    'SERVICE_AREA_NAME',
    'FUND_NAME',
    'FUND_DETAIL_NAME',
    'CATEGORY_NAME',
    'EXPENSE_TYPE',
    'TRANS_DATE',
    'FISCAL_YEAR',
    'AMOUNT',
    'VENDOR_NAME'
]

# Output field names (cleaned up for frontend)
OUTPUT_FIELDS = [
    'branch',
    'secretariat',
    'agency',
    'function',
    'program',
    'service_area',
    'fund',
    'fund_detail',
    'category',
    'expense_type',
    'trans_date',
    'fiscal_year',
    'amount',
    'vendor_name'
]

# ============================================================================
# EXTRACTION FUNCTIONS
# ============================================================================

def extract_transfer_payments_from_file(csv_file: Path) -> List[Dict]:
    """Extract all transfer payment records from a single CARDINAL CSV file."""
    records = []
    
    print(f"   Processing: {csv_file.name}...", end=" ")
    
    try:
        with open(csv_file, 'r', encoding='utf-8', errors='ignore') as f:
            reader = csv.DictReader(f)
            count = 0
            
            for row in reader:
                # Filter for TRANSFER PAYMENTS category only
                category = row.get('CATEGORY_NAME', '')
                if category and 'TRANSFER' in category.upper():
                    # Extract all 14 CARDINAL fields
                    record = {}
                    for cardinal_field, output_field in zip(CARDINAL_FIELDS, OUTPUT_FIELDS):
                        value = row.get(cardinal_field, '')
                        # Clean up None values and whitespace
                        record[output_field] = value.strip() if value else ''
                    
                    records.append(record)
                    count += 1
        
        print(f"✓ ({count:,} transfer payments)")
        
    except Exception as e:
        print(f"✗ Error: {e}")
    
    return records


def main():
    """Main extraction pipeline."""
    print("=" * 100)
    print("TRANSFER PAYMENTS EXTRACTION PIPELINE")
    print("=" * 100)
    print(f"\nStarted: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    all_records = []
    
    # Extract from FY2025 files
    print("\n📂 Extracting from FY2025 files...")
    for csv_file in sorted(EXPENDITURES_FY25_DIR.glob("*.csv")):
        records = extract_transfer_payments_from_file(csv_file)
        all_records.extend(records)
    
    # Extract from FY2026 files
    print("\n📂 Extracting from FY2026 files...")
    for csv_file in sorted(EXPENDITURES_FY26_DIR.glob("*.csv")):
        records = extract_transfer_payments_from_file(csv_file)
        all_records.extend(records)
    
    # Ensure output directory exists
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # Save to CSV
    print(f"\n💾 Saving {len(all_records):,} records to {OUTPUT_FILE}...")

    with open(OUTPUT_FILE, 'w', newline='', encoding='utf-8') as f:
        if all_records:
            writer = csv.DictWriter(f, fieldnames=OUTPUT_FIELDS)
            writer.writeheader()
            writer.writerows(all_records)

    # Calculate statistics
    unique_vendors = len(set(r['vendor_name'] for r in all_records))
    total_amount = sum(float(r['amount']) if r['amount'] else 0 for r in all_records)

    print(f"\n✅ Complete! Saved to: {OUTPUT_FILE}")
    print(f"   Total records: {len(all_records):,}")
    print(f"   File size: {OUTPUT_FILE.stat().st_size / 1024 / 1024:.1f} MB")
    print(f"   Unique vendors: {unique_vendors:,}")
    print(f"   Total amount: ${total_amount:,.2f}")
    print(f"\nFinished: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 100)


if __name__ == "__main__":
    main()

