#!/usr/bin/env python3
"""
Process IRS Tax Exempt Organization data for Virginia nonprofits.

This script:
1. Reads the IRS EO BMF (Exempt Organizations Business Master File) for Virginia
2. Filters for 501(c)(3) charitable organizations
3. Creates a clean dataset for name matching with CARDINAL vendor data
4. Outputs JSON file for frontend integration
"""

import csv
import json
import re
from pathlib import Path
from typing import Dict, List

# Paths
BASE_DIR = Path(__file__).parent.parent
IRS_DATA_FILE = BASE_DIR / "data" / "irs" / "eo_va.csv"
OUTPUT_DIR = BASE_DIR / "frontend" / "public" / "data"
OUTPUT_FILE = OUTPUT_DIR / "irs_nonprofits_va.json"

def normalize_name(name: str) -> str:
    """
    Normalize organization name for matching.
    
    - Convert to uppercase
    - Remove punctuation except spaces
    - Remove common suffixes (INC, CORP, etc.)
    - Remove extra whitespace
    """
    if not name:
        return ""
    
    # Convert to uppercase
    normalized = name.upper()
    
    # Remove common legal suffixes for better matching
    suffixes = [
        r'\bINCORPORATED\b',
        r'\bINC\.?\b',
        r'\bCORPORATION\b',
        r'\bCORP\.?\b',
        r'\bLIMITED\b',
        r'\bLTD\.?\b',
        r'\bL\.L\.C\.?\b',
        r'\bLLC\b',
        r'\bCOMPANY\b',
        r'\bCO\.?\b',
    ]
    
    for suffix in suffixes:
        normalized = re.sub(suffix, '', normalized)
    
    # Remove punctuation except spaces
    normalized = re.sub(r'[^\w\s]', ' ', normalized)
    
    # Remove extra whitespace
    normalized = re.sub(r'\s+', ' ', normalized).strip()
    
    return normalized

def process_irs_data():
    """Process IRS data and create clean dataset."""
    
    print("=" * 80)
    print("PROCESSING IRS TAX EXEMPT ORGANIZATION DATA")
    print("=" * 80)
    
    if not IRS_DATA_FILE.exists():
        print(f"❌ Error: IRS data file not found: {IRS_DATA_FILE}")
        return
    
    nonprofits = []
    total_count = 0
    c3_count = 0
    
    with open(IRS_DATA_FILE, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        
        for row in reader:
            total_count += 1
            
            # Filter for 501(c)(3) organizations only
            subsection = row.get('SUBSECTION', '').strip()
            if subsection != '03':
                continue
            
            c3_count += 1
            
            ein = row.get('EIN', '').strip()
            name = row.get('NAME', '').strip()
            city = row.get('CITY', '').strip()
            state = row.get('STATE', '').strip()
            zip_code = row.get('ZIP', '').strip()
            
            # NTEE code (National Taxonomy of Exempt Entities)
            ntee_cd = row.get('NTEE_CD', '').strip()
            
            # Asset and income codes
            asset_amt = row.get('ASSET_AMT', '0').strip()
            income_amt = row.get('INCOME_AMT', '0').strip()
            
            # Status (01 = unconditional exemption)
            status = row.get('STATUS', '').strip()
            
            # Create normalized name for matching
            normalized_name = normalize_name(name)
            
            nonprofit = {
                'ein': ein,
                'name': name,
                'normalized_name': normalized_name,
                'city': city,
                'state': state,
                'zip': zip_code,
                'ntee_code': ntee_cd,
                'asset_amount': int(asset_amt) if asset_amt.isdigit() else 0,
                'income_amount': int(income_amt) if income_amt.isdigit() else 0,
                'status': status,
                'subsection': '501(c)(3)',
            }
            
            nonprofits.append(nonprofit)
    
    print(f"✅ Processed {total_count:,} total organizations")
    print(f"✅ Found {c3_count:,} 501(c)(3) charitable organizations")
    
    # Sort by name
    nonprofits.sort(key=lambda x: x['name'])
    
    # Create output directory if it doesn't exist
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    
    # Write to JSON file
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(nonprofits, f, indent=2)
    
    print(f"✅ Saved to: {OUTPUT_FILE}")
    print(f"   File size: {OUTPUT_FILE.stat().st_size / 1024 / 1024:.2f} MB")
    
    # Print sample entries
    print("\n" + "=" * 80)
    print("SAMPLE ENTRIES (first 10)")
    print("=" * 80)
    for i, nonprofit in enumerate(nonprofits[:10], 1):
        print(f"{i:2}. {nonprofit['name']}")
        print(f"    EIN: {nonprofit['ein']}")
        print(f"    City: {nonprofit['city']}, {nonprofit['state']} {nonprofit['zip']}")
        print(f"    Normalized: {nonprofit['normalized_name']}")
        print()

if __name__ == '__main__':
    process_irs_data()

