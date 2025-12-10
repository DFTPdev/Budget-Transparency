#!/usr/bin/env python3
"""
Test the 990 scraper on a single nonprofit to verify it works correctly.
"""

import json
import sys
from pathlib import Path

# Add parent directory to path to import from fetch_990_links
sys.path.insert(0, str(Path(__file__).parent))

from fetch_990_links import scrape_990_filings_from_website, extract_filings_with_regex

def test_big_homies():
    """Test scraping Big Homies Inc (EIN: 85-2229451)"""
    print("=" * 70)
    print("Testing 990 Scraper on Big Homies Inc")
    print("=" * 70)
    print()
    
    ein = "852229451"
    vendor_name = "Big Homies Inc"
    
    print(f"Scraping: {vendor_name} (EIN: {ein})")
    print(f"URL: https://projects.propublica.org/nonprofits/organizations/{ein}")
    print()
    
    result = scrape_990_filings_from_website(ein, vendor_name)
    
    if result:
        print("✅ SUCCESS!")
        print()
        print(json.dumps(result, indent=2))
        print()
        print(f"Found {result['filings_count']} filing(s):")
        for filing in result['filings']:
            print(f"  - Tax Year {filing.get('tax_year')}: ", end="")
            if filing.get('filed_date'):
                print(f"Filed {filing.get('filed_date')}, ", end="")
            if filing.get('pdf_url'):
                print(f"PDF: {filing.get('pdf_url')[:60]}...")
            else:
                print("No PDF")
    else:
        print("❌ FAILED - No data returned")
        return False
    
    print()
    print("Expected: Should find 2024 and 2022 filings")
    print()
    
    return True

if __name__ == '__main__':
    success = test_big_homies()
    sys.exit(0 if success else 1)

