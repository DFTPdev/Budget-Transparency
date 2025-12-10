#!/usr/bin/env python3
"""
Fetch IRS Form 990 filing data from ProPublica Nonprofit Explorer website.

This script uses a hybrid approach:
1. Loads verified nonprofit EINs from vendor_irs_matches.json
2. First tries ProPublica API for basic data
3. Falls back to scraping ProPublica website HTML to get complete filing list with PDF links
4. Saves complete filing data including tax years, PDF URLs, and filing dates

ProPublica API: https://projects.propublica.org/nonprofits/api
ProPublica Website: https://projects.propublica.org/nonprofits/organizations/{EIN}
"""

import json
import time
import re
from pathlib import Path
from urllib.request import urlopen, Request
from urllib.error import HTTPError, URLError
from html.parser import HTMLParser

# Configuration
IRS_MATCHES_FILE = Path('frontend/public/data/vendor_irs_matches.json')
OUTPUT_FILE = Path('frontend/public/data/form_990_links.json')
PROPUBLICA_API_BASE = 'https://projects.propublica.org/nonprofits/api/v2'
PROPUBLICA_WEB_BASE = 'https://projects.propublica.org/nonprofits/organizations'
RATE_LIMIT_DELAY = 0.8  # seconds between requests (be nice to ProPublica)


class ProPublicaFilingParser(HTMLParser):
    """
    HTML parser to extract Form 990 filing information from ProPublica nonprofit pages.

    Extracts:
    - Tax years (fiscal year ending)
    - Filing dates (when the form was filed)
    - PDF download links
    - Form types (990, 990-EZ, 990-PF)
    """

    def __init__(self):
        super().__init__()
        self.filings = []
        self.current_filing = {}
        self.in_filing_section = False
        self.in_fiscal_year = False
        self.in_filed_date = False
        self.capture_text = False

    def handle_starttag(self, tag, attrs):
        attrs_dict = dict(attrs)

        # Detect fiscal year heading (e.g., "Fiscal Year Ending Dec. 2024")
        if tag == 'h3' or tag == 'h4':
            self.in_fiscal_year = True
            self.capture_text = True

        # Detect "Filed on" text
        if tag == 'p' or tag == 'div':
            # Check if this might contain filing date
            pass

        # Detect PDF download links
        if tag == 'a':
            href = attrs_dict.get('href', '')
            # ProPublica PDF links look like: /nonprofits/download-filing?path=...
            if 'download-filing' in href or '.pdf' in href.lower():
                if self.current_filing:
                    self.current_filing['pdf_url'] = f"https://projects.propublica.org{href}" if href.startswith('/') else href

    def handle_data(self, data):
        data = data.strip()
        if not data:
            return

        # Extract fiscal year (e.g., "Fiscal Year Ending Dec. 2024")
        if self.in_fiscal_year and 'Fiscal Year Ending' in data:
            match = re.search(r'(\d{4})', data)
            if match:
                tax_year = int(match.group(1))
                # Save previous filing if exists
                if self.current_filing and 'tax_year' in self.current_filing:
                    self.filings.append(self.current_filing)
                # Start new filing
                self.current_filing = {'tax_year': tax_year}
            self.in_fiscal_year = False

        # Extract filing date (e.g., "Filed on Sept. 30, 2025")
        if 'Filed on' in data:
            # Extract the date after "Filed on"
            date_match = re.search(r'Filed on\s+(.+?)(?:\s|$)', data)
            if date_match and self.current_filing:
                self.current_filing['filed_date'] = date_match.group(1).strip()

        # Extract form type from headings like "990" or "990-EZ"
        if data in ['990', '990-EZ', '990-PF', 'Form 990', 'Form 990-EZ', 'Form 990-PF']:
            if self.current_filing:
                form_type = data.replace('Form ', '')
                if form_type == '990':
                    self.current_filing['form_type'] = 0
                elif form_type == '990-EZ':
                    self.current_filing['form_type'] = 1
                elif form_type == '990-PF':
                    self.current_filing['form_type'] = 2

    def handle_endtag(self, tag):
        if tag in ['h3', 'h4']:
            self.in_fiscal_year = False
            self.capture_text = False

    def get_filings(self):
        # Add the last filing if exists
        if self.current_filing and 'tax_year' in self.current_filing:
            self.filings.append(self.current_filing)
        return self.filings

def scrape_990_filings_from_website(ein: str, vendor_name: str) -> dict | None:
    """
    Scrape 990 filing data from ProPublica website HTML.

    This is more reliable than the API because:
    1. Website has the most recent filings (API lags behind)
    2. Website has actual PDF download links (API often has null)
    3. Website shows filing dates (API only has tax years)

    Args:
        ein: Employer Identification Number (9 digits, no hyphens)
        vendor_name: Name of the vendor/nonprofit

    Returns:
        Dictionary with 990 filing data, or None if not found
    """
    ein_clean = ein.replace('-', '')
    url = f"{PROPUBLICA_WEB_BASE}/{ein_clean}"

    try:
        # Add User-Agent header to avoid being blocked
        req = Request(url, headers={
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        })

        with urlopen(req, timeout=15) as response:
            html = response.read().decode('utf-8')

            # Parse HTML to extract filing information
            parser = ProPublicaFilingParser()
            parser.feed(html)
            filings = parser.get_filings()

            # If parser didn't find filings, try regex fallback
            if not filings:
                filings = extract_filings_with_regex(html)

            # Extract organization name from HTML
            org_name = vendor_name
            name_match = re.search(r'<h1[^>]*>([^<]+)</h1>', html)
            if name_match:
                org_name = name_match.group(1).strip()

            # Keep only last 5 years of filings
            filings = sorted(filings, key=lambda x: x.get('tax_year', 0), reverse=True)[:5]

            return {
                'ein': ein_clean,
                'name': org_name,
                'propublica_url': url,
                'filings': filings,
                'filings_count': len(filings),
                'data_source': 'website_scrape'
            }

    except HTTPError as e:
        if e.code == 404:
            print(f"⚠️  Not found on ProPublica website")
        else:
            print(f"❌ HTTP Error {e.code}")
        return None

    except (URLError, Exception) as e:
        print(f"❌ Scrape failed: {e}")
        return None


def extract_filings_with_regex(html: str) -> list:
    """
    Extract filings using regex by finding fiscal year sections.

    ProPublica's HTML structure:
    - Each filing starts with <section class="single-filing-period" id='filing2024'>
    - Year is in <div class="year-label">2024</div>
    - Filing date is in <span class="filed-on">Filed on Sept. 30, 2025</span>
    - View Filing link: <a href="/nonprofits/organizations/{EIN}/{object_id}/full">

    The sections are large and contain nested sections, so we need to be careful
    about matching the right content for each filing year.
    """
    filings = []

    # Strategy: Find all filing IDs first, then extract data for each
    filing_ids = re.findall(r'id=[\'"]filing(\d{4})[\'"]', html)

    for tax_year_str in filing_ids:
        tax_year = int(tax_year_str)

        # Find the section for this specific year
        # We'll extract a chunk of HTML starting from this filing ID
        pattern = rf'id=[\'"]filing{tax_year}[\'"].*?(?=id=[\'"]filing\d{{4}}[\'"]|$)'
        match = re.search(pattern, html, re.DOTALL)

        if not match:
            continue

        section_html = match.group(0)

        filing = {
            'tax_year': tax_year,
            'form_type': 0  # Default to 990
        }

        # Extract filing date (month may or may not have a period)
        filed_date_match = re.search(r'Filed on\s+([A-Za-z]+\.?\s+\d{1,2},\s+\d{4})', section_html)
        if filed_date_match:
            filing['filed_date'] = filed_date_match.group(1)

        # Look for View Filing link
        view_filing_match = re.search(r'href="(/nonprofits/organizations/\d+/\d+/full)"', section_html)
        if view_filing_match:
            filing['filing_url'] = f"https://projects.propublica.org{view_filing_match.group(1)}"
            # Use the filing page URL as the pdf_url (it's not a direct PDF, but it's where users can view/download)
            filing['pdf_url'] = filing['filing_url']

        # Try to find direct PDF download link (rare, but check anyway)
        pdf_match = re.search(r'href="(/nonprofits/download-filing\?[^"]+)"', section_html)
        if pdf_match:
            filing['pdf_url'] = f"https://projects.propublica.org{pdf_match.group(1)}"

        # Detect form type from the <h5> heading
        if re.search(r'<h5>990-EZ</h5>', section_html):
            filing['form_type'] = 1
        elif re.search(r'<h5>990-PF</h5>', section_html):
            filing['form_type'] = 2
        elif re.search(r'<h5>990</h5>', section_html):
            filing['form_type'] = 0

        filings.append(filing)

    return filings


def fetch_990_filings_hybrid(ein: str, vendor_name: str) -> dict | None:
    """
    Hybrid approach: Try API first (fast), fall back to website scraping (complete).

    Args:
        ein: Employer Identification Number (9 digits, no hyphens)
        vendor_name: Name of the vendor/nonprofit

    Returns:
        Dictionary with 990 filing data, or None if not found
    """
    # Always use website scraping for most complete and up-to-date data
    # The API is often incomplete (missing PDFs, missing recent filings)
    return scrape_990_filings_from_website(ein, vendor_name)

def main():
    """Main execution function."""
    print("=" * 80)
    print("IRS Form 990 Filing Data Fetcher (Hybrid Website Scraper)")
    print("=" * 80)
    print()
    print("This script scrapes ProPublica's website to get complete 990 filing data,")
    print("including the most recent filings and actual PDF download links.")
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

    print("🔍 Scraping 990 filing data from ProPublica website...")
    print(f"   (This will take ~30-35 minutes for {total_vendors:,} nonprofits)")
    print(f"   Rate limit: {RATE_LIMIT_DELAY}s between requests")
    print()

    start_time = time.time()

    for idx, (vendor_name, irs_data) in enumerate(irs_matches.items(), 1):
        ein = irs_data['ein']

        # Progress indicator every 50 items
        if idx % 50 == 0:
            elapsed = time.time() - start_time
            rate = idx / elapsed
            remaining = (total_vendors - idx) / rate if rate > 0 else 0
            print(f"\n📊 Progress: {idx}/{total_vendors} ({idx/total_vendors*100:.1f}%) - "
                  f"Found: {success_count}, Not found: {not_found_count}, Errors: {error_count}")
            print(f"   ⏱️  Elapsed: {elapsed/60:.1f}m, Estimated remaining: {remaining/60:.1f}m\n")

        print(f"[{idx}/{total_vendors}] {vendor_name[:50]:<50} (EIN: {ein})...", end=" ")

        # Fetch 990 data using hybrid approach
        data = fetch_990_filings_hybrid(ein, vendor_name)

        if data and data['filings_count'] > 0:
            form_990_data[vendor_name] = data
            success_count += 1
            # Show filing years found
            years = [str(f.get('tax_year', '?')) for f in data['filings']]
            print(f"✅ {data['filings_count']} filing(s): {', '.join(years)}")
        elif data and data['filings_count'] == 0:
            not_found_count += 1
            print("⚠️  No filings")
        else:
            error_count += 1

        # Rate limiting - be respectful to ProPublica
        time.sleep(RATE_LIMIT_DELAY)

    total_time = time.time() - start_time

    print()
    print("=" * 80)
    print("Summary")
    print("=" * 80)
    print(f"Total nonprofits processed: {total_vendors:,}")
    print(f"✅ With 990 filings:        {success_count:,} ({success_count/total_vendors*100:.1f}%)")
    print(f"⚠️  No filings found:        {not_found_count:,} ({not_found_count/total_vendors*100:.1f}%)")
    print(f"❌ Errors:                  {error_count:,} ({error_count/total_vendors*100:.1f}%)")
    print(f"⏱️  Total time:              {total_time/60:.1f} minutes")
    print()

    # Calculate statistics
    total_filings = sum(org['filings_count'] for org in form_990_data.values())
    filings_with_pdfs = sum(
        1 for org in form_990_data.values()
        for filing in org['filings']
        if filing.get('pdf_url')
    )

    print("📊 Filing Statistics:")
    print(f"   Total filings found:     {total_filings:,}")
    print(f"   Filings with PDF links:  {filings_with_pdfs:,} ({filings_with_pdfs/total_filings*100:.1f}%)")
    print()

    # Save results
    print(f"💾 Saving results to: {OUTPUT_FILE}")
    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_FILE, 'w') as f:
        json.dump(form_990_data, f, indent=2)

    print(f"✅ Saved 990 data for {len(form_990_data):,} nonprofits")
    print()
    print("🎉 Done! Your data now includes the most recent filings with PDF links.")

if __name__ == '__main__':
    main()

