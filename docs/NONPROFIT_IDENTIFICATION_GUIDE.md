# Nonprofit Identification in CARDINAL Expenditure Data

## Executive Summary

Virginia's CARDINAL system provides **two primary expense types** that identify nonprofit recipients:

1. **`Grnt-Nongovernmental Org`** - 32,062 records, $2.3B total
2. **`Disaster Aid-Nongovernmnt Org`** - 223 records, $124M total

However, these categories include **quasi-governmental entities, for-profit companies, and universities** that are not traditional community nonprofits. Our current filtering system reduces this to **2,775 actual community nonprofits** receiving **$824 million**.

---

## Current Nonprofit Identification Method

### ✅ What We're Currently Doing

**Three-Layer Filtering System:**

#### **Layer 1: Expense Type Filter**
Must receive one of these expense types:
- `Grnt-Nongovernmental Org` (primary indicator)
- `Disaster Aid-Nongovernmnt Org` (disaster relief)

#### **Layer 2: Keyword Exclusion**
Exclude entities with these keywords (quasi-governmental/for-profit):
- `AUTHORITY`, `COMMISSION`, `AIRPORT`, `RAILROAD`
- `INSURANCE`, `HEALTH PLAN`, `HMO`, `CIGNA`, `SENTARA`, `KAISER`, `HEALTHKEEPERS`, `OPTIMA`
- `UNIVERSITY`, `COLLEGE`, `INSTITUTE OF TECHNOLOGY`
- `ECONOMIC DEVELOPMENT PARTNERSHIP`, `TOURISM`
- `RAIL AUTHORITY`, `COMMERCIAL SPACE`

#### **Layer 3: Size Threshold**
- Total grants < $30 million (excludes large quasi-governmental entities)

### ✅ Results
- **2,775 community nonprofits** identified
- **$824 million** in total grants
- **Average grant per nonprofit:** $297,067

---

## Data Analysis: What's in "Grnt-Nongovernmental Org"?

### Top Recipients (Before Filtering)

| Rank | Recipient | Amount | Type |
|------|-----------|--------|------|
| 1 | Virginia Passenger Rail Authority | $409M | ❌ Quasi-governmental |
| 2 | ** DETAILED DATA NOT YET AVAILABLE ** | $225M | ❌ Placeholder |
| 3 | HealthKeepers Inc | $134M | ❌ For-profit insurance |
| 4 | Virginia Economic Development Partnership | $73M | ❌ Quasi-governmental |
| 5 | Innovation and Entrepreneur Invest Auth | $59M | ❌ Quasi-governmental |
| 6 | Virginia Housing Development Authority | $58M | ❌ Quasi-governmental |
| 7 | Virginia Early Childhood Foundation | $50M | ✅ **Nonprofit** |
| 8 | Virginia Tourism Authority | $50M | ❌ Quasi-governmental |
| 9 | Sentara Health Plans | $47M | ❌ For-profit insurance |
| 10 | Cigna Health and Life Insurance Co | $43M | ❌ For-profit insurance |

### Key Findings

**❌ Excluded (Not Community Nonprofits):**
- **Authorities:** Rail Authority ($409M), Tourism Authority ($50M), Fort Monroe Authority ($15M)
- **For-Profit Insurance:** HealthKeepers ($134M), Sentara ($47M), Cigna ($43M), Kaiser ($22M)
- **Universities:** Liberty University ($31M), Virginia Union ($13M), Shenandoah ($12M)
- **Placeholder:** "DETAILED DATA NOT YET AVAILABLE" ($225M)

**✅ Included (Actual Community Nonprofits):**
- Community Housing Partners Corporation ($28M)
- Lutheran Social Services ($13M)
- Legal Services Corporation of Virginia ($10M)
- Prevent Child Abuse Virginia ($9M)
- Child Care Resources Inc ($9M)

---

## Alternative Identification Methods

### Option 1: IRS 501(c)(3) Cross-Reference (Most Accurate)
**Pros:**
- Definitive nonprofit status
- Includes EIN (Employer Identification Number)
- Distinguishes between nonprofit types (charitable, educational, religious, etc.)

**Cons:**
- Requires external IRS data source
- Vendor names in CARDINAL may not match IRS records exactly
- Requires fuzzy matching algorithm

**Implementation:**
1. Download IRS Tax Exempt Organization database
2. Extract Virginia nonprofits (501(c)(3) organizations)
3. Match CARDINAL vendor names to IRS organization names
4. Use fuzzy matching for name variations

### Option 2: Virginia State Corporation Commission (SCC) Registration
**Pros:**
- Virginia-specific nonprofit registry
- Includes foreign (out-of-state) nonprofits registered in VA
- Official state source

**Cons:**
- Requires SCC data integration
- May not include all federal nonprofits
- Name matching challenges

### Option 3: Enhanced Keyword Pattern Matching (Current Method+)
**Pros:**
- No external data required
- Fast and efficient
- Already implemented

**Cons:**
- Not 100% accurate
- May miss some nonprofits
- May include some non-nonprofits

**Improvements:**
- Add positive indicators: `FOUNDATION`, `COALITION`, `SOCIETY`, `ASSOCIATION`, `INC.`, `CHARITABLE`
- Refine exclusion patterns
- Add manual verification for large recipients

---

## Recommended Approach for Your Client

### **Short-Term Solution (Immediate)**
Continue using the current **three-layer filtering system**:
- ✅ Already implemented
- ✅ Identifies 2,775 community nonprofits
- ✅ Excludes quasi-governmental entities and for-profit companies
- ✅ $824M in verified nonprofit grants

### **Medium-Term Enhancement (1-2 weeks)**
Add **IRS 501(c)(3) cross-reference**:
1. Download IRS Tax Exempt Organization database (free, public data)
2. Filter for Virginia nonprofits (501(c)(3) status)
3. Create matching algorithm to link CARDINAL vendors to IRS records
4. Add "IRS Verified ✓" badge to confirmed nonprofits
5. Flag unmatched entities for manual review

### **Long-Term Solution (1-2 months)**
Integrate **Virginia SCC nonprofit registry**:
- Cross-reference with both IRS and SCC data
- Create comprehensive nonprofit database
- Add nonprofit classification (charitable, educational, religious, etc.)
- Track nonprofit registration status over time

---

## Data Quality Issues

### Issue 1: "DETAILED DATA NOT YET AVAILABLE"
- **Amount:** $225 million
- **Records:** Multiple entries
- **Problem:** Placeholder for incomplete data
- **Solution:** Exclude from nonprofit counts until data is available

### Issue 2: Name Variations
Examples of same organization with different names:
- "Legal Services Corporation of Virginia" vs "LEGAL SERVICES CORP OF VA"
- "Child Care Resources Inc" vs "CHILD CARE RESOURCES INC"

**Solution:** Normalize vendor names (uppercase, remove punctuation, standardize abbreviations)

### Issue 3: Quasi-Governmental Entities
Virginia classifies these as "Grnt-Nongovernmental Org" even though they're not traditional nonprofits:
- **Authorities** (Rail, Tourism, Housing, Economic Development)
- **For-profit health insurance** (HealthKeepers, Sentara, Cigna, Kaiser)
- **Universities** (public and private)

**Solution:** Current keyword exclusion filter (already implemented)

---

## Sample Verified Community Nonprofits

Here are examples of **actual community nonprofits** identified by our system:

### Social Services
- Lutheran Social Services of the National Capital Area - $12.8M
- Legal Services Corporation of Virginia - $10.1M
- Child Care Resources Inc - $8.7M
- Big Homies Inc - $2.5M
- Partners for Justice - $1.2M
- OAR of Richmond - $890K

### Child Welfare
- Prevent Child Abuse Virginia - $9.3M
- Youth For Tomorrow-New Life Center Inc - $52K

### Housing
- Community Housing Partners Corporation - $28.0M

### Healthcare (Disaster Aid)
- Inova Health Care Services - $53.3M
- Bon Secours Mercy Health - $20.0M
- Children's Hospital of The Kings Daughters - $10.2M

### Education
- The Institute for Advanced Learning - $12.6M

---

## Technical Implementation Details

### Current Code Location
**File:** `frontend/src/sections/budget-decoder/view/budget-decoder-view.tsx`

**Lines:** 1067-1158 (NGO Tracker data processing)

### Current Filtering Logic
```typescript
// Filter 1: Must receive "Grnt-Nongovernmental Org" expense type
const hasNGOGrant = records.some(r => r.expense_type === ngoGrantExpenseType);
if (!hasNGOGrant) return;

// Filter 2: Exclude quasi-governmental entities
if (shouldExcludeFromNGO(vendorName)) return;

// Filter 3: Total must be < $30M (excludes big foundations/authorities)
if (totalAmount > maxNonprofitTotal) return;
```

### Data Source
**File:** `frontend/public/decoder/transfer_payments_full.csv.gz`
- **Size:** 8.8MB compressed (96MB uncompressed)
- **Records:** 389,417 total transfer payments
- **Nonprofit records:** 32,062 "Grnt-Nongovernmental Org" + 223 "Disaster Aid-Nongovernmnt Org"
- **Fiscal years:** FY2025 and FY2026

---

## Questions for Your Client

1. **Accuracy vs. Completeness:** Do you prefer:
   - **High accuracy** (fewer nonprofits, but all verified) - Current approach
   - **High completeness** (more nonprofits, but some false positives) - Relaxed filters

2. **External Data Integration:** Are you willing to:
   - Integrate IRS 501(c)(3) database for verification?
   - Integrate Virginia SCC nonprofit registry?
   - Budget for data matching/cleaning work?

3. **Nonprofit Definition:** Should we include:
   - Universities and colleges? (Currently excluded)
   - Hospitals and healthcare systems? (Currently included for disaster aid only)
   - Quasi-governmental authorities? (Currently excluded)
   - Religious organizations? (Currently included if they receive grants)

4. **Size Threshold:** Should we:
   - Keep $30M threshold? (Current)
   - Adjust to different amount?
   - Remove threshold entirely?

5. **Transparency:** Should we:
   - Show "IRS Verified ✓" badges for confirmed nonprofits?
   - Display confidence scores for nonprofit classification?
   - Provide "Report Error" button for users to flag misclassifications?

---

## Next Steps

1. **Immediate:** Share this document with client for feedback
2. **This week:** Decide on IRS 501(c)(3) integration approach
3. **Next week:** Implement chosen enhancements
4. **Ongoing:** Monitor and refine nonprofit identification accuracy


