#!/usr/bin/env python3
"""
Amendment Vault - Member Request PDF Parser

Parses Member Request PDFs (HB30, SB30, HB1600, SB800) into structured AmendmentVaultRecord format.

Usage:
    python scripts/amendment_vault/parse_member_requests.py

Output:
    - data/amendments/member_requests_2024.json (HB30 + SB30)
    - data/amendments/member_requests_2025.json (HB1600 + SB800)
    - CSV files for inspection (optional)
"""

import os
import re
import json
import csv
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple
from decimal import Decimal

# Try to import pdfplumber (install with: pip install pdfplumber)
try:
    import pdfplumber
    HAS_PDFPLUMBER = True
except ImportError:
    HAS_PDFPLUMBER = False
    import sys
    print("ERROR: pdfplumber is required. Install with: pip install pdfplumber", file=sys.stderr)
    print("Or: pip install -r scripts/amendment_vault/requirements.txt", file=sys.stderr)

# ============================================================================
# Configuration
# ============================================================================

REPO_ROOT = Path(__file__).parent.parent.parent
PDF_DIR = REPO_ROOT / "Amendment Member Requests"
OUTPUT_DIR = REPO_ROOT / "data" / "amendments"

# Bill configurations: (bill_number, chamber, session_year)
BILL_CONFIGS = [
    ("HB30", "House", 2024),
    ("SB30", "Senate", 2024),
    ("HB1600", "House", 2025),
    ("SB800", "Senate", 2025),
]

# ============================================================================
# PDF Discovery
# ============================================================================

def discover_pdfs() -> List[Tuple[Path, str, str, int]]:
    """
    Discover all Member Request PDFs in the PDF directory.

    Returns:
        List of tuples: (pdf_path, bill_number, chamber, session_year)
    """
    discovered = []

    if not PDF_DIR.exists():
        print(f"⚠ PDF directory not found: {PDF_DIR}")
        return discovered

    # Search for PDFs matching our bill patterns
    for bill_number, chamber, session_year in BILL_CONFIGS:
        # Try multiple possible locations/naming patterns
        possible_paths = [
            PDF_DIR / bill_number / f"{bill_number} Member Requests.pdf",
            PDF_DIR / f"{bill_number} Member Requests.pdf",
            PDF_DIR / f"{bill_number} Member Request.pdf",
            PDF_DIR / bill_number / f"{bill_number}_Member_Requests.pdf",
            PDF_DIR / f"{bill_number}_Member_Requests.pdf",
        ]

        for pdf_path in possible_paths:
            if pdf_path.exists():
                discovered.append((pdf_path, bill_number, chamber, session_year))
                print(f"  ✓ Found {bill_number} ({session_year}): {pdf_path.name}")
                break
        else:
            print(f"  ⚠ {bill_number} ({session_year}) PDF not found")

    return discovered

# ============================================================================
# Category Mapping (simplified version - matches category_mapping.ts logic)
# ============================================================================

def map_to_spending_category(agency_name: str = "", secretariat_code: str = "") -> str:
    """Map agency/secretariat to spending category ID"""
    agency = agency_name.lower().strip()
    secretariat = secretariat_code.lower().strip()
    
    # Education
    if "higher" in agency or "college" in agency or "university" in agency:
        return "higher_education"
    if "education" in agency or "education" in secretariat:
        return "k12_education"
    
    # Health & Human Resources
    if any(kw in agency for kw in ["health", "medicaid", "dmas", "human services", "social services"]):
        return "health_and_human_resources"
    
    # Public Safety
    if any(kw in agency for kw in ["police", "corrections", "criminal", "emergency", "homeland", "public safety"]):
        return "public_safety_and_homeland_security"
    
    # Transportation
    if any(kw in agency for kw in ["transportation", "vdot", "highway", "transit"]):
        return "transportation"
    
    # Natural Resources
    if any(kw in agency for kw in ["environmental", "conservation", "wildlife", "parks", "forestry"]):
        return "natural_resources"
    
    # Commerce & Trade
    if any(kw in agency for kw in ["commerce", "trade", "economic development", "tourism"]):
        return "commerce_and_trade"
    
    # Agriculture
    if any(kw in agency for kw in ["agriculture", "farming", "vdacs"]):
        return "agriculture_and_forestry"
    
    # Veterans
    if any(kw in agency for kw in ["veteran", "military", "defense"]):
        return "veterans_and_defense_affairs"
    
    # Judicial
    if any(kw in agency for kw in ["court", "judicial", "magistrate"]):
        return "judicial"
    
    # Legislative
    if any(kw in agency for kw in ["general assembly", "legislative"]):
        return "legislative"
    
    # Default
    return "independent_agencies"

# ============================================================================
# PDF Parsing Logic
# ============================================================================

def parse_currency(text: str) -> float:
    """Parse currency string to float (e.g., '$1,234,567' -> 1234567.0)"""
    if not text or not isinstance(text, str):
        return 0.0

    # Remove $, commas, and whitespace
    cleaned = text.strip().replace('$', '').replace(',', '').replace(' ', '')

    # Handle empty or dash
    if not cleaned or cleaned == '-' or cleaned.lower() == 'n/a':
        return 0.0

    # Handle parentheses for negative numbers
    if '(' in cleaned and ')' in cleaned:
        cleaned = '-' + cleaned.replace('(', '').replace(')', '')

    try:
        return float(Decimal(cleaned))
    except (ValueError, Exception):
        return 0.0

def generate_amendment_id(bill_number: str, session_year: int, item_number: str, sequence: int) -> str:
    """Generate stable unique ID for amendment"""
    base = f"{bill_number}-{session_year}-member-{item_number}-{sequence:03d}"
    return base

def extract_patron_and_item(text: str) -> tuple[str, str, str]:
    """
    Extract patron name, item number, and amendment ID from text like:
    'Chief Patron: Reid Item 1 #1h'
    Returns: (patron_name, item_number, amendment_id)
    """
    patron_match = re.search(r'Chief Patron:\s*([^\s]+(?:\s+[^\s]+)*?)\s+Item\s+(\d+[A-Za-z]*)\s+#(\S+)', text)
    if patron_match:
        return patron_match.group(1).strip(), patron_match.group(2).strip(), patron_match.group(3).strip()
    return "", "", ""


def extract_dollar_amounts(text: str) -> tuple[float, float, float, float]:
    """
    Extract GF and NGF dollar amounts from text like:
    '$500,000 $500,000 GF' or '$0 $50,000 GF' or 'Language'

    Returns: (fy1_gf, fy2_gf, fy1_ngf, fy2_ngf)
    where fy1 = first year, fy2 = second year
    """
    fy1_gf = 0.0
    fy2_gf = 0.0
    fy1_ngf = 0.0
    fy2_ngf = 0.0

    # Pattern: $X $Y GF (where X is first year, Y is second year)
    gf_pattern = r'\$[\d,]+\s+\$[\d,]+\s+GF'
    gf_match = re.search(gf_pattern, text)
    if gf_match:
        amounts = re.findall(r'\$([\d,]+)', gf_match.group())
        if len(amounts) >= 2:
            fy1_gf = parse_currency(amounts[0])
            fy2_gf = parse_currency(amounts[1])
    else:
        # Try single amount pattern: $X GF
        single_gf_pattern = r'\$([\d,]+)\s+GF'
        single_gf_match = re.search(single_gf_pattern, text)
        if single_gf_match:
            # Ambiguous - could be first or second year
            # Check context for "first year" or "second year"
            amount = parse_currency(single_gf_match.group(1))
            if 'second year' in text.lower():
                fy2_gf = amount
            else:
                # Default to second year for consistency
                fy2_gf = amount

    # Pattern: $X $Y NGF (where X is first year, Y is second year)
    ngf_pattern = r'\$[\d,]+\s+\$[\d,]+\s+NGF'
    ngf_match = re.search(ngf_pattern, text)
    if ngf_match:
        amounts = re.findall(r'\$([\d,]+)', ngf_match.group())
        if len(amounts) >= 2:
            fy1_ngf = parse_currency(amounts[0])
            fy2_ngf = parse_currency(amounts[1])
    else:
        # Try single amount pattern: $X NGF
        single_ngf_pattern = r'\$([\d,]+)\s+NGF'
        single_ngf_match = re.search(single_ngf_pattern, text)
        if single_ngf_match:
            amount = parse_currency(single_ngf_match.group(1))
            if 'second year' in text.lower():
                fy2_ngf = amount
            else:
                fy2_ngf = amount

    return fy1_gf, fy2_gf, fy1_ngf, fy2_ngf


def extract_recipient_from_description(description: str) -> Tuple[Optional[str], Optional[str], Optional[float]]:
    """
    Given the full explanation/description text for an amendment, attempt to extract
    the intended funding recipient.

    Return:
        (primary_recipient_name, raw_snippet, confidence)

    STRICT RULES (v2 - tightened for accuracy):
    - ONLY accept candidates that contain at least one STRONG_ORG_KEYWORD
    - REJECT candidates that start with fragment/action phrases
    - REJECT candidates with clause glue words unless they have strong org signals
    - Confidence: 0.95 for strong org signals, 0.80 for weaker program names
    """
    if not description or not description.strip():
        return None, None, None

    # Normalize whitespace
    text = re.sub(r'\s+', ' ', description.strip())

    # STRONG organization/program keywords (REQUIRED for acceptance)
    STRONG_ORG_KEYWORDS = [
        "City", "County", "Town", "Village", "Borough",
        "School Board", "Public Schools", "School Division", "School District",
        "University", "College", "Community College", "Institute",
        "Hospital", "Clinic", "Center",
        "Authority", "Commission", "Corporation", "Foundation", "Association",
        "Department", "Agency", "Board", "Council",
        "Fund", "Trust", "Program", "Grant", "Scholarship", "Initiative"
    ]

    # STRONG high-confidence org signals (for 0.95 confidence)
    STRONG_HIGH_CONF = [
        "City", "County", "Town", "School Board", "Public Schools",
        "University", "College", "Community College",
        "Hospital", "Center", "Authority", "Commission",
        "Department", "Agency", "Board"
    ]

    # BLACKLIST: reject candidates starting with these (case-insensitive)
    START_BLACKLIST = [
        "this ", "that ", "these ", "those ", "such ",
        "the cost of ", "the cost ", "the provision of ",
        "implement ", "to implement ", "provide ", "to provide ",
        "establish ", "to establish ", "support ", "to support ",
        "fund ", "to fund ", "expand ", "to expand ",
        "improve ", "to improve ", "reduce ", "to reduce ",
        "continue ", "to continue ", "create ", "to create ",
        "enable ", "to enable ", "allow ", "to allow ",
        "assist ", "to assist ", "help ", "to help "
    ]

    # Clause glue words that indicate sentence fragments
    CLAUSE_GLUE = [" while ", " which ", " that ", " in order to "]

    # Stop phrases (where to end extraction)
    stop_phrases = [
        r'\bto support\b', r'\bto provide\b', r'\bto establish\b',
        r'\bto administer\b', r'\bto be used\b', r'\bfor the purpose of\b',
        r'\bto fund\b', r'\bto assist\b', r'\bto help\b',
        r'\bto enable\b', r'\bto allow\b', r'\bto create\b',
    ]

    # Patterns to look for: "to [the] <Recipient>" or "for [the] <Recipient>"
    intro_patterns = [
        r'\bto the\s+([A-Z][^.;]*)',
        r'\bto\s+([A-Z][^.;]*)',
        r'\bfor the\s+([A-Z][^.;]*)',
        r'\bfor\s+([A-Z][^.;]*)',
        r'\bprovides?\s+(?:funding\s+)?(?:to|for)\s+(?:the\s+)?([A-Z][^.;]*)',
    ]

    candidates = []

    for pattern in intro_patterns:
        matches = re.finditer(pattern, text, re.IGNORECASE)
        for match in matches:
            raw_candidate = match.group(1).strip()

            # Apply stop phrases to truncate
            truncated = raw_candidate
            for stop_phrase in stop_phrases:
                stop_match = re.search(stop_phrase, truncated, re.IGNORECASE)
                if stop_match:
                    truncated = truncated[:stop_match.start()].strip()
                    break

            # Also stop at sentence boundaries
            for delimiter in ['.', ';', ',']:
                if delimiter in truncated:
                    truncated = truncated.split(delimiter)[0].strip()

            # Clean up trailing punctuation and whitespace
            truncated = re.sub(r'[,;:\s]+$', '', truncated).strip()

            # Skip if too short or too long
            if len(truncated) < 3 or len(truncated) > 150:
                continue

            # STRICT FILTER A: Check if starts with blacklisted phrase
            truncated_lower = truncated.lower()
            is_blacklisted = any(truncated_lower.startswith(bl) for bl in START_BLACKLIST)
            if is_blacklisted:
                continue

            # STRICT FILTER B: Must contain at least one STRONG_ORG_KEYWORD
            has_org_keyword = any(
                re.search(r'\b' + re.escape(keyword) + r'\b', truncated, re.IGNORECASE)
                for keyword in STRONG_ORG_KEYWORDS
            )
            if not has_org_keyword:
                continue

            # STRICT FILTER C: Reject if contains clause glue AND is long/complex
            has_clause_glue = any(glue in truncated_lower for glue in CLAUSE_GLUE)
            word_count = len(truncated.split())
            if has_clause_glue and word_count > 15:
                continue

            # STRICT FILTER D: Must start with capitalized word or "the" + capitalized
            if not (truncated[0].isupper() or truncated_lower.startswith("the ")):
                continue

            # CONFIDENCE SCORING
            # Check for strong high-confidence keywords
            has_strong_signal = any(
                re.search(r'\b' + re.escape(keyword) + r'\b', truncated, re.IGNORECASE)
                for keyword in STRONG_HIGH_CONF
            )

            if has_strong_signal:
                confidence = 0.95
            else:
                confidence = 0.80

            # Store candidate with confidence
            candidates.append((truncated, match.group(0), confidence))

    # If no candidates found, return None
    if not candidates:
        return None, None, None

    # Sort by confidence (descending), then by length (prefer longer, more specific names)
    candidates.sort(key=lambda x: (x[2], len(x[0])), reverse=True)

    # Return the best candidate
    best_recipient, raw_snippet, confidence = candidates[0]

    return best_recipient, raw_snippet, confidence


def parse_member_request_pdf(pdf_path: Path, bill_number: str, chamber: str, session_year: int) -> List[Dict[str, Any]]:
    """
    Parse a Member Request PDF into amendment records

    The PDFs are in text format with patterns like:
    Chief Patron: [Name] Item [Number] #[ID]
    [Department/Agency]
    [Agency Name] $X $Y GF (or Language)
    Language: ...
    Explanation: ...
    """
    if not HAS_PDFPLUMBER:
        print(f"  ⚠ Skipping {pdf_path.name} - pdfplumber not installed")
        return []

    if not pdf_path.exists():
        print(f"  ✗ ERROR: PDF not found: {pdf_path}")
        return []

    print(f"  📄 Parsing {pdf_path.name}...")

    records = []
    sequence = 0

    try:
        with pdfplumber.open(pdf_path) as pdf:
            total_pages = len(pdf.pages)
            print(f"     Total pages: {total_pages}")

            # Extract all text from all pages
            full_text = ""
            page_map = {}  # Map character position to page number
            char_pos = 0

            for page_num, page in enumerate(pdf.pages, start=1):
                page_text = page.extract_text()
                if page_text:
                    page_start = char_pos
                    full_text += page_text + "\n"
                    char_pos += len(page_text) + 1
                    page_map[page_start] = page_num

            # Split into amendment blocks by "Chief Patron:" pattern
            amendment_pattern = r'Chief Patron:\s*([^\n]+)'
            matches = list(re.finditer(amendment_pattern, full_text))

            print(f"     Found {len(matches)} 'Chief Patron' entries")

            for idx, match in enumerate(matches):
                # Get the text block for this amendment
                start_pos = match.start()
                end_pos = matches[idx + 1].start() if idx + 1 < len(matches) else len(full_text)
                amendment_text = full_text[start_pos:end_pos]

                # Determine page number
                page_num = 1
                for pos, pnum in sorted(page_map.items(), reverse=True):
                    if start_pos >= pos:
                        page_num = pnum
                        break

                # Extract patron and item from the first line
                first_line = amendment_text.split('\n')[0]
                patron_name, item_number, amendment_id = extract_patron_and_item(first_line)

                if not patron_name and not item_number:
                    continue

                # Extract agency/department name (usually on line 2 or 3)
                lines = amendment_text.split('\n')
                agency_name = ""
                department_name = ""

                # Look for department/agency in first few lines
                fy1_gf, fy2_gf, fy1_ngf, fy2_ngf = 0.0, 0.0, 0.0, 0.0
                amounts_found = False

                for line_idx in range(1, min(5, len(lines))):
                    line = lines[line_idx].strip()
                    if not line or line.startswith('Language:') or line.startswith('Explanation:'):
                        continue
                    # Check if line contains dollar amounts or "Language" keyword
                    if '$' in line or line == 'Language':
                        # Previous line might be agency, this line has amounts
                        if line_idx > 1:
                            agency_name = lines[line_idx - 1].strip()
                        # Extract dollar amounts from this line
                        fy1_gf, fy2_gf, fy1_ngf, fy2_ngf = extract_dollar_amounts(line)
                        amounts_found = True
                        break
                    elif 'Department' in line or 'FY' in line:
                        department_name = line
                    elif not agency_name and line and len(line) > 3:
                        # Potential agency name
                        agency_name = line

                # If we didn't find amounts yet, look for them in the full text
                if not amounts_found:
                    fy1_gf, fy2_gf, fy1_ngf, fy2_ngf = extract_dollar_amounts(amendment_text)

                # Extract explanation text
                explanation_match = re.search(r'Explanation:\s*\(([^)]+)\)', amendment_text, re.DOTALL)
                explanation = explanation_match.group(1).strip() if explanation_match else ""

                # Compute derived fields
                # We track second-year amounts only
                delta_gf = fy2_gf
                delta_ngf = fy2_ngf
                net_amount = delta_gf + delta_ngf

                # isLanguageOnly = true ONLY if there's no funding in ANY year
                # If there's first-year funding but no second-year, it's NOT language-only
                total_fy1 = fy1_gf + fy1_ngf
                total_fy2 = fy2_gf + fy2_ngf
                is_language_only = (total_fy1 == 0 and total_fy2 == 0)

                is_increase = net_amount > 0

                # Map to spending category
                spending_category_id = map_to_spending_category(agency_name or department_name)

                # Extract funding recipient from explanation
                primary_recipient_name, recipient_raw_text, recipient_confidence = extract_recipient_from_description(
                    explanation
                )

                # Generate unique ID
                sequence += 1
                record_id = generate_amendment_id(bill_number, session_year, item_number or f"unknown-{sequence}", sequence)

                # Build record
                record = {
                    "id": record_id,
                    "stage": "member_request",
                    "billNumber": bill_number,
                    "sessionYear": session_year,
                    "chamber": chamber,

                    "patronName": patron_name,
                    "patronLISId": None,
                    "legislatorId": None,
                    "districtCode": None,

                    "itemNumber": item_number,
                    "subItem": None,
                    "agencyCode": None,
                    "agencyName": agency_name if agency_name else None,

                    "secretariatCode": None,
                    "spendingCategoryId": spending_category_id,

                    "fiscalYear": None,
                    "deltaGF": delta_gf,
                    "deltaNGF": delta_ngf,
                    "netAmount": net_amount,

                    "isIncrease": is_increase,
                    "isLanguageOnly": is_language_only,

                    "descriptionShort": explanation[:140] if explanation else "",
                    "descriptionFull": explanation,

                    "primaryRecipientName": primary_recipient_name,
                    "recipientRawText": recipient_raw_text,
                    "recipientConfidence": recipient_confidence,

                    "sourcePdfPath": str(pdf_path.relative_to(REPO_ROOT)),
                    "sourcePage": page_num,
                    "sourceLineHint": patron_name if patron_name else item_number,

                    "createdAt": datetime.now().astimezone().isoformat(),
                    "updatedAt": None,
                }

                records.append(record)

            print(f"     ✓ Extracted {len(records)} amendments")

    except Exception as e:
        print(f"     ✗ ERROR parsing {pdf_path.name}: {e}")
        import traceback
        traceback.print_exc()

    return records

# ============================================================================
# Main Execution
# ============================================================================

def print_statistics(records: List[Dict[str, Any]], indent: str = ""):
    """Print summary statistics about parsed records"""
    if not records:
        return

    from collections import Counter

    # Count by bill
    bill_counts = Counter(r['billNumber'] for r in records)

    # Count by patron (top 10)
    patron_counts = Counter(r['patronName'] for r in records if r['patronName'])

    # Count by category
    category_counts = Counter(r['spendingCategoryId'] for r in records)

    # Dollar totals
    total_gf = sum(r['deltaGF'] for r in records)
    total_ngf = sum(r['deltaNGF'] for r in records)
    total_net = sum(r['netAmount'] for r in records)

    # Language-only count
    language_only_count = sum(1 for r in records if r['isLanguageOnly'])

    print(f"{indent}📊 Total Records: {len(records)}")
    print()

    print(f"{indent}By Bill:")
    for bill, count in sorted(bill_counts.items()):
        print(f"{indent}  • {bill}: {count} amendments")
    print()

    print(f"{indent}Top 10 Patrons:")
    for patron, count in patron_counts.most_common(10):
        print(f"{indent}  • {patron}: {count} amendments")
    print()

    print(f"{indent}By Spending Category:")
    for category, count in sorted(category_counts.items(), key=lambda x: x[1], reverse=True):
        print(f"{indent}  • {category}: {count} amendments")
    print()

    print(f"{indent}Dollar Totals:")
    print(f"{indent}  • General Fund (GF):     ${total_gf:,.0f}")
    print(f"{indent}  • Non-General Fund (NGF): ${total_ngf:,.0f}")
    print(f"{indent}  • Net Total:              ${total_net:,.0f}")
    print()

    print(f"{indent}Language-Only Amendments: {language_only_count}")


def main():
    """Main entry point"""
    print("=" * 80)
    print("Amendment Vault - Member Request PDF Parser")
    print("=" * 80)
    print()

    # Check for pdfplumber
    if not HAS_PDFPLUMBER:
        print("✗ ERROR: pdfplumber is required but not installed")
        print()
        print("Install with:")
        print("  pip install pdfplumber")
        print("  OR")
        print("  pip install -r scripts/amendment_vault/requirements.txt")
        print()
        return 1

    # Check PDF directory exists
    if not PDF_DIR.exists():
        print(f"✗ ERROR: PDF directory not found: {PDF_DIR}")
        return 1

    # Ensure output directory exists
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    print("Discovering PDFs...")
    print()

    # Discover all PDFs
    discovered_pdfs = discover_pdfs()

    if not discovered_pdfs:
        print("✗ ERROR: No Member Request PDFs found")
        return 1

    print()
    print("Parsing PDFs...")
    print()

    # Group records by session year
    records_by_year = {}

    # Parse each discovered PDF
    for pdf_path, bill_number, chamber, session_year in discovered_pdfs:
        print(f"  Processing {bill_number} ({session_year})...")
        records = parse_member_request_pdf(pdf_path, bill_number, chamber, session_year)

        if session_year not in records_by_year:
            records_by_year[session_year] = []
        records_by_year[session_year].extend(records)

        print(f"    ✓ Parsed {len(records)} amendments")
        print()

    # Write separate JSON files per session year
    print("=" * 80)
    print("Writing output files...")
    print("=" * 80)
    print()

    for session_year, records in sorted(records_by_year.items()):
        print(f"Session {session_year}: {len(records)} amendments")

        # Write JSON output
        json_path = OUTPUT_DIR / f"member_requests_{session_year}.json"
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(records, f, indent=2, ensure_ascii=False)
        print(f"  ✓ JSON: {json_path}")

        # Write CSV output (optional, for inspection)
        if records:
            csv_path = OUTPUT_DIR / f"member_requests_{session_year}.csv"
            fieldnames = list(records[0].keys())
            with open(csv_path, 'w', newline='', encoding='utf-8') as f:
                writer = csv.DictWriter(f, fieldnames=fieldnames)
                writer.writeheader()
                writer.writerows(records)
            print(f"  ✓ CSV: {csv_path}")

        # Print statistics for this year
        print()
        print(f"  Statistics for {session_year}:")
        print("  " + "-" * 76)
        print_statistics(records, indent="  ")
        print()

    print("=" * 80)
    print("✅ PARSING COMPLETE")
    print("=" * 80)
    print()
    print("Summary:")
    for session_year, records in sorted(records_by_year.items()):
        print(f"  • {session_year}: {len(records)} amendments")
    print()
    print("Next steps:")
    print("1. Review the JSON outputs to verify data quality")
    print("2. Copy JSON files to frontend/src/data/amendments/")
    print("3. Update frontend aggregation to support multi-year data")
    print("4. Test the legislator pie chart with combined data")
    print()

    return 0

if __name__ == "__main__":
    import sys
    try:
        exit_code = main()
        sys.exit(exit_code or 0)
    except KeyboardInterrupt:
        print("\n\n⚠ Interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n✗ FATAL ERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


