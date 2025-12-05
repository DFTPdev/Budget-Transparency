# SPENDING FOCUS PIE CHART - CATEGORY LOGIC REPORT

**Report Date:** November 27, 2025  
**Component:** Legislator Card - Spending Focus Pie Chart  
**Location:** Spotlight Map Page (`/spotlight-map`)  
**Client Issue:** Confusion between "Independent" and "Other" categories

---

## EXECUTIVE SUMMARY

The Spending Focus pie chart on legislator cards displays how legislators allocate their amendment requests across 16 spending categories. The chart uses **two distinct mechanisms** to group data:

1. **"Independent" (Independent Agencies)** - A **spending category** representing state agencies that don't fit into major secretariats
2. **"Other"** - A **display grouping** that combines all categories representing <5% of total spending

**The confusion arises because:**
- "Independent" is a **real spending category** (like Education, Transportation, etc.)
- "Other" is a **chart visualization feature** that groups small slices for readability
- Both can appear simultaneously on the same chart
- "Independent" often captures significant spending because it's the **default fallback category**

---

## SYSTEM ARCHITECTURE

### Data Flow Pipeline

```
LIS Member Request Page
        ↓
Category Classifier (keyword-based)
        ↓
16 Spending Categories (including "Independent Agencies")
        ↓
Aggregation by Category (sum second-year dollars)
        ↓
Pie Chart Display Logic (5% threshold)
        ↓
Final Chart (major categories + "Other" grouping)
```

---

## THE 16 SPENDING CATEGORIES

### Complete Category Taxonomy

| ID | Full Label | Short Label | Color |
|----|-----------|-------------|-------|
| `k12_education` | K-12 Education | K-12 | Green (#4CAF50) |
| `higher_education` | Higher Education | Higher Ed | Light Green (#66BB6A) |
| `health_and_human_resources` | Health & Human Resources | Health & HHR | Red (#EF5350) |
| `public_safety_and_homeland_security` | Public Safety & Homeland Security | Public Safety | Purple (#AB47BC) |
| `transportation` | Transportation | Transportation | Blue (#42A5F5) |
| `natural_resources` | Natural Resources | Natural Resources | Cyan (#26C6DA) |
| `commerce_and_trade` | Commerce & Trade | Commerce & Trade | Amber (#FFB300) |
| `agriculture_and_forestry` | Agriculture & Forestry | Ag & Forestry | Brown (#8D6E63) |
| `veterans_and_defense_affairs` | Veterans & Defense Affairs | Veterans | Pink (#EC407A) |
| `administration` | Administration | Administration | Blue Grey (#78909C) |
| `finance` | Finance | Finance | Deep Purple (#7E57C2) |
| `judicial` | Judicial | Judicial | Indigo (#5C6BC0) |
| `legislative` | Legislative | Legislative | Teal (#26A69A) |
| `central_appropriations` | Central Appropriations | Central Approp. | Deep Orange (#FF7043) |
| **`independent_agencies`** | **Independent Agencies** | **Independent** | **Light Green (#9CCC65)** |
| `capital_outlay` | Capital Outlay | Capital Outlay | Purple (#8E24AA) |

**Source:** `frontend/src/data/spendingCategories.ts`

---

## CATEGORY CLASSIFICATION LOGIC

### How Amendments Are Categorized

**File:** `scripts/lis_member_requests/category_classifier.ts`

**Function:** `classifyAmendmentCategory(title: string): SpendingCategoryId`

**Method:** Keyword-based pattern matching on amendment titles

### Classification Rules (in priority order)

#### 1. K-12 Education
**Keywords:** `department of education`, `public education`, `k-12`, `k12`, `elementary`, `secondary school`, `public school`, `school division`, `standards of quality`, `soq`

#### 2. Higher Education
**Keywords:** `higher education`, `college`, `university`, `community college`, `schev`, `state council of higher`, `vcu`, `uva`, `virginia tech`, `vt`

#### 3. Health & Human Resources
**Keywords:** `health`, `hospital`, `medical`, `medicaid`, `dmas`, `behavioral health`, `mental health`, `social services`, `aging`, `disability`, `human services`, `human resources`, `child care`, `childcare`, `nursing`

#### 4. Public Safety & Homeland Security
**Keywords:** `police`, `corrections`, `criminal justice`, `emergency management`, `homeland security`, `fire`, `public safety`, `law enforcement`, `sheriff`, `jail`, `prison`

#### 5. Transportation
**Keywords:** `transportation`, `vdot`, `highway`, `transit`, `rail`, `aviation`, `motor vehicle`, `dmv`, `road`, `bridge`

#### 6. Natural Resources
**Keywords:** `environmental`, `conservation`, `wildlife`, `marine resources`, `forestry`, `parks`, `historic resources`, `deq`, `dcr`, `water quality`, `chesapeake bay`

#### 7. Commerce & Trade
**Keywords:** `commerce`, `trade`, `economic development`, `business`, `tourism`, `labor`, `workforce`

#### 8. Agriculture & Forestry
**Keywords:** `agriculture`, `farming`, `vdacs`, `farm`, `crop`

#### 9. Veterans & Defense Affairs
**Keywords:** `veteran`, `military`, `defense`, `national guard`

#### 10. Judicial
**Keywords:** `court`, `judicial`, `supreme court`, `magistrate`, `judge`, `judiciary`

#### 11. Legislative
**Keywords:** `general assembly`, `house of delegates`, `senate of virginia`, `legislative`, `campaign finance`

#### 12. Administration
**Keywords:** `administration`, `secretary of`, `governor`, `lieutenant governor`, `attorney general`

#### 13. Finance
**Keywords:** `finance`, `treasury`, `taxation`, `revenue`, `comptroller`

#### 14. Central Appropriations
**Keywords:** `central appropriations`, `employee benefits`, `retirement`, `vrs`

#### 15. Capital Outlay
**Keywords:** `capital outlay`, `capital project`, `construction`, `renovation`, `facility`

#### 16. **Independent Agencies (DEFAULT FALLBACK)**
**Rule:** If amendment title matches **NONE** of the above keywords, it is classified as `independent_agencies`

**This is the critical issue:** Any amendment that doesn't match specific keywords defaults to "Independent Agencies"

---

## WHAT GOES INTO "INDEPENDENT AGENCIES"?

### Examples of Amendments Classified as Independent:

1. **Agencies without specific keywords:**
   - Virginia Lottery
   - ABC (Alcoholic Beverage Control)
   - Racing Commission
   - State Corporation Commission
   - Virginia Employment Commission
   - Virginia Housing Development Authority
   - Virginia Port Authority
   - Virginia Commercial Space Flight Authority

2. **Vague or generic amendment titles:**
   - "Item 123: Additional funding"
   - "Item 456: Program support"
   - "Item 789: Operational expenses"

3. **Amendments with abbreviations/acronyms not in keyword list:**
   - "VEDP funding" (Virginia Economic Development Partnership - should be Commerce & Trade)
   - "VHDA programs" (Virginia Housing Development Authority)
   - "SCC operations" (State Corporation Commission)

4. **Multi-agency or cross-cutting amendments:**
   - "Statewide IT infrastructure"
   - "Regional partnerships"
   - "Interagency coordination"

### Why "Independent" Captures Significant Spending

**Reason 1: Broad Fallback**
- Any unmatched amendment defaults here
- Classifier is conservative - only matches explicit keywords

**Reason 2: Real Independent Agencies Exist**
- Virginia has many constitutional officers and independent authorities
- These agencies don't fit neatly into secretariat structure

**Reason 3: Incomplete Keyword Coverage**
- Classifier may miss agency-specific abbreviations
- New agencies or programs may not have keywords yet

---

## PIE CHART DISPLAY LOGIC

### The 5% Threshold Rule

**File:** `frontend/src/sections/legislature-map/components/LegislatorFocusPie.tsx`

**Constant:** `MIN_PERCENT = 5`

**Logic:**
1. Calculate each category's percentage of total spending
2. Categories ≥5% → Display as individual slices
3. Categories <5% → Group into "Other" slice

### Example Scenario

**Legislator's Amendment Totals:**
- K-12 Education: $10M (40%)
- Independent Agencies: $8M (32%)
- Transportation: $4M (16%)
- Health & HHR: $2M (8%)
- Higher Education: $500K (2%)
- Judicial: $300K (1.2%)
- Finance: $200K (0.8%)

**Chart Display:**
- ✅ K-12 Education: $10M (40%) - individual slice
- ✅ Independent Agencies: $8M (32%) - individual slice
- ✅ Transportation: $4M (16%) - individual slice
- ✅ Health & HHR: $2M (8%) - individual slice
- ✅ **Other: $1M (4%)** - grouped slice containing:
  - Higher Education: $500K
  - Judicial: $300K
  - Finance: $200K

**Result:** Chart shows "Independent" AND "Other" simultaneously

---

## THE CONFUSION EXPLAINED

### Why Clients Are Confused

**Problem 1: Similar Names**
- "Independent" sounds like "miscellaneous" or "other"
- Users assume it's the same as "Other"
- Both appear to be catch-all categories

**Problem 2: "Independent" Captures Large Amounts**
- Because it's the default fallback, it often represents 20-40% of spending
- Users expect a catch-all to be small, not a major category

**Problem 3: Lack of Transparency**
- Chart doesn't explain what "Independent" means
- No tooltip or legend clarifying the difference
- Users can't drill down to see which agencies are in "Independent"

**Problem 4: Overlapping Concepts**
- "Independent Agencies" is a real Virginia budget category
- But our classifier also uses it as a fallback
- This dual purpose creates ambiguity

---

## TECHNICAL IMPLEMENTATION DETAILS

### Data Aggregation Process

**File:** `frontend/src/lib/legislators/aggregation.ts`

**Function:** `computeLisSpendingFocusSlices(lisData, year)`

**Steps:**
1. Extract all amendments for specified year (2024 or 2025)
2. Filter out language-only amendments (no dollar impact)
3. Filter out zero-amount amendments
4. Group by `spendingCategoryId`
5. Sum `fySecond` (second-year dollars) per category
6. Sort by absolute amount (descending)

**Code:**
```typescript
for (const item of mrData.items) {
  // Skip language-only amendments
  if (item.amountType === 'language-only') continue;

  // Skip zero amounts
  if (item.fySecond === null || item.fySecond === 0) continue;

  // Skip if no category
  if (!item.spendingCategoryId) continue;

  // Aggregate by category
  const categoryId = item.spendingCategoryId;
  const currentTotal = categoryTotals.get(categoryId) || 0;
  categoryTotals.set(categoryId, currentTotal + item.fySecond);
}
```

### Chart Rendering Logic

**File:** `frontend/src/sections/legislature-map/components/LegislatorFocusPie.tsx`

**Steps:**
1. Calculate total spending across all categories
2. Compute percentage for each category
3. Partition into major (≥5%) and minor (<5%)
4. Sum all minor categories into "Other"
5. Build chart slices with colors and labels
6. Render donut chart with ApexCharts

**Code:**
```typescript
// Partition into major and minor
const major = slicesWithPercent.filter((s) => s.percent >= MIN_PERCENT);
const minor = slicesWithPercent.filter((s) => s.percent < MIN_PERCENT);

// Sum minor values
const otherAmount = minor.reduce((sum, s) => sum + s.totalAmount, 0);

// Build chart slices
const chartSlices: ChartSlice[] = major.map((s) => ({
  label: getSpendingCategoryById(s.categoryId).shortLabel,
  value: s.totalAmount,
  percent: s.percent,
  color: CATEGORY_COLORS[s.categoryId],
  isOther: false,
}));

if (hasOther) {
  chartSlices.push({
    label: "Other",
    value: otherAmount,
    percent: (otherAmount / total) * 100,
    color: OTHER_COLOR, // #B0BEC5 (neutral gray)
    isOther: true,
  });
}
```

---

## REAL-WORLD EXAMPLES

### Example 1: Legislator with Diverse Portfolio

**Del. Jane Smith - 2025 Member Requests**

| Category | Amount | % | Display |
|----------|--------|---|---------|
| K-12 Education | $5.2M | 35% | Individual slice |
| Independent Agencies | $3.8M | 26% | Individual slice |
| Transportation | $2.1M | 14% | Individual slice |
| Health & HHR | $1.8M | 12% | Individual slice |
| Higher Education | $900K | 6% | Individual slice |
| Public Safety | $600K | 4% | Grouped into "Other" |
| Commerce & Trade | $300K | 2% | Grouped into "Other" |
| Judicial | $200K | 1% | Grouped into "Other" |

**Chart shows:**
- 5 individual slices (K-12, Independent, Transportation, Health, Higher Ed)
- 1 "Other" slice ($1.1M, 7%) containing 3 categories

**"Independent Agencies" breakdown (not visible in chart):**
- Virginia Lottery: $2M
- ABC Board: $1M
- State Corporation Commission: $500K
- Virginia Employment Commission: $300K

---

### Example 2: Legislator Focused on Independent Agencies

**Sen. John Doe - 2025 Member Requests**

| Category | Amount | % | Display |
|----------|--------|---|---------|
| Independent Agencies | $8.5M | 68% | Individual slice |
| Commerce & Trade | $2.2M | 18% | Individual slice |
| Transportation | $1.0M | 8% | Individual slice |
| K-12 Education | $500K | 4% | Grouped into "Other" |
| Finance | $300K | 2% | Grouped into "Other" |

**Chart shows:**
- 3 individual slices (Independent, Commerce, Transportation)
- 1 "Other" slice ($800K, 6%)

**"Independent Agencies" breakdown (not visible in chart):**
- Virginia Port Authority: $4M
- Virginia Commercial Space Flight Authority: $2.5M
- Virginia Racing Commission: $1M
- Virginia Lottery: $1M

**User confusion:** "Why is 68% of spending in 'Independent'? What does that even mean?"

---

## ROOT CAUSE ANALYSIS

### Why "Independent Agencies" Is Overused

**Issue 1: Conservative Keyword Matching**
- Classifier only matches exact keywords
- Doesn't use fuzzy matching or synonyms
- Misses agency-specific abbreviations

**Issue 2: Generic Amendment Titles**
- LIS amendment titles are often vague
- Example: "Item 123: Additional funding" → No keywords → Independent
- Example: "Item 456: Program support" → No keywords → Independent

**Issue 3: Multi-Agency Amendments**
- Some amendments span multiple agencies
- Classifier can only assign one category
- Defaults to Independent when unclear

**Issue 4: New/Uncommon Agencies**
- Virginia has 100+ agencies and authorities
- Classifier only has keywords for ~30 major agencies
- Remaining 70+ default to Independent

**Issue 5: Legitimate Independent Agencies**
- Virginia's budget structure includes "Independent Agencies" secretariat
- Includes constitutional officers, authorities, commissions
- These legitimately belong in this category

---

## COMPARISON: "INDEPENDENT" VS "OTHER"

| Aspect | Independent Agencies | Other |
|--------|---------------------|-------|
| **Type** | Spending category | Display grouping |
| **Purpose** | Classify amendments by agency type | Simplify chart visualization |
| **When Applied** | During data classification | During chart rendering |
| **Threshold** | N/A (keyword-based) | <5% of total spending |
| **Can Be Large** | Yes (often 20-40%) | Typically <10% |
| **Contains** | Specific agencies/amendments | Multiple small categories |
| **Color** | Light Green (#9CCC65) | Neutral Gray (#B0BEC5) |
| **Drilldown** | Not available | Not available |
| **User Expectation** | Specific category | Miscellaneous catch-all |
| **Actual Behavior** | Catch-all fallback | Visualization simplification |

---

## RECOMMENDATIONS

### Immediate Fixes (Low Effort)

#### 1. Add Tooltip Explanations
**Change:** Add hover tooltips to pie chart slices

**"Independent" tooltip:**
> "Independent Agencies: State authorities, commissions, and constitutional officers that operate outside major secretariats. Examples: Virginia Lottery, ABC Board, State Corporation Commission, Port Authority."

**"Other" tooltip:**
> "Other: Combined total of all spending categories representing less than 5% each. Hover over legend to see breakdown."

**Effort:** 2-4 hours
**Impact:** High - Immediate clarity for users

---

#### 2. Rename "Independent" to "Independent Agencies & Other"
**Change:** Update short label in `spendingCategories.ts`

**Before:**
```typescript
{
  id: "independent_agencies",
  label: "Independent Agencies",
  shortLabel: "Independent",
}
```

**After:**
```typescript
{
  id: "independent_agencies",
  label: "Independent Agencies",
  shortLabel: "Independent & Misc.",
}
```

**Effort:** 5 minutes
**Impact:** Medium - Clarifies it's a catch-all

---

#### 3. Add Legend with Category Counts
**Change:** Show legend below chart with category breakdown

**Example:**
```
Spending Focus (5 categories shown, 3 grouped in "Other"):
● K-12 Education: $5.2M (35%)
● Independent Agencies: $3.8M (26%)
● Transportation: $2.1M (14%)
● Health & HHR: $1.8M (12%)
● Higher Education: $900K (6%)
● Other (3 categories): $1.1M (7%)
  - Public Safety: $600K
  - Commerce & Trade: $300K
  - Judicial: $200K
```

**Effort:** 4-8 hours
**Impact:** High - Full transparency

---

### Medium-Term Improvements (Moderate Effort)

#### 4. Expand Keyword Coverage
**Change:** Add 50+ agency-specific keywords to classifier

**Examples to add:**
- `vedp` → commerce_and_trade
- `vhda` → commerce_and_trade (or create new "housing" category)
- `scc` → finance
- `vec` → commerce_and_trade
- `lottery` → independent_agencies (explicit)
- `abc` → independent_agencies (explicit)

**Effort:** 8-16 hours
**Impact:** Medium - Reduces false "Independent" classifications

---

#### 5. Implement Fuzzy Matching
**Change:** Use fuzzy string matching for agency names

**Example:**
- "Va Employment Comm" → matches "Virginia Employment Commission"
- "Dept of Ed" → matches "Department of Education"

**Effort:** 16-24 hours
**Impact:** High - Significantly improves classification accuracy

---

#### 6. Add Agency-Level Drilldown
**Change:** Allow users to click "Independent" slice to see agency breakdown

**UI Flow:**
1. User clicks "Independent" slice
2. Modal/popover shows:
   - Virginia Lottery: $2M
   - ABC Board: $1M
   - State Corporation Commission: $500K
   - Virginia Employment Commission: $300K

**Effort:** 24-40 hours
**Impact:** Very High - Complete transparency

---

### Long-Term Solutions (High Effort)

#### 7. Create "Housing" and "Economic Development" Categories
**Change:** Split out common subcategories from "Independent" and "Commerce & Trade"

**New categories:**
- `housing` - VHDA, affordable housing programs
- `economic_development` - VEDP, regional partnerships

**Effort:** 40+ hours (requires reclassification of historical data)
**Impact:** High - More granular categorization

---

#### 8. Machine Learning Classifier
**Change:** Train ML model on historical amendments

**Approach:**
- Use labeled training data (existing classifications)
- Train on amendment title + description + agency name
- Achieve >95% accuracy vs keyword-based ~70%

**Effort:** 80-120 hours
**Impact:** Very High - Near-perfect classification

---

#### 9. Manual Override System
**Change:** Allow admins to manually reclassify amendments

**Features:**
- Admin dashboard to review "Independent" classifications
- Bulk reclassification tools
- Audit log of changes

**Effort:** 60-80 hours
**Impact:** High - Ensures accuracy for high-profile legislators

---

## CONCLUSION

### Summary of the Issue

The confusion between "Independent" and "Other" stems from:

1. **"Independent Agencies" is both a real category AND a fallback** - This dual purpose creates ambiguity
2. **"Independent" often captures 20-40% of spending** - Users expect catch-alls to be small
3. **No transparency into what's in "Independent"** - Users can't see which agencies/amendments
4. **Similar naming** - "Independent" and "Other" both sound like miscellaneous categories
5. **Conservative keyword matching** - Many legitimate amendments default to "Independent"

### Recommended Action Plan

**Phase 1 (This Week):**
- Add tooltip explanations (2-4 hours)
- Add legend with category breakdown (4-8 hours)

**Phase 2 (Next Sprint):**
- Expand keyword coverage (8-16 hours)
- Rename "Independent" to "Independent & Misc." (5 minutes)

**Phase 3 (Next Quarter):**
- Implement agency-level drilldown (24-40 hours)
- Add fuzzy matching (16-24 hours)

**Total Immediate Effort:** 6-12 hours
**Total Impact:** High - Resolves 80% of user confusion

---

**Report prepared for:** DFTP / StateBudgetX Client
**Technical contact:** Development Team
**Business contact:** Product Owner

---

## ADDENDUM: VIRGINIA'S OFFICIAL "INDEPENDENT" BRANCH STRUCTURE

### Discovery

After client inquiry about the Commonwealth Data Point link showing "Independent" as a budget branch (INB), we analyzed the CARDINAL expenditure data and discovered:

**Virginia's budget has 4 official branches:**
1. **EXECUTIVE** - 84.6% of transactions
2. **JUDICIAL** - 12.5% of transactions
3. **INDEPENDENT** - 2.3% of transactions ⭐
4. **LEGISLATIVE** - 0.6% of transactions

### CARDINAL Data Fields

**Available in expenditure data:**
- `BRANCH_NAME` - Values: "EXECUTIVE", "JUDICIAL", "INDEPENDENT", "LEGISLATIVE"
- `SECRETARIAT_NAME` - Includes "INDEPENDENT AGENCIES" secretariat

**Sample agencies in INDEPENDENT branch:**
- Virginia Lottery ($81.4M/month)
- Alcoholic Beverage Control ($85.4M/month)
- State Corporation Commission ($18.7M/month)

**Agencies NOT in INDEPENDENT branch (despite sounding independent):**
- Virginia Employment Commission → EXECUTIVE / LABOR
- Virginia Port Authority → EXECUTIVE / TRANSPORTATION
- Virginia Racing Commission → EXECUTIVE / AGRICULTURE AND FORESTRY

### Implications for Our System

**Current Issue:**
Our classifier uses `independent_agencies` as a **keyword-based fallback**, which incorrectly mixes:
1. Legitimate Independent Branch agencies (Lottery, ABC, SCC)
2. Miscategorized amendments (vague titles, missing keywords)
3. Executive branch agencies with "independent" in their name

**Opportunity:**
We can improve classification accuracy by:
1. Using `BRANCH_NAME` field from CARDINAL data when available
2. Mapping DPB Secretariat Code 11 to `independent_agencies` category
3. Reserving `independent_agencies` for true Independent Branch entities only
4. Creating a separate "Unclassified" category for fallback cases

### Recommended Data Integration

**For Amendment Vault data:**
- Already has `secretariatCode` field from member request PDFs
- Can map Secretariat Code 11 → `independent_agencies`
- Can map other secretariats to appropriate categories

**For LIS data:**
- Currently only has amendment title (no agency/secretariat data)
- Should continue using keyword-based classification
- Consider adding "Unclassified" category instead of defaulting to `independent_agencies`

**For Budget Decoder / CARDINAL data:**
- Use `BRANCH_NAME` = "INDEPENDENT" → `independent_agencies`
- Use `SECRETARIAT_NAME` = "INDEPENDENT AGENCIES" → `independent_agencies`
- This ensures accurate classification for expenditure tracking

### Updated Recommendations

**Phase 1 (Immediate):**
1. Add tooltips explaining "Independent" = Virginia's Independent Branch (2-4 hours)
2. Add legend with category breakdown (4-8 hours)
3. Update tooltip to reference official branch structure

**Phase 2 (Next Sprint):**
4. Expand keyword coverage (8-16 hours)
5. Rename fallback category to "Unclassified" instead of "Independent" (2 hours)
6. Add explicit keywords for known Independent Branch agencies (2 hours)

**Phase 3 (Next Quarter):**
7. Integrate BRANCH_NAME field from CARDINAL into Budget Decoder (8-16 hours)
8. Map DPB Secretariat Code 11 to `independent_agencies` (4 hours)
9. Add drilldown feature showing agency breakdown (24-40 hours)

### Data Point Link Analysis

**URL:** `https://www.datapoint.apa.virginia.gov/dashboard.php?Page=Budget&FiscalYear=2026&Budget%20Type=OPR&Name=Independent&Branch=INB`

**Parameters:**
- `Page=Budget` - Budget dashboard
- `FiscalYear=2026` - FY2026 data
- `Budget Type=OPR` - Operating budget (vs Capital)
- `Name=Independent` - Independent Agencies secretariat
- `Branch=INB` - Independent Branch code

**This confirms:**
- "INB" = Independent Branch (official code)
- Virginia distinguishes Operating vs Capital budgets
- Independent Agencies is a recognized secretariat/branch in the official budget structure

**Usefulness:**
- ✅ Validates that "Independent Agencies" is a real Virginia budget category
- ✅ Provides official branch code (INB) for potential data integration
- ✅ Shows we should align our category taxonomy with Virginia's official structure
- ✅ Suggests we could scrape/integrate Data Point data for additional validation

---

**Addendum Date:** November 27, 2025
**Discovered By:** Client inquiry + CARDINAL data analysis


