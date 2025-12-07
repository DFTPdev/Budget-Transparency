#!/usr/bin/env python3
"""Quick analysis of NGO grants by expense type"""

import csv
import gzip
from collections import Counter, defaultdict

csv_file = "frontend/public/decoder/transfer_payments_full.csv.gz"

print("=" * 100)
print("NGO GRANTS ANALYSIS - BY EXPENSE_TYPE")
print("=" * 100)

priority_types = [
    'Grnt-Nongovernmental Org',
    'Grnt-Intergovernmental Org',
    'Disaster Aid-Nongovernmnt Org',
]

stats = {}
for exp_type in priority_types:
    stats[exp_type] = {'count': 0, 'vendors': set(), 'amount': 0, 'samples': []}

with gzip.open(csv_file, 'rt') as f:
    reader = csv.DictReader(f)
    
    for row in reader:
        exp_type = row['expense_type']
        if exp_type in priority_types:
            vendor = row['vendor_name']
            amount = float(row['amount']) if row['amount'] else 0
            
            stats[exp_type]['count'] += 1
            stats[exp_type]['vendors'].add(vendor)
            stats[exp_type]['amount'] += amount
            
            if len(stats[exp_type]['samples']) < 10:
                stats[exp_type]['samples'].append((vendor, amount))

print("\n📊 PRIORITY NGO EXPENSE TYPES:\n")
for exp_type in priority_types:
    s = stats[exp_type]
    count = s['count']
    unique_vendors = len(s['vendors'])
    total_amount = s['amount']
    
    print(f"🎯 {exp_type}")
    print(f"   Records: {count:,}")
    print(f"   Unique Vendors: {unique_vendors:,}")
    print(f"   Total Amount: ${total_amount:,.2f}")
    if count > 0:
        print(f"   Avg per Record: ${total_amount/count:,.2f}")
    
    if s['samples']:
        print(f"\n   Sample Recipients:")
        for vendor, amt in s['samples'][:5]:
            print(f"     • {vendor[:55]:55} ${amt:>12,.2f}")
    print()

print("=" * 100)

