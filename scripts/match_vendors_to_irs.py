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

def get_entity_type(name: str) -> Optional[str]:
    """
    Extract legal entity type from organization name.

    Returns:
        'foundation' if name contains FOUNDATION
        'insurance' if name contains INSURANCE
        'inc' if name contains INC/INCORPORATED
        'llc' if name contains LLC
        'corp' if name contains CORP/CORPORATION
        None if no clear entity type
    """
    name_upper = name.upper()

    # Check for foundation (nonprofits) - must be exact word
    if re.search(r'\bFOUNDATION\b', name_upper):
        return 'foundation'

    # Check for insurance company (for-profit)
    if re.search(r'\bINSURANCE\b', name_upper):
        return 'insurance'

    # Check for LLC
    if re.search(r'\bL\.?L\.?C\.?\b', name_upper):
        return 'llc'

    # Check for Corp
    if re.search(r'\bCORP(ORATION)?\b', name_upper):
        return 'corp'

    # Check for Inc (but not if it's part of "INC" in "INCORPORATED")
    if re.search(r'\bINC\b', name_upper) and 'FOUNDATION' not in name_upper:
        return 'inc'

    return None

def has_significant_name_overlap(vendor_name: str, irs_name: str) -> bool:
    """
    Check if vendor and IRS names have significant word overlap.

    This prevents matching completely unrelated organizations.
    For example: "Nestle USA INC" should NOT match "WINDLE USA"
    """
    # Normalize and get words
    vendor_words = set(normalize_name(vendor_name).split())
    irs_words = set(normalize_name(irs_name).split())

    # Remove very common words that don't indicate identity
    # Including geographic/generic terms like USA, VIRGINIA, WASHINGTON, etc.
    common_words = {
        'OF', 'THE', 'AND', 'FOR', 'IN', 'A', 'AN', 'AT',
        'USA', 'US', 'VIRGINIA', 'VA', 'AMERICA', 'AMERICAN',
        'WASHINGTON', 'DC', 'D', 'C',  # Washington DC variations
        'ALLIANCE', 'FOUNDATION', 'FUND', 'CENTER', 'CENTRE',  # Generic org words
    }
    vendor_words = {w for w in vendor_words if w not in common_words and len(w) >= 3}
    irs_words = {w for w in irs_words if w not in common_words and len(w) >= 3}

    if not vendor_words or not irs_words:
        return False

    # Calculate overlap
    common = vendor_words.intersection(irs_words)

    # Require at least 60% overlap of the smaller set (increased from 50%)
    # This is stricter to avoid false positives
    smaller_set_size = min(len(vendor_words), len(irs_words))
    overlap_ratio = len(common) / smaller_set_size if smaller_set_size > 0 else 0

    return overlap_ratio >= 0.6

def is_valid_entity_match(vendor_name: str, irs_name: str) -> bool:
    """
    Check if vendor and IRS entity types are compatible.

    Prevents matching for-profit companies to nonprofit foundations.
    For example: "Nestle USA INC" should NOT match "NESTLE USA FOUNDATION"
    """
    # First check if names have significant overlap
    if not has_significant_name_overlap(vendor_name, irs_name):
        return False

    vendor_type = get_entity_type(vendor_name)
    irs_type = get_entity_type(irs_name)

    # If neither has a clear entity type, allow the match
    if vendor_type is None and irs_type is None:
        return True

    # If only one has an entity type, allow the match
    # (e.g., "Big Brothers Big Sisters" vs "Big Brothers Big Sisters Foundation")
    if vendor_type is None or irs_type is None:
        return True

    # If both have entity types, they must match
    # Exception: 'inc' and 'foundation' can both be nonprofits if the base name matches
    # (e.g., "Historic Fredericksburg Foundation Inc" is a foundation that's incorporated)
    if vendor_type == irs_type:
        return True

    # Allow foundation + inc combination (foundations can be incorporated)
    if (vendor_type == 'foundation' and irs_type == 'inc') or \
       (vendor_type == 'inc' and irs_type == 'foundation'):
        # Only if BOTH names contain "foundation"
        if 'FOUNDATION' in vendor_name.upper() and 'FOUNDATION' in irs_name.upper():
            return True

    # Otherwise, entity types must match
    return False

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
        # Validate entity type compatibility
        if not is_valid_entity_match(vendor_name, match['name']):
            return None
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

        # Validate entity type compatibility BEFORE scoring
        if not is_valid_entity_match(vendor_name, nonprofit['name']):
            continue

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

