#!/usr/bin/env python3
"""
Global Amount & Flag Audit for Member Request Amendments (2024 + 2025)

This script identifies suspicious records where:
- netAmount == 0 but description contains money indicators
- isLanguageOnly == true but description contains money indicators
- netAmount != 0 but deltaGF and deltaNGF are both 0 (inconsistent)

Outputs:
- CSV: data/amendments/member_requests_suspicious_amounts_2024_2025.csv
- Markdown: AMENDMENT_VAULT_AMOUNT_AUDIT_2024_2025.md
"""

import json
import csv
import re
from pathlib import Path
from collections import defaultdict

# Money indicator patterns
MONEY_WORDS = ['million', 'thousand', 'hundred', 'grant', 'appropriation', 'funding', 'funds']
DOLLAR_SIGN_PATTERN = re.compile(r'\$')

def has_money_words(text: str) -> bool:
    """Check if text contains money-related words"""
    if not text:
        return False
    text_lower = text.lower()
    return any(word in text_lower for word in MONEY_WORDS)

def has_dollar_sign(text: str) -> bool:
    """Check if text contains dollar sign"""
    if not text:
        return False
    return bool(DOLLAR_SIGN_PATTERN.search(text))

def analyze_record(record: dict) -> dict | None:
    """
    Analyze a single record for suspicious patterns.
    Returns dict with issue details if suspicious, None otherwise.
    """
    session_year = record.get('sessionYear')
    bill_number = record.get('billNumber')
    patron_name = record.get('patronName')
    item_number = record.get('itemNumber')
    net_amount = record.get('netAmount', 0)
    delta_gf = record.get('deltaGF', 0)
    delta_ngf = record.get('deltaNGF', 0)
    is_language_only = record.get('isLanguageOnly', False)
    
    desc_short = record.get('descriptionShort', '')
    desc_full = record.get('descriptionFull', '')
    description = desc_short or desc_full
    
    has_money_w = has_money_words(description)
    has_dollar = has_dollar_sign(description)
    
    issues = []

    # Category A: isLanguageOnly == true but description contains money indicators
    # This is the REAL problem - amendments marked as language-only that have funding
    if is_language_only and (has_dollar or has_money_w):
        issues.append('language_only_with_money_indicators')

    # Category B: netAmount != 0 but both deltaGF and deltaNGF are 0 (inconsistent)
    if net_amount != 0 and delta_gf == 0 and delta_ngf == 0:
        issues.append('nonzero_net_but_zero_deltas')

    # Note: We do NOT flag netAmount == 0 with money indicators as suspicious
    # because these are likely first-year-only amendments (which is valid)

    if not issues:
        return None
    
    return {
        'sessionYear': session_year,
        'billNumber': bill_number,
        'patronName': patron_name,
        'itemNumber': item_number,
        'netAmount': net_amount,
        'deltaGF': delta_gf,
        'deltaNGF': delta_ngf,
        'isLanguageOnly': is_language_only,
        'hasMoneyWords': 'yes' if has_money_w else 'no',
        'hasDollarSign': 'yes' if has_dollar else 'no',
        'descriptionSnippet': description[:200],
        'descriptionFull': description,
        'issues': '|'.join(issues),
    }

def main():
    # Load both JSON files
    data_2024_path = Path('data/amendments/member_requests_2024.json')
    data_2025_path = Path('data/amendments/member_requests_2025.json')
    
    print("Loading amendment data...")
    with open(data_2024_path, 'r') as f:
        data_2024 = json.load(f)
    with open(data_2025_path, 'r') as f:
        data_2025 = json.load(f)
    
    all_records = data_2024 + data_2025
    print(f"Total records: {len(all_records)}")
    
    # Analyze all records
    suspicious_records = []
    for record in all_records:
        result = analyze_record(record)
        if result:
            suspicious_records.append(result)
    
    print(f"Suspicious records found: {len(suspicious_records)}")
    
    # Write CSV
    csv_path = Path('data/amendments/member_requests_suspicious_amounts_2024_2025.csv')
    csv_path.parent.mkdir(parents=True, exist_ok=True)
    
    if suspicious_records:
        with open(csv_path, 'w', newline='') as f:
            fieldnames = ['sessionYear', 'billNumber', 'patronName', 'itemNumber', 
                         'netAmount', 'deltaGF', 'deltaNGF', 'isLanguageOnly',
                         'hasMoneyWords', 'hasDollarSign', 'descriptionSnippet', 'issues']
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            for rec in suspicious_records:
                writer.writerow({k: rec[k] for k in fieldnames})
        print(f"✓ CSV written to {csv_path}")

    # Generate statistics
    issue_counts = defaultdict(int)
    patron_issue_counts = defaultdict(int)

    for rec in suspicious_records:
        for issue in rec['issues'].split('|'):
            issue_counts[issue] += 1
        patron_issue_counts[rec['patronName']] += 1

    # Top 10 patrons with most suspicious records
    top_patrons = sorted(patron_issue_counts.items(), key=lambda x: x[1], reverse=True)[:10]

    # Generate Markdown report
    md_path = Path('AMENDMENT_VAULT_AMOUNT_AUDIT_2024_2025.md')
    with open(md_path, 'w') as f:
        f.write("# Amendment Vault Amount & Flag Audit (2024 + 2025)\n\n")
        f.write(f"**Generated:** {Path(__file__).name}\n\n")
        f.write(f"**Total records analyzed:** {len(all_records):,}\n\n")
        f.write(f"**Suspicious records found:** {len(suspicious_records):,}\n\n")

        f.write("## Summary by Issue Category\n\n")
        for issue, count in sorted(issue_counts.items(), key=lambda x: x[1], reverse=True):
            f.write(f"- **{issue}**: {count:,} records\n")

        f.write("\n## Top 10 Patrons with Most Suspicious Records\n\n")
        f.write("| Rank | Patron Name | Suspicious Records |\n")
        f.write("|------|-------------|--------------------|\n")
        for idx, (patron, count) in enumerate(top_patrons, 1):
            f.write(f"| {idx} | {patron} | {count} |\n")

        # Examples for each category
        f.write("\n## Example Records by Category\n\n")

        categories = {
            'language_only_with_money_indicators': 'Language-Only but Contains Money Indicators (CRITICAL)',
            'nonzero_net_but_zero_deltas': 'Non-Zero Net Amount but Zero Deltas (INCONSISTENT)',
        }

        for issue_key, issue_title in categories.items():
            examples = [r for r in suspicious_records if issue_key in r['issues']][:3]
            if examples:
                f.write(f"\n### {issue_title}\n\n")
                f.write(f"**Count:** {issue_counts[issue_key]:,}\n\n")
                for idx, ex in enumerate(examples, 1):
                    f.write(f"**Example {idx}:**\n")
                    f.write(f"- **Year:** {ex['sessionYear']}\n")
                    f.write(f"- **Bill:** {ex['billNumber']}\n")
                    f.write(f"- **Patron:** {ex['patronName']}\n")
                    f.write(f"- **Item:** {ex['itemNumber']}\n")
                    f.write(f"- **Net Amount:** ${ex['netAmount']:,.0f}\n")
                    f.write(f"- **Delta GF:** ${ex['deltaGF']:,.0f}\n")
                    f.write(f"- **Delta NGF:** ${ex['deltaNGF']:,.0f}\n")
                    f.write(f"- **Is Language Only:** {ex['isLanguageOnly']}\n")
                    f.write(f"- **Has Money Words:** {ex['hasMoneyWords']}\n")
                    f.write(f"- **Has Dollar Sign:** {ex['hasDollarSign']}\n")
                    f.write(f"- **Description:** {ex['descriptionFull']}\n\n")

    print(f"✓ Markdown report written to {md_path}")
    print("\n" + "="*80)
    print("SUMMARY")
    print("="*80)
    print(f"Total records: {len(all_records):,}")
    print(f"Suspicious records: {len(suspicious_records):,} ({len(suspicious_records)/len(all_records)*100:.1f}%)")
    print("\nIssue breakdown:")
    for issue, count in sorted(issue_counts.items(), key=lambda x: x[1], reverse=True):
        print(f"  {issue}: {count:,}")

if __name__ == '__main__':
    main()

