#!/usr/bin/env python3
"""
Amendment Vault 2024 Trust Report Generator

Analyzes member_requests_2024.json for duplicate records and data quality issues.
Generates a comprehensive markdown report with duplicate detection and statistics.
"""

import json
from pathlib import Path
from collections import defaultdict
from typing import Dict, List, Any, Tuple

# Paths
REPO_ROOT = Path(__file__).parent.parent.parent
DATA_FILE = REPO_ROOT / "data" / "amendments" / "member_requests_2024.json"
REPORT_FILE = REPO_ROOT / "AMENDMENT_VAULT_2024_TRUST_REPORT.md"


def normalize_text(text: str) -> str:
    """Normalize text for fingerprinting: lowercase, trim, collapse spaces"""
    if not text:
        return ""
    # Convert to lowercase, strip, collapse multiple spaces
    normalized = " ".join(text.lower().strip().split())
    return normalized


def create_fingerprint(record: Dict[str, Any]) -> str:
    """
    Create a fingerprint for duplicate detection.
    
    Combines:
    - billNumber
    - itemNumber
    - patronName (normalized)
    - deltaGF (rounded)
    - deltaNGF (rounded)
    - descriptionShort (normalized, first 200 chars)
    """
    bill_number = record.get("billNumber", "")
    item_number = str(record.get("itemNumber", ""))
    patron_name = normalize_text(record.get("patronName", ""))
    
    # Round dollar amounts to nearest whole number
    delta_gf = round(record.get("deltaGF", 0))
    delta_ngf = round(record.get("deltaNGF", 0))
    
    # Normalize and truncate description
    desc = normalize_text(record.get("descriptionShort", ""))
    desc_truncated = desc[:200]
    
    # Build fingerprint
    fingerprint = "|".join([
        bill_number,
        item_number,
        patron_name,
        str(delta_gf),
        str(delta_ngf),
        desc_truncated
    ])
    
    return fingerprint


def analyze_data(records: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Analyze records for duplicates and compute statistics"""
    
    # Global totals
    total_records = len(records)
    total_net_amount_all = sum(r.get("netAmount", 0) for r in records)
    
    # Build fingerprint index
    fingerprint_to_records = defaultdict(list)
    for record in records:
        fp = create_fingerprint(record)
        fingerprint_to_records[fp].append(record)
    
    # Fingerprint stats
    distinct_fingerprints = len(fingerprint_to_records)
    duplicate_fingerprints = {fp: recs for fp, recs in fingerprint_to_records.items() if len(recs) > 1}
    duplicate_fingerprint_count = len(duplicate_fingerprints)
    total_duplicate_rows = sum(len(recs) - 1 for recs in duplicate_fingerprints.values())
    
    # Per-bill analysis
    bill_stats = {}
    for bill_number in ["HB30", "SB30"]:
        bill_records = [r for r in records if r.get("billNumber") == bill_number]
        
        # Build fingerprints for this bill
        bill_fingerprints = defaultdict(list)
        for record in bill_records:
            fp = create_fingerprint(record)
            bill_fingerprints[fp].append(record)
        
        # Compute stats
        total_records_all = len(bill_records)
        total_net_amount_all = sum(r.get("netAmount", 0) for r in bill_records)
        unique_records_count = len(bill_fingerprints)
        
        # Total netAmount counting only one record per fingerprint
        total_net_amount_unique = sum(
            recs[0].get("netAmount", 0) for recs in bill_fingerprints.values()
        )
        
        dup_fingerprints = {fp: recs for fp, recs in bill_fingerprints.items() if len(recs) > 1}
        dup_fingerprint_count = len(dup_fingerprints)
        total_dup_rows = sum(len(recs) - 1 for recs in dup_fingerprints.values())
        
        bill_stats[bill_number] = {
            "totalRecordsAll": total_records_all,
            "totalNetAmountAll": total_net_amount_all,
            "uniqueRecordsCount": unique_records_count,
            "totalNetAmountUnique": total_net_amount_unique,
            "dupFingerprintCount": dup_fingerprint_count,
            "totalDuplicateRows": total_dup_rows,
        }
    
    # Find top 10 most suspicious duplicate groups
    # Sort by: occurrence count (desc), then total netAmount (desc)
    duplicate_groups = []
    for fp, recs in duplicate_fingerprints.items():
        occurrence_count = len(recs)
        sum_net_amount = sum(r.get("netAmount", 0) for r in recs)
        
        duplicate_groups.append({
            "fingerprint": fp,
            "records": recs,
            "occurrenceCount": occurrence_count,
            "sumNetAmount": sum_net_amount,
        })
    
    # Sort by occurrence count (desc), then sumNetAmount (desc)
    duplicate_groups.sort(key=lambda x: (-x["occurrenceCount"], -abs(x["sumNetAmount"])))
    top_10_duplicates = duplicate_groups[:10]
    
    return {
        "totalRecords": total_records,
        "totalNetAmountAll": total_net_amount_all,
        "distinctFingerprints": distinct_fingerprints,
        "duplicateFingerprintCount": duplicate_fingerprint_count,
        "totalDuplicateRows": total_duplicate_rows,
        "billStats": bill_stats,
        "top10Duplicates": top_10_duplicates,
    }


def generate_markdown_report(analysis: Dict[str, Any]) -> str:
    """Generate markdown trust report"""
    
    lines = []
    lines.append("# Amendment Vault 2024 Trust Report")
    lines.append("")
    lines.append("**Generated:** Automated analysis of `member_requests_2024.json`")
    lines.append("")
    lines.append("---")
    lines.append("")
    
    # Section 1: Overview
    lines.append("## Section 1 – Overview")
    lines.append("")
    lines.append(f"**Total Records:** {analysis['totalRecords']:,}")
    lines.append(f"**Total Net Amount (All Records):** ${analysis['totalNetAmountAll']:,.0f}")
    lines.append("")
    lines.append(f"**Distinct Fingerprints:** {analysis['distinctFingerprints']:,}")
    lines.append(f"**Duplicate Fingerprint Count:** {analysis['duplicateFingerprintCount']:,}")
    lines.append(f"**Total Duplicate Rows:** {analysis['totalDuplicateRows']:,}")
    lines.append("")
    
    duplicate_pct = (analysis['totalDuplicateRows'] / analysis['totalRecords'] * 100) if analysis['totalRecords'] > 0 else 0
    lines.append(f"**Duplicate Rate:** {duplicate_pct:.2f}% of all records are duplicates")
    lines.append("")
    lines.append("---")
    lines.append("")
    
    # Section 2: Per-Bill Summary
    lines.append("## Section 2 – Per-Bill Summary")
    lines.append("")
    
    for bill_number in ["HB30", "SB30"]:
        stats = analysis["billStats"][bill_number]
        lines.append(f"### {bill_number}")
        lines.append("")
        lines.append(f"- **Total Records (All):** {stats['totalRecordsAll']:,}")
        lines.append(f"- **Total Net Amount (All):** ${stats['totalNetAmountAll']:,.0f}")
        lines.append(f"- **Unique Records Count:** {stats['uniqueRecordsCount']:,}")
        lines.append(f"- **Total Net Amount (Unique):** ${stats['totalNetAmountUnique']:,.0f}")
        lines.append(f"- **Duplicate Fingerprint Count:** {stats['dupFingerprintCount']:,}")
        lines.append(f"- **Total Duplicate Rows:** {stats['totalDuplicateRows']:,}")
        lines.append("")
        
        # Calculate inflation
        if stats['totalNetAmountUnique'] != 0:
            inflation_pct = ((stats['totalNetAmountAll'] - stats['totalNetAmountUnique']) / stats['totalNetAmountUnique'] * 100)
            lines.append(f"- **Inflation from Duplicates:** {inflation_pct:.2f}%")
        else:
            lines.append(f"- **Inflation from Duplicates:** N/A")
        lines.append("")
    
    lines.append("---")
    lines.append("")

    # Section 3: Duplicate Groups (Top 10)
    lines.append("## Section 3 – Duplicate Groups (Top 10)")
    lines.append("")

    if not analysis["top10Duplicates"]:
        lines.append("**No duplicate groups found.** ✅")
        lines.append("")
    else:
        for i, group in enumerate(analysis["top10Duplicates"], 1):
            records = group["records"]
            first_record = records[0]

            bill_number = first_record.get("billNumber", "N/A")
            patron_name = first_record.get("patronName", "N/A")
            item_number = first_record.get("itemNumber", "N/A")
            occurrence_count = group["occurrenceCount"]
            sum_net_amount = group["sumNetAmount"]

            lines.append(f"### {i}. {bill_number} – {patron_name} – Item {item_number}")
            lines.append("")
            lines.append(f"**Occurrence Count:** {occurrence_count}")
            lines.append(f"**Sum Net Amount:** ${sum_net_amount:,.0f}")
            lines.append("")
            lines.append("**Sample Records:**")
            lines.append("")

            # Show up to 3 sample records
            for j, record in enumerate(records[:3], 1):
                patron = record.get("patronName", "N/A")
                item = record.get("itemNumber", "N/A")
                net_amt = record.get("netAmount", 0)
                desc = record.get("descriptionShort", "")
                desc_truncated = desc[:150] + "..." if len(desc) > 150 else desc
                desc_truncated = desc_truncated.replace("\n", " ")

                agency = record.get("agencyName", "")
                source_pdf = record.get("sourcePdfPath", "")
                source_page = record.get("sourcePage", "")

                lines.append(f"{j}. **{patron}** – Item {item} – ${net_amt:,.0f}")
                lines.append(f"   - Description: {desc_truncated}")
                if agency:
                    lines.append(f"   - Agency: {agency}")
                if source_pdf and source_page:
                    pdf_name = Path(source_pdf).name if source_pdf else "N/A"
                    lines.append(f"   - Source: {pdf_name}, Page {source_page}")
                lines.append("")

            if len(records) > 3:
                lines.append(f"   _(... and {len(records) - 3} more duplicate(s))_")
                lines.append("")

    lines.append("---")
    lines.append("")

    # Section 4: Quick Interpretation
    lines.append("## Section 4 – Quick Interpretation")
    lines.append("")

    # Determine severity
    duplicate_pct = (analysis['totalDuplicateRows'] / analysis['totalRecords'] * 100) if analysis['totalRecords'] > 0 else 0

    # Calculate total inflation
    total_unique_net = sum(stats['totalNetAmountUnique'] for stats in analysis['billStats'].values())
    total_all_net = sum(stats['totalNetAmountAll'] for stats in analysis['billStats'].values())
    inflation_pct = ((total_all_net - total_unique_net) / total_unique_net * 100) if total_unique_net != 0 else 0

    if duplicate_pct < 1.0:
        severity = "**very low**"
        quality = "excellent"
    elif duplicate_pct < 5.0:
        severity = "**low**"
        quality = "good"
    elif duplicate_pct < 10.0:
        severity = "**moderate**"
        quality = "acceptable but should be reviewed"
    else:
        severity = "**high**"
        quality = "concerning and requires parser refinement"

    lines.append(f"The duplicate count is {severity} ({duplicate_pct:.2f}% of all records). ")
    lines.append(f"The gap between total net amount (all records) and total net amount (unique fingerprints) is {inflation_pct:.2f}%, ")
    lines.append(f"which suggests the 2024 data quality is {quality}. ")

    if duplicate_pct < 5.0:
        lines.append("The parser appears to be working correctly with minimal duplication. ✅")
    else:
        lines.append("Consider reviewing the parser logic to reduce duplicate extraction. ⚠️")

    lines.append("")
    lines.append("---")
    lines.append("")
    lines.append("**End of Report**")

    return "\n".join(lines)


def main():
    """Main execution"""
    print("=" * 80)
    print("Amendment Vault 2024 Trust Report Generator")
    print("=" * 80)
    print()

    # Load data
    print(f"Loading data from: {DATA_FILE}")
    if not DATA_FILE.exists():
        print(f"❌ ERROR: Data file not found: {DATA_FILE}")
        return 1

    with open(DATA_FILE, "r", encoding="utf-8") as f:
        records = json.load(f)

    print(f"✓ Loaded {len(records):,} records")
    print()

    # Analyze
    print("Analyzing data for duplicates...")
    analysis = analyze_data(records)
    print(f"✓ Found {analysis['distinctFingerprints']:,} distinct fingerprints")
    print(f"✓ Found {analysis['duplicateFingerprintCount']:,} duplicate fingerprints")
    print(f"✓ Total duplicate rows: {analysis['totalDuplicateRows']:,}")
    print()

    # Generate report
    print("Generating markdown report...")
    report = generate_markdown_report(analysis)

    # Save report
    with open(REPORT_FILE, "w", encoding="utf-8") as f:
        f.write(report)

    print(f"✓ Report saved to: {REPORT_FILE}")
    print()

    # Print report to stdout
    print("=" * 80)
    print("REPORT PREVIEW")
    print("=" * 80)
    print()
    print(report)

    return 0


if __name__ == "__main__":
    exit(main())

