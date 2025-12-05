# Legislature Map Migration - File Manifest

This document lists all files in the migration package and their purposes.

## Documentation Files

| File | Purpose | Read First? |
|------|---------|-------------|
| `README.md` | Main migration guide with detailed instructions | ✅ YES |
| `QUICK_START.md` | 10-minute quick start guide | ✅ YES |
| `MIGRATION_CHECKLIST.md` | Step-by-step checklist for migration | ⭐ Important |
| `DEPENDENCIES.md` | Complete list of npm packages required | ⭐ Important |
| `OVERVIEW.md` | Technical architecture and design decisions | 📖 Reference |
| `FILE_MANIFEST.md` | This file - lists all files in package | 📋 Reference |

## Component Files

| File | Lines | Purpose | Dependencies |
|------|-------|---------|--------------|
| `components/LegislatureMapPage.tsx` | 220 | Main page component, orchestrates all features | All other components |
| `components/LegislatorMap.tsx` | 150 | Interactive Mapbox map with district layers | react-map-gl, mapbox-gl |
| `components/LegislatorDetails.tsx` | 150 | Legislator info card display | MUI components |
| `components/AddressForm.tsx` | 130 | Address input form with validation | MUI components |

## Utility Files

| File | Lines | Purpose | Dependencies |
|------|-------|---------|--------------|
| `lib/geojson.ts` | 140 | GeoJSON loading and point-in-polygon detection | @turf/turf |
| `lib/geocode.ts` | 145 | Address geocoding via Nominatim API | fetch API |
| `lib/mapStyle.ts` | 90 | Mapbox style configuration | None |

## Type Definition Files

| File | Lines | Purpose | Dependencies |
|------|-------|---------|--------------|
| `types/index.ts` | 75 | TypeScript type definitions for all components | None |

## Data Files

| File | Size | Purpose | Source |
|------|------|---------|--------|
| `data/va_house_districts.geojson` | 37 MB | House of Delegates district boundaries (100 districts) | Virginia Legislature GIS |
| `data/va_senate_districts.geojson` | 24 MB | Senate district boundaries (40 districts) | Virginia Legislature GIS |

## Total Package Size

- **Code files**: ~1,100 lines of TypeScript/TSX
- **Data files**: ~61 MB (GeoJSON)
- **Documentation**: ~1,500 lines of Markdown
- **Total**: ~62 MB

## File Dependencies Graph

```
LegislatureMapPage.tsx
├── AddressForm.tsx
│   └── types/index.ts
├── LegislatorMap.tsx
│   ├── lib/geojson.ts
│   │   ├── @turf/turf
│   │   └── types/index.ts
│   ├── lib/mapStyle.ts
│   ├── types/index.ts
│   └── mapbox-gl, react-map-gl
├── LegislatorDetails.tsx
│   └── types/index.ts
├── lib/geocode.ts
│   └── types/index.ts
└── lib/geojson.ts
    ├── @turf/turf
    └── types/index.ts
```

## External Dependencies

### npm Packages Required
- `mapbox-gl` (^3.10.0)
- `react-map-gl` (^8.0.2)
- `@turf/turf` (^7.2.0)
- `@mui/material` (^7.0.1)
- `@mui/icons-material` (^7.3.5)
- `@emotion/react` (^11.14.0)
- `@emotion/styled` (^11.14.0)
- `@types/react-map-gl` (^6.1.7) - dev only

### Environment Variables Required
- `NEXT_PUBLIC_MAPBOX_TOKEN` - Mapbox API token (required)
- `NEXT_PUBLIC_GEOCODER_URL` - Geocoding service URL (optional)
- `NEXT_PUBLIC_GEOCODER_KEY` - Geocoding API key (optional)

## What's NOT Included

The following were explicitly excluded from this migration package:

### Budget/Amendment Features
- `AmendmentTable.tsx` - Budget amendment table component
- `AmendmentTableRow.tsx` - Amendment table row component
- `AmendmentDetailCard.tsx` - Amendment detail card
- `amendment-table-types.ts` - Amendment type definitions
- `amendments.ts` - Amendment data utilities
- `enrichedAmendmentsAPI.ts` - Budget API client
- All `AMENDMENT_*.md` documentation files

### LIS API Integration
- `lookupLegislatorMemberId()` function (removed from geojson.ts)
- All LIS Partner API calls
- All BudgetPortal Web Service calls

### Backend Code
- Express server routes
- API middleware
- Database connections
- Authentication logic

### Vite-Specific Code
- Vite configuration
- Vite environment variable patterns (converted to Next.js)
- Vite dev server setup

## Migration Readiness

### ✅ Ready to Use
- All components are self-contained
- All imports are relative
- All types are defined
- All utilities are included
- All data files are included
- All documentation is complete

### ⚠️ Requires Configuration
- Mapbox token must be set
- 'use client' directives must be added
- Mapbox CSS must be imported
- Environment variables must be configured

### 🔧 May Need Adjustment
- SSR handling (may need dynamic imports)
- MUI theme integration (if custom theme exists)
- Geocoding service (if not using Nominatim)
- GeoJSON file paths (if different public directory structure)

## Verification Checklist

Use this to verify you have all files:

### Documentation (6 files)
- [ ] README.md
- [ ] QUICK_START.md
- [ ] MIGRATION_CHECKLIST.md
- [ ] DEPENDENCIES.md
- [ ] OVERVIEW.md
- [ ] FILE_MANIFEST.md

### Components (4 files)
- [ ] components/LegislatureMapPage.tsx
- [ ] components/LegislatorMap.tsx
- [ ] components/LegislatorDetails.tsx
- [ ] components/AddressForm.tsx

### Utilities (3 files)
- [ ] lib/geojson.ts
- [ ] lib/geocode.ts
- [ ] lib/mapStyle.ts

### Types (1 file)
- [ ] types/index.ts

### Data (2 files)
- [ ] data/va_house_districts.geojson
- [ ] data/va_senate_districts.geojson

**Total: 16 files**

## File Integrity

To verify file integrity after copying:

```bash
# Check file count
find legislature-map-migration -type f | wc -l
# Should output: 16

# Check data file sizes
ls -lh legislature-map-migration/data/
# va_house_districts.geojson should be ~37 MB
# va_senate_districts.geojson should be ~24 MB

# Check for TypeScript errors
npx tsc --noEmit legislature-map-migration/**/*.ts legislature-map-migration/**/*.tsx
```

## Version Information

- **Package Version**: 1.0.0
- **Created**: 2025-11-18
- **Source**: budget-decoder-dpb Vite project
- **Target**: Next.js DFTP site
- **Status**: Ready for migration

## Support

If any files are missing or corrupted:
1. Check the original Vite project: `budget-decoder-dpb/src/features/legislator-locator/`
2. Verify GeoJSON files: `budget-decoder-dpb/public/data/`
3. Re-run the migration preparation script
4. Contact the development team

## License

All code is proprietary to DFTP. GeoJSON data is public domain (Virginia Legislature).
