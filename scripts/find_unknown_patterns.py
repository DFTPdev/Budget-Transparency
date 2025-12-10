#!/usr/bin/env python3
"""
Find common patterns in Unknown entities to identify more exclusions.
"""

import csv
import gzip
import json
from collections import defaultdict, Counter

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

# Classify entities
def classify_entity_type(vendor_name: str, irs_verified: bool) -> str:
    """Classify entity type (simplified version)."""
    if irs_verified:
        return 'nonprofit'
    
    name_upper = vendor_name.upper()
    
    # For-profit keywords
    forprofit_keywords = [
        'LLC', 'INC', 'CORP', 'LTD', 'LP', 'PLLC', 'PC', 'LLP', 'PA',
        'CONSULTING', 'SOLUTIONS', 'TECHNOLOGIES', 'CONSTRUCTION', 'MANAGEMENT'
    ]
    
    for keyword in forprofit_keywords:
        if keyword in name_upper:
            return 'for-profit'
    
    return 'unknown'

# Find unknown entities
unknown_entities = []
for vendor_name, records in vendor_records.items():
    irs_verified = vendor_name in irs_matches
    entity_type = classify_entity_type(vendor_name, irs_verified)
    
    if entity_type == 'unknown':
        total = sum(float(r.get('amount', 0) or 0) for r in records)
        unknown_entities.append({
            'name': vendor_name,
            'total': total
        })

print(f'📊 Total Unknown Entities: {len(unknown_entities)}\n')
print('=' * 100)

# Extract common words/patterns
word_counts = Counter()
for entity in unknown_entities:
    words = entity['name'].upper().split()
    for word in words:
        # Skip very short words
        if len(word) >= 4:
            word_counts[word] += 1

print('\n🔍 Most Common Words in Unknown Entities (≥4 chars):\n')
for word, count in word_counts.most_common(50):
    # Find entities with this word
    entities_with_word = [e for e in unknown_entities if word in e['name'].upper()]
    total_spending = sum(e['total'] for e in entities_with_word)
    
    # Show if appears in at least 3 entities
    if count >= 3:
        print(f'{word:30} - {count:3} entities, ${total_spending:>15,.0f}')

print('\n' + '=' * 100)
print('\n📋 Sample Unknown Entities (Top 30 by spending):\n')

# Sort by total
unknown_sorted = sorted(unknown_entities, key=lambda x: x['total'], reverse=True)

for i, entity in enumerate(unknown_sorted[:30], 1):
    print(f'{i:2}. {entity["name"]:60} ${entity["total"]:>12,.0f}')

