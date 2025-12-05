# Testing Guide: Independent Branch Classification Changes

**Date:** November 27, 2025  
**Server:** http://localhost:8082  
**Status:** ✅ Development server running with new changes

---

## WHAT TO TEST

The changes affect the **Spending Focus pie chart** on legislator cards in the Spotlight Map page.

---

## HOW TO TEST

### 1. Navigate to Spotlight Map
- Open: http://localhost:8082
- Click on **"Spotlight Map"** or navigate to the legislature map page
- Click on any legislator marker to open their card

### 2. Check the Spending Focus Pie Chart
Look for the pie chart showing spending categories. You should now see:

**BEFORE (Old Behavior):**
- "Independent" category was large (20-40% of spending)
- Mixed legitimate Independent Branch agencies with miscategorized items
- Unclear what was actually in "Independent"

**AFTER (New Behavior):**
- "Independent" category should be smaller and more accurate
- Only includes true Independent Branch agencies (Lottery, ABC, SCC, VRS, etc.)
- New "Unclassified" category may appear for items that don't match keywords
- "Other" category still exists for small categories (<5% of total)

### 3. Test Different Legislators
Try clicking on several different legislators to see the variation:

**Legislators likely to have "Independent" spending:**
- Look for legislators who proposed amendments to:
  - Virginia Lottery
  - ABC Board
  - State Corporation Commission
  - Virginia Retirement System

**Legislators likely to have "Unclassified" spending:**
- Legislators with vague or generic amendment titles
- Amendments that don't match specific category keywords

### 4. Check Pie Chart Legend
- Hover over pie slices to see category names
- "Independent" should show as "Independent Agencies"
- "Unclassified" should show as "Unclassified" (if present)
- "Other" should show as "Other" (aggregation of small categories)

---

## WHAT TO LOOK FOR

### ✅ Expected Improvements

1. **"Independent" category is more accurate**
   - Should only appear when legislator has amendments to true Independent Branch agencies
   - Should be smaller than before (unless legislator genuinely focuses on Independent agencies)

2. **"Unclassified" category may appear**
   - Gray color (#BDBDBD)
   - Indicates amendments that don't match category keywords
   - This is more honest than defaulting to "Independent"

3. **"Other" category still exists**
   - Aggregates categories < 5% of total
   - This is a display feature, not a data category
   - Should be clearly distinct from "Independent" and "Unclassified"

4. **Overall pie chart should look cleaner**
   - Better distribution across categories
   - More accurate representation of legislator's spending focus

### ❌ Potential Issues to Report

1. **TypeScript compilation errors**
   - Check browser console (F12) for errors
   - Look for red error messages

2. **Missing "Unclassified" category**
   - If you see large "Independent" categories that seem wrong
   - May indicate the fallback logic isn't working

3. **Pie chart not rendering**
   - If the chart is blank or broken
   - May indicate color mapping issue

4. **Data not loading**
   - If legislator cards don't show spending data
   - May indicate data aggregation issue

---

## BROWSER CONSOLE TESTING

Open browser console (F12) and check for:

### Expected (No Errors)
```
✓ No TypeScript errors
✓ No "Unknown spending category" errors
✓ Pie chart renders correctly
```

### Check Category Distribution
In the console, you can inspect the data by:
1. Click on a legislator card
2. Open console (F12)
3. Look for any warnings or errors related to spending categories

---

## BACKEND TESTING (Optional)

If you want to test the Budget Decoder changes:

### Run Budget Decoder Pipeline
```bash
cd /Users/secretservice/Budget-Transparency/scripts
python3 build_budget_decoder.py
```

**Expected Output:**
```
✓ Loaded 268,662 expenditure records for FY2026
✓ Marked 12,345 as placeholders
✓ Marked 45,678 as expected unmatched
✓ Classified into 14 spending categories
   - health_and_human_resources: 55,776 (20.8%)
   - higher_education: 54,104 (20.1%)
   - judicial: 33,586 (12.5%)
   - independent_agencies: 6,152 (2.3%)  ← Should be ~2-3%
   ...
```

**Look for:**
- `independent_agencies` should be ~2-3% of total (not 20-40%)
- New spending category distribution should be reported
- No errors during classification

---

## COMPARISON TEST

### Before Changes (What You Saw Before)
- "Independent" category: 20-40% of legislator spending
- No "Unclassified" category
- Confusion about what's in "Independent" vs "Other"

### After Changes (What You Should See Now)
- "Independent" category: 2-10% of legislator spending (only true INB agencies)
- "Unclassified" category: 5-15% (items needing keyword additions)
- Clear distinction between categories

---

## SPECIFIC TEST CASES

### Test Case 1: Legislator with Lottery Amendment
**Expected:**
- "Independent" category should appear
- Should be labeled "Independent Agencies"
- Tooltip should show it's for Virginia Lottery

### Test Case 2: Legislator with Generic Amendments
**Expected:**
- "Unclassified" category should appear
- Gray color
- Indicates amendments without clear category match

### Test Case 3: Legislator with Education Focus
**Expected:**
- "K-12 Education" or "Higher Education" should be largest slice
- "Independent" should be small or absent
- "Unclassified" may appear for vague amendments

---

## TROUBLESHOOTING

### Issue: Server won't start
**Solution:**
```bash
# Kill existing server
lsof -i :8082
kill <PID>

# Restart
cd /Users/secretservice/Budget-Transparency/frontend
npm run dev
```

### Issue: Changes not appearing
**Solution:**
- Hard refresh browser (Cmd+Shift+R)
- Clear browser cache
- Check that server restarted successfully

### Issue: TypeScript errors in console
**Solution:**
- Check that all files were saved correctly
- Run: `cd frontend && npm run lint`
- Report specific error messages

---

## REPORTING RESULTS

After testing, please report:

1. **What works well:**
   - Is "Independent" category more accurate?
   - Does "Unclassified" appear appropriately?
   - Is the distinction clear?

2. **What needs improvement:**
   - Any errors in console?
   - Any unexpected category assignments?
   - Any UI/UX issues?

3. **Specific examples:**
   - Which legislators did you test?
   - What categories appeared?
   - Any surprising results?

---

## NEXT STEPS AFTER TESTING

Based on your feedback, we may need to:

1. **Adjust keyword matching** - Add more keywords for better classification
2. **Update tooltips** - Add explanations for "Independent" and "Unclassified"
3. **Refine colors** - Adjust color scheme if needed
4. **Add drilldown** - Show agency breakdown within categories

---

**Server Status:** ✅ Running at http://localhost:8082  
**Ready for Testing:** Yes  
**Estimated Testing Time:** 10-15 minutes

---

**Questions?** Check the implementation summary at `reports/IMPLEMENTATION_COMPLETE.md`

