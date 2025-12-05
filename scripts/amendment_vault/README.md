# Amendment Vault

## Overview

The **Amendment Vault** is a structured data pipeline for parsing, storing, and querying Virginia budget amendments. It powers the **Spotlight Map legislator pie chart** by aggregating amendment dollar amounts by spending category.

## Directory Structure

```
scripts/amendment_vault/
├── README.md                    # This file
├── parse_member_requests.py     # PDF parser for Member Request amendments
├── category_mapping.ts          # Agency → spending category mapping logic
└── schema.sql                   # Database schema and sample queries

data/amendments/
├── docs/
│   └── member_requests_schema.md  # Schema documentation
├── member_requests_2025.json      # Parsed amendment data (JSON)
└── member_requests_2025.csv       # Parsed amendment data (CSV, optional)

frontend/src/lib/amendments/
├── amendmentTypes.ts            # TypeScript type definitions
└── aggregation.ts               # Aggregation logic for pie chart
```

## Quick Start

### 1. Install Dependencies

```bash
pip install pdfplumber
```

### 2. Parse Member Request PDFs

```bash
python scripts/amendment_vault/parse_member_requests.py
```

This will:
- Parse `Amendment Member Requests/HB1600/HB1600 Member Requests.pdf`
- Parse `Amendment Member Requests/SB800/SB800 Member Requests.pdf`
- Output to `data/amendments/member_requests_2025.json`

### 3. Use in Frontend

```typescript
import { computeLegislatorAmendmentFocusSlices } from 'src/lib/amendments/aggregation';
import amendmentRecords from 'data/amendments/member_requests_2025.json';

const slices = computeLegislatorAmendmentFocusSlices(amendmentRecords, {
  sessionYear: 2025,
  patronName: "John Doe",
  billNumberFilter: "both",
});

// Pass to pie chart component
<LegislatorFocusPie slices={slices} />
```

## Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. SOURCE: Member Request PDFs                                 │
│    - HB1600 Member Requests.pdf                                 │
│    - SB800 Member Requests.pdf                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. PARSE: parse_member_requests.py                             │
│    - Extract tables from PDFs                                   │
│    - Map agencies to spending categories                        │
│    - Generate AmendmentVaultRecord objects                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. STORE: member_requests_2025.json                            │
│    - Array of AmendmentVaultRecord objects                      │
│    - One record per amendment                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. AGGREGATE: computeLegislatorAmendmentFocusSlices()          │
│    - Filter by legislator + session                             │
│    - Group by spending category                                 │
│    - Sum netAmount per category                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. VISUALIZE: LegislatorFocusPie component                     │
│    - Donut chart with category slices                           │
│    - Tooltips with dollars + percentages                        │
│    - "Other" bucket for small categories                        │
└─────────────────────────────────────────────────────────────────┘
```

## Key Concepts

### Amendment Vault Record

Each amendment is stored as an `AmendmentVaultRecord` with:

- **Identity**: `id`, `billNumber`, `sessionYear`, `chamber`, `stage`
- **Legislator**: `patronName`, `legislatorId`, `districtCode`
- **Budget Item**: `itemNumber`, `agencyName`, `spendingCategoryId`
- **Dollar Amounts**: `deltaGF`, `deltaNGF`, `netAmount`
- **Metadata**: `isIncrease`, `isLanguageOnly`, descriptions
- **Source**: `sourcePdfPath`, `sourcePage`

### Spending Categories

16 canonical categories defined in `frontend/src/data/spendingCategories.ts`:

- K-12 Education
- Higher Education
- Health & Human Resources
- Public Safety & Homeland Security
- Transportation
- Natural Resources
- Commerce & Trade
- Agriculture & Forestry
- Veterans & Defense Affairs
- Administration
- Finance
- Judicial
- Legislative
- Central Appropriations
- Independent Agencies
- Capital Outlay

### Aggregation Query

Core SQL query (also implemented in TypeScript):

```sql
SELECT
  spending_category_id AS categoryId,
  SUM(net_amount) AS totalAmount
FROM
  amendment_vault_member_requests
WHERE
  stage = 'member_request'
  AND session_year = 2025
  AND patron_name = 'John Doe'
  AND is_language_only = 0
  AND net_amount != 0
GROUP BY
  spending_category_id
ORDER BY
  ABS(totalAmount) DESC;
```

## Current Status

✅ **Complete**:
- TypeScript type definitions (`amendmentTypes.ts`)
- Aggregation logic (`aggregation.ts`)
- SQL schema (`schema.sql`)
- Category mapping logic (`category_mapping.ts`)
- PDF parser scaffold (`parse_member_requests.py`)
- Documentation (`member_requests_schema.md`)

⚠️ **TODO**:
- Implement PDF table extraction in `parse_member_requests.py`
- Install pdfplumber: `pip install pdfplumber`
- Parse actual PDFs to generate real data
- Wire real data into legislator card component
- Map legislator names to IDs for cross-referencing

## See Also

- [Schema Documentation](../../data/amendments/docs/member_requests_schema.md)
- [SQL Schema](./schema.sql)
- [TypeScript Types](../../frontend/src/lib/amendments/amendmentTypes.ts)
- [Aggregation Logic](../../frontend/src/lib/amendments/aggregation.ts)

