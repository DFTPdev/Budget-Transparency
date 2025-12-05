# Amendment Vault - Member Requests Schema

## Overview

The **Amendment Vault** is a canonical data structure for storing and querying Virginia budget amendments. This document describes the schema for **Member Request** amendments (the initial stage of the amendment process).

## Purpose

Enable the **Spotlight Map legislator pie chart** to display amendment focus by spending category:

> "For legislator X in session Y, show the breakdown of their amendment dollar amounts by spending category (K-12 Education, Health & Human Resources, Transportation, etc.)"

## Data Source

- **HB1600 Member Requests PDF** (`Amendment Member Requests/HB1600/HB1600 Member Requests.pdf`)
- **SB800 Member Requests PDF** (`Amendment Member Requests/SB800/SB800 Member Requests.pdf`)

These PDFs contain pre-committee amendments submitted by individual legislators.

## Schema: `AmendmentVaultRecord`

### TypeScript Interface

Location: `frontend/src/lib/amendments/amendmentTypes.ts`

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Stable unique ID (e.g., `"HB1600-2025-member-135-001"`) |
| `stage` | `"member_request"` | Amendment lifecycle stage |
| `billNumber` | `"HB1600" \| "SB800"` | Bill number |
| `sessionYear` | `number` | Legislative session year (e.g., `2025`) |
| `chamber` | `"House" \| "Senate"` | Chamber |
| `patronName` | `string` | Patron name as it appears in PDF |
| `itemNumber` | `string` | LIS item number |
| `spendingCategoryId` | `SpendingCategoryId` | **KEY FIELD** - Canonical spending category |
| `deltaGF` | `number` | Change in General Fund dollars |
| `deltaNGF` | `number` | Change in Non-General Fund dollars |
| `netAmount` | `number` | **KEY FIELD** - Total impact (GF + NGF) |
| `isIncrease` | `boolean` | True if netAmount > 0 |
| `isLanguageOnly` | `boolean` | True if no numeric change |
| `descriptionShort` | `string` | Short summary |
| `descriptionFull` | `string` | Full text |
| `sourcePdfPath` | `string` | Path to source PDF |

### Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `patronLISId` | `string` | LIS Member ID (for cross-referencing) |
| `legislatorId` | `string` | Internal ID used by Spotlight Map |
| `districtCode` | `string` | District code (e.g., `"HD075"`) |
| `subItem` | `string` | Sub-item identifier |
| `agencyCode` | `string` | DPB/LIS agency code |
| `agencyName` | `string` | Human-readable agency name |
| `secretariatCode` | `string` | Secretariat/functional area code |
| `fiscalYear` | `number \| null` | Fiscal year (null if biennial) |
| `sourcePage` | `number` | Page number in PDF (1-based) |
| `sourceLineHint` | `string` | Snippet for debugging |
| `createdAt` | `string` | ISO timestamp (record creation) |
| `updatedAt` | `string` | ISO timestamp (last update) |

## Key Design Decisions

### 1. `netAmount` Calculation Rule

**Rule**: `netAmount = deltaGF + deltaNGF`

This represents the **total fiscal impact** of the amendment, combining both General Fund and Non-General Fund changes.

**Rationale**: For the pie chart, we want to show the legislator's overall spending priorities, not just GF or NGF in isolation.

### 2. `spendingCategoryId` Mapping

Each amendment must be mapped to one of the 16 canonical spending categories defined in `frontend/src/data/spendingCategories.ts`:

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

**Mapping Strategy**: Use agency name or secretariat code to infer category. See `scripts/amendment_vault/category_mapping.ts` for the mapping logic.

### 3. Exclusions for Pie Chart

When computing legislator focus slices, **exclude**:
- `isLanguageOnly === true` (no dollar impact)
- `netAmount === 0` (no fiscal change)

## Core Aggregation Query

### SQL Version

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

### TypeScript Version

```typescript
import { computeLegislatorAmendmentFocusSlices } from 'src/lib/amendments/aggregation';

const slices = computeLegislatorAmendmentFocusSlices(records, {
  sessionYear: 2025,
  legislatorId: "leg_12345", // or patronName: "John Doe"
  billNumberFilter: "both",
});

// Returns: [
//   { categoryId: "health_and_human_resources", totalAmount: 4000000 },
//   { categoryId: "k12_education", totalAmount: 750000 },
//   { categoryId: "transportation", totalAmount: 250000 },
// ]
```

## Output Files

Parsed amendment data is stored in:

- **JSON**: `data/amendments/member_requests_2025.json`
- **CSV**: `data/amendments/member_requests_2025.csv` (optional, for inspection)

## Integration with Spotlight Map

### Current State (Stubbed)

The legislator card currently uses hard-coded example data:

```typescript
const exampleSlices: LegislatorAmendmentFocusSlice[] = [
  { categoryId: "health_and_human_resources", totalAmount: 4_000_000 },
  { categoryId: "k12_education", totalAmount: 750_000 },
  { categoryId: "transportation", totalAmount: 250_000 },
];
```

### Future Integration

1. Load amendment records from JSON file or API
2. Map legislator card's `legislator.name` to `patronName` or `legislatorId`
3. Call `computeLegislatorAmendmentFocusSlices()` with real data
4. Pass result to `<LegislatorFocusPie slices={slices} />`

## See Also

- TypeScript types: `frontend/src/lib/amendments/amendmentTypes.ts`
- Aggregation logic: `frontend/src/lib/amendments/aggregation.ts`
- SQL schema: `scripts/amendment_vault/schema.sql`
- PDF parser: `scripts/amendment_vault/parse_member_requests.py`

