#!/usr/bin/env python3
"""
Show what entities are being excluded by the enhanced NGO filter.
"""

import csv
import gzip
import json
from collections import defaultdict

# Load transfer payments
vendor_records = defaultdict(list)
with gzip.open('frontend/public/decoder/transfer_payments_full.csv.gz', 'rt', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        if row.get('expense_type') == 'Grnt-Nongovernmental Org':
            vendor_records[row['vendor_name']].append(row)

# Enhanced exclusion keywords
exclude_keywords = [
    # Authorities and Commissions
    'AUTHORITY', 'COMMISSION', 'AIRPORT', 'RAILROAD',
    'REDEVELOPMENT', 'HOUSING AUTHORITY', 'REDEVELOPMENT AND HOUSING',
    'PLANNING DISTRICT', 'PLANNING DISTR', 'PDC',
    'ECONOMIC DEVELOPMENT PARTNERSHIP', 'TOURISM',
    'RAIL AUTHORITY', 'COMMERCIAL SPACE',
    
    # Insurance/Health Plans
    'INSURANCE', 'HEALTH PLAN', 'HMO', 'CIGNA', 'SENTARA', 'KAISER', 'HEALTHKEEPERS', 'OPTIMA', 'OPTIMUM',
    
    # Universities and Colleges
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
    
    # Other
    'DETAILED DATA NOT YET AVAILABLE',
    'HUNTINGTON INGALLS'
]

local_govt_patterns = [
    'CITY OF', 'TOWN OF', 'COUNTY OF',
    'BOARD OF SUPERVISORS', 'CIRCUIT COURT', 'PUBLIC SCHOOLS',
    'COMMUNITY SERVICES BOARD',
    'DIRECTOR OF FINANCE',
    'MISCELLANEOUS ADJUSTMENT',
    '** CONTACT AGENCY FOR MORE INFO **'
]

# Find excluded entities
excluded_by_category = defaultdict(list)

for vendor_name, records in vendor_records.items():
    name_upper = vendor_name.upper()
    
    # Check which keyword triggered exclusion
    for keyword in exclude_keywords:
        if keyword in name_upper:
            total = sum(float(r.get('amount', 0) or 0) for r in records)
            excluded_by_category[keyword].append({
                'name': vendor_name,
                'total': total
            })
            break
    else:
        # Check local govt patterns
        for pattern in local_govt_patterns:
            if pattern in name_upper:
                total = sum(float(r.get('amount', 0) or 0) for r in records)
                excluded_by_category[pattern].append({
                    'name': vendor_name,
                    'total': total
                })
                break

# Print results
print('🚫 Entities Excluded by Enhanced NGO Filter\n')
print('=' * 100)

# Sort categories by number of exclusions
sorted_categories = sorted(excluded_by_category.items(), key=lambda x: len(x[1]), reverse=True)

for keyword, entities in sorted_categories[:15]:  # Show top 15 categories
    print(f'\n📌 Excluded by "{keyword}": {len(entities)} entities')
    
    # Sort by total amount
    entities_sorted = sorted(entities, key=lambda x: x['total'], reverse=True)
    
    # Show top 5 by spending
    for entity in entities_sorted[:5]:
        print(f'   • {entity["name"]}: ${entity["total"]:,.0f}')

print('\n' + '=' * 100)
total_excluded = sum(len(entities) for entities in excluded_by_category.values())
total_spending = sum(entity['total'] for entities in excluded_by_category.values() for entity in entities)
print(f'\n📊 Total Excluded: {total_excluded} entities')
print(f'💰 Total Spending: ${total_spending:,.0f}')

