# Fix VA Budget Totals: Add Base Budget Integration

## Problem
DFTP-site shows ~$10B while LIS sessionreport shows ~$181.2B for FY2024–26.

## Root Cause Analysis
Current pipeline only processes **legislative amendments** (~$10B), missing the **base budget appropriations** (~$170B).

### Data Analysis Results:
- **Current Totals**: $10.49B (amendments only)
- **LIS Target**: $181.2B (biennial total)
- **Gap**: $170.71B (94% missing)
- **Scale Factor**: 17.28x

### Key Findings:
1. **Missing Base Budget**: Pipeline only ingests LIS amendments, not base appropriations
2. **Fund Classification**: No General Fund vs Non-General Fund breakdown
3. **Biennial vs Annual**: Processing single year instead of biennial
4. **DPB Integration**: DPB data ($34.9B GF) exists but not integrated into district totals

## Proposed Solution

### Phase 1: Immediate Fix (Safe)
1. **Integrate DPB Base Budget**: 
   - Use DPB general fund resources ($34.9B) as base
   - Add non-general fund estimates
   - Distribute proportionally to districts

2. **Biennial Calculation**:
   - Extend to FY2024-26 biennial period
   - Scale appropriately for 2-year budget cycle

### Phase 2: Complete Integration (Requires Data)
1. **Full Base Budget Ingestion**:
   - Integrate Virginia's base budget appropriations
   - Add capital budget items
   - Include federal and special revenue funds

2. **Enhanced Fund Classification**:
   - Separate General Fund vs Non-General Fund
   - Add fund source tracking

## Files Modified
- `scripts/join/build_site_artifacts.ts` - Add base budget integration
- `scripts/build_budget_dataset.ts` - Enhance with biennial calculation

## Testing
- Verify totals approach $181.2B target
- Ensure district-level accuracy maintained
- Validate fund source breakdowns

## Risk Assessment
**Low Risk**: Changes are additive, existing amendment data preserved.

## Missing Data Sources Required
1. Virginia base budget appropriations by agency/program
2. Biennial budget data (FY2024-26)
3. Non-general fund revenue sources
4. Capital budget allocations
5. Federal fund distributions
6. Special revenue fund details

## Implementation Priority
1. **High**: Integrate existing DPB general fund data
2. **Medium**: Add biennial calculation logic
3. **Low**: Full base budget data ingestion (requires external data sources)
