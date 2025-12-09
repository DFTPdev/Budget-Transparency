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

    # Remove common prefixes and suffixes that don't affect identity
    # Based on client feedback: these variations should match
    prefixes_suffixes = [
        r'\bTHE TRUSTEES OF\b',
        r'\bTRUSTEES OF\b',
        r'\bBOARD OF\b',
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
        r'\bFOUNDATION\b',
        r'\bFDN\b',
    ]

    for pattern in prefixes_suffixes:
        normalized = re.sub(pattern, '', normalized)

    # Normalize common word variations
    # College <-> University, National <-> Natl, etc.
    word_replacements = {
        r'\bUNIVERSITY\b': 'COLLEGE',
        r'\bCOLLEGE\b': 'COLLEGE',
        r'\bNATIONAL\b': 'NATL',
        r'\bNATL\b': 'NATL',
        r'\bCAPITAL\b': 'CAP',
        r'\bCAP\b': 'CAP',
        r'\bSOUTHEASTERN\b': 'SE',
        r'\bSOUTHEAST\b': 'SE',
        r'\bNORTHEASTERN\b': 'NE',
        r'\bNORTHEAST\b': 'NE',
        r'\bSOUTHWESTERN\b': 'SW',
        r'\bSOUTHWEST\b': 'SW',
        r'\bNORTHWESTERN\b': 'NW',
        r'\bNORTHWEST\b': 'NW',
    }

    for pattern, replacement in word_replacements.items():
        normalized = re.sub(pattern, replacement, normalized)

    # Remove punctuation except spaces
    normalized = re.sub(r'[^\w\s]', ' ', normalized)

    # Remove extra whitespace
    normalized = re.sub(r'\s+', ' ', normalized).strip()

    return normalized

def calculate_similarity(str1: str, str2: str) -> float:
    """Calculate similarity ratio between two strings."""
    return SequenceMatcher(None, str1, str2).ratio()

def calculate_partial_similarity(str1: str, str2: str) -> float:
    """
    Calculate partial similarity - checks if one string is contained in the other.
    This handles cases like:
    - "Senior Connections" vs "Senior Connections The Capital Area Agency On Aging"
    - "Institute for Advanced Learning and" vs "Institute for Advanced Learning and Research Foundation"
    """
    words1 = set(str1.split())
    words2 = set(str2.split())

    # If one is empty, no match
    if not words1 or not words2:
        return 0.0

    # Calculate word overlap
    common_words = words1.intersection(words2)

    # Percentage of smaller set that overlaps
    smaller_set_size = min(len(words1), len(words2))
    if smaller_set_size == 0:
        return 0.0

    overlap_ratio = len(common_words) / smaller_set_size

    # Also check if shorter string is substring of longer
    if str1 in str2 or str2 in str1:
        overlap_ratio = max(overlap_ratio, 0.9)  # Boost score for substring matches

    return overlap_ratio

def find_best_match(vendor_name: str, irs_index: Dict, irs_nonprofits: List[Dict], threshold: float = 0.70) -> Optional[Dict]:
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

    # For fuzzy matching, check nonprofits with overlapping words
    # This dramatically reduces search space while being more flexible
    vendor_words = normalized_vendor.split()
    if not vendor_words:
        return None

    # Get significant words (3+ chars) for better filtering
    significant_words = [w for w in vendor_words if len(w) >= 3]
    if not significant_words:
        significant_words = vendor_words

    # Filter candidates: must share at least one significant word
    candidates = []
    for nonprofit in irs_nonprofits:
        irs_name = nonprofit['normalized_name']
        irs_words = set(irs_name.split())

        # Check if any significant word overlaps
        if any(word in irs_words for word in significant_words):
            candidates.append(nonprofit)

    # If too many candidates, use only first word filter
    if len(candidates) > 1000:
        first_word = vendor_words[0]
        candidates = [np for np in irs_nonprofits
                     if first_word in np['normalized_name']]

    # If still too many, skip
    if len(candidates) > 1000:
        return None

    # Fuzzy match against candidates using BOTH methods
    best_match = None
    best_score = 0.0
    best_method = None

    for nonprofit in candidates:
        normalized_irs = nonprofit['normalized_name']

        # Method 1: Full string similarity (good for close matches)
        full_score = calculate_similarity(normalized_vendor, normalized_irs)

        # Method 2: Partial/word overlap similarity (good for truncated/extra words)
        partial_score = calculate_partial_similarity(normalized_vendor, normalized_irs)

        # Take the better of the two scores
        score = max(full_score, partial_score)

        if score > best_score:
            best_score = score
            best_match = nonprofit
            best_method = 'full' if full_score > partial_score else 'partial'

    # Only return if score meets threshold
    if best_score >= threshold:
        return {
            **best_match,
            'match_score': round(best_score, 3),
            'match_method': best_method
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
            # Try fuzzy match with optimized search (lowered threshold to 0.70)
            best_match = find_best_match(vendor_name, irs_index, irs_nonprofits, threshold=0.70)
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

