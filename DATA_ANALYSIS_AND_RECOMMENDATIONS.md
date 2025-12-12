# Budget Transparency Platform - Data Analysis & UX Recommendations

**Date:** December 11, 2025  
**Issue:** Low match rate between budget appropriations and actual expenditures, unclear data presentation

---

## 📊 CURRENT DATA LANDSCAPE

### Data Sources Overview

| Dataset | Records | Purpose | Source System |
|---------|---------|---------|---------------|
| `budget_by_program_2025.json` | 803 programs | Chapter 725 appropriations (what was budgeted) | DPB Budget Documents |
| `program_rollup_decoder.csv` | 1,586 rows (235 unique programs) | Aggregated expenditures by program+service_area | CARDINAL via decoder pipeline |
| `program_vendor_decoder_external.csv` | 56,214 rows | Individual vendor transactions | CARDINAL via decoder pipeline |
| `transfer_payments_full.csv.gz` | ~100K+ rows | All transfer payment transactions | CARDINAL raw data |
| `budget_by_agency_2025.json` | ~200 agencies | Agency-level appropriations | DPB Budget Documents |

### Critical Data Gap Identified

**MATCH RATE PROBLEM:**
- **Budget programs:** 803 total programs in Chapter 725
- **Rollup programs:** 235 unique programs with expenditure data (after aggregating service areas)
- **Match rate:** ~29% (235/803)
- **Result:** 71% of budget programs have NO expenditure data to show users

---

## 🔍 ROOT CAUSES OF LOW MATCH RATE

### 1. **Structural Mismatch: Budget vs. Expenditure Granularity**

**Budget Data (Chapter 725):**
- Organized by: `Secretariat → Agency → Program`
- Example: "Dept of Med Assistance Svcs → Medicaid Program Services"
- Represents APPROPRIATIONS (what legislature authorized)

**Expenditure Data (CARDINAL):**
- Organized by: `Agency → Program → Service Area → Vendor`
- Example: "Compensation Board → Fin Asst-Circuit Court Clerks → FA-Circuit Court Clk Land Recd → Rockingham County"
- Represents ACTUAL SPENDING (what agencies paid out)

**The Gap:**
- Many budget programs are HIGH-LEVEL policy categories
- CARDINAL tracks OPERATIONAL spending at granular service area level
- No 1:1 mapping between budget structure and accounting structure

### 2. **Timing Mismatch**

- Budget data: FY2025 appropriations (what was authorized for the full fiscal year)
- Expenditure data: YTD spending through a specific date (partial year)
- Many programs may have $0 spent if:
  - Spending happens later in fiscal year
  - Funds are encumbered but not yet disbursed
  - Program is capital project with multi-year timeline

### 3. **Missing Decoder Coverage**

The decoder pipeline (`scripts/build_budget_decoder.py`) only matches:
- Programs where CARDINAL has actual transaction records
- Programs with recognizable agency/program names
- Programs that passed the 3-pass matching logic (strict, fuzzy, category-assisted)

**What's NOT in decoder:**
- Capital projects with no YTD spending
- Internal transfers between state agencies
- Debt service payments
- Reserve funds
- Programs with spending recorded under different names

---

## 🎯 CURRENT USER EXPERIENCE PROBLEMS

### Problem 1: **Invisible Data Gaps**
**What users see:** A table with 803 budget programs
**What users DON'T see:** Only 235 have expenditure details available
**Impact:** Users click expand arrows expecting vendor details, but 71% of rows have nothing to show

### Problem 2: **Confusing Execution Rates**
**Example:** Environmental Fin Assistance shows 0.01% execution rate
**Reality:** Data is split across 5 service areas, only first one matched
**Impact:** Users think money isn't being spent when it actually is

### Problem 3: **Fragmented Story Across Pages**

| Page | Data Source | What It Shows | What's Missing |
|------|-------------|---------------|----------------|
| **Budget Decoder - Appropriations Tab** | `budget_by_program_2025.json` | What was budgeted | Where money actually went |
| **Budget Decoder - Expenditures Tab** | `program_rollup_decoder.csv` | What was spent (partial) | Full budget context |
| **Budget Decoder - NGO Tracker** | `transfer_payments_full.csv.gz` | Nonprofit grants | Connection to budget programs |
| **Budget Decoder - Test Table** | Hybrid (budget + rollup) | Attempted integration | 71% missing matches |
| **Budget Overview** | `budget_summary_2025.json` | High-level totals | Agency/program details |
| **Legislator Spotlight** | `budget_by_district_2025.json` | District amendments | Actual spending by district |

**The Problem:** Users have to mentally connect 6+ different data views to understand one question: "Where did my tax dollars go?"

### Problem 4: **No Clear Entry Point**
Users land on homepage and see 4 tools:
1. Budget Decoder (4 tabs inside)
2. Legislator Spotlight (map + table)
3. FOIA Toolkit (static content)
4. Whistleblower Portal (static content)

**Question:** Which tool answers "How much did Virginia spend on schools this year?"
**Answer:** Unclear - data is split across Budget Decoder tabs and Budget Overview

---

## 💡 RECOMMENDATIONS FOR CLARITY & QUICK INSIGHT

### TIER 1: IMMEDIATE WINS (No Data Pipeline Changes)

#### 1.1 **Add Match Status Indicators**
Show users which programs have expenditure data BEFORE they try to expand:

```typescript
// In Budget Appropriations table, add a column:
{
  header: 'Data Available',
  cell: (row) => row.rollup ?
    <Chip icon={<CheckIcon />} label="Expenditures" size="small" color="success" /> :
    <Chip icon={<CloseIcon />} label="Budget Only" size="small" color="default" />
}
```

**Impact:** Users immediately see 235 programs with full data vs 568 with budget-only

#### 1.2 **Add Summary Stats Card**
At top of Budget Decoder, show:

```
┌─────────────────────────────────────────────────┐
│ FY2025 Budget Transparency Status               │
├─────────────────────────────────────────────────┤
│ Total Budget: $111.9B                           │
│ Programs with Expenditure Data: 235 / 803 (29%)│
│ YTD Spending Tracked: $XX.XB (XX% of budget)   │
│ Last Updated: Nov 24, 2024                      │
└─────────────────────────────────────────────────┘
```

**Impact:** Sets expectations - users know this is partial data, not complete

#### 1.3 **Merge Appropriations + Expenditures Tabs**
Instead of separate tabs, show ONE table with both columns:

| Program | Budgeted | Spent YTD | Execution Rate | Vendors | Actions |
|---------|----------|-----------|----------------|---------|---------|
| Medicaid Program Services | $25.2B | $18.4B | 73% | 1,234 | [Expand] |
| Highway Construction | $8.9B | $2.1B | 24% | 456 | [Expand] |
| Environmental Fin Assistance | $669M | $154M | 23% | 402 | [Expand] |
| State Education Assistance | $11.0B | - | - | - | Budget Only |

**Impact:** Users see full picture in one view, understand which programs have spending data

#### 1.4 **Redesign Test Table → "Full Budget View"**
Rename "Test Table" to "Integrated Budget View" and make it the DEFAULT tab:
- Show ALL 803 programs
- Clearly mark which have expenditure data
- Add filters: "Show only programs with spending data" toggle
- Add search: "Find programs by name or agency"

**Impact:** One authoritative view instead of confusing 4-tab interface

---

### TIER 2: MEDIUM EFFORT (Frontend + Data Improvements)

#### 2.1 **Create "Budget Story" Landing Page**
Replace current Budget Decoder with a narrative-driven page:

**Section 1: The Big Picture (Top of page)**
```
Virginia's FY2025 Budget: $111.9 Billion

[Donut Chart: Top 5 Story Buckets]
- Healthcare: $XX.XB (XX%)
- Education: $XX.XB (XX%)
- Transportation: $XX.XB (XX%)
- Public Safety: $XX.XB (XX%)
- Other: $XX.XB (XX%)

[Button: Explore Full Budget Breakdown]
```

**Section 2: Where Your Money Goes (Scrollable cards)**
```
┌─────────────────────────────────────┐
│ 🏥 Healthcare: $XX.XB               │
├─────────────────────────────────────┤
│ Top Programs:                       │
│ • Medicaid: $25.2B                  │
│ • State Health Services: $X.XB      │
│                                     │
│ [See All Healthcare Programs]       │
└─────────────────────────────────────┘
```

**Section 3: Follow the Money (Interactive drill-down)**
- Click story bucket → See agencies → See programs → See vendors
- Each level shows: Budget, Spent, Execution Rate, Vendor Count

**Impact:** Users get quick insights in 10 seconds, can drill deeper if interested

#### 2.2 **Add "Data Completeness" Metadata**
For each program, show:
- ✅ Budget data available (always true)
- ✅ Expenditure data available (true for 235 programs)
- ✅ Vendor details available (true for programs with >0 vendors)
- ⚠️ Partial data (true if execution rate < 10% - likely incomplete)
- ❌ No expenditure data (true for 568 programs)

**Impact:** Transparency about data quality builds trust

#### 2.3 **Improve Decoder Pipeline Matching**
Run analysis to find common mismatch patterns:

```bash
# Compare budget program names vs rollup program names
# Find programs in budget but not in rollup
# Identify naming variations (e.g., "Fin Asst" vs "Financial Assistance")
```

Then update `scripts/build_budget_decoder.py`:
- Add more fuzzy matching rules
- Create manual mapping file for known mismatches
- Add "unmatched budget programs" report

**Target:** Increase match rate from 29% to 50%+

#### 2.4 **Create "Budget vs. Reality" Comparison View**
New page that shows:
- What was budgeted (Chapter 725)
- What was spent (CARDINAL YTD)
- What's the gap (and why)

Example:
```
Capital Projects: $5.2B budgeted
├─ Spent YTD: $1.1B (21%)
├─ Why low? Capital projects spend over multiple years
└─ Expected: Normal for Q2 of fiscal year

Medicaid: $25.2B budgeted
├─ Spent YTD: $18.4B (73%)
├─ Why high? Healthcare costs front-loaded
└─ Expected: On track for full-year spending
```

**Impact:** Educates users on why execution rates vary

---

### TIER 3: MAJOR EFFORT (Data Pipeline Overhaul)

#### 3.1 **Unified Budget-Expenditure Data Model**
Create new CSV that joins budget + expenditure at program level:

**File:** `public/data/unified_budget_2025.csv`

| fiscal_year | secretariat | agency | program | budgeted_amount | spent_ytd | execution_rate | vendor_count | has_vendor_details | data_quality |
|-------------|-------------|--------|---------|-----------------|-----------|----------------|--------------|-------------------|--------------|
| 2025 | HEALTH AND HUMAN RESOURCES | Dept of Med Assistance Svcs | Medicaid Program Services | 25206639950.1 | 18400000000 | 0.73 | 1234 | true | complete |
| 2025 | NATURAL RESOURCES | Dept of Environmental Quality | Environmental Fin Assistance | 669665088.71 | 154574258 | 0.23 | 402 | true | complete |
| 2025 | EDUCATION | Direct Aid to Public Education | State Educatn Assistance Pgms | 10960963278.49 | NULL | NULL | 0 | false | budget_only |

**Benefits:**
- Single source of truth
- Clear data quality flags
- Easy to filter/sort/search
- Supports all current views

#### 3.2 **Add Historical Trends**
Extend data to include FY2023, FY2024, FY2025:
- Show spending trends over time
- Identify programs with unusual changes
- Predict full-year spending based on historical patterns

**Example:**
```
Medicaid Program Services
├─ FY2023: $22.1B budgeted, $21.8B spent (99%)
├─ FY2024: $23.5B budgeted, $23.2B spent (99%)
└─ FY2025: $25.2B budgeted, $18.4B spent YTD (73%)
    └─ Projected: $24.9B (99% - on track)
```

#### 3.3 **Real-Time Data Updates**
Currently: Data updated manually, last refresh Nov 24, 2024
Proposed: Automated monthly updates from CARDINAL

**Pipeline:**
1. Monthly CARDINAL export → S3 bucket
2. Lambda function runs decoder pipeline
3. Updates CSV files in `public/decoder/`
4. Triggers Netlify rebuild
5. Users see fresh data within 24 hours

**Impact:** Data stays current, users trust the platform

#### 3.4 **Add Budget Amendment Tracking**
Integrate Amendment Vault data to show:
- Original budget (Chapter 725)
- Amendments by legislators
- Revised budget (after amendments)
- Actual spending

**Example:**
```
Environmental Fin Assistance
├─ Original Budget: $650M
├─ Amendments: +$19.7M (Del. Smith: +$15M, Del. Jones: +$4.7M)
├─ Revised Budget: $669.7M
└─ Spent YTD: $154.6M (23%)
```

**Impact:** Users see full budget lifecycle, understand legislator influence

---

## 🎨 PROPOSED NEW INFORMATION ARCHITECTURE

### Current Structure (Confusing)
```
Homepage
├─ Budget Decoder
│  ├─ Budget Appropriations (803 programs, budget only)
│  ├─ Actual Expenditures (235 programs, spending only)
│  ├─ Pass-Through NGO Tracker (nonprofit grants)
│  └─ Test Table (hybrid, 71% missing data)
├─ Legislator Spotlight (district amendments)
├─ FOIA Toolkit (static)
└─ Whistleblower Portal (static)
```

### Proposed Structure (Clear)
```
Homepage
├─ 💰 Budget Explorer (Main tool - replaces Budget Decoder)
│  ├─ Overview Tab: Big picture + story buckets
│  ├─ Programs Tab: Unified budget + spending table (803 programs)
│  ├─ Agencies Tab: Agency-level rollups
│  └─ Vendors Tab: Who got paid (vendor details)
│
├─ 🗺️ Legislator Spotlight
│  ├─ Map View: District spending + amendments
│  └─ Legislator Profiles: Individual voting records
│
├─ 🏢 Nonprofit Tracker (Standalone - promoted from sub-tab)
│  ├─ All Nonprofits: Full list with IRS verification
│  ├─ Red Flags: Suspicious patterns
│  └─ Success Stories: High-impact organizations
│
├─ 📊 Budget Timeline (Already exists)
│  ├─ Timeline Tab: Budget process stages
│  └─ Key Visuals Tab: Charts and comparisons
│
├─ 🔍 Transparency Tools
│  ├─ FOIA Toolkit
│  └─ Whistleblower Portal
│
└─ 📚 About & Methodology
   ├─ Data Sources
   ├─ How We Match Budget to Spending
   └─ Data Quality & Limitations
```

**Key Changes:**
1. **Budget Decoder → Budget Explorer**: More user-friendly name
2. **Unified Programs Tab**: One table with budget + spending (not separate tabs)
3. **Nonprofit Tracker**: Promoted to top-level (it's unique and valuable)
4. **About & Methodology**: NEW - explains data gaps transparently

---

## 📋 SPECIFIC ACTIONABLE NEXT STEPS

### Phase 1: Quick Wins (This Week)
- [ ] Add "Data Available" column to Budget Appropriations table
- [ ] Add summary stats card showing match rate (235/803)
- [ ] Rename "Test Table" to "Integrated View" and make it default
- [ ] Add toggle: "Show only programs with spending data"
- [ ] Add help text explaining why some programs have no expenditure data

### Phase 2: UX Improvements (Next 2 Weeks)
- [ ] Merge Appropriations + Expenditures tabs into one unified table
- [ ] Create "Budget Story" landing section at top of Budget Decoder
- [ ] Add data quality indicators (✅ Complete, ⚠️ Partial, ❌ Budget Only)
- [ ] Improve execution rate calculations (aggregate service areas correctly)
- [ ] Add "Why is this execution rate low?" tooltips

### Phase 3: Data Pipeline (Next Month)
- [ ] Run analysis: Compare budget program names vs rollup program names
- [ ] Create manual mapping file for known mismatches
- [ ] Update decoder pipeline with improved fuzzy matching
- [ ] Generate "unmatched programs" report
- [ ] Target: Increase match rate from 29% to 50%+

### Phase 4: Major Enhancements (Next Quarter)
- [ ] Create unified budget-expenditure CSV
- [ ] Add historical trends (FY2023-2025)
- [ ] Integrate Amendment Vault data
- [ ] Set up automated monthly data updates
- [ ] Build "Budget vs. Reality" comparison view

---

## 🎯 SUCCESS METRICS

### Current State
- **Match Rate:** 29% (235/803 programs)
- **User Confusion:** High (4 tabs, unclear which to use)
- **Data Freshness:** Static (last updated Nov 24, 2024)
- **Insight Speed:** Slow (requires clicking through multiple tabs)

### Target State (3 Months)
- **Match Rate:** 50%+ (400+/803 programs)
- **User Confusion:** Low (1 unified view with clear indicators)
- **Data Freshness:** Monthly automated updates
- **Insight Speed:** Fast (key insights visible in <10 seconds)

### User Success Criteria
✅ User can answer "How much did VA spend on schools?" in <30 seconds
✅ User understands why some programs show 0% execution rate
✅ User knows which data is complete vs. partial
✅ User can find vendor details for programs that have them
✅ User trusts the data (clear sources, limitations, last updated date)

---

## 💬 CONCLUSION

**The Core Problem:** You're trying to match two fundamentally different data structures:
1. **Budget data** (policy-level appropriations from legislature)
2. **Expenditure data** (operational-level transactions from accounting system)

**The Reality:** Perfect 100% match is impossible because:
- Budget is forward-looking (what we plan to spend)
- Expenditures are backward-looking (what we actually spent)
- Timing differences (YTD vs. full year)
- Structural differences (program names don't align perfectly)
- Some budget items never generate CARDINAL transactions (reserves, transfers, etc.)

**The Solution:** Don't hide the gap - EXPLAIN it:
1. Show users which programs have complete data (235)
2. Show users which programs have budget-only data (568)
3. Explain WHY the gap exists (timing, structure, data sources)
4. Focus on making the 235 programs with full data SHINE
5. Gradually improve match rate through better pipeline logic

**The Goal:** Quick insight without digging
- ✅ Big picture visible in 10 seconds (story buckets, top programs)
- ✅ Drill-down available for curious users (vendor details, trends)
- ✅ Data quality transparent (users know what's complete vs. partial)
- ✅ One authoritative view (not 4 confusing tabs)

**Next Step:** Pick 3-5 items from Phase 1 and implement them this week. The quick wins will dramatically improve user experience while you work on longer-term data pipeline improvements.


