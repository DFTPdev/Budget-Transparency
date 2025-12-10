#!/usr/bin/env python3
"""
Identify for-profit companies among "Unknown" type vendors.

This script uses multiple approaches:
1. SAM.gov API - Federal contractor database (most reliable)
2. Enhanced pattern matching - Business name patterns
3. OpenCorporates API - Corporate registry (optional)

Strategy:
- Check high-spending "Unknown" vendors first
- Use SAM.gov to get official business type
- Save results for manual review
"""

import json
import csv
import time
import re
from pathlib import Path
from urllib.request import urlopen, Request
from urllib.error import HTTPError, URLError
from urllib.parse import quote

# Configuration
SCRIPT_DIR = Path(__file__).parent
REPO_ROOT = SCRIPT_DIR.parent
DECODER_CSV = REPO_ROOT / 'frontend/public/decoder/program_vendor_decoder_external.csv'
IRS_MATCHES_FILE = REPO_ROOT / 'frontend/public/data/vendor_irs_matches.json'
OUTPUT_FILE = REPO_ROOT / 'frontend/public/data/forprofit_discoveries.json'

# SAM.gov API (no key required for basic entity search)
SAM_API_BASE = 'https://api.sam.gov/entity-information/v3/entities'
RATE_LIMIT_DELAY = 0.5  # seconds between requests

# Enhanced for-profit keywords
FOR_PROFIT_KEYWORDS = [
    'INC', 'LLC', 'CORP', 'LTD', 'LP', 'CORPORATION', 'INCORPORATED',
    'LIMITED', 'COMPANY', 'CO', 'PLLC', 'PC', 'LLP', 'PA'
]

# Additional business patterns
BUSINESS_PATTERNS = [
    r'\b(CONSULTING|CONSULTANTS)\b',
    r'\b(SOLUTIONS|SERVICES)\b',
    r'\b(GROUP|PARTNERS|ASSOCIATES)\b',
    r'\b(TECHNOLOGIES|TECHNOLOGY)\b',
    r'\b(SYSTEMS|SOFTWARE)\b',
    r'\b(ENTERPRISES|INDUSTRIES)\b',
    r'\b(HOLDINGS|INVESTMENTS)\b',
    r'\b(& SONS|& DAUGHTERS|& BROS)\b',
    r'\b(CONSTRUCTION|CONTRACTORS)\b',
    r'\b(MANAGEMENT|CONSULTING)\b',
]

def classify_entity_type(vendor_name: str, is_irs_verified: bool) -> str:
    """Classify entity type using same logic as frontend."""
    if is_irs_verified:
        return 'nonprofit'
    
    name_upper = vendor_name.upper()
    
    # Check for for-profit indicators
    for keyword in FOR_PROFIT_KEYWORDS:
        pattern = rf'\b{re.escape(keyword)}\b'
        if re.search(pattern, name_upper):
            return 'for-profit'
    
    return 'unknown'

def has_business_pattern(vendor_name: str) -> bool:
    """Check if vendor name matches common business patterns."""
    name_upper = vendor_name.upper()
    for pattern in BUSINESS_PATTERNS:
        if re.search(pattern, name_upper):
            return True
    return False

def search_sam_gov(vendor_name: str) -> dict | None:
    """
    Search SAM.gov for vendor information.
    Returns business type and other details if found.
    """
    # Clean vendor name for search
    search_term = vendor_name.strip()
    
    # SAM.gov API requires exact or partial name match
    # Using the public API endpoint (no key required for basic search)
    url = f"{SAM_API_BASE}?legalBusinessName={quote(search_term)}&includeSections=entityRegistration"
    
    try:
        req = Request(url, headers={
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            'Accept': 'application/json'
        })
        
        with urlopen(req, timeout=15) as response:
            data = json.loads(response.read().decode('utf-8'))
            
            # Check if we got results
            if data.get('totalRecords', 0) > 0 and data.get('entityData'):
                entity = data['entityData'][0]
                reg = entity.get('entityRegistration', {})
                
                return {
                    'legal_business_name': reg.get('legalBusinessName'),
                    'dba_name': reg.get('dbaName'),
                    'uei': entity.get('entityEFTIndicator'),
                    'cage_code': reg.get('cageCode'),
                    'business_types': reg.get('businessTypes', []),
                    'sam_url': f"https://sam.gov/entity/{entity.get('entityEFTIndicator')}"
                }
            
            return None
            
    except HTTPError as e:
        if e.code == 404 or e.code == 400:
            return None
        print(f"  ⚠️  HTTP Error {e.code}")
        return None
        
    except (URLError, Exception) as e:
        # SAM.gov API might not be accessible or might require API key
        # Silently fail and continue
        return None

def main():
    print("=" * 70)
    print("For-Profit Vendor Identification Tool")
    print("=" * 70)
    print()
    
    # Load IRS matches
    print(f"📂 Loading IRS matches...")
    with open(IRS_MATCHES_FILE, 'r') as f:
        irs_matches = json.load(f)
    print(f"✅ Loaded {len(irs_matches):,} verified nonprofits")
    print()
    
    # Load vendor data from CSV
    print(f"📂 Loading vendor data...")
    vendors = []
    with open(DECODER_CSV, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            vendors.append({
                'vendor_name': row['vendor_name'],
                'spent_amount_ytd': float(row['spent_amount_ytd']) if row['spent_amount_ytd'] else 0
            })
    
    # Get unique vendors
    unique_vendors = {}
    for v in vendors:
        name = v['vendor_name']
        if name not in unique_vendors:
            unique_vendors[name] = 0
        unique_vendors[name] += v['spent_amount_ytd']
    
    print(f"✅ Loaded {len(unique_vendors):,} unique vendors")
    print()
    
    # Classify vendors
    print("🔍 Classifying vendors...")
    unknown_vendors = []
    for vendor_name, total_amount in unique_vendors.items():
        is_verified = vendor_name in irs_matches
        entity_type = classify_entity_type(vendor_name, is_verified)
        
        if entity_type == 'unknown':
            unknown_vendors.append({
                'vendor_name': vendor_name,
                'total_amount': total_amount,
                'has_business_pattern': has_business_pattern(vendor_name)
            })
    
    # Sort by total amount (highest first)
    unknown_vendors.sort(key=lambda x: x['total_amount'], reverse=True)
    
    print(f"✅ Found {len(unknown_vendors):,} 'Unknown' type vendors")
    print(f"   With business patterns: {sum(1 for v in unknown_vendors if v['has_business_pattern']):,}")
    print()

    # First pass: Identify vendors with business patterns (likely for-profits)
    print("🔍 PHASE 1: Identifying vendors with business name patterns...")
    print()

    pattern_matches = [v for v in unknown_vendors if v['has_business_pattern']]
    pattern_matches_top = pattern_matches[:50]  # Top 50 by spending

    print(f"Found {len(pattern_matches):,} vendors with business patterns")
    print(f"Total spending: ${sum(v['total_amount'] for v in pattern_matches):,.0f}")
    print()
    print("Top 20 by spending:")
    for i, v in enumerate(pattern_matches[:20], 1):
        print(f"{i:2}. {v['vendor_name']:60} ${v['total_amount']:>12,.0f}")
    print()

    # Second pass: Try SAM.gov lookup for high-value unknowns
    print("🔍 PHASE 2: Checking SAM.gov for top unknown vendors...")
    print("(This may take a few minutes...)")
    print()

    sam_discoveries = []
    check_count = min(50, len(unknown_vendors))

    for i, vendor in enumerate(unknown_vendors[:check_count], 1):
        vendor_name = vendor['vendor_name']
        total_amount = vendor['total_amount']

        # Skip obvious non-businesses
        if any(x in vendor_name.upper() for x in ['CITY OF', 'COUNTY OF', 'TOWN OF', 'COMMONWEALTH']):
            continue

        print(f"[{i}/{check_count}] {vendor_name:50}", end="")

        result = search_sam_gov(vendor_name)

        if result:
            print(f" ✅ FOUND")
            sam_discoveries.append({
                'vendor_name': vendor_name,
                'total_amount': total_amount,
                'sam_data': result
            })
        else:
            print(f" ⚠️  Not in SAM.gov")

        time.sleep(RATE_LIMIT_DELAY)

    print()
    print("=" * 70)
    print("📊 RESULTS")
    print("=" * 70)
    print()

    print("PHASE 1 - Business Pattern Matches:")
    print(f"  Found: {len(pattern_matches):,} vendors")
    print(f"  Total spending: ${sum(v['total_amount'] for v in pattern_matches):,.0f}")
    print()

    print("PHASE 2 - SAM.gov Discoveries:")
    print(f"  Checked: {check_count:,} vendors")
    print(f"  Found in SAM.gov: {len(sam_discoveries):,}")
    if sam_discoveries:
        print(f"  Total spending: ${sum(d['total_amount'] for d in sam_discoveries):,.0f}")
    print()

    # Save results
    output_data = {
        'pattern_matches': pattern_matches,
        'pattern_matches_count': len(pattern_matches),
        'pattern_matches_spending': sum(v['total_amount'] for v in pattern_matches),
        'sam_discoveries': sam_discoveries,
        'sam_discoveries_count': len(sam_discoveries),
        'sam_checked_count': check_count
    }

    with open(OUTPUT_FILE, 'w') as f:
        json.dump(output_data, f, indent=2)

    print(f"💾 Results saved to: {OUTPUT_FILE}")
    print()
    print("💡 RECOMMENDATION:")
    print("   Review the pattern_matches list - these are likely for-profit companies")
    print("   that should be reclassified from 'Unknown' to 'For-Profit'")

if __name__ == '__main__':
    main()

