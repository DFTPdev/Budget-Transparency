#!/usr/bin/env python3
"""
Check if any "Unknown" type entities are actually nonprofits on ProPublica.

This script:
1. Loads vendor data from the decoder CSV
2. Loads IRS matches to identify already-verified nonprofits
3. Identifies vendors classified as "Unknown" (not verified, no for-profit indicators)
4. Searches ProPublica for each unknown vendor to see if they're actually nonprofits
5. Reports findings
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
OUTPUT_FILE = REPO_ROOT / 'frontend/public/data/unknown_nonprofit_discoveries.json'
PROPUBLICA_SEARCH_BASE = 'https://projects.propublica.org/nonprofits/api/v2/search.json'
RATE_LIMIT_DELAY = 1.0  # seconds between requests

# For-profit keywords (same as frontend logic)
FOR_PROFIT_KEYWORDS = [
    'INC', 'LLC', 'CORP', 'LTD', 'LP', 'CORPORATION', 'INCORPORATED',
    'LIMITED', 'COMPANY', 'CO', 'PLLC', 'PC'
]

def classify_entity_type(vendor_name: str, is_irs_verified: bool) -> str:
    """
    Classify entity type using same logic as frontend.
    Returns: 'nonprofit', 'for-profit', or 'unknown'
    """
    if is_irs_verified:
        return 'nonprofit'
    
    name_upper = vendor_name.upper()
    
    # Check for for-profit indicators
    for keyword in FOR_PROFIT_KEYWORDS:
        # Use word boundary matching
        pattern = rf'\b{re.escape(keyword)}\b'
        if re.search(pattern, name_upper):
            return 'for-profit'
    
    return 'unknown'

def search_propublica(vendor_name: str) -> dict | None:
    """
    Search ProPublica for a vendor name.
    Returns organization data if found, None otherwise.
    """
    # Clean vendor name for search
    search_term = vendor_name.strip()
    url = f"{PROPUBLICA_SEARCH_BASE}?q={quote(search_term)}"
    
    try:
        req = Request(url, headers={
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        })
        
        with urlopen(req, timeout=15) as response:
            data = json.loads(response.read().decode('utf-8'))
            
            # Check if we got any results
            if data.get('total_results', 0) > 0 and data.get('organizations'):
                # Return the first result (best match)
                org = data['organizations'][0]
                return {
                    'ein': org.get('ein'),
                    'name': org.get('name'),
                    'city': org.get('city'),
                    'state': org.get('state'),
                    'subsection': org.get('subsection'),
                    'ntee_code': org.get('ntee_code'),
                    'propublica_url': f"https://projects.propublica.org/nonprofits/organizations/{org.get('ein')}"
                }
            
            return None
            
    except HTTPError as e:
        if e.code == 404:
            return None
        print(f"  ❌ HTTP Error {e.code}")
        return None
        
    except (URLError, Exception) as e:
        print(f"  ❌ Search failed: {e}")
        return None

def main():
    print("=" * 70)
    print("Unknown Entity Nonprofit Discovery Tool")
    print("=" * 70)
    print()
    
    # Load IRS matches
    print(f"📂 Loading IRS matches from: {IRS_MATCHES_FILE}")
    with open(IRS_MATCHES_FILE, 'r') as f:
        irs_matches = json.load(f)
    print(f"✅ Loaded {len(irs_matches):,} verified nonprofits")
    print()
    
    # Load vendor data from CSV
    print(f"📂 Loading vendor data from: {DECODER_CSV}")
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
                'total_amount': total_amount
            })
    
    # Sort by total amount (highest first)
    unknown_vendors.sort(key=lambda x: x['total_amount'], reverse=True)
    
    print(f"✅ Found {len(unknown_vendors):,} 'Unknown' type vendors")
    print(f"   Total spending: ${sum(v['total_amount'] for v in unknown_vendors):,.0f}")
    print()
    
    # Ask user how many to check
    print(f"How many unknown vendors would you like to check on ProPublica?")
    print(f"(Checking all {len(unknown_vendors):,} would take ~{len(unknown_vendors) * RATE_LIMIT_DELAY / 60:.0f} minutes)")
    print()
    
    discoveries = []
    not_found = []
    
    # Check top 100 by default (can be changed)
    check_count = min(100, len(unknown_vendors))
    
    print(f"🔍 Checking top {check_count} unknown vendors on ProPublica...")
    print()
    
    for i, vendor in enumerate(unknown_vendors[:check_count], 1):
        vendor_name = vendor['vendor_name']
        total_amount = vendor['total_amount']
        
        print(f"[{i}/{check_count}] {vendor_name:50} (${total_amount:>12,.0f})", end="")
        
        result = search_propublica(vendor_name)
        
        if result:
            print(f" ✅ FOUND: {result['name']} (EIN: {result['ein']})")
            discoveries.append({
                'vendor_name': vendor_name,
                'total_amount': total_amount,
                'propublica_data': result
            })
        else:
            print(" ⚠️  Not found")
            not_found.append(vendor_name)
        
        time.sleep(RATE_LIMIT_DELAY)
    
    print()
    print("=" * 70)
    print("📊 RESULTS")
    print("=" * 70)
    print(f"Checked: {check_count:,} unknown vendors")
    print(f"Found on ProPublica: {len(discoveries):,} ({len(discoveries)/check_count*100:.1f}%)")
    print(f"Not found: {len(not_found):,} ({len(not_found)/check_count*100:.1f}%)")
    print()
    
    if discoveries:
        print(f"💰 Total spending on discovered nonprofits: ${sum(d['total_amount'] for d in discoveries):,.0f}")
        print()
        print("Top 10 discoveries:")
        for i, d in enumerate(discoveries[:10], 1):
            print(f"{i:2}. {d['vendor_name']:50} ${d['total_amount']:>12,.0f}")
            print(f"    → {d['propublica_data']['name']} (EIN: {d['propublica_data']['ein']})")
        print()
    
    # Save results
    output_data = {
        'checked_count': check_count,
        'discoveries_count': len(discoveries),
        'not_found_count': len(not_found),
        'discoveries': discoveries,
        'not_found': not_found
    }
    
    with open(OUTPUT_FILE, 'w') as f:
        json.dump(output_data, f, indent=2)
    
    print(f"💾 Results saved to: {OUTPUT_FILE}")

if __name__ == '__main__':
    main()

