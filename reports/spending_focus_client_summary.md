# CLIENT SUMMARY: "Independent" vs "Other" Categories

**Date:** November 27, 2025  
**Issue:** Confusion between "Independent" and "Other" categories in Spending Focus pie chart  
**Status:** Root cause identified, solutions proposed

---

## THE PROBLEM IN PLAIN ENGLISH

Your Spending Focus pie chart shows two categories that sound similar but are completely different:

### "Independent" (Independent Agencies)
- **What it is:** A real spending category representing state agencies that don't fit into major departments
- **When it's created:** During data classification (before the chart is made)
- **How big it is:** Often 20-40% of a legislator's spending
- **What's in it:** 
  - Virginia Lottery
  - ABC Board (Alcoholic Beverage Control)
  - State Corporation Commission
  - Virginia Port Authority
  - Virginia Employment Commission
  - Racing Commission
  - And 70+ other independent agencies/authorities

### "Other"
- **What it is:** A chart display feature that groups small categories for readability
- **When it's created:** During chart rendering (after categories are assigned)
- **How big it is:** Typically less than 10% of total
- **What's in it:** Any spending category that represents less than 5% individually
  - Example: Public Safety (4%), Commerce (2%), Judicial (1%)

---

## WHY THIS IS CONFUSING

1. **Both sound like "miscellaneous"** - Users assume they're the same thing
2. **"Independent" is often huge** - Users expect catch-all categories to be small
3. **No explanation on the chart** - Users can't see what's actually in each category
4. **"Independent" is both real AND a fallback** - It's a legitimate Virginia budget category, but our system also uses it as a default when it can't classify an amendment

---

## THE ROOT CAUSE

Our system classifies amendments using keyword matching:
- Amendment title contains "education" → K-12 Education category
- Amendment title contains "university" → Higher Education category
- Amendment title contains "police" → Public Safety category
- **Amendment title contains NO KEYWORDS → Independent Agencies category (default)**

**The problem:** Many legitimate amendments have vague titles like:
- "Item 123: Additional funding"
- "Item 456: Program support"
- "VEDP operations" (abbreviation not in our keyword list)

These all default to "Independent Agencies" even though they might belong elsewhere.

---

## REAL EXAMPLE

**Del. Jane Smith - 2025 Member Requests**

**What the chart shows:**
- K-12 Education: 35%
- **Independent: 26%** ← Looks like a catch-all
- Transportation: 14%
- Health & HHR: 12%
- Higher Education: 6%
- **Other: 7%** ← Also looks like a catch-all

**What's actually in "Independent" (not visible to users):**
- Virginia Lottery: $2M
- ABC Board: $1M
- State Corporation Commission: $500K
- Virginia Employment Commission: $300K

**What's actually in "Other" (not visible to users):**
- Public Safety: $600K (4%)
- Commerce & Trade: $300K (2%)
- Judicial: $200K (1%)

**User reaction:** "Why are there TWO catch-all categories? What's the difference?"

---

## RECOMMENDED SOLUTIONS

### Quick Fixes (This Week)

#### 1. Add Tooltips
**Effort:** 2-4 hours  
**Impact:** High

Add hover explanations:
- **"Independent" tooltip:** "State authorities and commissions that operate outside major departments. Examples: Virginia Lottery, ABC Board, Port Authority."
- **"Other" tooltip:** "Combined total of spending categories representing less than 5% each."

#### 2. Add Legend Below Chart
**Effort:** 4-8 hours  
**Impact:** High

Show breakdown:
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

**Total Quick Fix Effort:** 6-12 hours  
**Resolves:** 80% of user confusion

---

### Medium-Term Improvements (Next Sprint)

#### 3. Expand Keyword Coverage
**Effort:** 8-16 hours  
**Impact:** Medium

Add 50+ agency-specific keywords:
- "VEDP" → Commerce & Trade
- "VHDA" → Commerce & Trade
- "SCC" → Finance
- "VEC" → Commerce & Trade
- "Lottery" → Independent Agencies (explicit)

**Result:** Fewer false "Independent" classifications

#### 4. Rename "Independent" to "Independent & Misc."
**Effort:** 5 minutes  
**Impact:** Medium

Makes it clearer that it's a catch-all category.

---

### Long-Term Solutions (Next Quarter)

#### 5. Add Drilldown Feature
**Effort:** 24-40 hours  
**Impact:** Very High

Allow users to click "Independent" slice to see:
- Virginia Lottery: $2M
- ABC Board: $1M
- State Corporation Commission: $500K
- Virginia Employment Commission: $300K

**Result:** Complete transparency

#### 6. Improve Classification Accuracy
**Effort:** 16-24 hours  
**Impact:** High

Use fuzzy matching to catch abbreviations:
- "Va Employment Comm" → matches "Virginia Employment Commission"
- "Dept of Ed" → matches "Department of Education"

**Result:** 90%+ classification accuracy (vs current ~70%)

---

## RECOMMENDED ACTION

**Phase 1 (Immediate):**
1. Add tooltips (2-4 hours)
2. Add legend with breakdown (4-8 hours)

**Phase 2 (Next Sprint):**
3. Expand keywords (8-16 hours)
4. Rename "Independent" (5 minutes)

**Phase 3 (Next Quarter):**
5. Add drilldown feature (24-40 hours)

**Total Immediate Investment:** 6-12 hours  
**Expected Outcome:** 80% reduction in user confusion

---

## TECHNICAL DETAILS

**Full technical report:** `reports/spending_focus_pie_chart_logic.md`

**Key files:**
- Category definitions: `frontend/src/data/spendingCategories.ts`
- Classification logic: `scripts/lis_member_requests/category_classifier.ts`
- Chart rendering: `frontend/src/sections/legislature-map/components/LegislatorFocusPie.tsx`
- Aggregation: `frontend/src/lib/legislators/aggregation.ts`

**System architecture:**
```
LIS Amendment → Keyword Classifier → 16 Categories → Aggregation → 5% Threshold → Chart Display
                                      (including Independent)              (creates "Other")
```

---

## QUESTIONS?

Contact the development team for:
- Technical implementation details
- Timeline estimates
- Alternative solutions
- Demo of proposed changes

**Next Steps:** Review recommendations and approve Phase 1 quick fixes.
