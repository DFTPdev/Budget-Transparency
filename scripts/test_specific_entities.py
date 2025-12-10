#!/usr/bin/env python3
"""
Test if specific entities are being excluded by the filter logic.
"""

import re

# Exclusion logic (matching frontend)
exclude_keywords = [
    'AUTHORITY', 'AUTH', 'COMMISSION', 'AIRPORT', 'RAILROAD',
    'REDEVELOPMENT', 'HOUSING AUTHORITY', 'REDEVELOPMENT AND HOUSING',
    'PLANNING DISTRICT', 'PLANNING DISTR', 'PDC',
    'ECONOMIC DEVELOPMENT', 'INDUSTRIAL DEVELOPMENT', 'WORKFORCE DEVELOPMENT',
    'INDUSTRIAL',
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
    'WATERSHED DISTRICT', 'SCHOOL DISTRICT',
    'PLANNING DISTRICT COMM', 'GOVERNMENTAL DISTRICT',
    'JUDICIAL DISTRICT',
    'GRAINS COUNCIL', 'EGG COUNCIL', 'BEEF COUNCIL', 'HORSE COUNCIL',
    'REGIONAL COUNCIL',
    'HOSPITAL', 'MEDICAL CENTER', 'HEALTH SYSTEM',
    'SPACE CENTER', 'AIR & SPACE',
    'VIRGINIA EARLY CHILDHOOD FOUNDATION',
    'VIRGINIA RESOURCES AUTHORITY',
    'GROW CAPITAL JOBS FOUNDATION',
    'HOSPITAL & HEALTHCARE ASSOCIATI', 'HOSPITAL RESEARCH',
    'PHARMACISTS ASSOCIATION', 'TRANSIT ASSOCIATION',
    'DRIVER EDUCATION', 'VOLUNTEER RESCUE',
    'CREDIT UNION', 'FEDERAL CREDIT UNION',
    'BELT LINE RR', 'RAILROAD',
    'RESEARCH ASSOC', 'UNIVERSITIES RESEARCH',
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

def should_exclude(vendor_name):
    name_upper = vendor_name.upper()
    
    # Check exclusion keywords
    for keyword in exclude_keywords:
        if len(keyword) <= 3:
            if re.search(rf'\b{re.escape(keyword)}\b', name_upper):
                print(f'  ✅ EXCLUDED by keyword (word boundary): "{keyword}"')
                return True
        else:
            if keyword in name_upper:
                print(f'  ✅ EXCLUDED by keyword: "{keyword}"')
                return True
    
    # Check local govt patterns
    for pattern in local_govt_patterns:
        if pattern in name_upper:
            print(f'  ✅ EXCLUDED by local govt pattern: "{pattern}"')
            return True
    
    if name_upper.endswith(' COUNTY:') or name_upper.startswith('CITY '):
        print(f'  ✅ EXCLUDED by county/city pattern')
        return True
    
    print(f'  ❌ NOT EXCLUDED')
    return False

# Test specific entities
test_entities = [
    'DANVILLE-PITTSYLVANIA REG. INDUSTRIAL',
    'Virginia Air & Space Center',
    'Lake Barcroft Watershed District',
    'U.S. Grains Council',
    'Hitachi Energy USA In'
]

print('=' * 100)
print('Testing Specific Entities Against Exclusion Filter')
print('=' * 100)

for entity in test_entities:
    print(f'\n🔍 Testing: {entity}')
    should_exclude(entity)

