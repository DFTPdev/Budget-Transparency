# Virginia Legislature Map - Next.js Migration Package

This folder contains a clean, self-contained version of the Virginia Legislature Map feature, prepared for migration to the Next.js DFTP site.

## 📦 Package Contents

```
legislature-map-migration/
├── components/
│   ├── AddressForm.tsx           # Address input form
│   ├── LegislatorDetails.tsx     # Legislator info card display
│   ├── LegislatorMap.tsx         # Interactive Mapbox map
│   └── LegislatureMapPage.tsx    # Main page component
├── lib/
│   ├── geocode.ts                # Address geocoding utilities
│   ├── geojson.ts                # GeoJSON loading and processing
│   └── mapStyle.ts               # Mapbox style configuration
├── types/
│   └── index.ts                  # TypeScript type definitions
├── data/                         # (Copy GeoJSON files here)
│   ├── va_house_districts.geojson
│   └── va_senate_districts.geojson
└── README.md                     # This file
```

## 🚀 Migration Steps

### 1. Copy Files to Next.js Project

```bash
# From the Next.js project root:
cp -r /path/to/legislature-map-migration/components app/(public)/legislature-map/
cp -r /path/to/legislature-map-migration/lib app/(public)/legislature-map/
cp -r /path/to/legislature-map-migration/types app/(public)/legislature-map/
```

### 2. Copy Data Files

```bash
# Copy GeoJSON files to Next.js public directory
cp /path/to/budget-decoder-dpb/public/data/va_house_districts.geojson public/data/
cp /path/to/budget-decoder-dpb/public/data/va_senate_districts.geojson public/data/
```

### 3. Install Required Dependencies

```bash
npm install mapbox-gl react-map-gl @turf/turf
npm install --save-dev @types/react-map-gl
```

### 4. Set Environment Variables

Add to `.env.local`:

```env
NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_token_here
NEXT_PUBLIC_GEOCODER_URL=https://nominatim.openstreetmap.org/search
NEXT_PUBLIC_GEOCODER_KEY=optional_geocoder_api_key
```

### 5. Create Next.js Page

Create `app/(public)/legislature-map/page.tsx`:

```tsx
import { LegislatureMapPage } from './components/LegislatureMapPage';

export const metadata = {
  title: 'Virginia Legislature Map | DFTP',
  description: 'Find your representatives in the Virginia House of Delegates and Senate',
};

export default function Page() {
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';
  
  return <LegislatureMapPage mapboxToken={mapboxToken} />;
}
```

### 6. Import Mapbox CSS

Add to `app/layout.tsx` or global CSS:

```tsx
import 'mapbox-gl/dist/mapbox-gl.css';
```

## 📋 Required npm Packages

### Production Dependencies
- `mapbox-gl` (^3.10.0) - Mapbox GL JS library
- `react-map-gl` (^8.0.2) - React wrapper for Mapbox GL
- `@turf/turf` (^7.2.0) - Geospatial analysis
- `@mui/material` (^7.0.1) - Material-UI components
- `@mui/icons-material` (^7.3.5) - Material-UI icons
- `@emotion/react` (^11.14.0) - CSS-in-JS (MUI dependency)
- `@emotion/styled` (^11.14.0) - Styled components (MUI dependency)

### Development Dependencies
- `@types/react-map-gl` (^6.1.7) - TypeScript types for react-map-gl

## ⚠️ Next.js Compatibility Notes

### Client Components
All components in this package are **client components** and require the `'use client'` directive:
- `LegislatureMapPage.tsx` ✅ (already added)
- `LegislatorMap.tsx` (add at top of file)
- `LegislatorDetails.tsx` (add at top of file)
- `AddressForm.tsx` (add at top of file)

### SSR Considerations

1. **Mapbox requires window object**: The map component will not render during SSR. Consider using Next.js dynamic imports:

```tsx
import dynamic from 'next/dynamic';

const LegislatureMapPage = dynamic(
  () => import('./components/LegislatureMapPage').then(mod => ({ default: mod.LegislatureMapPage })),
  { ssr: false }
);
```

2. **Environment Variables**: 
   - Use `process.env.NEXT_PUBLIC_*` for client-side variables
   - The geocode.ts file has placeholder code for Next.js env vars

3. **Data Loading**:
   - GeoJSON files are loaded via fetch from `/data/` directory
   - This works the same in Next.js with files in `public/data/`
   - Consider pre-loading GeoJSON in server components for better performance

## 🎨 Styling

The map uses MUI (Material-UI) components with the following features:
- Responsive grid layout
- Party-based district coloring (Blue=Democrat, Red=Republican)
- Minimal map style (no basemap, only districts)
- Mobile-friendly design

## 🗺️ Data Files Required

Copy these files from the Vite project to Next.js `public/data/`:

1. **va_house_districts.geojson** (~2.5MB)
   - 100 House of Delegates districts
   - Properties: districtId, memberName, memberParty, memberPhotoUrl, etc.

2. **va_senate_districts.geojson** (~1.8MB)
   - 40 Senate districts
   - Same property structure as House

## 🔧 Customization

### Map Styling
Edit `lib/mapStyle.ts` to customize:
- Background color
- Party colors
- District border styling

### Geocoding Service
Edit `lib/geocode.ts` to:
- Use a different geocoding provider
- Add custom geocoding logic
- Implement rate limiting

### Layout
Edit `components/LegislatureMapPage.tsx` to:
- Change grid layout
- Adjust spacing
- Modify responsive breakpoints

## ✅ Migration Readiness Checklist

- [x] All components are self-contained
- [x] No dependencies on budget/amendment logic
- [x] No LIS API calls
- [x] TypeScript types are complete
- [x] Environment variable placeholders added
- [x] SSR compatibility notes documented
- [x] Required npm packages listed
- [x] Data files identified
- [ ] Add 'use client' directives to components (do in Next.js)
- [ ] Test with Next.js dynamic imports (do in Next.js)
- [ ] Verify MUI theme compatibility (do in Next.js)

## 🚨 Known Issues & Limitations

1. **Mapbox Token Required**: The map will not render without a valid Mapbox token
2. **Geocoding Rate Limits**: OpenStreetMap Nominatim has rate limits (1 req/sec)
3. **Large GeoJSON Files**: Consider optimizing or simplifying geometries for production
4. **No Caching**: GeoJSON is fetched on every page load (consider Next.js caching)

## 📞 Support

For questions about this migration package, refer to:
- Original Vite implementation: `budget-decoder-dpb/src/features/legislator-locator/`
- Mapbox GL JS docs: https://docs.mapbox.com/mapbox-gl-js/
- react-map-gl docs: https://visgl.github.io/react-map-gl/

