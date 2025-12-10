#!/usr/bin/env python3
"""
Show what's still in the Unknown category after enhanced filtering.
"""

import csv
import gzip
import json
import re
from collections import defaultdict

# Load vendor data
vendor_records = defaultdict(list)
with gzip.open('frontend/public/decoder/transfer_payments_full.csv.gz', 'rt', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        if row.get('expense_type') == 'Grnt-Nongovernmental Org':
            vendor_records[row['vendor_name']].append(row)

# Load IRS matches
with open('frontend/public/data/vendor_irs_matches.json', 'r') as f:
    irs_matches = json.load(f)

# Exclusion logic (matching frontend)
exclude_keywords = [
    'AUTHORITY', 'AUTH', 'COMMISSION', 'AIRPORT', 'RAILROAD',
    'REDEVELOPMENT', 'HOUSING AUTHORITY', 'REDEVELOPMENT AND HOUSING',
    'PLANNING DISTRICT', 'PLANNING DISTR', 'PDC',
    'ECONOMIC DEVELOPMENT', 'INDUSTRIAL DEVELOPMENT', 'WORKFORCE DEVELOPMENT',
    'TOURISM AUTHORITY', 'TOURISM',
    'RAIL AUTHORITY', 'COMMERCIAL SPACE',
    'FORT MONROE AUTHORITY', 'INNOVATION AND ENTREPRENEUR',
    'INSURANCE', 'HEALTH PLAN', 'HMO', 'CIGNA', 'SENTARA', 'KAISER', 'HEALTHKEEPERS', 'OPTIMA', 'OPTIMUM',
    'CAREFIRST', 'BLUECHOICE', 'GROUP HOSPITALIZATION',
    'UNIVERSITY', 'COLLEGE', 'INSTITUTE OF TECHNOLOGY',
    'VIRGINIA TECH', 'VA TECH', 'VPI', 'VIRGINIA POLYTECHNIC',
    'LIBERTY UNIVERSITY', 'HAMPTON UNIVERSITY', 'VIRGINIA UNION UNIVERSITY',
    'SHENANDOAH UNIVERSITY', 'UNIVERSITY OF LYNCHBURG', 'MARYMOUNT UNIVERSITY',
    'MARY BALDWIN UNIVERSITY', 'VIRGINIA WESLEYAN UNIVERSITY', 'REGENT UNIVERSITY',
    'AVERETT UNIVERSITY', 'UNIVERSITY OF RICHMOND', 'HAMPDEN-SYDNEY',
    'RANDOLPH MACON', 'ROANOKE COLLEGE', 'BRIDGEWATER COLLEGE',
    'EMORY & HENRY', 'FERRUM COLLEGE',
    'SHERIFF', "SHERIFF'S OFFICE", 'POLICE DEPARTMENT',
    'DETENTION', 'CORRECTIONAL', 'JAIL', 'PRISON',
    'JUVENILE DETENTION', 'DETENTION CENTER',
    'LIBRARY SYSTEM', 'REGIONAL LIBRARY', 'PUBLIC LIBRARY',
    'DEPARTMENT OF', 'DEPT OF', 'DEPARTMENT FOR',
    'DIVISION OF', 'OFFICE OF',
    'REGIONAL', 'DISTRICT OF', 'GOVERNMENTAL COOPERATIVE',
    'HOSPITAL', 'MEDICAL CENTER', 'HEALTH SYSTEM',
    'VIRGINIA EARLY CHILDHOOD FOUNDATION',
    'VIRGINIA RESOURCES AUTHORITY',
    'GROW CAPITAL JOBS FOUNDATION',
    'HOSPITAL & HEALTHCARE ASSOCIATI', 'HOSPITAL RESEARCH',
    'DETAILED DATA NOT YET AVAILABLE',
    'MISCELLANEOUS ADJUSTMENT',
    'HUNTINGTON INGALLS',
    'BOARD OF CONTROL'
]

local_govt_patterns = [
    'CITY OF', 'TOWN OF', 'COUNTY OF',
    'BOARD OF SUPERVISORS', 'CIRCUIT COURT', 'PUBLIC SCHOOLS',
    'COMMUNITY SERVICES BOARD',
    'DIRECTOR OF FINANCE',
    'MISCELLANEOUS ADJUSTMENT',
    '** CONTACT AGENCY FOR MORE INFO **'
]

def should_exclude(vendor_name):
    name_upper = vendor_name.upper()
    
    # Check exclusion keywords
    for keyword in exclude_keywords:
        if len(keyword) <= 3:
            if re.search(rf'\b{re.escape(keyword)}\b', name_upper):
                return True
        else:
            if keyword in name_upper:
                return True
    
    # Check local govt patterns
    for pattern in local_govt_patterns:
        if pattern in name_upper:
            return True
    
    if name_upper.endswith(' COUNTY:') or name_upper.startswith('CITY '):
        return True
    
    return False

def classify_entity_type(vendor_name, irs_verified):
    if irs_verified:
        return 'nonprofit'
    
    name_upper = vendor_name.upper()
    
    forprofit_keywords = [
        'LLC', 'INC', 'CORP', 'LTD', 'LP', 'PLLC', 'PC', 'LLP', 'PA',
        'CONSULTING', 'SOLUTIONS', 'TECHNOLOGIES', 'CONSTRUCTION', 'MANAGEMENT'
    ]
    
    for keyword in forprofit_keywords:
        if keyword in name_upper:
            return 'for-profit'
    
    return 'unknown'

# Find remaining unknown entities
remaining_unknown = []

for vendor_name, records in vendor_records.items():
    # Filter 1: Has NGO grant
    if not any(r.get('expense_type') == 'Grnt-Nongovernmental Org' for r in records):
        continue
    
    # Filter 2: Exclude quasi-governmental
    if should_exclude(vendor_name):
        continue
    
    total = sum(float(r.get('amount', 0) or 0) for r in records)
    
    # Filter 3: < $30M
    if total >= 30000000:
        continue
    
    # Filter 4: Exclude for-profits
    irs_verified = vendor_name in irs_matches
    entity_type = classify_entity_type(vendor_name, irs_verified)
    
    if entity_type == 'for-profit':
        continue
    
    if entity_type == 'unknown':
        remaining_unknown.append({
            'name': vendor_name,
            'total': total
        })

print(f'📊 Remaining Unknown Entities: {len(remaining_unknown)}\n')
print('=' * 100)
print('\n📋 Top 50 Unknown Entities by Spending:\n')

# Sort by total
remaining_sorted = sorted(remaining_unknown, key=lambda x: x['total'], reverse=True)

for i, entity in enumerate(remaining_sorted[:50], 1):
    print(f'{i:2}. {entity["name"]:70} ${entity["total"]:>12,.0f}')

