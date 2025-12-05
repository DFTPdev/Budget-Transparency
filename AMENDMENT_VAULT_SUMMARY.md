# Amendment Vault Implementation Summary

## Overview

The **Amendment Vault** is now fully designed and scaffolded for the DFTP / StateBudgetX project. It provides a complete data pipeline for parsing, storing, and aggregating Virginia budget amendments to power the **Spotlight Map legislator pie chart**.

---

## 1. Files Created

### TypeScript Type Definitions

**Path**: `frontend/src/lib/amendments/amendmentTypes.ts`

Defines the canonical `AmendmentVaultRecord` interface with all required fields for Member Request amendments:

- **Identity**: `id`, `stage`, `billNumber`, `sessionYear`, `chamber`
- **Legislator Attribution**: `patronName`, `legislatorId`, `districtCode`
- **Budget Item**: `itemNumber`, `agencyName`, `spendingCategoryId`
- **Dollar Amounts**: `deltaGF`, `deltaNGF`, `netAmount`
- **Metadata**: `isIncrease`, `isLanguageOnly`, descriptions
- **Source Tracking**: `sourcePdfPath`, `sourcePage`

### Aggregation Logic

**Path**: `frontend/src/lib/amendments/aggregation.ts`

Implements `computeLegislatorAmendmentFocusSlices()` function:

```typescript
export function computeLegislatorAmendmentFocusSlices(
  records: AmendmentVaultRecord[],
  params: LegislatorFocusParams
): LegislatorAmendmentFocusSlice[]
```

**Behavior**:
1. Filters amendments by legislator (ID or name) and session year
2. Excludes language-only and zero-amount amendments
3. Groups by `spendingCategoryId`
4. Sums `netAmount` per category
5. Returns sorted array of `{ categoryId, totalAmount }` slices

### SQL Schema

**Path**: `scripts/amendment_vault/schema.sql`

Defines database table `amendment_vault_member_requests` with:
- All fields from `AmendmentVaultRecord`
- Indexes for performance (legislator, category, session)
- Sample aggregation queries (4 variants)

### Category Mapping

**Path**: `scripts/amendment_vault/category_mapping.ts`

Implements `mapToSpendingCategory()` function that maps agency names and secretariat codes to one of the 16 canonical spending categories using keyword-based heuristics.

### PDF Parser

**Path**: `scripts/amendment_vault/parse_member_requests.py`

Python script to parse Member Request PDFs:
- Reads from `Amendment Member Requests/HB1600/` and `Amendment Member Requests/SB800/`
- Outputs to `data/amendments/member_requests_2025.json`
- Currently a scaffold (requires pdfplumber implementation)

### Documentation

**Paths**:
- `data/amendments/docs/member_requests_schema.md` - Schema documentation
- `scripts/amendment_vault/README.md` - Amendment Vault overview

### Output Files

**Paths**:
- `data/amendments/member_requests_2025.json` - Parsed amendment data (currently empty array)
- `data/amendments/member_requests_2025.csv` - CSV version (optional)

---

## 2. Amendment Vault Fields (Canonical Schema)

### Required Fields for Pie Chart Aggregation

| Field | Type | Purpose |
|-------|------|---------|
| `spendingCategoryId` | `SpendingCategoryId` | **KEY** - Category for grouping |
| `netAmount` | `number` | **KEY** - Dollar amount to sum |
| `patronName` | `string` | Legislator attribution |
| `legislatorId` | `string?` | Preferred legislator ID |
| `sessionYear` | `number` | Filter by session |
| `stage` | `"member_request"` | Amendment lifecycle stage |
| `isLanguageOnly` | `boolean` | Exclude from dollar aggregation |

### Dollar Amount Calculation Rule

**Rule**: `netAmount = deltaGF + deltaNGF`

This represents the **total fiscal impact** (General Fund + Non-General Fund).

**Rationale**: For the pie chart, we want to show overall spending priorities, not just GF or NGF in isolation.

### Spending Category Mapping

Each amendment is mapped to one of 16 categories:
- `k12_education`
- `higher_education`
- `health_and_human_resources`
- `public_safety_and_homeland_security`
- `transportation`
- `natural_resources`
- `commerce_and_trade`
- `agriculture_and_forestry`
- `veterans_and_defense_affairs`
- `administration`
- `finance`
- `judicial`
- `legislative`
- `central_appropriations`
- `independent_agencies`
- `capital_outlay`

Mapping is done via `mapToSpendingCategory()` using agency name keywords.

---

## 3. SQL Aggregation Query

### Core Query (Legislator → Category → Sum)

```sql
SELECT
  spending_category_id AS categoryId,
  SUM(net_amount) AS totalAmount
FROM
  amendment_vault_member_requests
WHERE
  stage = 'member_request'
  AND session_year = :session_year
  AND (
    legislator_id = :legislator_id
    OR (legislator_id IS NULL AND LOWER(patron_name) = LOWER(:patron_name))
  )
  AND is_language_only = 0
  AND net_amount != 0
GROUP BY
  spending_category_id
ORDER BY
  ABS(totalAmount) DESC;
```

### Indexes for Performance

- `idx_legislator_id` - Fast legislator lookups
- `idx_patron_name` - Fallback name matching
- `idx_spending_category` - Category aggregation
- `idx_session_stage` - Session/stage filtering
- `idx_legislator_session_category` - Composite index for common query pattern

---

## 4. TypeScript Aggregation (Frontend)

### Function Signature

```typescript
import { computeLegislatorAmendmentFocusSlices } from 'src/lib/amendments/aggregation';

const slices = computeLegislatorAmendmentFocusSlices(records, {
  sessionYear: 2025,
  legislatorId: "leg_12345",        // Preferred
  patronName: "John Doe",           // Fallback
  billNumberFilter: "both",         // "HB1600" | "SB800" | "both"
  chamberFilter: "both",            // "House" | "Senate" | "both"
});

// Returns: LegislatorAmendmentFocusSlice[]
// [
//   { categoryId: "health_and_human_resources", totalAmount: 4000000 },
//   { categoryId: "k12_education", totalAmount: 750000 },
//   { categoryId: "transportation", totalAmount: 250000 },
// ]
```

### Integration with Legislator Card

**Current State** (in `LegislatorDetails.tsx`):

```typescript
// TODO: Replace stubbed data with real amendment aggregation
const exampleSlices: LegislatorAmendmentFocusSlice[] = [
  { categoryId: "health_and_human_resources", totalAmount: 4_000_000 },
  { categoryId: "k12_education", totalAmount: 750_000 },
  { categoryId: "transportation", totalAmount: 250_000 },
];

<LegislatorFocusPie slices={exampleSlices} />
```

**Future Integration**:

```typescript
// 1. Load amendment records
import amendmentRecords from 'data/amendments/member_requests_2025.json';

// 2. Compute slices for this legislator
const slices = computeLegislatorAmendmentFocusSlices(amendmentRecords, {
  sessionYear: 2025,
  patronName: legislator.name,  // or legislatorId if available
  billNumberFilter: "both",
});

// 3. Pass to pie chart
<LegislatorFocusPie slices={slices} />
```

---

## 5. Build Status

✅ **`npm run build` SUCCEEDED**

- No TypeScript errors in new amendment code
- No ESLint errors
- All types fully defined (no `any` types)
- Build warnings are pre-existing (unrelated mock data imports)

---

## 6. Next Steps for Full Integration

### Immediate (Required for Real Data)

1. **Install pdfplumber**:
   ```bash
   pip install pdfplumber
   ```

2. **Implement PDF parsing logic** in `parse_member_requests.py`:
   - Extract tables from PDFs using pdfplumber
   - Parse patron, item, agency, GF/NGF amounts, description
   - Map agencies to spending categories
   - Generate `AmendmentVaultRecord` objects

3. **Run parser** to generate real data:
   ```bash
   python scripts/amendment_vault/parse_member_requests.py
   ```

4. **Map legislator names** to IDs:
   - Cross-reference `patronName` from PDFs with Spotlight Map legislator dataset
   - Populate `legislatorId` field for accurate matching

5. **Wire into frontend**:
   - Import JSON data into legislator card component
   - Replace `exampleSlices` with `computeLegislatorAmendmentFocusSlices()` call
   - Test with real legislator selections

### Future Enhancements

- Add more amendment stages (committee, floor, conference, enacted)
- Build API endpoint for dynamic data loading
- Add database backend (SQLite or PostgreSQL)
- Implement caching for performance
- Add amendment detail drill-down views

---

## 7. File Locations Summary

| File | Purpose |
|------|---------|
| `frontend/src/lib/amendments/amendmentTypes.ts` | TypeScript type definitions |
| `frontend/src/lib/amendments/aggregation.ts` | Aggregation logic |
| `scripts/amendment_vault/schema.sql` | SQL schema + queries |
| `scripts/amendment_vault/category_mapping.ts` | Agency → category mapping |
| `scripts/amendment_vault/parse_member_requests.py` | PDF parser |
| `scripts/amendment_vault/README.md` | Amendment Vault overview |
| `data/amendments/docs/member_requests_schema.md` | Schema documentation |
| `data/amendments/member_requests_2025.json` | Parsed data output |
| `frontend/src/sections/legislature-map/components/LegislatorDetails.tsx` | Wiring point (TODO comments) |

---

## Conclusion

The Amendment Vault is **fully designed and ready for implementation**. All TypeScript types, aggregation logic, SQL schemas, and documentation are in place. The only remaining work is:

1. Implementing the PDF table extraction logic
2. Running the parser to generate real data
3. Wiring the real data into the legislator card component

The pie chart will then display **real amendment focus data** instead of stubbed examples! 🎉

