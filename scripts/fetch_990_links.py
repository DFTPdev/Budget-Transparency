#!/usr/bin/env python3
"""
Fetch IRS Form 990 filing data from ProPublica Nonprofit Explorer API.

This script:
1. Loads verified nonprofit EINs from vendor_irs_matches.json
2. Fetches all available 990 filings from ProPublica API for each nonprofit
3. Saves PDF URLs, tax years, and basic financial data to form_990_links.json

ProPublica API: https://projects.propublica.org/nonprofits/api
"""

import json
import time
from pathlib import Path
from urllib.request import urlopen
from urllib.error import HTTPError, URLError

# Configuration
IRS_MATCHES_FILE = Path('frontend/public/data/vendor_irs_matches.json')
OUTPUT_FILE = Path('frontend/public/data/form_990_links.json')
PROPUBLICA_API_BASE = 'https://projects.propublica.org/nonprofits/api/v2'
RATE_LIMIT_DELAY = 0.5  # seconds between requests (be nice to ProPublica)

def fetch_990_filings(ein: str, vendor_name: str) -> dict | None:
    """
    Fetch all 990 filings for a given EIN from ProPublica API.

    Args:
        ein: Employer Identification Number (9 digits, no hyphens)
        vendor_name: Name of the vendor/nonprofit

    Returns:
        Dictionary with 990 filing data, or None if not found
    """
    # Remove any hyphens from EIN
    ein_clean = ein.replace('-', '')

    url = f"{PROPUBLICA_API_BASE}/organizations/{ein_clean}.json"

    try:
        with urlopen(url, timeout=10) as response:
            data = json.loads(response.read().decode('utf-8'))

            # Extract organization info
            org_name = data.get('name', vendor_name)

            # Get all filings with data (PDFs available)
            filings = []
            for filing in data.get('filings_with_data', []):
                filing_data = {
                    'tax_year': filing.get('tax_prd_yr'),
                    'pdf_url': filing.get('pdf_url'),
                    'form_type': filing.get('formtype', '990'),  # 990, 990EZ, 990PF
                    'total_revenue': filing.get('totrevenue'),
                    'total_expenses': filing.get('totfuncexpns'),
                    'total_assets': filing.get('totassetsend'),
                    'total_liabilities': filing.get('totliabend')
                }
                filings.append(filing_data)

            # Keep only last 5 years of filings
            filings = sorted(filings, key=lambda x: x['tax_year'] or 0, reverse=True)[:5]

            return {
                'ein': ein_clean,
                'name': org_name,
                'propublica_url': f"https://projects.propublica.org/nonprofits/organizations/{ein_clean}",
                'filings': filings,
                'filings_count': len(filings)
            }

    except HTTPError as e:
        if e.code == 404:
            print(f"  ⚠️  Not found in ProPublica database")
        else:
            print(f"  ❌ HTTP Error {e.code}")
        return None

    except (URLError, Exception) as e:
        print(f"  ❌ Request failed: {e}")
        return None

def main():
    """Main execution function."""
    print("=" * 70)
    print("IRS Form 990 Filing Data Fetcher")
    print("=" * 70)
    print()
    
    # Load IRS matches
    print(f"📂 Loading IRS matches from: {IRS_MATCHES_FILE}")
    with open(IRS_MATCHES_FILE, 'r') as f:
        irs_matches = json.load(f)
    
    total_vendors = len(irs_matches)
    print(f"✅ Loaded {total_vendors:,} verified nonprofits")
    print()
    
    # Fetch 990 data for each nonprofit
    form_990_data = {}
    success_count = 0
    not_found_count = 0
    error_count = 0
    
    print("🔍 Fetching 990 filing data from ProPublica API...")
    print("   (This will take ~20-25 minutes for 2,449 nonprofits)")
    print()
    
    for idx, (vendor_name, irs_data) in enumerate(irs_matches.items(), 1):
        ein = irs_data['ein']
        
        # Progress indicator
        if idx % 50 == 0:
            print(f"Progress: {idx}/{total_vendors} ({idx/total_vendors*100:.1f}%) - "
                  f"Found: {success_count}, Not found: {not_found_count}, Errors: {error_count}")
        
        print(f"[{idx}/{total_vendors}] {vendor_name} (EIN: {ein})...", end=" ")
        
        # Fetch 990 data
        data = fetch_990_filings(ein, vendor_name)
        
        if data and data['filings_count'] > 0:
            form_990_data[vendor_name] = data
            success_count += 1
            print(f"✅ Found {data['filings_count']} filing(s)")
        elif data and data['filings_count'] == 0:
            not_found_count += 1
            print("⚠️  No 990 filings available")
        else:
            error_count += 1
        
        # Rate limiting - be nice to ProPublica
        time.sleep(RATE_LIMIT_DELAY)
    
    print()
    print("=" * 70)
    print("Summary")
    print("=" * 70)
    print(f"Total nonprofits processed: {total_vendors:,}")
    print(f"✅ With 990 filings:        {success_count:,} ({success_count/total_vendors*100:.1f}%)")
    print(f"⚠️  No filings found:        {not_found_count:,} ({not_found_count/total_vendors*100:.1f}%)")
    print(f"❌ Errors:                  {error_count:,} ({error_count/total_vendors*100:.1f}%)")
    print()
    
    # Save results
    print(f"💾 Saving results to: {OUTPUT_FILE}")
    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_FILE, 'w') as f:
        json.dump(form_990_data, f, indent=2)
    
    print(f"✅ Saved 990 data for {len(form_990_data):,} nonprofits")
    print()
    print("🎉 Done!")

if __name__ == '__main__':
    main()

