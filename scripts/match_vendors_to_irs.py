#!/usr/bin/env python3
"""
Match CARDINAL vendor names to IRS nonprofit database.

This script:
1. Loads CARDINAL transfer payment vendors
2. Loads IRS 501(c)(3) nonprofit database
3. Performs fuzzy matching to identify verified nonprofits
4. Outputs matched results for frontend integration
"""

import csv
import gzip
import json
import re
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from difflib import SequenceMatcher

# Paths
BASE_DIR = Path(__file__).parent.parent
CARDINAL_FILE = BASE_DIR / "frontend" / "public" / "decoder" / "transfer_payments_full.csv.gz"
IRS_FILE = BASE_DIR / "frontend" / "public" / "data" / "irs_nonprofits_va.json"
OUTPUT_FILE = BASE_DIR / "frontend" / "public" / "data" / "vendor_irs_matches.json"

def normalize_name(name: str) -> str:
    """Normalize organization name for matching."""
    if not name:
        return ""
    
    normalized = name.upper()
    
    # Remove common legal suffixes
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
        r'\bTHE\b',
    ]
    
    for suffix in suffixes:
        normalized = re.sub(suffix, '', normalized)
    
    # Remove punctuation except spaces
    normalized = re.sub(r'[^\w\s]', ' ', normalized)
    
    # Remove extra whitespace
    normalized = re.sub(r'\s+', ' ', normalized).strip()
    
    return normalized

def calculate_similarity(str1: str, str2: str) -> float:
    """Calculate similarity ratio between two strings."""
    return SequenceMatcher(None, str1, str2).ratio()

def find_best_match(vendor_name: str, irs_index: Dict, irs_nonprofits: List[Dict], threshold: float = 0.85) -> Optional[Dict]:
    """
    Find best IRS nonprofit match for a vendor name using optimized search.

    Args:
        vendor_name: CARDINAL vendor name
        irs_index: Dictionary mapping normalized names to nonprofit records
        irs_nonprofits: List of IRS nonprofit records (for fuzzy fallback)
        threshold: Minimum similarity score (0.0 to 1.0)

    Returns:
        Best matching nonprofit record or None
    """
    normalized_vendor = normalize_name(vendor_name)

    if not normalized_vendor:
        return None

    # Try exact match first
    if normalized_vendor in irs_index:
        match = irs_index[normalized_vendor][0]
        return {
            **match,
            'match_score': 1.0
        }

    # For fuzzy matching, only check nonprofits with similar first words
    # This dramatically reduces search space
    vendor_words = normalized_vendor.split()
    if not vendor_words:
        return None

    first_word = vendor_words[0]

    # Filter candidates: must start with same first word or contain it
    candidates = []
    for nonprofit in irs_nonprofits:
        irs_name = nonprofit['normalized_name']
        if first_word in irs_name or irs_name.split()[0] == first_word if irs_name.split() else False:
            candidates.append(nonprofit)

    # If too many candidates, skip fuzzy matching (likely common word)
    if len(candidates) > 500:
        return None

    # Fuzzy match against candidates only
    best_match = None
    best_score = 0.0

    for nonprofit in candidates:
        normalized_irs = nonprofit['normalized_name']
        score = calculate_similarity(normalized_vendor, normalized_irs)

        if score > best_score:
            best_score = score
            best_match = nonprofit

    # Only return if score meets threshold
    if best_score >= threshold:
        return {
            **best_match,
            'match_score': round(best_score, 3)
        }

    return None

def match_vendors():
    """Match CARDINAL vendors to IRS nonprofits."""
    
    print("=" * 80)
    print("MATCHING CARDINAL VENDORS TO IRS NONPROFITS")
    print("=" * 80)
    
    # Load IRS nonprofits
    print("📂 Loading IRS nonprofit database...")
    with open(IRS_FILE, 'r', encoding='utf-8') as f:
        irs_nonprofits = json.load(f)
    print(f"✅ Loaded {len(irs_nonprofits):,} IRS 501(c)(3) nonprofits")
    
    # Create lookup index by normalized name for faster matching
    print("🔍 Creating search index...")
    irs_index = {}
    for nonprofit in irs_nonprofits:
        normalized = nonprofit['normalized_name']
        if normalized not in irs_index:
            irs_index[normalized] = []
        irs_index[normalized].append(nonprofit)
    
    # Load CARDINAL vendors
    print("📂 Loading CARDINAL vendor data...")
    vendors = set()
    with gzip.open(CARDINAL_FILE, 'rt', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            vendor_name = row.get('vendor_name', '').strip()
            if vendor_name:
                vendors.add(vendor_name)
    
    print(f"✅ Found {len(vendors):,} unique CARDINAL vendors")
    
    # Match vendors to IRS nonprofits
    print("\n🔗 Matching vendors to IRS nonprofits...")
    matches = {}
    exact_matches = 0
    fuzzy_matches = 0
    no_matches = 0
    
    for i, vendor_name in enumerate(sorted(vendors), 1):
        if i % 500 == 0:
            print(f"   Processed {i:,} / {len(vendors):,} vendors... (Exact: {exact_matches}, Fuzzy: {fuzzy_matches}, None: {no_matches})")

        normalized_vendor = normalize_name(vendor_name)

        # Try exact match first
        if normalized_vendor in irs_index:
            # Exact match found
            irs_match = irs_index[normalized_vendor][0]  # Take first if multiple
            matches[vendor_name] = {
                **irs_match,
                'match_score': 1.0,
                'match_type': 'exact'
            }
            exact_matches += 1
        else:
            # Try fuzzy match with optimized search
            best_match = find_best_match(vendor_name, irs_index, irs_nonprofits, threshold=0.85)
            if best_match:
                matches[vendor_name] = {
                    **best_match,
                    'match_type': 'fuzzy'
                }
                fuzzy_matches += 1
            else:
                no_matches += 1
    
    print(f"\n✅ Matching complete!")
    print(f"   Exact matches: {exact_matches:,}")
    print(f"   Fuzzy matches: {fuzzy_matches:,}")
    print(f"   No matches: {no_matches:,}")
    print(f"   Total matched: {len(matches):,} / {len(vendors):,} ({len(matches)/len(vendors)*100:.1f}%)")
    
    # Save matches
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(matches, f, indent=2)
    
    print(f"\n✅ Saved matches to: {OUTPUT_FILE}")
    print(f"   File size: {OUTPUT_FILE.stat().st_size / 1024 / 1024:.2f} MB")
    
    return matches

if __name__ == '__main__':
    matches = match_vendors()

