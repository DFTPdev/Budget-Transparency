#!/usr/bin/env python3
"""
Legislator Totals Audit for Member Request Amendments (2024 + 2025)

This script computes per-legislator totals using the same business rules as the frontend:
- Only second-year amendments
- netAmount > 0
- isLanguageOnly == False
- Dedupe by fingerprint (matching TypeScript logic)

Outputs:
- CSV: data/amendments/legislator_member_request_totals_2024_2025.csv
- Stdout: Top 20 legislators by totalNetAmount for each year
"""

import json
import csv
from pathlib import Path
from collections import defaultdict

def build_fingerprint(record: dict) -> str:
    """
    Build deduplication fingerprint matching TypeScript logic in aggregation.ts
    """
    bill = record.get('billNumber', '')
    item = record.get('itemNumber', '')
    patron = record.get('patronName', '').lower().strip()
    
    # Round amounts to nearest 1000
    gf = round(record.get('deltaGF', 0) / 1000) * 1000
    ngf = round(record.get('deltaNGF', 0) / 1000) * 1000
    
    # First 50 chars of description
    desc = record.get('descriptionShort', '') or record.get('descriptionFull', '')
    desc_prefix = desc[:50].lower().strip()
    
    return f"{bill}|{item}|{patron}|{gf}|{ngf}|{desc_prefix}"

def dedupe_records(records: list) -> list:
    """Deduplicate records by fingerprint"""
    seen = set()
    deduped = []
    
    for record in records:
        fp = build_fingerprint(record)
        if fp not in seen:
            seen.add(fp)
            deduped.append(record)
    
    return deduped

def main():
    # Load both JSON files
    data_2024_path = Path('data/amendments/member_requests_2024.json')
    data_2025_path = Path('data/amendments/member_requests_2025.json')
    
    print("Loading amendment data...")
    with open(data_2024_path, 'r') as f:
        data_2024 = json.load(f)
    with open(data_2025_path, 'r') as f:
        data_2025 = json.load(f)
    
    print(f"Total records: {len(data_2024) + len(data_2025):,}")
    
    # Group by (sessionYear, patronName)
    legislator_data = defaultdict(lambda: {
        'sessionYear': 0,
        'patronName': '',
        'records': [],
    })
    
    for record in data_2024 + data_2025:
        # Apply frontend business rules
        if record.get('stage') != 'member_request':
            continue
        if record.get('isLanguageOnly', False):
            continue
        if record.get('netAmount', 0) <= 0:
            continue
        
        session_year = record.get('sessionYear')
        patron_name = record.get('patronName', '')
        
        key = (session_year, patron_name)
        legislator_data[key]['sessionYear'] = session_year
        legislator_data[key]['patronName'] = patron_name
        legislator_data[key]['records'].append(record)
    
    # Compute totals for each legislator
    results = []
    
    for key, data in legislator_data.items():
        # Deduplicate
        deduped = dedupe_records(data['records'])
        
        if not deduped:
            continue
        
        amounts = [r['netAmount'] for r in deduped]
        
        results.append({
            'sessionYear': data['sessionYear'],
            'patronName': data['patronName'],
            'amendmentCount': len(deduped),
            'totalNetAmount': sum(amounts),
            'largestAmendment': max(amounts),
            'smallestAmendment': min(amounts),
        })
    
    # Sort by sessionYear, then totalNetAmount descending
    results.sort(key=lambda x: (x['sessionYear'], -x['totalNetAmount']))
    
    # Write CSV
    csv_path = Path('data/amendments/legislator_member_request_totals_2024_2025.csv')
    csv_path.parent.mkdir(parents=True, exist_ok=True)
    
    with open(csv_path, 'w', newline='') as f:
        fieldnames = ['sessionYear', 'patronName', 'amendmentCount', 'totalNetAmount', 
                     'largestAmendment', 'smallestAmendment']
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(results)
    
    print(f"✓ CSV written to {csv_path}")
    
    # Print top 20 for each year
    print("\n" + "="*80)
    print("TOP 20 LEGISLATORS BY TOTAL NET AMOUNT - 2024")
    print("="*80)
    print(f"{'Rank':<6} {'Patron Name':<25} {'Amendments':<12} {'Total Amount':<20}")
    print("-"*80)
    
    results_2024 = [r for r in results if r['sessionYear'] == 2024][:20]
    for idx, r in enumerate(results_2024, 1):
        print(f"{idx:<6} {r['patronName']:<25} {r['amendmentCount']:<12} ${r['totalNetAmount']:>18,.0f}")
    
    print("\n" + "="*80)
    print("TOP 20 LEGISLATORS BY TOTAL NET AMOUNT - 2025")
    print("="*80)
    print(f"{'Rank':<6} {'Patron Name':<25} {'Amendments':<12} {'Total Amount':<20}")
    print("-"*80)
    
    results_2025 = [r for r in results if r['sessionYear'] == 2025][:20]
    for idx, r in enumerate(results_2025, 1):
        print(f"{idx:<6} {r['patronName']:<25} {r['amendmentCount']:<12} ${r['totalNetAmount']:>18,.0f}")

if __name__ == '__main__':
    main()

