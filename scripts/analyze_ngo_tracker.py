#!/usr/bin/env python3
"""
Analyze NGO Tracker data to understand entity classification breakdown.
Replicates the frontend logic to show what entities are in the NGO Tracker.
"""

import csv
import json
import gzip
from pathlib import Path
from collections import defaultdict

# Paths
REPO_ROOT = Path(__file__).parent.parent
TRANSFER_PAYMENTS_CSV = REPO_ROOT / 'frontend' / 'public' / 'decoder' / 'transfer_payments_full.csv.gz'
IRS_MATCHES_JSON = REPO_ROOT / 'frontend' / 'public' / 'data' / 'vendor_irs_matches.json'

def classify_entity_type(vendor_name: str, irs_verified: bool) -> str:
    """Classify entity type based on name patterns (matches frontend logic)."""
    if irs_verified:
        return 'nonprofit'
    
    name_upper = vendor_name.upper()
    
    # Legal entity keywords
    forprofit_keywords = [
        'LLC', 'L.L.C.', 'L L C',
        'INC.', 'INC', 'INCORPORATED',
        'CORP.', 'CORP', 'CORPORATION',
        'COMPANY', 'CO.', 'CO ',
        'LTD', 'LIMITED',
        'LP', 'L.P.', 'L P',
        'PLLC', 'P.L.L.C.',
        'PC', 'P.C.',
        'LLP', 'L.L.P.',
        'PA', 'P.A.',
    ]
    
    # Business patterns
    business_patterns = [
        'CONSULTING', 'CONSULTANTS',
        'SOLUTIONS', 'SERVICES',
        'GROUP', 'PARTNERS', 'ASSOCIATES',
        'TECHNOLOGIES', 'TECHNOLOGY',
        'SYSTEMS', 'SOFTWARE',
        'ENTERPRISES', 'INDUSTRIES',
        'HOLDINGS', 'INVESTMENTS',
        '& SONS', '& DAUGHTERS', '& BROS',
        'CONSTRUCTION', 'CONTRACTORS',
        'MANAGEMENT',
        'ELECTRIC', 'GAS & ELECTRIC', 'POWER COMPANY', 'ENERGY COMPANY',
        'INSURANCE CO', 'LIFE INSURANCE', 'HEALTH INSURANCE',
        'HEALTHKEEPERS', 'CIGNA', 'AETNA', 'ANTHEM', 'OPTIMA', 'OPTIMUM',
        'BANK ', ' BANK', 'FINANCIAL SERVICES', 'FINANCIAL MANAGEMENT',
        'REALTY', 'PROPERTIES LLC', 'PROPERTIES INC', 'REAL ESTATE',
        'BUILDERS INC',
        'MERCK', 'PFIZER', 'PHARMACEUTICAL'
    ]
    
    all_indicators = forprofit_keywords + business_patterns
    
    for keyword in all_indicators:
        if keyword in name_upper:
            return 'for-profit'
    
    return 'unknown'

def should_exclude_from_ngo(vendor_name: str) -> bool:
    """Check if vendor should be excluded from NGO classification (matches frontend logic)."""
    name_upper = vendor_name.upper()

    exclude_keywords = [
        # Authorities and Commissions
        'AUTHORITY', 'AUTH', 'COMMISSION', 'AIRPORT', 'RAILROAD',
        'REDEVELOPMENT', 'HOUSING AUTHORITY', 'REDEVELOPMENT AND HOUSING',
        'PLANNING DISTRICT', 'PLANNING DISTR', 'PDC',
        'ECONOMIC DEVELOPMENT', 'INDUSTRIAL DEVELOPMENT', 'WORKFORCE DEVELOPMENT',
        'INDUSTRIAL',
        'TOURISM AUTHORITY', 'TOURISM',
        'RAIL AUTHORITY', 'COMMERCIAL SPACE',
        'FORT MONROE AUTHORITY', 'INNOVATION AND ENTREPRENEUR',

        # Insurance/Health Plans
        'INSURANCE', 'HEALTH PLAN', 'HMO', 'CIGNA', 'SENTARA', 'KAISER', 'HEALTHKEEPERS', 'OPTIMA', 'OPTIMUM',
        'CAREFIRST', 'BLUECHOICE', 'GROUP HOSPITALIZATION',

        # Universities and Colleges (comprehensive list)
        'UNIVERSITY', 'COLLEGE', 'INSTITUTE OF TECHNOLOGY',
        'VIRGINIA TECH', 'VA TECH', 'VPI', 'VIRGINIA POLYTECHNIC',
        'VIRGINIA COMMONWEALTH UNIVERSITY', 'VCU',
        'GEORGE MASON UNIVERSITY', 'GMU',
        'JAMES MADISON UNIVERSITY', 'JMU',
        'OLD DOMINION UNIVERSITY', 'ODU',
        'WILLIAM & MARY', 'WILLIAM AND MARY',
        'RADFORD UNIVERSITY', 'LONGWOOD UNIVERSITY',
        'CHRISTOPHER NEWPORT UNIVERSITY', 'CNU',
        'VIRGINIA STATE UNIVERSITY', 'VSU',
        'NORFOLK STATE UNIVERSITY', 'NSU',
        'UNIVERSITY OF VIRGINIA', 'UVA',
        'VIRGINIA MILITARY INSTITUTE', 'VMI',
        'LIBERTY UNIVERSITY', 'HAMPTON UNIVERSITY', 'VIRGINIA UNION UNIVERSITY',
        'SHENANDOAH UNIVERSITY', 'UNIVERSITY OF LYNCHBURG', 'MARYMOUNT UNIVERSITY',
        'MARY BALDWIN UNIVERSITY', 'VIRGINIA WESLEYAN UNIVERSITY', 'REGENT UNIVERSITY',
        'AVERETT UNIVERSITY', 'UNIVERSITY OF RICHMOND', 'HAMPDEN-SYDNEY',
        'RANDOLPH MACON', 'ROANOKE COLLEGE', 'BRIDGEWATER COLLEGE',
        'EMORY & HENRY', 'FERRUM COLLEGE',

        # Law Enforcement
        'SHERIFF', "SHERIFF'S OFFICE", 'POLICE DEPARTMENT',

        # Correctional/Detention Facilities
        'DETENTION', 'CORRECTIONAL', 'JAIL', 'PRISON',
        'JUVENILE DETENTION', 'DETENTION CENTER',

        # Libraries (often government-run)
        'LIBRARY SYSTEM', 'REGIONAL LIBRARY', 'PUBLIC LIBRARY',

        # State/Local Government Departments
        'DEPARTMENT OF', 'DEPT OF', 'DEPARTMENT FOR',
        'DIVISION OF', 'OFFICE OF',

        # Regional/District Entities
        'REGIONAL', 'DISTRICT OF', 'GOVERNMENTAL COOPERATIVE',
        'WATERSHED DISTRICT', 'SCHOOL DISTRICT',
        'PLANNING DISTRICT COMM', 'GOVERNMENTAL DISTRICT',
        'JUDICIAL DISTRICT',

        # Councils (specific types)
        'GRAINS COUNCIL', 'EGG COUNCIL', 'BEEF COUNCIL', 'HORSE COUNCIL',
        'REGIONAL COUNCIL',

        # Hospitals and Healthcare Systems
        'HOSPITAL', 'MEDICAL CENTER', 'HEALTH SYSTEM',

        # Centers (government-run or large institutions)
        'SPACE CENTER', 'AIR & SPACE',

        # Large Foundations (not community nonprofits)
        'VIRGINIA EARLY CHILDHOOD FOUNDATION',
        'VIRGINIA RESOURCES AUTHORITY',
        'GROW CAPITAL JOBS FOUNDATION',

        # Associations (often trade/industry groups)
        'HOSPITAL & HEALTHCARE ASSOCIATI', 'HOSPITAL RESEARCH',
        'PHARMACISTS ASSOCIATION', 'TRANSIT ASSOCIATION',
        'DRIVER EDUCATION', 'VOLUNTEER RESCUE',

        # Financial Institutions
        'CREDIT UNION', 'FEDERAL CREDIT UNION',

        # Railroads
        'BELT LINE RR', 'RAILROAD',

        # Research Institutions
        'RESEARCH ASSOC', 'UNIVERSITIES RESEARCH',

        # Other
        'DETAILED DATA NOT YET AVAILABLE',
        'MISCELLANEOUS ADJUSTMENT',
        'HUNTINGTON INGALLS',
        'HITACHI',
        'BOARD OF CONTROL',
        'CITY SCHOOLS', 'TOWN SCHOOLS'
    ]

    local_govt_patterns = [
        'CITY OF', 'TOWN OF', 'COUNTY OF',
        'BOARD OF SUPERVISORS', 'CIRCUIT COURT', 'PUBLIC SCHOOLS',
        'COMMUNITY SERVICES BOARD',
        'DIRECTOR OF FINANCE',
        'MISCELLANEOUS ADJUSTMENT',
        '** CONTACT AGENCY FOR MORE INFO **'
    ]

    # Check exclusion keywords (with word boundary for short acronyms)
    import re
    for keyword in exclude_keywords:
        # For short acronyms (3 chars or less), use word boundary matching
        if len(keyword) <= 3:
            if re.search(rf'\b{re.escape(keyword)}\b', name_upper):
                return True
        else:
            # For longer keywords, use simple includes
            if keyword in name_upper:
                return True

    for pattern in local_govt_patterns:
        if pattern in name_upper:
            return True

    # Check county/city patterns
    if name_upper.endswith(' COUNTY:') or name_upper.startswith('CITY '):
        return True

    return False

def main():
    # Load IRS matches
    with open(IRS_MATCHES_JSON, 'r') as f:
        irs_matches = json.load(f)
    
    print(f"Loaded {len(irs_matches)} IRS verified nonprofits\n")
    
    # Load transfer payments and group by vendor
    vendor_records = defaultdict(list)
    with gzip.open(TRANSFER_PAYMENTS_CSV, 'rt', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            vendor_records[row['vendor_name']].append(row)
    
    print(f"Total unique vendors: {len(vendor_records)}\n")
    
    # Apply NGO Tracker filters
    ngo_grant_expense_type = 'Grnt-Nongovernmental Org'
    max_nonprofit_total = 30_000_000
    
    filter_stats = {
        'has_ngo_grant': 0,
        'after_exclusion': 0,
        'after_amount_filter': 0,
        'after_forprofit_filter': 0,
    }
    
    entity_breakdown = {
        'nonprofit': [],
        'for-profit': [],
        'unknown': []
    }
    
    for vendor_name, records in vendor_records.items():
        # Filter 1: Must receive "Grnt-Nongovernmental Org"
        has_ngo_grant = any(r['expense_type'] == ngo_grant_expense_type for r in records)
        if not has_ngo_grant:
            continue
        filter_stats['has_ngo_grant'] += 1
        
        # Filter 2: Exclude quasi-governmental entities
        if should_exclude_from_ngo(vendor_name):
            continue
        filter_stats['after_exclusion'] += 1
        
        # Filter 3: Total must be < $30M
        total_amount = sum(float(r.get('amount', 0) or 0) for r in records)
        if total_amount >= max_nonprofit_total:
            continue
        filter_stats['after_amount_filter'] += 1
        
        # Filter 4: Exclude for-profit companies
        irs_verified = vendor_name in irs_matches
        entity_type = classify_entity_type(vendor_name, irs_verified)
        
        if entity_type == 'for-profit':
            continue
        filter_stats['after_forprofit_filter'] += 1
        
        # Track entity type
        entity_breakdown[entity_type].append({
            'vendor_name': vendor_name,
            'total_amount': total_amount
        })
    
    # Print results
    print("📊 NGO Tracker Filter Stages:")
    print(f"  After Filter 1 (has NGO grant): {filter_stats['has_ngo_grant']}")
    print(f"  After Filter 2 (exclude keywords): {filter_stats['after_exclusion']}")
    print(f"  After Filter 3 (<$30M): {filter_stats['after_amount_filter']}")
    print(f"  After Filter 4 (exclude for-profits): {filter_stats['after_forprofit_filter']}")
    print()
    
    print("🔍 Entity Type Breakdown in NGO Tracker:")
    print(f"  Nonprofit (IRS verified): {len(entity_breakdown['nonprofit'])}")
    print(f"  Unknown: {len(entity_breakdown['unknown'])}")
    print(f"  For-Profit (should be 0): {len(entity_breakdown['for-profit'])}")
    print(f"  Total: {filter_stats['after_forprofit_filter']}")

if __name__ == '__main__':
    main()

