#!/usr/bin/env python3
"""
Budget Decoder Join Pipeline
Maps Virginia Chapter 725 appropriations (DPB Warehouse) to actual recipient-level 
expenditures (Commonwealth Data Point/CARDINAL exports).

Author: DFTP/StateBudgetX Team
Date: 2025-11-24
"""

import os
import re
import json
import pandas as pd
from pathlib import Path
from typing import Dict, List, Tuple
from datetime import datetime
from rapidfuzz import fuzz

# ============================================================================
# CONFIGURATION
# ============================================================================

# Source data paths
BASE_DIR = Path("/Users/secretservice/Documents/Budget Decoder Datasets")
APPROPRIATIONS_FILE = BASE_DIR / "appropriationsdata.csv"
EXPENDITURES_FY25_DIR = BASE_DIR / "All Expenditures for Fiscal Year 2025"
EXPENDITURES_FY26_DIR = BASE_DIR / "All Expenditures for Fiscal Year 2026"

# Configuration files
SCRIPT_DIR = Path(__file__).parent
EXPECTED_UNMATCHED_CONFIG = SCRIPT_DIR / "expected_unmatched_categories.json"
PLACEHOLDER_CONFIG = SCRIPT_DIR / "placeholder_categories.json"
PROGRAM_ALIASES_CONFIG = SCRIPT_DIR / "program_aliases.json"
DPB_PROGRAM_FLAGS_CONFIG = SCRIPT_DIR / "dpb_program_flags.json"

# Output paths
OUTPUT_DIR = BASE_DIR / "decoder_outputs"
UNMATCHED_DIR = OUTPUT_DIR / "unmatched_reports"

# Fuzzy match threshold
FUZZY_THRESHOLD = 0.88

# Internal recipient patterns (state agencies and internal service providers)
INTERNAL_VENDOR_PATTERNS = [
    "virginia information technologies agency",
    "vita",
    "department of",
    "dept of",
    "university of",
    "commonwealth of virginia",
    "treasury",
    "state treasurer",
    "division of",
    "office of",
    "virginia state",
    "board of",
    "commission on",
    "council on",
    "authority of virginia",
    "virginia community college",
    "vccs",
    "secretary of",
    "secretariat",
    "virginia employment commission",
    "vec",
    "department for",
    "dept for",
    "virginia retirement system",
    "vrs",
    "virginia port authority",
    "virginia housing",
    "virginia college",
    "virginia tech",
    "vcu",
    "virginia commonwealth university",
    "uva",
    "university of virginia",
    "william and mary",
    "college of william",
    "virginia military institute",
    "vmi",
    "norfolk state",
    "virginia state university",
    "radford university",
    "old dominion",
    "george mason",
    "james madison",
    "longwood university",
    "christopher newport",
    "mary washington",
]

# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

def classify_recipient_type(vendor_name: str) -> str:
    """
    Classify vendor as 'internal' (state agency/service) or 'external'.

    Args:
        vendor_name: Vendor name to classify

    Returns:
        'internal' or 'external'
    """
    if pd.isna(vendor_name) or not vendor_name:
        return 'external'

    vendor_lower = str(vendor_name).lower()

    # Check against internal patterns
    for pattern in INTERNAL_VENDOR_PATTERNS:
        if pattern in vendor_lower:
            return 'internal'

    return 'external'


def classify_spending_category(branch_name: str, secretariat_name: str, agency_name: str) -> str:
    """
    Classify expenditure into spending category using Virginia's official budget structure.

    Uses BRANCH_NAME and SECRETARIAT_NAME from CARDINAL data for accurate classification.
    This aligns with Virginia's official budget taxonomy (Executive, Judicial, Independent, Legislative).

    Args:
        branch_name: Branch from CARDINAL (EXECUTIVE, JUDICIAL, INDEPENDENT, LEGISLATIVE)
        secretariat_name: Secretariat from CARDINAL (e.g., "EDUCATION", "INDEPENDENT AGENCIES")
        agency_name: Agency name for additional context

    Returns:
        Spending category ID (e.g., 'independent_agencies', 'judicial', 'k12_education')
    """
    branch = str(branch_name).strip().upper() if pd.notna(branch_name) else ''
    secretariat = str(secretariat_name).strip().upper() if pd.notna(secretariat_name) else ''
    agency = str(agency_name).strip().lower() if pd.notna(agency_name) else ''

    # ===== BRANCH-BASED CLASSIFICATION (Most Reliable) =====

    # Independent Branch → independent_agencies
    if branch == 'INDEPENDENT' or secretariat == 'INDEPENDENT AGENCIES':
        return 'independent_agencies'

    # Judicial Branch → judicial
    if branch == 'JUDICIAL':
        return 'judicial'

    # Legislative Branch → legislative
    if branch == 'LEGISLATIVE':
        return 'legislative'

    # ===== EXECUTIVE BRANCH - Use Secretariat Mapping =====

    # Education (distinguish K-12 vs Higher Ed)
    if 'EDUCATION' in secretariat:
        # Check agency name for higher ed indicators
        if any(keyword in agency for keyword in ['higher', 'college', 'university', 'schev']):
            return 'higher_education'
        return 'k12_education'

    # Health & Human Resources
    if 'HEALTH' in secretariat or 'HUMAN' in secretariat:
        return 'health_and_human_resources'

    # Public Safety & Homeland Security
    if 'PUBLIC SAFETY' in secretariat or 'HOMELAND' in secretariat:
        return 'public_safety_and_homeland_security'

    # Transportation
    if 'TRANSPORTATION' in secretariat:
        return 'transportation'

    # Natural Resources
    if 'NATURAL' in secretariat or 'ENVIRONMENT' in secretariat or 'HISTORIC' in secretariat:
        return 'natural_resources'

    # Commerce & Trade
    if 'COMMERCE' in secretariat or 'TRADE' in secretariat:
        return 'commerce_and_trade'

    # Agriculture & Forestry
    if 'AGRICULTURE' in secretariat or 'FORESTRY' in secretariat:
        return 'agriculture_and_forestry'

    # Veterans & Defense Affairs
    if 'VETERAN' in secretariat or 'DEFENSE' in secretariat:
        return 'veterans_and_defense_affairs'

    # Administration
    if 'ADMINISTRATION' in secretariat:
        return 'administration'

    # Finance
    if 'FINANCE' in secretariat:
        return 'finance'

    # Labor (map to Commerce & Trade)
    if 'LABOR' in secretariat:
        return 'commerce_and_trade'

    # Central Appropriations (catch VRS, employee benefits, etc.)
    if any(keyword in agency for keyword in ['retirement system', 'vrs', 'employee benefit']):
        return 'central_appropriations'

    # ===== AGENCY-BASED FALLBACK (for missing secretariat data) =====

    # K-12 Education
    if any(keyword in agency for keyword in ['department of education', 'public education', 'k-12', 'k12']):
        return 'k12_education'

    # Higher Education
    if any(keyword in agency for keyword in ['college', 'university', 'higher education']):
        return 'higher_education'

    # Health
    if any(keyword in agency for keyword in ['health', 'medicaid', 'dmas', 'behavioral health']):
        return 'health_and_human_resources'

    # Public Safety
    if any(keyword in agency for keyword in ['police', 'corrections', 'criminal justice', 'emergency']):
        return 'public_safety_and_homeland_security'

    # Transportation
    if any(keyword in agency for keyword in ['transportation', 'vdot', 'highway', 'dmv']):
        return 'transportation'

    # Natural Resources
    if any(keyword in agency for keyword in ['conservation', 'wildlife', 'marine', 'parks', 'deq', 'dcr']):
        return 'natural_resources'

    # Agriculture
    if any(keyword in agency for keyword in ['agriculture', 'farming', 'vdacs']):
        return 'agriculture_and_forestry'

    # Veterans
    if any(keyword in agency for keyword in ['veteran', 'military', 'defense']):
        return 'veterans_and_defense_affairs'

    # Courts/Judicial (shouldn't happen if branch is set correctly)
    if any(keyword in agency for keyword in ['court', 'judicial', 'magistrate']):
        return 'judicial'

    # General Assembly (shouldn't happen if branch is set correctly)
    if any(keyword in agency for keyword in ['general assembly', 'house of delegates', 'senate of virginia']):
        return 'legislative'

    # Default: administration (for Executive branch agencies without clear category)
    return 'administration'


def load_json_config(config_path: Path) -> dict:
    """Load JSON configuration file if it exists."""
    if config_path.exists():
        with open(config_path, 'r') as f:
            return json.load(f)
    return {}


def is_placeholder_expenditure(row: pd.Series, placeholder_config: dict) -> bool:
    """
    Determine if an expenditure is an accounting placeholder.

    Args:
        row: Expenditure row
        placeholder_config: Loaded placeholder configuration

    Returns:
        True if placeholder, False otherwise
    """
    if not placeholder_config:
        return False

    vendor = str(row.get('vendor_name', '')).strip()
    agency = str(row.get('agency_name', '')).strip()
    category = str(row.get('category_name', '')).strip()
    expense_type = str(row.get('expense_type', '')).strip()
    category_expense = f"{category} / {expense_type}"

    # Check vendor patterns
    for pattern in placeholder_config.get('placeholder_vendors', []):
        if pattern.upper() in vendor.upper():
            return True

    # Check agency patterns
    for pattern in placeholder_config.get('placeholder_agencies', []):
        if pattern.upper() in agency.upper():
            return True

    # Check category/expense patterns
    for pattern in placeholder_config.get('placeholder_category_expense_patterns', []):
        if pattern.upper() in category_expense.upper():
            return True

    return False


def is_expected_unmatched(row: pd.Series, expected_config: dict) -> bool:
    """
    Determine if an expenditure is expected to be unmatched.

    Args:
        row: Expenditure row
        expected_config: Loaded expected unmatched configuration

    Returns:
        True if expected unmatched, False otherwise
    """
    if not expected_config:
        return False

    vendor = str(row.get('vendor_name', '')).strip()
    agency = str(row.get('agency_name', '')).strip()
    category = str(row.get('category_name', '')).strip()
    expense_type = str(row.get('expense_type', '')).strip()
    category_expense = f"{category} / {expense_type}"

    # Check all categories
    for cat in expected_config.get('categories', []):
        # Check vendor patterns
        for pattern in cat.get('vendor_patterns', []):
            if pattern.upper() in vendor.upper():
                return True

        # Check agency patterns
        for pattern in cat.get('agency_patterns', []):
            if pattern.upper() in agency.upper():
                return True

        # Check category/expense patterns
        for pattern in cat.get('category_expense_patterns', []):
            if pattern.upper() in category_expense.upper():
                return True

    return False


def flag_dpb_program(row: pd.Series, dpb_flags_config: dict) -> dict:
    """
    Determine DPB program flags (pass-through, adjustment, internal finance).

    Args:
        row: DPB program row
        dpb_flags_config: Loaded DPB program flags configuration

    Returns:
        Dictionary with boolean flags
    """
    flags = {
        'dpb_is_pass_through': False,
        'dpb_is_adjustment': False,
        'dpb_is_internal_finance': False
    }

    if not dpb_flags_config:
        return flags

    agency = str(row.get('agency_name', '')).strip()
    program = str(row.get('program_name', '')).strip()
    appropriation = float(row.get('appropriated_amount', 0))

    program_flags = dpb_flags_config.get('program_flags', {})

    # Check pass-through programs
    for pattern_group in program_flags.get('pass_through_programs', {}).get('patterns', []):
        agency_pattern = pattern_group.get('agency_pattern', '')
        if agency_pattern.upper() in agency.upper():
            for prog_pattern in pattern_group.get('program_patterns', []):
                if prog_pattern.upper() in program.upper():
                    flags['dpb_is_pass_through'] = True
                    break

    # Check adjustment programs
    for pattern_group in program_flags.get('adjustment_programs', {}).get('patterns', []):
        agency_pattern = pattern_group.get('agency_pattern', '')
        if agency_pattern.upper() in agency.upper():
            for prog_pattern in pattern_group.get('program_patterns', []):
                if prog_pattern.upper() in program.upper():
                    flags['dpb_is_adjustment'] = True
                    break

    # Check for zero/negative appropriations
    adj_conditions = program_flags.get('adjustment_programs', {}).get('appropriation_conditions', {})
    if adj_conditions.get('negative_appropriation') and appropriation < 0:
        flags['dpb_is_adjustment'] = True
    if adj_conditions.get('zero_appropriation') and abs(appropriation) < program_flags.get('zero_spend_programs', {}).get('appropriation_threshold', 1000):
        flags['dpb_is_adjustment'] = True

    # Check internal finance programs
    for pattern_group in program_flags.get('internal_finance_programs', {}).get('patterns', []):
        agency_pattern = pattern_group.get('agency_pattern', '')
        if agency_pattern.upper() in agency.upper():
            for prog_pattern in pattern_group.get('program_patterns', []):
                if prog_pattern.upper() in program.upper():
                    flags['dpb_is_internal_finance'] = True
                    break

    return flags


def normalize_text(text: str) -> str:
    """
    Normalize entity names for matching.
    - Lowercase
    - Remove punctuation
    - Collapse whitespace
    - Apply synonym rules
    """
    if pd.isna(text) or text is None:
        return ""

    text = str(text).lower().strip()

    # Remove leading "the"
    text = re.sub(r'^the\s+', '', text)

    # Synonym replacements (expanded set)
    text = text.replace('dept', 'department')
    text = text.replace('&', 'and')
    text = text.replace('svcs', 'services')
    text = text.replace('svc', 'service')
    text = text.replace('asst', 'assistance')
    text = text.replace('rehab', 'rehabilitation')
    # New synonyms from context pack
    text = text.replace(' med ', ' medical ')
    text = text.replace(' va ', ' virginia ')
    text = text.replace('admin', 'administration')
    text = text.replace('mgmt', 'management')
    text = text.replace('coord', 'coordination')
    text = text.replace('dev', 'development')
    text = text.replace('prog', 'program')
    text = text.replace('educ', 'education')
    text = text.replace('govt', 'government')
    text = text.replace('genrl', 'general')
    # University-specific synonyms
    text = text.replace('educationl', 'educational')
    text = text.replace('educationatn', 'education')
    text = text.replace('institutionl', 'institutional')
    text = text.replace('assistnce', 'assistance')
    text = text.replace('enforcemnt', 'enforcement')
    text = text.replace('retiremnt', 'retirement')
    text = text.replace('childrn', 'children')
    text = text.replace('hlth', 'health')
    text = text.replace('ins', 'insurance')
    text = text.replace('pgm', 'program')
    text = text.replace('pgms', 'programs')
    text = text.replace('fac', 'facilities')
    text = text.replace('pln', 'planning')
    text = text.replace('maint', 'maintenance')
    text = text.replace('acq', 'acquisition')
    text = text.replace('cnstrct', 'construction')
    text = text.replace('hwy', 'highway')
    text = text.replace('fin', 'financial')
    text = text.replace('off', 'office')
    text = text.replace('reg', 'regional')
    text = text.replace(' he ', ' higher education ')
    text = text.replace('e&g', 'educational and general')

    # Remove punctuation
    text = re.sub(r'[^\w\s]', ' ', text)

    # Collapse whitespace
    text = re.sub(r'\s+', ' ', text).strip()

    return text


def to_snake_case(name: str) -> str:
    """Convert column name to snake_case."""
    # Replace spaces and special chars with underscore
    name = re.sub(r'[^\w\s]', '', name)
    name = re.sub(r'\s+', '_', name)
    return name.lower()


def safe_float(value) -> float:
    """Safely convert value to float."""
    if pd.isna(value):
        return 0.0
    try:
        return float(value)
    except (ValueError, TypeError):
        return 0.0


def safe_int(value) -> int:
    """Safely convert value to int."""
    if pd.isna(value):
        return 0
    try:
        return int(value)
    except (ValueError, TypeError):
        return 0


# ============================================================================
# DATA LOADING FUNCTIONS
# ============================================================================

def load_appropriations() -> pd.DataFrame:
    """
    Load and standardize DPB appropriations data.
    
    Returns:
        DataFrame with standardized columns and normalized fields
    """
    print("📊 Loading appropriations data...")
    
    # Read CSV (handle BOM if present)
    df = pd.read_csv(APPROPRIATIONS_FILE, encoding='utf-8-sig')
    
    # Standardize column names to snake_case
    df.columns = [to_snake_case(col) for col in df.columns]
    
    # Expected columns after snake_case conversion:
    # secretarial_area_code, agency_code, agency_title, program_code, program_title,
    # fund_group_code, fund_group_title, fund_code, fund_title,
    # ch_725_fy_2025_gf_dollars, ch_725_fy_2025_ngf_dollars, ch_725_fy_2025_total_dollars,
    # ch_725_fy_2026_gf_dollars, ch_725_fy_2026_ngf_dollars, ch_725_fy_2026_total_dollars

    # Rename for clarity
    rename_map = {
        'secretarial_area_code': 'secretariat_code',
        'agency_title': 'agency_name',
        'program_title': 'program_name',
        'fund_group_title': 'fund_group_name',
        'fund_title': 'fund_name',
    }

    # Handle different possible column name variations
    for col in df.columns:
        if 'fy_2025' in col and 'total' in col:
            rename_map[col] = 'fy25_amount'
        elif 'fy_2026' in col and 'total' in col:
            rename_map[col] = 'fy26_amount'

    df = df.rename(columns=rename_map)

    # Ensure numeric fields are floats
    numeric_cols = ['fy25_amount', 'fy26_amount']
    for col in numeric_cols:
        if col in df.columns:
            df[col] = df[col].apply(safe_float)

    # HYGIENE: Strip whitespace from all text fields BEFORE normalization
    text_fields = ['secretariat_code', 'agency_code', 'agency_name', 'program_code', 'program_name',
                   'fund_group_code', 'fund_group_name', 'fund_code', 'fund_name']
    for field in text_fields:
        if field in df.columns:
            df[field] = df[field].astype(str).str.strip()

    # Create normalized fields for matching
    df['norm_agency'] = df['agency_name'].apply(normalize_text)
    df['norm_program'] = df['program_name'].apply(normalize_text)

    # Normalize fund fields for Pass C matching
    if 'fund_code' in df.columns:
        df['norm_fund_code'] = df['fund_code'].apply(lambda x: str(x).strip().lower() if pd.notna(x) else '')
    else:
        df['norm_fund_code'] = ''

    if 'fund_group_code' in df.columns:
        df['norm_fund_group_code'] = df['fund_group_code'].apply(lambda x: str(x).strip().lower() if pd.notna(x) else '')
    else:
        df['norm_fund_group_code'] = ''

    if 'fund_name' in df.columns:
        df['norm_fund_name'] = df['fund_name'].apply(normalize_text)
    else:
        df['norm_fund_name'] = ''

    print(f"   ✓ Loaded {len(df):,} appropriation records")
    print(f"   ✓ Columns: {', '.join(df.columns)}")

    # Report fund field availability
    has_fund_code = 'fund_code' in df.columns and df['fund_code'].notna().any()
    has_fund_group = 'fund_group_code' in df.columns and df['fund_group_code'].notna().any()
    has_fund_name = 'fund_name' in df.columns and df['fund_name'].notna().any()
    print(f"   ✓ Fund fields available: fund_code={has_fund_code}, fund_group_code={has_fund_group}, fund_name={has_fund_name}")

    # Load DPB program flags configuration
    dpb_flags_config = load_json_config(DPB_PROGRAM_FLAGS_CONFIG)

    # Apply DPB program flags
    if dpb_flags_config:
        flag_results = df.apply(lambda row: flag_dpb_program(row, dpb_flags_config), axis=1)
        for flag_name in ['dpb_is_pass_through', 'dpb_is_adjustment', 'dpb_is_internal_finance']:
            df[flag_name] = flag_results.apply(lambda x: x[flag_name])

        pass_through_count = df['dpb_is_pass_through'].sum()
        adjustment_count = df['dpb_is_adjustment'].sum()
        internal_finance_count = df['dpb_is_internal_finance'].sum()

        print(f"   ✓ DPB program flags applied:")
        print(f"      - Pass-through programs: {pass_through_count:,}")
        print(f"      - Adjustment programs: {adjustment_count:,}")
        print(f"      - Internal finance programs: {internal_finance_count:,}")
    else:
        # Initialize flags as False if config not found
        df['dpb_is_pass_through'] = False
        df['dpb_is_adjustment'] = False
        df['dpb_is_internal_finance'] = False

    return df


def create_program_grain_appropriations(appropriations: pd.DataFrame) -> pd.DataFrame:
    """
    Create a program-grain view of appropriations for matching.

    Groups by fiscal_year, norm_agency, norm_program and aggregates:
    - Sum appropriated amounts across all funds/service areas
    - Collect list of fund_code and fund_group_code values

    This ensures each expenditure matches to at most one DPB program per fiscal year.

    Returns:
        DataFrame with one row per fiscal_year × norm_agency × norm_program
    """
    print("\n" + "="*80)
    print("CREATING PROGRAM-GRAIN APPROPRIATIONS VIEW")
    print("="*80)

    # Prepare appropriations for both fiscal years
    base_cols = ['agency_code', 'agency_name', 'program_code', 'program_name',
                 'norm_agency', 'norm_program',
                 'fund_code', 'fund_group_code', 'fund_name',
                 'norm_fund_code', 'norm_fund_group_code', 'norm_fund_name']

    # Add DPB flags if they exist
    if 'dpb_is_pass_through' in appropriations.columns:
        base_cols.extend(['dpb_is_pass_through', 'dpb_is_adjustment', 'dpb_is_internal_finance'])

    approp_fy25 = appropriations[base_cols + ['fy25_amount']].copy()
    approp_fy25['fiscal_year'] = 2025
    approp_fy25 = approp_fy25.rename(columns={'fy25_amount': 'appropriated_amount'})

    approp_fy26 = appropriations[base_cols + ['fy26_amount']].copy()
    approp_fy26['fiscal_year'] = 2026
    approp_fy26 = approp_fy26.rename(columns={'fy26_amount': 'appropriated_amount'})

    approp_long = pd.concat([approp_fy25, approp_fy26], ignore_index=True)

    # Group by program grain
    group_cols = ['fiscal_year', 'norm_agency', 'norm_program']

    # Aggregate
    agg_dict = {
        'agency_code': 'first',
        'agency_name': 'first',
        'program_code': 'first',
        'program_name': 'first',
        'appropriated_amount': 'sum',  # Sum across all funds
        'fund_code': lambda x: list(x.dropna().unique()),  # Collect unique fund codes
        'fund_group_code': lambda x: list(x.dropna().unique()),  # Collect unique fund group codes
        'fund_name': lambda x: list(x.dropna().unique()),  # Collect unique fund names
        'norm_fund_name': lambda x: list(x.dropna().unique())  # Collect normalized fund names
    }

    # Add DPB flags to aggregation if they exist
    if 'dpb_is_pass_through' in approp_long.columns:
        agg_dict['dpb_is_pass_through'] = 'max'  # True if any row is True
        agg_dict['dpb_is_adjustment'] = 'max'
        agg_dict['dpb_is_internal_finance'] = 'max'

    program_grain = approp_long.groupby(group_cols, dropna=False).agg(agg_dict).reset_index()

    print(f"   ✓ Original appropriations (long format): {len(approp_long):,} rows")
    print(f"   ✓ Program-grain appropriations: {len(program_grain):,} unique programs")
    print(f"   ✓ Deduplication ratio: {len(approp_long) / len(program_grain):.2f}x")

    return program_grain


def load_expenditures_for_fy(fy_dir: Path, fiscal_year: int) -> pd.DataFrame:
    """
    Load and concatenate all monthly expenditure CSVs for a fiscal year.

    Args:
        fy_dir: Directory containing monthly CSV files
        fiscal_year: Fiscal year (2025 or 2026)

    Returns:
        DataFrame with all expenditures for the fiscal year
    """
    print(f"📊 Loading FY{fiscal_year} expenditures from {fy_dir.name}...")

    # Find all CSV files
    csv_files = sorted(fy_dir.glob("*.csv"))

    if not csv_files:
        print(f"   ⚠️  No CSV files found in {fy_dir}")
        return pd.DataFrame()

    print(f"   Found {len(csv_files)} monthly files")

    # Load and concatenate in chunks to avoid memory issues
    chunks = []
    for csv_file in csv_files:
        print(f"   Loading {csv_file.name}...")

        # Try multiple encoding and parsing strategies
        # Start with ISO-8859-1 (latin-1) which handles Windows-1252 characters
        loaded = False
        chunk_iter = None
        encoding_used = None

        # Strategy 1: ISO-8859-1 (latin-1) encoding - handles most special chars
        try:
            chunk_iter = pd.read_csv(
                csv_file,
                chunksize=50000,
                encoding='ISO-8859-1',
                on_bad_lines='skip',
                low_memory=False
            )
            loaded = True
            encoding_used = 'ISO-8859-1'
        except Exception as e1:
            # Strategy 2: UTF-8 encoding
            try:
                chunk_iter = pd.read_csv(
                    csv_file,
                    chunksize=50000,
                    encoding='utf-8',
                    on_bad_lines='skip',
                    low_memory=False
                )
                loaded = True
                encoding_used = 'UTF-8'
            except Exception as e2:
                # Strategy 3: Python engine with flexible parsing
                try:
                    chunk_iter = pd.read_csv(
                        csv_file,
                        chunksize=50000,
                        encoding='ISO-8859-1',
                        engine='python',
                        on_bad_lines='skip',
                        quotechar='"',
                        sep=',',
                        low_memory=False
                    )
                    loaded = True
                    encoding_used = 'Python/ISO-8859-1'
                except Exception as e3:
                    # Strategy 4: Try pipe separator
                    try:
                        chunk_iter = pd.read_csv(
                            csv_file,
                            chunksize=50000,
                            encoding='ISO-8859-1',
                            engine='python',
                            on_bad_lines='skip',
                            quotechar='"',
                            sep='|',
                            low_memory=False
                        )
                        loaded = True
                        encoding_used = 'Python/ISO-8859-1/pipe'
                    except Exception as e4:
                        print(f"   ⚠️  All loading strategies failed for {csv_file.name}")
                        print(f"      ISO-8859-1 error: {e1}")
                        print(f"      UTF-8 error: {e2}")
                        print(f"      Python/comma error: {e3}")
                        print(f"      Python/pipe error: {e4}")
                        print(f"   Skipping this file...")
                        continue

        if loaded and chunk_iter is not None:
            chunk_num = 0
            file_chunks = 0
            row_offset = 0
            try:
                for chunk in chunk_iter:
                    # Standardize column names
                    chunk.columns = [to_snake_case(col) for col in chunk.columns]

                    # Create unique exp_id: source_file:row_index
                    # Use sequential row numbering to avoid index issues
                    chunk = chunk.reset_index(drop=True)
                    chunk['exp_id'] = csv_file.name + ':' + (chunk.index + row_offset).astype(str)
                    row_offset += len(chunk)
                    chunk_num += 1
                    file_chunks += 1

                    chunks.append(chunk)

                print(f"      ✓ Loaded {file_chunks} chunks with {encoding_used} encoding")
            except Exception as e:
                print(f"   ⚠️  Error processing chunks from {csv_file.name}: {e}")
                if file_chunks > 0:
                    print(f"      Loaded {file_chunks} chunks before error")
                else:
                    print(f"   Skipping this file...")
                continue

    # Concatenate all chunks
    if not chunks:
        print(f"   ⚠️  No data loaded for FY{fiscal_year}")
        return pd.DataFrame()

    df = pd.concat(chunks, ignore_index=True)

    # Parse and clean fields
    df['amount'] = df['amount'].apply(safe_float)
    df['fiscal_year'] = df['fiscal_year'].apply(safe_int)

    # Parse transaction date
    if 'trans_date' in df.columns:
        df['trans_date'] = pd.to_datetime(df['trans_date'], format='%m-%d-%y', errors='coerce')

    # HYGIENE: Strip whitespace from all text fields BEFORE normalization
    text_fields = ['branch_name', 'secretariat_name', 'agency_name', 'function_name',
                   'program_name', 'service_area_name', 'fund_name', 'fund_detail_name',
                   'category_name', 'expense_type', 'vendor_name']
    for field in text_fields:
        if field in df.columns:
            df[field] = df[field].astype(str).str.strip()

    # Create normalized fields for matching
    df['norm_secretariat'] = df.get('secretariat_name', '').apply(normalize_text)
    df['norm_agency'] = df.get('agency_name', '').apply(normalize_text)
    df['norm_program'] = df.get('program_name', '').apply(normalize_text)
    df['norm_service_area'] = df.get('service_area_name', '').apply(normalize_text)
    df['norm_fund'] = df.get('fund_name', '').apply(normalize_text)

    # Classify recipient type (internal vs external)
    if 'vendor_name' in df.columns:
        df['recipient_type'] = df['vendor_name'].apply(classify_recipient_type)
    else:
        df['recipient_type'] = 'external'

    # Classify spending category using Virginia's official branch structure
    if 'branch_name' in df.columns and 'secretariat_name' in df.columns:
        df['spending_category'] = df.apply(
            lambda row: classify_spending_category(
                row.get('branch_name', ''),
                row.get('secretariat_name', ''),
                row.get('agency_name', '')
            ),
            axis=1
        )
    else:
        df['spending_category'] = 'administration'  # fallback if fields missing

    # Load configuration files
    placeholder_config = load_json_config(PLACEHOLDER_CONFIG)
    expected_config = load_json_config(EXPECTED_UNMATCHED_CONFIG)

    # Mark placeholders and expected unmatched
    df['is_placeholder'] = df.apply(lambda row: is_placeholder_expenditure(row, placeholder_config), axis=1)
    df['is_expected_unmatched'] = df.apply(lambda row: is_expected_unmatched(row, expected_config), axis=1)

    placeholder_count = df['is_placeholder'].sum()
    expected_unmatched_count = df['is_expected_unmatched'].sum()

    print(f"   ✓ Loaded {len(df):,} expenditure records for FY{fiscal_year}")
    print(f"   ✓ Marked {placeholder_count:,} as placeholders")
    print(f"   ✓ Marked {expected_unmatched_count:,} as expected unmatched")

    # Report spending category distribution
    if 'spending_category' in df.columns:
        category_counts = df['spending_category'].value_counts()
        print(f"   ✓ Classified into {len(category_counts)} spending categories")
        # Show top 5 categories
        for cat, count in category_counts.head(5).items():
            pct = (count / len(df)) * 100
            print(f"      - {cat}: {count:,} ({pct:.1f}%)")

    return df


def load_all_expenditures() -> pd.DataFrame:
    """
    Load all expenditures from both FY25 and FY26 directories.

    Returns:
        Combined DataFrame with all expenditures
    """
    print("\n" + "="*80)
    print("LOADING EXPENDITURE DATA")
    print("="*80)

    fy25_df = load_expenditures_for_fy(EXPENDITURES_FY25_DIR, 2025)
    fy26_df = load_expenditures_for_fy(EXPENDITURES_FY26_DIR, 2026)

    # Combine
    all_exp = pd.concat([fy25_df, fy26_df], ignore_index=True)

    print(f"\n✓ Total expenditure records loaded: {len(all_exp):,}")
    print(f"   FY2025: {len(fy25_df):,}")
    print(f"   FY2026: {len(fy26_df):,}")

    return all_exp


# ============================================================================
# JOIN LOGIC
# ============================================================================

def strict_match(program_grain_approp: pd.DataFrame, expenditures: pd.DataFrame) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame, set]:
    """
    Pass A: Strict matching on normalized agency + program.

    Uses program-grain appropriations to ensure 1:1 matching.
    Tracks matched exp_id to prevent duplicates.

    Returns:
        Tuple of (matched_df, unmatched_appropriations, unmatched_expenditures, matched_exp_ids)
    """
    print("\n" + "="*80)
    print("PASS A: STRICT MATCHING")
    print("="*80)

    # Join on fiscal_year + norm_agency + norm_program
    matched = expenditures.merge(
        program_grain_approp,
        on=['fiscal_year', 'norm_agency', 'norm_program'],
        how='inner',
        suffixes=('_exp', '_approp')
    )

    matched['match_type'] = 'strict'
    matched['match_score'] = 1.0

    # Get unique exp_ids that were matched
    matched_exp_ids = set(matched['exp_id'].unique())

    print(f"   ✓ Strict matches: {len(matched):,} expenditure records")
    print(f"   ✓ Unique exp_ids matched: {len(matched_exp_ids):,}")

    # Find unmatched appropriations (programs with no matching expenditures)
    matched_approp_keys = set(
        matched[['fiscal_year', 'norm_agency', 'norm_program']].itertuples(index=False, name=None)
    )

    unmatched_approp = program_grain_approp[
        ~program_grain_approp.apply(
            lambda row: (row['fiscal_year'], row['norm_agency'], row['norm_program']) in matched_approp_keys,
            axis=1
        )
    ].copy()

    # Find unmatched expenditures (exp_ids not in matched set)
    unmatched_exp = expenditures[~expenditures['exp_id'].isin(matched_exp_ids)].copy()

    print(f"   Unmatched appropriations: {len(unmatched_approp):,} programs")
    print(f"   Unmatched expenditures: {len(unmatched_exp):,} records ({len(unmatched_exp['exp_id'].unique()):,} unique exp_ids)")

    return matched, unmatched_approp, unmatched_exp, matched_exp_ids


def calculate_fund_overlap_score(exp_fund_name: str, exp_fund_detail: str, approp_row: pd.Series) -> int:
    """
    Calculate fund overlap score between expenditure and appropriation.

    Note: approp_row fund fields are now lists (from program-grain aggregation).
    We check if expenditure fund matches ANY fund in the appropriation's fund list.

    Priority-based scoring:
    - +3 for exact fund name match (e.g., "General Fund" == "General Fund")
    - +2 for fund group match (e.g., "GENERAL" matches fund_group "General")
    - +1 for partial fund name token overlap

    Returns:
        Integer score (0-6 possible range)
    """
    score = 0

    # Normalize expenditure fund fields
    exp_fund_name_norm = normalize_text(str(exp_fund_name)) if pd.notna(exp_fund_name) else ''
    exp_fund_detail_norm = normalize_text(str(exp_fund_detail)) if pd.notna(exp_fund_detail) else ''

    # Get appropriation fund fields (now lists from program-grain aggregation)
    approp_fund_names = approp_row.get('norm_fund_name', [])
    approp_fund_codes = approp_row.get('fund_code', [])
    approp_fund_group_codes = approp_row.get('fund_group_code', [])

    # Ensure they're lists
    if not isinstance(approp_fund_names, list):
        approp_fund_names = [approp_fund_names] if pd.notna(approp_fund_names) else []
    if not isinstance(approp_fund_codes, list):
        approp_fund_codes = [approp_fund_codes] if pd.notna(approp_fund_codes) else []
    if not isinstance(approp_fund_group_codes, list):
        approp_fund_group_codes = [approp_fund_group_codes] if pd.notna(approp_fund_group_codes) else []

    # Priority 1: Exact fund name match (+3 points)
    # Check if expenditure fund detail matches ANY appropriation fund name
    if exp_fund_detail_norm and approp_fund_names:
        for approp_fund_name in approp_fund_names:
            if approp_fund_name and approp_fund_name == exp_fund_detail_norm:
                score += 3
                return score  # Perfect match, no need to check further

    # Priority 2: Fund group match (+2 points)
    # Check if expenditure FUND_NAME matches any fund group code pattern
    if exp_fund_name_norm and approp_fund_group_codes:
        for fund_group_code in approp_fund_group_codes:
            if fund_group_code:
                # Normalize fund group code for comparison
                fund_group_norm = normalize_text(str(fund_group_code))
                if fund_group_norm and fund_group_norm in exp_fund_name_norm:
                    score += 2
                    break

    # Priority 3: Partial fund name token overlap (+1 point)
    # Check if key tokens match between fund names
    if approp_fund_names and (exp_fund_name_norm or exp_fund_detail_norm):
        exp_tokens = set()
        if exp_fund_name_norm:
            exp_tokens.update(exp_fund_name_norm.split())
        if exp_fund_detail_norm:
            exp_tokens.update(exp_fund_detail_norm.split())

        # Remove common words
        common_words = {'fund', 'the', 'of', 'and', 'for'}
        exp_tokens = exp_tokens - common_words

        # Check overlap with any appropriation fund name
        for approp_fund_name in approp_fund_names:
            if approp_fund_name:
                approp_tokens = set(approp_fund_name.split()) - common_words
                overlap = approp_tokens & exp_tokens
                if len(overlap) >= 1:
                    score += 1
                    break

    return score


def fuzzy_match(unmatched_appropriations: pd.DataFrame, unmatched_expenditures: pd.DataFrame, already_matched_exp_ids: set) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame, set]:
    """
    Pass B & C: Fuzzy matching on agency (exact) + program (fuzzy) with fund-assisted tie-breaking.

    Excludes exp_ids that were already matched in strict pass.

    Returns:
        Tuple of (matched_df, still_unmatched_appropriations, still_unmatched_expenditures, fuzzy_matched_exp_ids)
    """
    print("\n" + "="*80)
    print("PASS B & C: FUZZY MATCHING WITH FUND-ASSISTED TIE-BREAKING")
    print("="*80)

    if len(unmatched_appropriations) == 0 or len(unmatched_expenditures) == 0:
        print("   No unmatched records to process")
        return pd.DataFrame(), unmatched_appropriations, unmatched_expenditures, set()

    fuzzy_matches = []
    matched_approp_indices = set()
    fuzzy_matched_exp_ids = set()
    fund_tiebreak_count = 0

    # Group by fiscal year and agency for efficiency
    for fy in unmatched_appropriations['fiscal_year'].unique():
        approp_fy = unmatched_appropriations[unmatched_appropriations['fiscal_year'] == fy]
        exp_fy = unmatched_expenditures[unmatched_expenditures['fiscal_year'] == fy]

        for agency in approp_fy['norm_agency'].unique():
            if not agency:
                continue

            approp_agency = approp_fy[approp_fy['norm_agency'] == agency]
            exp_agency = exp_fy[exp_fy['norm_agency'] == agency]

            if len(exp_agency) == 0:
                continue

            # For each unmatched appropriation program, find best fuzzy match
            for approp_idx, approp_row in approp_agency.iterrows():
                approp_program = approp_row['norm_program']

                if not approp_program:
                    continue

                # Find ALL candidate programs that meet threshold
                candidates = []

                for exp_program in exp_agency['norm_program'].unique():
                    if not exp_program:
                        continue

                    score = fuzz.token_set_ratio(approp_program, exp_program) / 100.0

                    if score >= FUZZY_THRESHOLD:
                        candidates.append((exp_program, score))

                # If no candidates, skip
                if not candidates:
                    continue

                # Sort candidates by score descending
                candidates.sort(key=lambda x: x[1], reverse=True)

                # Check if we have multiple candidates with same top score (tie)
                best_score = candidates[0][1]
                top_candidates = [c for c in candidates if c[1] == best_score]

                best_exp_program = None
                match_type = 'fuzzy'

                if len(top_candidates) == 1:
                    # Single best match
                    best_exp_program = top_candidates[0][0]
                else:
                    # Multiple candidates with same score - use fund tie-breaking (Pass C)
                    # Calculate fund overlap score for each candidate
                    candidate_fund_scores = []

                    for candidate_program, fuzzy_score in top_candidates:
                        # Get sample expenditure for this program to check fund fields
                        sample_exp = exp_agency[exp_agency['norm_program'] == candidate_program].iloc[0]

                        # Calculate fund overlap score
                        fund_score = calculate_fund_overlap_score(
                            sample_exp.get('fund_name', ''),
                            sample_exp.get('fund_detail_name', ''),
                            approp_row
                        )

                        candidate_fund_scores.append((candidate_program, fuzzy_score, fund_score))

                    # Sort by fund_score (desc), then fuzzy_score (desc)
                    candidate_fund_scores.sort(key=lambda x: (x[2], x[1]), reverse=True)

                    # Check if fund tie-breaking actually helped disambiguate
                    best_fund_score = candidate_fund_scores[0][2]

                    # Fund tie-breaking is considered "used" if:
                    # 1. We had multiple tied candidates, AND
                    # 2. At least one candidate has fund overlap (best_fund_score > 0), AND
                    # 3. The fund scores differ (i.e., fund scoring helped pick a winner)
                    if len(candidate_fund_scores) > 1 and best_fund_score > 0:
                        second_best_fund_score = candidate_fund_scores[1][2]
                        if best_fund_score > second_best_fund_score:
                            # Fund tie-breaking successfully disambiguated
                            match_type = 'fuzzy_fund_tiebreak'
                            fund_tiebreak_count += 1

                    # Always pick the top candidate after fund scoring
                    best_exp_program = candidate_fund_scores[0][0]

                # Get all expenditures for this program
                matching_exp = exp_agency[exp_agency['norm_program'] == best_exp_program]

                for exp_idx, exp_row in matching_exp.iterrows():
                    exp_id = exp_row['exp_id']

                    # Skip if this exp_id was already matched in strict pass
                    if exp_id in already_matched_exp_ids:
                        continue

                    # Skip if this exp_id was already matched in fuzzy pass
                    if exp_id in fuzzy_matched_exp_ids:
                        continue

                    # Merge appropriation and expenditure data
                    match_row = exp_row.to_dict()
                    match_row.update({
                        'agency_code': approp_row['agency_code'],
                        'agency_name_approp': approp_row['agency_name'],
                        'program_code': approp_row['program_code'],
                        'program_name_approp': approp_row['program_name'],
                        'appropriated_amount': approp_row['appropriated_amount'],
                        'match_type': match_type,
                        'match_score': best_score
                    })
                    fuzzy_matches.append(match_row)
                    fuzzy_matched_exp_ids.add(exp_id)

                matched_approp_indices.add(approp_idx)

    # Create matched DataFrame
    if fuzzy_matches:
        matched_df = pd.DataFrame(fuzzy_matches)
    else:
        matched_df = pd.DataFrame()

    # Remove matched records from unmatched sets
    still_unmatched_approp = unmatched_appropriations.drop(index=matched_approp_indices, errors='ignore')
    still_unmatched_exp = unmatched_expenditures[~unmatched_expenditures['exp_id'].isin(fuzzy_matched_exp_ids)].copy()

    print(f"   ✓ Fuzzy matches: {len(matched_df):,} expenditure records")
    print(f"   ✓ Unique exp_ids matched: {len(fuzzy_matched_exp_ids):,}")
    if fund_tiebreak_count > 0:
        print(f"   ✓ Fund tie-breaks used: {fund_tiebreak_count}")
    print(f"   Still unmatched appropriations: {len(still_unmatched_approp):,} programs")
    print(f"   Still unmatched expenditures: {len(still_unmatched_exp):,} records ({len(still_unmatched_exp['exp_id'].unique()):,} unique exp_ids)")

    return matched_df, still_unmatched_approp, still_unmatched_exp, fuzzy_matched_exp_ids


def category_assisted_fuzzy_match(unmatched_appropriations: pd.DataFrame, unmatched_expenditures: pd.DataFrame, already_matched_exp_ids: set) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame, set]:
    """
    Pass D: Category-assisted fuzzy matching for specific opportunity buckets.

    Only runs on:
    - Grants to Nongovernmental Organizations
    - Skilled Services

    Uses higher fuzzy threshold (0.92) to avoid false positives.

    Returns:
        Tuple of (matched_df, still_unmatched_appropriations, still_unmatched_expenditures, category_matched_exp_ids)
    """
    print("\n" + "="*80)
    print("PASS D: CATEGORY-ASSISTED FUZZY MATCHING (OPPORTUNITY BUCKETS)")
    print("="*80)

    # Filter for opportunity bucket categories
    opportunity_exp = unmatched_expenditures[
        (unmatched_expenditures['expense_type'].str.contains('Grnt-Nongovernmental', na=False)) |
        (unmatched_expenditures['expense_type'].str.contains('Skilled Services', na=False))
    ].copy()

    if len(opportunity_exp) == 0:
        print("   No opportunity bucket expenditures to process")
        return pd.DataFrame(), unmatched_appropriations, unmatched_expenditures, set()

    print(f"   Opportunity bucket expenditures: {len(opportunity_exp):,} records ({len(opportunity_exp['exp_id'].unique()):,} unique exp_ids)")

    # Use higher threshold for category-assisted matching
    CATEGORY_FUZZY_THRESHOLD = 0.92

    category_matches = []
    matched_approp_indices = set()
    category_matched_exp_ids = set()

    # Group by fiscal year and agency for efficiency
    for fy in unmatched_appropriations['fiscal_year'].unique():
        approp_fy = unmatched_appropriations[unmatched_appropriations['fiscal_year'] == fy]
        exp_fy = opportunity_exp[opportunity_exp['fiscal_year'] == fy]

        for agency in approp_fy['norm_agency'].unique():
            if not agency:
                continue

            approp_agency = approp_fy[approp_fy['norm_agency'] == agency]
            exp_agency = exp_fy[exp_fy['norm_agency'] == agency]

            if len(exp_agency) == 0:
                continue

            # For each unmatched appropriation program, find best fuzzy match
            for approp_idx, approp_row in approp_agency.iterrows():
                approp_program = approp_row['norm_program']

                if not approp_program:
                    continue

                # Find best candidate program
                best_exp_program = None
                best_score = 0.0

                for exp_program in exp_agency['norm_program'].unique():
                    if not exp_program:
                        continue

                    score = fuzz.token_set_ratio(approp_program, exp_program) / 100.0

                    if score >= CATEGORY_FUZZY_THRESHOLD and score > best_score:
                        best_score = score
                        best_exp_program = exp_program

                # If no match found, skip
                if best_exp_program is None:
                    continue

                # Get all expenditures for this program
                matching_exp = exp_agency[exp_agency['norm_program'] == best_exp_program]

                for exp_idx, exp_row in matching_exp.iterrows():
                    exp_id = exp_row['exp_id']

                    # Skip if this exp_id was already matched
                    if exp_id in already_matched_exp_ids:
                        continue

                    if exp_id in category_matched_exp_ids:
                        continue

                    # Merge appropriation and expenditure data
                    match_row = exp_row.to_dict()
                    match_row.update({
                        'agency_code': approp_row['agency_code'],
                        'agency_name_approp': approp_row['agency_name'],
                        'program_code': approp_row['program_code'],
                        'program_name_approp': approp_row['program_name'],
                        'appropriated_amount': approp_row['appropriated_amount'],
                        'match_type': 'category_assisted_fuzzy',
                        'match_score': best_score
                    })
                    category_matches.append(match_row)
                    category_matched_exp_ids.add(exp_id)

                matched_approp_indices.add(approp_idx)

    # Create matched DataFrame
    if category_matches:
        matched_df = pd.DataFrame(category_matches)
    else:
        matched_df = pd.DataFrame()

    # Remove matched records from unmatched sets
    still_unmatched_approp = unmatched_appropriations.drop(index=matched_approp_indices, errors='ignore')
    still_unmatched_exp = unmatched_expenditures[~unmatched_expenditures['exp_id'].isin(category_matched_exp_ids)].copy()

    print(f"   ✓ Category-assisted matches: {len(matched_df):,} expenditure records")
    print(f"   ✓ Unique exp_ids matched: {len(category_matched_exp_ids):,}")
    print(f"   Still unmatched appropriations: {len(still_unmatched_approp):,} programs")
    print(f"   Still unmatched expenditures: {len(still_unmatched_exp):,} records ({len(still_unmatched_exp['exp_id'].unique()):,} unique exp_ids)")

    return matched_df, still_unmatched_approp, still_unmatched_exp, category_matched_exp_ids


def combine_all_matches(strict_matches: pd.DataFrame, fuzzy_matches: pd.DataFrame, category_matches: pd.DataFrame = None) -> pd.DataFrame:
    """
    Combine all matched records into a single DataFrame.

    Returns:
        Combined DataFrame with all matches
    """
    print("\n" + "="*80)
    print("COMBINING ALL MATCHES")
    print("="*80)

    # Ensure consistent columns
    dfs_to_concat = [strict_matches, fuzzy_matches]
    if category_matches is not None and len(category_matches) > 0:
        dfs_to_concat.append(category_matches)

    all_matches = pd.concat(dfs_to_concat, ignore_index=True)

    print(f"   ✓ Total matched records: {len(all_matches):,}")
    print(f"      Strict: {len(strict_matches):,}")
    print(f"      Fuzzy: {len(fuzzy_matches):,}")
    if category_matches is not None and len(category_matches) > 0:
        print(f"      Category-assisted: {len(category_matches):,}")

    return all_matches


# ============================================================================
# OUTPUT GENERATION
# ============================================================================

def generate_program_vendor_decoder(all_matches: pd.DataFrame) -> pd.DataFrame:
    """
    Generate program_vendor_decoder.csv output.

    One row per: fiscal_year, secretariat, agency, program, service_area, vendor_name
    """
    print("\n" + "="*80)
    print("GENERATING PROGRAM-VENDOR DECODER")
    print("="*80)

    # Group by key dimensions (include recipient_type)
    group_cols = ['fiscal_year', 'secretariat_name', 'agency_name', 'program_name',
                  'service_area_name', 'vendor_name', 'recipient_type']

    # Aggregate
    decoder = all_matches.groupby(group_cols, dropna=False).agg({
        'appropriated_amount': 'first',  # Same for all records in group
        'amount': 'sum',  # Sum expenditures
        'category_name': lambda x: x.value_counts().index[0] if len(x) > 0 else '',  # Top category
        'match_type': 'first',
        'match_score': 'first',
        'is_placeholder': 'max',  # True if any record is a placeholder
        'is_expected_unmatched': 'max'  # True if any record is expected unmatched
    }).reset_index()

    # Rename and calculate derived fields
    decoder = decoder.rename(columns={
        'secretariat_name': 'secretariat',
        'agency_name': 'agency',
        'program_name': 'program',
        'service_area_name': 'service_area',
        'amount': 'spent_amount_ytd',
        'category_name': 'top_category_name'
    })

    decoder['remaining_balance'] = decoder['appropriated_amount'] - decoder['spent_amount_ytd']
    decoder['execution_rate'] = decoder.apply(
        lambda row: row['spent_amount_ytd'] / row['appropriated_amount']
        if row['appropriated_amount'] > 0 else 0, axis=1
    )

    # Reorder columns
    output_cols = [
        'fiscal_year', 'secretariat', 'agency', 'program', 'service_area', 'vendor_name',
        'recipient_type', 'appropriated_amount', 'spent_amount_ytd', 'remaining_balance',
        'execution_rate', 'top_category_name', 'match_type', 'match_score',
        'is_placeholder', 'is_expected_unmatched'
    ]

    decoder = decoder[output_cols]

    print(f"   ✓ Generated {len(decoder):,} program-vendor records")
    print(f"      Internal recipients: {len(decoder[decoder['recipient_type'] == 'internal']):,}")
    print(f"      External recipients: {len(decoder[decoder['recipient_type'] == 'external']):,}")
    print(f"      Placeholders: {len(decoder[decoder['is_placeholder'] == True]):,}")

    return decoder


def generate_program_rollup_decoder(all_matches: pd.DataFrame) -> pd.DataFrame:
    """
    Generate program_rollup_decoder.csv output.

    One row per program per fiscal year.
    """
    print("\n" + "="*80)
    print("GENERATING PROGRAM ROLLUP DECODER")
    print("="*80)

    # Group by program
    group_cols = ['fiscal_year', 'secretariat_name', 'agency_name', 'program_name', 'service_area_name']

    # Aggregate
    rollup = all_matches.groupby(group_cols, dropna=False).agg({
        'appropriated_amount': 'first',
        'amount': 'sum',
        'vendor_name': lambda x: list(x.value_counts().head(10).index),  # Top 10 vendors
        'category_name': lambda x: x.value_counts().to_dict(),  # Category breakdown
        'match_type': 'first',
        'match_score': 'first'
    }).reset_index()

    # Count unique recipients
    unique_recipients = all_matches.groupby(group_cols, dropna=False)['vendor_name'].nunique().reset_index()
    unique_recipients = unique_recipients.rename(columns={'vendor_name': 'number_of_unique_recipients'})

    rollup = rollup.merge(unique_recipients, on=group_cols, how='left')

    # Rename and calculate derived fields
    rollup = rollup.rename(columns={
        'secretariat_name': 'secretariat',
        'agency_name': 'agency',
        'program_name': 'program',
        'service_area_name': 'service_area',
        'amount': 'total_spent_ytd',
        'vendor_name': 'top_10_recipients',
        'category_name': 'category_breakdown'
    })

    rollup['remaining_balance'] = rollup['appropriated_amount'] - rollup['total_spent_ytd']
    rollup['execution_rate'] = rollup.apply(
        lambda row: row['total_spent_ytd'] / row['appropriated_amount']
        if row['appropriated_amount'] > 0 else 0, axis=1
    )

    # Convert lists/dicts to JSON strings
    rollup['top_10_recipients'] = rollup['top_10_recipients'].apply(json.dumps)
    rollup['category_breakdown'] = rollup['category_breakdown'].apply(json.dumps)

    # Reorder columns
    output_cols = [
        'fiscal_year', 'secretariat', 'agency', 'program', 'service_area',
        'appropriated_amount', 'total_spent_ytd', 'remaining_balance', 'execution_rate',
        'number_of_unique_recipients', 'top_10_recipients', 'category_breakdown',
        'match_type', 'match_score'
    ]

    rollup = rollup[output_cols]

    print(f"   ✓ Generated {len(rollup):,} program rollup records")

    return rollup


def generate_unmatched_reports(unmatched_appropriations: pd.DataFrame,
                               unmatched_expenditures: pd.DataFrame,
                               all_expenditures: pd.DataFrame) -> Tuple[pd.DataFrame, pd.DataFrame]:
    """
    Generate unmatched reports with best candidate suggestions.

    Returns:
        Tuple of (dpb_unmatched_df, expenditures_unmatched_df)
    """
    print("\n" + "="*80)
    print("GENERATING UNMATCHED REPORTS")
    print("="*80)

    # DPB programs unmatched
    dpb_unmatched = unmatched_appropriations.copy()

    # For each unmatched DPB program, find best candidate from expenditures
    best_candidates = []
    for idx, row in dpb_unmatched.iterrows():
        agency = row['norm_agency']
        program = row['norm_program']
        fy = row['fiscal_year']

        # Find expenditures with same agency
        candidates = all_expenditures[
            (all_expenditures['fiscal_year'] == fy) &
            (all_expenditures['norm_agency'] == agency)
        ]

        if len(candidates) > 0:
            # Calculate fuzzy scores for programs
            scores = []
            for exp_program in candidates['norm_program'].unique():
                if exp_program:
                    score = fuzz.token_set_ratio(program, exp_program) / 100.0
                    scores.append((exp_program, score))

            if scores:
                scores.sort(key=lambda x: x[1], reverse=True)
                best_candidate, best_score = scores[0]
                best_candidates.append({
                    'best_candidate_program': best_candidate,
                    'best_candidate_score': best_score
                })
            else:
                best_candidates.append({
                    'best_candidate_program': '',
                    'best_candidate_score': 0.0
                })
        else:
            best_candidates.append({
                'best_candidate_program': '',
                'best_candidate_score': 0.0
            })

    dpb_unmatched = pd.concat([dpb_unmatched.reset_index(drop=True),
                                pd.DataFrame(best_candidates)], axis=1)

    # Expenditures unmatched - keep key fields including category for profiling
    exp_cols = ['fiscal_year', 'secretariat_name', 'agency_name', 'program_name',
                'service_area_name', 'vendor_name', 'amount', 'trans_date']

    # Add category_name if available
    if 'category_name' in unmatched_expenditures.columns:
        exp_cols.append('category_name')

    # Add expense_type if available
    if 'expense_type' in unmatched_expenditures.columns:
        exp_cols.append('expense_type')

    exp_unmatched = unmatched_expenditures[exp_cols].copy()

    print(f"   ✓ DPB programs unmatched: {len(dpb_unmatched):,}")
    print(f"   ✓ Expenditures unmatched: {len(exp_unmatched):,}")

    return dpb_unmatched, exp_unmatched


def save_outputs(program_vendor_decoder: pd.DataFrame,
                program_rollup_decoder: pd.DataFrame,
                dpb_unmatched: pd.DataFrame,
                exp_unmatched: pd.DataFrame):
    """
    Save all output files to the decoder_outputs directory.
    """
    print("\n" + "="*80)
    print("SAVING OUTPUTS")
    print("="*80)

    # Create output directories
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    UNMATCHED_DIR.mkdir(parents=True, exist_ok=True)

    # Save main outputs
    program_vendor_file = OUTPUT_DIR / "program_vendor_decoder.csv"
    program_vendor_decoder.to_csv(program_vendor_file, index=False)
    print(f"   ✓ Saved {program_vendor_file}")

    # Save external-only decoder (exclude placeholders)
    program_vendor_external = program_vendor_decoder[
        (program_vendor_decoder['recipient_type'] == 'external') &
        (program_vendor_decoder['is_placeholder'] == False)
    ].copy()
    program_vendor_external_file = OUTPUT_DIR / "program_vendor_decoder_external.csv"
    program_vendor_external.to_csv(program_vendor_external_file, index=False)
    print(f"   ✓ Saved {program_vendor_external_file} ({len(program_vendor_external):,} records)")
    print(f"      (Excluded {len(program_vendor_decoder[(program_vendor_decoder['recipient_type'] == 'external') & (program_vendor_decoder['is_placeholder'] == True)]):,} placeholder records)")

    program_rollup_file = OUTPUT_DIR / "program_rollup_decoder.csv"
    program_rollup_decoder.to_csv(program_rollup_file, index=False)
    print(f"   ✓ Saved {program_rollup_file}")

    # Save unmatched reports
    dpb_unmatched_file = UNMATCHED_DIR / "dpb_programs_unmatched.csv"
    dpb_unmatched.to_csv(dpb_unmatched_file, index=False)
    print(f"   ✓ Saved {dpb_unmatched_file}")

    # Save clean DPB unmatched (exclude pass-through, adjustment, internal finance programs)
    if 'dpb_is_pass_through' in dpb_unmatched.columns:
        dpb_unmatched_clean = dpb_unmatched[
            (dpb_unmatched['dpb_is_pass_through'] == False) &
            (dpb_unmatched['dpb_is_adjustment'] == False) &
            (dpb_unmatched['dpb_is_internal_finance'] == False)
        ].copy()

        dpb_unmatched_clean_file = UNMATCHED_DIR / "dpb_programs_unmatched_clean.csv"
        dpb_unmatched_clean.to_csv(dpb_unmatched_clean_file, index=False)

        excluded_count = len(dpb_unmatched) - len(dpb_unmatched_clean)
        print(f"   ✓ Saved {dpb_unmatched_clean_file} ({len(dpb_unmatched_clean):,} records)")
        print(f"      (Excluded {excluded_count:,} pass-through/adjustment/internal programs)")

    exp_unmatched_file = UNMATCHED_DIR / "expenditures_unmatched.csv"
    exp_unmatched.to_csv(exp_unmatched_file, index=False)
    print(f"   ✓ Saved {exp_unmatched_file}")

    print(f"\n✅ All outputs saved to: {OUTPUT_DIR}")


# ============================================================================
# MAIN PIPELINE
# ============================================================================

def main():
    """
    Main pipeline execution.
    """
    start_time = datetime.now()

    print("\n" + "="*80)
    print("BUDGET DECODER JOIN PIPELINE")
    print("="*80)
    print(f"Started at: {start_time.strftime('%Y-%m-%d %H:%M:%S')}")

    # Step 1: Load appropriations
    print("\n" + "="*80)
    print("STEP 1: LOAD APPROPRIATIONS")
    print("="*80)
    appropriations = load_appropriations()

    # Step 2: Create program-grain appropriations view
    program_grain_approp = create_program_grain_appropriations(appropriations)

    # Step 3: Load expenditures
    print("\n" + "="*80)
    print("STEP 2: LOAD EXPENDITURES")
    print("="*80)
    expenditures = load_all_expenditures()

    total_exp_ids = len(expenditures['exp_id'].unique())
    print(f"\n✓ Total unique expenditure IDs: {total_exp_ids:,}")

    # Step 4: Strict matching
    strict_matches, unmatched_approp, unmatched_exp, strict_matched_exp_ids = strict_match(
        program_grain_approp, expenditures
    )

    # Step 5: Fuzzy matching (only on unmatched expenditures)
    fuzzy_matches, still_unmatched_approp, still_unmatched_exp, fuzzy_matched_exp_ids = fuzzy_match(
        unmatched_approp, unmatched_exp, strict_matched_exp_ids
    )

    # Step 5b: Category-assisted fuzzy matching (opportunity buckets only)
    all_matched_so_far = strict_matched_exp_ids | fuzzy_matched_exp_ids
    category_matches, still_unmatched_approp, still_unmatched_exp, category_matched_exp_ids = category_assisted_fuzzy_match(
        still_unmatched_approp, still_unmatched_exp, all_matched_so_far
    )

    # Step 6: Combine all matches
    all_matches = combine_all_matches(strict_matches, fuzzy_matches, category_matches)

    # Verify no duplicates
    all_matched_exp_ids = strict_matched_exp_ids | fuzzy_matched_exp_ids | category_matched_exp_ids
    unique_matched_exp_ids = len(all_matched_exp_ids)

    if len(all_matches['exp_id'].unique()) != unique_matched_exp_ids:
        print(f"\n⚠️  WARNING: Duplicate exp_ids detected in matched data!")
        print(f"   Expected unique exp_ids: {unique_matched_exp_ids:,}")
        print(f"   Actual unique exp_ids: {len(all_matches['exp_id'].unique()):,}")

    # Step 7: Generate outputs
    program_vendor_decoder = generate_program_vendor_decoder(all_matches)
    program_rollup_decoder = generate_program_rollup_decoder(all_matches)
    dpb_unmatched, exp_unmatched = generate_unmatched_reports(
        still_unmatched_approp, still_unmatched_exp, expenditures
    )

    # Step 8: Save outputs
    save_outputs(program_vendor_decoder, program_rollup_decoder, dpb_unmatched, exp_unmatched)

    # Summary
    end_time = datetime.now()
    duration = (end_time - start_time).total_seconds()

    # Calculate match type breakdown based on unique exp_ids
    match_type_counts = all_matches['match_type'].value_counts()
    strict_count = match_type_counts.get('strict', 0)
    fuzzy_count = match_type_counts.get('fuzzy', 0)
    fuzzy_fund_tiebreak_count = match_type_counts.get('fuzzy_fund_tiebreak', 0)
    category_assisted_count = match_type_counts.get('category_assisted_fuzzy', 0)

    # Calculate unique exp_id counts by match type
    strict_unique = len(strict_matched_exp_ids)
    fuzzy_unique = len(fuzzy_matched_exp_ids)
    category_unique = len(category_matched_exp_ids)
    total_matched_unique = unique_matched_exp_ids

    # Calculate match rates
    raw_match_rate = (total_matched_unique / total_exp_ids * 100) if total_exp_ids > 0 else 0

    # Calculate adjusted match rate (excluding expected unmatched and placeholders)
    total_placeholders = expenditures['is_placeholder'].sum()
    total_expected_unmatched = expenditures['is_expected_unmatched'].sum()

    # Get unique exp_ids for placeholders and expected unmatched
    placeholder_exp_ids = set(expenditures[expenditures['is_placeholder']]['exp_id'].unique())
    expected_unmatched_exp_ids = set(expenditures[expenditures['is_expected_unmatched']]['exp_id'].unique())

    # Combine (union) to avoid double-counting
    excluded_exp_ids = placeholder_exp_ids | expected_unmatched_exp_ids
    total_excluded = len(excluded_exp_ids)

    # Adjusted denominator
    adjusted_total = total_exp_ids - total_excluded
    adjusted_match_rate = (total_matched_unique / adjusted_total * 100) if adjusted_total > 0 else 0

    print("\n" + "="*80)
    print("PIPELINE COMPLETE")
    print("="*80)
    print(f"Duration: {duration:.1f} seconds")
    print(f"\nExpenditure Matching Summary:")
    print(f"   Total unique expenditure IDs: {total_exp_ids:,}")
    print(f"   Matched unique exp_ids: {total_matched_unique:,}")
    print(f"   Unmatched unique exp_ids: {total_exp_ids - total_matched_unique:,}")
    print(f"   Raw match rate: {raw_match_rate:.1f}%")
    print(f"\nAdjusted Match Rate (excluding expected unmatched):")
    print(f"   Placeholders excluded: {len(placeholder_exp_ids):,} unique exp_ids")
    print(f"   Expected unmatched excluded: {len(expected_unmatched_exp_ids):,} unique exp_ids")
    print(f"   Total excluded: {total_excluded:,} unique exp_ids")
    print(f"   Adjusted denominator: {adjusted_total:,} unique exp_ids")
    print(f"   Adjusted match rate: {adjusted_match_rate:.1f}%")
    print(f"\nMatch type breakdown (by unique exp_id):")
    print(f"   Strict matches: {strict_unique:,} unique exp_ids ({len(strict_matches):,} records)")
    print(f"   Fuzzy matches: {fuzzy_unique:,} unique exp_ids ({len(fuzzy_matches):,} records)")
    if fuzzy_fund_tiebreak_count > 0:
        print(f"   Fuzzy with fund tie-break: {fuzzy_fund_tiebreak_count:,} records")
        print(f"   → {fuzzy_fund_tiebreak_count / (fuzzy_count + fuzzy_fund_tiebreak_count) * 100:.1f}% of fuzzy matches used fund tie-breaking")
    if category_unique > 0:
        print(f"   Category-assisted fuzzy matches: {category_unique:,} unique exp_ids ({len(category_matches):,} records)")
    print(f"\nDPB Program Matching Summary:")
    print(f"   Total unique DPB programs: {len(program_grain_approp):,}")
    print(f"   Matched DPB programs: {len(program_grain_approp) - len(still_unmatched_approp):,}")
    print(f"   Unmatched DPB programs: {len(still_unmatched_approp):,}")
    print(f"\nOutputs saved to: {OUTPUT_DIR}")


if __name__ == "__main__":
    main()





