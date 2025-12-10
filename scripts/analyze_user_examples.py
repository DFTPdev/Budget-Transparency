#!/usr/bin/env python3
"""
Analyze user-provided examples to find patterns for exclusion.
"""

import csv
import gzip
import json
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

# Examples to analyze
examples = [
    'DANVILLE-PITTSYLVANIA REG. INDUSTRIAL',
    'Virginia Health Workforce Development',
    'Board of Control for Southern Regional',
    'Hitachi Energy USA In',
    'Valley Ridge District of the Virginia An'
]

print('🔍 Analyzing User Examples:\n')
print('=' * 100)

for vendor_name in examples:
    # Find exact or partial matches
    matches = [v for v in vendor_records.keys() if vendor_name.lower() in v.lower() or v.lower() in vendor_name.lower()]
    
    if matches:
        for match in matches[:3]:  # Show top 3 matches
            total = sum(float(r.get('amount', 0) or 0) for r in vendor_records[match])
            irs_verified = match in irs_matches
            print(f'\n📌 {match}')
            print(f'   Total: ${total:,.0f}')
            print(f'   IRS Verified: {irs_verified}')
            print(f'   Pattern Analysis:')
            
            name_upper = match.upper()
            
            # Check for patterns
            if 'INDUSTRIAL' in name_upper or 'DEVELOPMENT' in name_upper:
                print(f'   ⚠️  Economic/industrial development entity')
            if 'BOARD OF' in name_upper or 'CONTROL' in name_upper:
                print(f'   ⚠️  Government board/control entity')
            if 'WORKFORCE' in name_upper:
                print(f'   ⚠️  Workforce development (quasi-governmental)')
            if 'DISTRICT' in name_upper and 'VIRGINIA' in name_upper:
                print(f'   ⚠️  Virginia district (likely governmental)')
            if 'REGIONAL' in name_upper:
                print(f'   ⚠️  Regional entity (likely governmental)')
            if ' INC' in name_upper or 'LLC' in name_upper or 'CORP' in name_upper:
                print(f'   ⚠️  For-profit company')
    else:
        print(f'\n❌ No match found for: {vendor_name}')

print('\n' + '=' * 100)
print('\n🔍 Now searching for ALL Unknown entities with similar patterns...\n')

# Find all unknown entities with these patterns
patterns_to_exclude = [
    'INDUSTRIAL DEVELOPMENT',
    'ECONOMIC DEVELOPMENT',
    'WORKFORCE DEVELOPMENT',
    'BOARD OF',
    'REGIONAL',
    'DISTRICT OF',
]

unknown_with_patterns = defaultdict(list)

for vendor_name, records in vendor_records.items():
    # Skip IRS verified
    if vendor_name in irs_matches:
        continue
    
    name_upper = vendor_name.upper()
    total = sum(float(r.get('amount', 0) or 0) for r in records)
    
    for pattern in patterns_to_exclude:
        if pattern in name_upper:
            unknown_with_patterns[pattern].append({
                'name': vendor_name,
                'total': total
            })
            break

# Show results
for pattern, entities in sorted(unknown_with_patterns.items(), key=lambda x: len(x[1]), reverse=True):
    print(f'\n📌 Pattern: "{pattern}" - {len(entities)} entities')
    
    # Sort by total
    entities_sorted = sorted(entities, key=lambda x: x['total'], reverse=True)
    
    # Show top 10
    for entity in entities_sorted[:10]:
        print(f'   • {entity["name"]}: ${entity["total"]:,.0f}')

total_entities = sum(len(entities) for entities in unknown_with_patterns.values())
total_spending = sum(entity['total'] for entities in unknown_with_patterns.values() for entity in entities)
print(f'\n📊 Total entities with these patterns: {total_entities}')
print(f'💰 Total spending: ${total_spending:,.0f}')

