#!/usr/bin/env python3
"""
Check what entities contain DISTRICT or COUNCIL to avoid over-filtering.
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

# Find entities with DISTRICT or COUNCIL
district_entities = []
council_entities = []

for vendor_name in vendor_records.keys():
    name_upper = vendor_name.upper()
    total = sum(float(r.get('amount', 0) or 0) for r in vendor_records[vendor_name])
    irs_verified = vendor_name in irs_matches
    
    if 'DISTRICT' in name_upper:
        district_entities.append({
            'name': vendor_name,
            'total': total,
            'irs': irs_verified
        })
    
    if 'COUNCIL' in name_upper:
        council_entities.append({
            'name': vendor_name,
            'total': total,
            'irs': irs_verified
        })

print('=' * 100)
print(f'Entities with DISTRICT: {len(district_entities)}')
print('=' * 100)

district_sorted = sorted(district_entities, key=lambda x: x['total'], reverse=True)
for i, entity in enumerate(district_sorted[:30], 1):
    irs_mark = '✓' if entity['irs'] else ' '
    print(f'{i:2}. [{irs_mark}] {entity["name"]:70} ${entity["total"]:>12,.0f}')

print('\n' + '=' * 100)
print(f'Entities with COUNCIL: {len(council_entities)}')
print('=' * 100)

council_sorted = sorted(council_entities, key=lambda x: x['total'], reverse=True)
for i, entity in enumerate(council_sorted[:30], 1):
    irs_mark = '✓' if entity['irs'] else ' '
    print(f'{i:2}. [{irs_mark}] {entity["name"]:70} ${entity["total"]:>12,.0f}')

