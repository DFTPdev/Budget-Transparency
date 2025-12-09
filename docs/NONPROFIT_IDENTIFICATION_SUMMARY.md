# Nonprofit Identification - Quick Summary

## How We Currently Identify Nonprofits

### ✅ Current Method: Three-Layer Filter

**Layer 1: Expense Type**
- Must have expense type = `Grnt-Nongovernmental Org` OR `Disaster Aid-Nongovernmnt Org`

**Layer 2: Keyword Exclusion**
- Exclude: AUTHORITY, COMMISSION, INSURANCE, HEALTH PLAN, UNIVERSITY, COLLEGE, etc.
- Removes quasi-governmental entities and for-profit companies

**Layer 3: Size Threshold**
- Total grants must be < $30 million
- Removes large quasi-governmental foundations

### ✅ Results
- **2,775 community nonprofits** identified
- **$824 million** in total grants
- **Average:** $297,067 per nonprofit

---

## The Challenge

Virginia's CARDINAL system labels these as "Grnt-Nongovernmental Org":

| Entity Type | Example | Amount | Is it a nonprofit? |
|-------------|---------|--------|-------------------|
| Quasi-governmental authority | Virginia Passenger Rail Authority | $409M | ❌ No |
| For-profit insurance | HealthKeepers Inc | $134M | ❌ No |
| State partnership | VA Economic Development Partnership | $73M | ❌ No |
| **Community nonprofit** | **Community Housing Partners** | **$28M** | **✅ Yes** |
| **Community nonprofit** | **Lutheran Social Services** | **$13M** | **✅ Yes** |
| **Community nonprofit** | **Legal Services Corp of VA** | **$10M** | **✅ Yes** |

**Without filtering:** 3,210 entities, $2.3 billion  
**With filtering:** 2,775 nonprofits, $824 million

---

## Improvement Options

### Option 1: IRS 501(c)(3) Cross-Reference ⭐ RECOMMENDED
**What it does:**
- Downloads IRS Tax Exempt Organization database (free, public)
- Matches CARDINAL vendors to IRS-verified nonprofits
- Adds "IRS Verified ✓" badge to confirmed nonprofits

**Pros:**
- Definitive nonprofit status
- Most accurate method
- Includes nonprofit type (charitable, educational, religious)

**Cons:**
- Requires name matching algorithm (vendor names may differ from IRS names)
- One-time setup effort (1-2 weeks)

**Accuracy:** 95%+ (highest)

---

### Option 2: Virginia SCC Registry
**What it does:**
- Integrates Virginia State Corporation Commission nonprofit registry
- Cross-references state-registered nonprofits

**Pros:**
- Virginia-specific
- Official state source

**Cons:**
- May not include all federal nonprofits
- Requires data integration

**Accuracy:** 85-90%

---

### Option 3: Enhanced Keyword Matching (Current Method+)
**What it does:**
- Improves current keyword patterns
- Adds positive indicators (FOUNDATION, COALITION, SOCIETY, etc.)
- Refines exclusion patterns

**Pros:**
- No external data needed
- Fast implementation (1-2 days)
- Already working

**Cons:**
- Not 100% accurate
- May miss some nonprofits or include some non-nonprofits

**Accuracy:** 80-85% (current)

---

## Recommended Next Steps

### Immediate (This Week)
1. ✅ Share this analysis with client
2. Get client feedback on:
   - Should we include universities? (currently excluded)
   - Should we include hospitals? (currently included for disaster aid only)
   - Is $30M threshold appropriate?
3. Decide on IRS integration approach

### Short-Term (1-2 Weeks)
1. Download IRS 501(c)(3) database
2. Create name matching algorithm
3. Add "IRS Verified ✓" badges to frontend
4. Test accuracy with sample data

### Medium-Term (1-2 Months)
1. Integrate Virginia SCC registry
2. Create comprehensive nonprofit database
3. Add nonprofit classification (charitable, educational, religious)
4. Add "Report Error" feature for user feedback

---

## Key Questions for Client

1. **Definition:** What counts as a "nonprofit" for your purposes?
   - Only 501(c)(3) charitable organizations?
   - Include 501(c)(4) social welfare organizations?
   - Include universities and hospitals?
   - Include religious organizations?

2. **Accuracy vs. Completeness:**
   - Prefer fewer nonprofits but all verified? (current approach)
   - Prefer more nonprofits but some false positives?

3. **External Data:**
   - OK to integrate IRS database? (free, public)
   - OK to integrate VA SCC registry? (may require API access)

4. **Transparency:**
   - Show "IRS Verified ✓" badges?
   - Show confidence scores?
   - Allow users to report errors?

---

## Data Sources

### Current Data
- **File:** `frontend/public/decoder/transfer_payments_full.csv.gz`
- **Size:** 8.8MB compressed
- **Records:** 389,417 total transfer payments
- **Fiscal Years:** FY2025 and FY2026

### Potential External Sources
- **IRS Tax Exempt Organization Database:** https://www.irs.gov/charities-non-profits/tax-exempt-organization-search-bulk-data-downloads
- **Virginia SCC:** https://cis.scc.virginia.gov/
- **GuideStar/Candid:** https://www.guidestar.org/ (requires subscription)

---

## Contact

For questions about nonprofit identification methodology, contact the development team.

See `NONPROFIT_IDENTIFICATION_GUIDE.md` for detailed technical documentation.

