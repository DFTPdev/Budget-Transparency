#!/usr/bin/env python3
"""
Verify funding recipients for a specific legislator by examining raw amendment data.
This script helps audit the accuracy of the Top 5 Funding Recipients display.
"""

import json
import sys
from pathlib import Path
from collections import defaultdict

# Paths
REPO_ROOT = Path(__file__).parent.parent
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


def verify_legislator_recipients(patron_name: str, min_confidence: float = 0.6):
    """
    Extract and display all funding recipients for a legislator.
    
    Args:
        patron_name: Legislator's patron name (e.g., "Rae Cousins")
        min_confidence: Minimum confidence threshold (default: 0.6)
    """
    print(f"\n{'='*80}")
    print(f"FUNDING RECIPIENT VERIFICATION FOR: {patron_name}")
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
    
    print(f"Found {len(legislator_records)} total amendments for {patron_name}")
    
    # Deduplicate using fingerprints
    seen_fingerprints = set()
    deduped_records = []
    for record in legislator_records:
        fp = build_fingerprint(record)
        if fp not in seen_fingerprints:
            seen_fingerprints.add(fp)
            deduped_records.append(record)
    
    print(f"After deduplication: {len(deduped_records)} unique amendments\n")
    
    # Filter for records with recipients
    records_with_recipients = [
        r for r in deduped_records
        if r.get("primaryRecipientName")
        and (r.get("recipientConfidence") or 0) >= min_confidence
    ]
    
    print(f"Amendments with identified recipients (confidence >= {min_confidence}): {len(records_with_recipients)}\n")
    
    # Aggregate by recipient
    recipient_totals = defaultdict(lambda: {"total": 0, "count": 0, "amendments": []})
    
    for record in records_with_recipients:
        recipient = record["primaryRecipientName"]
        amount = record.get("netAmount", 0)
        recipient_totals[recipient]["total"] += amount
        recipient_totals[recipient]["count"] += 1
        recipient_totals[recipient]["amendments"].append({
            "bill": record.get("billNumber"),
            "year": record.get("sessionYear"),
            "item": record.get("itemNumber"),
            "amount": amount,
            "description": (record.get("descriptionShort") or record.get("descriptionFull", "")),
            "confidence": record.get("recipientConfidence"),
            "raw_text": record.get("recipientRawText", "")
        })
    
    # Sort by total amount
    top_recipients = sorted(recipient_totals.items(), key=lambda x: x[1]["total"], reverse=True)
    
    print(f"{'='*80}")
    print(f"TOP 5 FUNDING RECIPIENTS")
    print(f"{'='*80}\n")
    
    for i, (recipient, data) in enumerate(top_recipients[:5], 1):
        print(f"{i}. {recipient}")
        print(f"   Total: ${data['total']:,.0f}")
        print(f"   Amendments: {data['count']}")
        print(f"\n   Source Amendments:")
        for j, amend in enumerate(data["amendments"][:10], 1):  # Show up to 10 amendments
            print(f"      {j}. {amend['bill']} ({amend['year']}) Item #{amend['item']} - ${amend['amount']:,.0f}")
            print(f"         FULL Description: {amend['description']}")
            print(f"         Extracted Recipient: {recipient}")
            print(f"         Confidence: {amend['confidence']:.2f}")
            print(f"         Raw Extraction Text: {amend['raw_text']}")
            print()
        if len(data["amendments"]) > 10:
            print(f"      ... and {len(data['amendments']) - 10} more amendments")
        print()


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python verify_legislator_recipients.py 'Patron Name'")
        print("Example: python verify_legislator_recipients.py 'Rae Cousins'")
        sys.exit(1)
    
    patron_name = sys.argv[1]
    verify_legislator_recipients(patron_name)

