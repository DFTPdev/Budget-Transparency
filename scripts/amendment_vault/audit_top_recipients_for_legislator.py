#!/usr/bin/env python3
"""
Audit script for verifying Top Funding Recipients extraction quality.

Usage:
    python audit_top_recipients_for_legislator.py <patron_name>
    python audit_top_recipients_for_legislator.py "Cousins"
    python audit_top_recipients_for_legislator.py "Deeds"
"""

import json
import sys
from pathlib import Path
from collections import defaultdict

# Paths
REPO_ROOT = Path(__file__).parent.parent.parent
DATA_2024 = REPO_ROOT / "data" / "amendments" / "member_requests_2024.json"
DATA_2025 = REPO_ROOT / "data" / "amendments" / "member_requests_2025.json"


def normalize_patron_name(name: str) -> str:
    """Normalize patron name for matching (same logic as frontend)."""
    return name.lower().strip().replace("  ", " ")


def build_fingerprint(record: dict) -> str:
    """Build deduplication fingerprint (same logic as frontend)."""
    desc_source = record.get("descriptionShort") or record.get("descriptionFull") or ""
    normalized_desc = desc_source.lower().strip().replace("  ", " ")[:200]
    normalized_patron = normalize_patron_name(record.get("patronName", ""))
    bill = record.get("billNumber", "")
    item = record.get("itemNumber", "")
    rounded_gf = round(record.get("deltaGF", 0))
    rounded_ngf = round(record.get("deltaNGF", 0))
    
    return f"{bill}|{item}|{normalized_patron}|{rounded_gf}|{rounded_ngf}|{normalized_desc}"


def audit_legislator(patron_name: str, min_confidence: float = 0.9):
    """
    Audit funding recipients for a specific legislator.
    
    Args:
        patron_name: Legislator's patron name (e.g., "Cousins", "Deeds")
        min_confidence: Minimum confidence threshold (default: 0.9)
    """
    print(f"\n{'='*80}")
    print(f"TOP FUNDING RECIPIENTS AUDIT FOR: {patron_name}")
    print(f"Minimum Confidence: {min_confidence}")
    print(f"{'='*80}\n")
    
    # Load both years
    with open(DATA_2024) as f:
        records_2024 = json.load(f)
    with open(DATA_2025) as f:
        records_2025 = json.load(f)
    
    all_records = records_2024 + records_2025
    
    # Normalize search name
    search_name = normalize_patron_name(patron_name)
    
    # Filter records for this legislator
    legislator_records = [
        r for r in all_records
        if normalize_patron_name(r.get("patronName", "")) == search_name
        and r.get("stage") == "member_request"
        and not r.get("isLanguageOnly", False)
        and r.get("netAmount", 0) > 0  # Only increases
    ]
    
    print(f"📊 Total amendments for {patron_name}: {len(legislator_records)}")
    
    # Deduplicate using fingerprints
    seen_fingerprints = set()
    deduped_records = []
    for record in legislator_records:
        fp = build_fingerprint(record)
        if fp not in seen_fingerprints:
            seen_fingerprints.add(fp)
            deduped_records.append(record)
    
    print(f"📊 After deduplication: {len(deduped_records)} unique amendments")
    
    # Count recipients by confidence level
    with_recipient_any = [r for r in deduped_records if r.get("primaryRecipientName")]
    with_recipient_high = [r for r in with_recipient_any if (r.get("recipientConfidence") or 0) >= min_confidence]
    
    print(f"📊 Amendments with any recipient: {len(with_recipient_any)}")
    print(f"📊 Amendments with high-confidence recipient (>= {min_confidence}): {len(with_recipient_high)}\n")
    
    # Show sample amendments with recipients
    print(f"{'='*80}")
    print(f"SAMPLE AMENDMENTS WITH RECIPIENTS (showing first 10)")
    print(f"{'='*80}\n")
    
    for i, record in enumerate(with_recipient_high[:10], 1):
        print(f"{i}. {record.get('billNumber')} ({record.get('sessionYear')}) Item #{record.get('itemNumber')}")
        print(f"   Amount: ${record.get('netAmount', 0):,.0f}")
        print(f"   Recipient: {record.get('primaryRecipientName')}")
        print(f"   Confidence: {record.get('recipientConfidence', 0):.2f}")
        desc = (record.get("descriptionShort") or record.get("descriptionFull", ""))[:200]
        print(f"   Description: {desc}...")
        print()
    
    # Aggregate by recipient
    recipient_totals = defaultdict(lambda: {"total": 0, "count": 0, "avg_conf": 0, "confidences": []})
    
    for record in with_recipient_high:
        recipient = record["primaryRecipientName"]
        amount = record.get("netAmount", 0)
        conf = record.get("recipientConfidence", 0)
        
        recipient_totals[recipient]["total"] += amount
        recipient_totals[recipient]["count"] += 1
        recipient_totals[recipient]["confidences"].append(conf)
    
    # Calculate average confidence
    for data in recipient_totals.values():
        data["avg_conf"] = sum(data["confidences"]) / len(data["confidences"]) if data["confidences"] else 0
    
    # Sort by total amount
    top_recipients = sorted(recipient_totals.items(), key=lambda x: x[1]["total"], reverse=True)
    
    print(f"{'='*80}")
    print(f"TOP 5 FUNDING RECIPIENTS (Confidence >= {min_confidence})")
    print(f"{'='*80}\n")
    
    for i, (recipient, data) in enumerate(top_recipients[:5], 1):
        print(f"{i}. {recipient}")
        print(f"   Total: ${data['total']:,.0f}")
        print(f"   Amendments: {data['count']}")
        print(f"   Avg Confidence: {data['avg_conf']:.2f}")
        print()


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python audit_top_recipients_for_legislator.py <patron_name>")
        print('Example: python audit_top_recipients_for_legislator.py "Cousins"')
        sys.exit(1)
    
    patron_name = sys.argv[1]
    audit_legislator(patron_name)

