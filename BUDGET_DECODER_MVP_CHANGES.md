# Budget Decoder MVP - Data System Migration

## Summary

Successfully migrated the Budget Decoder page from legacy pipeline data to the new CSV-based decoder system while preserving all existing UI styling, layout, and component structure.

## Files Modified

### 1. `frontend/src/sections/budget-decoder/view/budget-decoder-view.tsx`

**Key Changes:**

- **Data Loading**: Replaced `fetchRecipientsData()` and `fetchDPBData()` with `loadProgramRollups()` and `loadVendorRecords()`
- **State Management**: Added new state for rollup data, vendor data, and expanded rows
- **Fiscal Year Filter**: Added fiscal year dropdown filter (FY25, FY26)
- **Expand/Collapse UI**: Added expand icon column and collapsible vendor details per program
- **Data Transformation**: Created `transformRollupData()` to map Chapter 725 rollup data to existing BudgetItem type
- **Vendor Display**: When row is expanded, shows top 10 recipients sorted by spent amount in card grid layout

**Why**: Switch from legacy recipients/DPB data to new program_rollup_decoder.csv (visible rows) and program_vendor_decoder_external.csv (expandable details)

### 2. `frontend/src/lib/csvLoader.ts` (NEW)

**Purpose**: Lightweight CSV parser with zero external dependencies

**Functions**:
- `parseCSV()`: Parse CSV text into array of objects
- `fetchCSV()`: Fetch and parse CSV from URL
- `toNumber()`, `toInt()`: Safe type conversion helpers
- `parseJSONField()`: Parse JSON fields from CSV (for top_10_recipients, category_breakdown)

**Why**: Avoid adding papaparse dependency, keep bundle size minimal

### 3. `frontend/src/lib/decoderDataLoader.ts` (NEW)

**Purpose**: Type-safe loader for decoder CSV files with caching

**Types**:
- `ProgramRollup`: Chapter 725 program-level aggregations (fiscal_year, secretariat, agency, program, appropriated_amount, total_spent_ytd, execution_rate, etc.)
- `VendorRecord`: Recipient-level expenditures (vendor_name, spent_amount_ytd, recipient_type, etc.)

**Functions**:
- `loadProgramRollups()`: Load and cache program_rollup_decoder.csv
- `loadVendorRecords()`: Load and cache program_vendor_decoder_external.csv
- `filterVendorsByProgram()`: Filter vendors by fiscal_year + agency + program + service_area

**Why**: Centralize decoder data loading logic, provide type safety, implement caching to avoid reloading on each expand

### 4. CSV Files Copied to `public/decoder/`

- `program_rollup_decoder.csv` (701KB, 1,586 programs)
- `program_vendor_decoder_external.csv` (11MB, 56,213 recipients)

**Why**: Make decoder outputs accessible to frontend via public URL

## Behavior Changes

### Before (Legacy)
- Visible rows: Recipients data from `fetchRecipientsData()`
- No expand/collapse functionality
- No fiscal year filter
- Data source: "VA Budget Pipeline (Live)"

### After (MVP)
- Visible rows: Program rollups from Chapter 725 (appropriated_amount, total_spent_ytd, execution_rate, number_of_unique_recipients)
- Expand row: Shows top 10 recipients from vendor decoder, sorted by spent_amount_ytd desc
- Fiscal year filter: FY25, FY26 dropdown
- Data source: "VA Budget Decoder (Chapter 725 + CARDINAL)"

## UI Preservation

**No changes to**:
- Component layout or hierarchy
- MUI components used
- Colors, spacing, typography
- Icons or animations
- Table structure (added one column for expand icon)
- Card styling for insights
- Filter layout (changed from 2-column to 3-column grid to add fiscal year)

**Minimal additions**:
- Expand/collapse icon button (▶ rotates 90° when expanded)
- Collapsible section with recipient cards (Grid layout, 3 columns on desktop)
- Fiscal year dropdown filter

## Testing Checklist

- [x] Build passes (no TypeScript errors)
- [ ] Page loads without console errors
- [ ] Visible rows show rollup data from Chapter 725
- [ ] Expanding a row shows recipient cards
- [ ] FY25 and FY26 filters work correctly
- [ ] Sorting still works on all columns
- [ ] Search filter works on program names
- [ ] Category filter works
- [ ] "View on Map" button still works for district rows
- [ ] Page styling matches previous version

## Next Steps

1. Start dev server: `cd frontend && npm run dev`
2. Navigate to `/budget-decoder`
3. Verify FY25 and FY26 data loads
4. Test expand/collapse on multiple programs
5. Verify no console errors
6. Compare visual appearance to previous version

