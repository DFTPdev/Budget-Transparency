# HAC Budget Dashboard Scripts

This directory contains scripts for extracting metrics from the House Appropriations Committee (HAC) budget summary PDFs and generating the data model for the homepage HAC Budget Dashboard.

## Overview

The HAC Budget Dashboard provides "instant insight" into Virginia's biennial budget using data from two official HAC summary documents:

- **Pre-session summary**: "hac 2025 pre-session summary document - print.pdf"
- **Post-session summary**: "hac 2025 post session summary document 5-19-25.pdf"

These PDFs are located at: `/Users/secretservice/Documents/HAC Summaries`

## Files

- **`extract_hac_metrics.ts`**: Main extraction script that reads the PDFs and generates the TypeScript data model
- **`package.json`**: Node.js dependencies for PDF parsing
- **`tsconfig.json`**: TypeScript configuration

## Usage

### Initial Setup

```bash
cd scripts/hac_dashboard
npm install
```

### Extract Metrics

```bash
npm run extract
```

This will:
1. Read both HAC summary PDFs from `/Users/secretservice/Documents/HAC Summaries`
2. Extract text content using `pdf-parse`
3. Parse key budget metrics (total budget, GF resources, new spending, etc.)
4. Generate `frontend/src/data/hacDashboardData.ts` with a typed data model

### Output

The script generates `frontend/src/data/hacDashboardData.ts` containing:

- **Global metrics**: Total biennial budget, GF resources, new GF spending, K-12/HHR share
- **Budget snapshots**: Introduced (HB1600) vs Final (Chapter 725) with highlights
- **Impact cards**: Thematic policy areas (car tax, Medicaid, K-12, infrastructure)

## Data Model

```typescript
export interface HacDashboardData {
  globalMetrics: HacGlobalMetrics;
  introduced: HacBudgetSnapshot;
  final: HacBudgetSnapshot;
  impactCards: HacImpactCard[];
}
```

## Frontend Integration

The generated data is consumed by:
- **Component**: `frontend/src/sections/hac/HacBudgetDashboard.tsx`
- **Homepage**: `frontend/src/app/(home)/page.tsx` via `HomeView`

## Updating the Dashboard

When new HAC summary PDFs are released:

1. Place the new PDFs in `/Users/secretservice/Documents/HAC Summaries`
2. Update the PDF filenames in `extract_hac_metrics.ts` if needed
3. Run `npm run extract` to regenerate the data file
4. Review the generated `hacDashboardData.ts` and manually adjust any metrics that weren't parsed correctly
5. The homepage will automatically reflect the updated data

## Notes

- The extraction script uses regex patterns to find key metrics in the PDF text
- Some metrics may need manual adjustment after extraction (check the generated file)
- All dollar amounts are in billions
- Source page references are included as comments for traceability

