# Quick Start Guide - Legislature Map Migration

This guide will get the Legislature Map running in your Next.js project in under 10 minutes.

## Prerequisites

- Next.js project set up and running
- Node.js 18+ installed
- Mapbox account and API token ([Get one free](https://account.mapbox.com/))

## Step 1: Install Dependencies (2 minutes)

```bash
cd your-nextjs-project
npm install mapbox-gl react-map-gl @turf/turf
npm install --save-dev @types/react-map-gl
```

If MUI is not already installed:
```bash
npm install @mui/material @mui/icons-material @emotion/react @emotion/styled
```

## Step 2: Copy Files (1 minute)

```bash
# From your Next.js project root:
MIGRATION_PATH="/path/to/budget-decoder-dpb/legislature-map-migration"

# Copy components
cp -r $MIGRATION_PATH/components app/(public)/legislature-map/
cp -r $MIGRATION_PATH/lib app/(public)/legislature-map/
cp -r $MIGRATION_PATH/types app/(public)/legislature-map/

# Copy data files
mkdir -p public/data
cp $MIGRATION_PATH/data/*.geojson public/data/
```

## Step 3: Set Environment Variables (1 minute)

Create or edit `.env.local`:

```env
NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ1IjoieW91ci11c2VybmFtZSIsImEiOiJjbHh4eHh4eHgifQ.xxxxx
```

Get your token from: https://account.mapbox.com/access-tokens/

## Step 4: Create Page Route (2 minutes)

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

## Step 5: Import Mapbox CSS (1 minute)

Add to `app/layout.tsx` (at the top with other imports):

```tsx
import 'mapbox-gl/dist/mapbox-gl.css';
```

## Step 6: Add 'use client' Directives (1 minute)

Add `'use client';` to the top of these files (if not already present):

```tsx
// app/(public)/legislature-map/components/AddressForm.tsx
'use client';

// app/(public)/legislature-map/components/LegislatorDetails.tsx
'use client';

// app/(public)/legislature-map/components/LegislatorMap.tsx
'use client';
```

## Step 7: Test It! (2 minutes)

```bash
npm run dev
```

Visit: http://localhost:3000/legislature-map

### Quick Test Checklist
- [ ] Map loads and shows Virginia districts
- [ ] Districts are colored (Blue/Red based on party)
- [ ] Enter address: "1000 Bank Street, Richmond, VA 23219"
- [ ] Legislator info appears on the right
- [ ] Click a district on the map
- [ ] Toggle between House and Senate

## Troubleshooting

### Map doesn't load
**Error**: Blank map or "Mapbox token not configured"
**Fix**: Check `.env.local` has `NEXT_PUBLIC_MAPBOX_TOKEN` set correctly

### SSR Error: "window is not defined"
**Error**: Build fails or page crashes
**Fix**: Use dynamic import in `page.tsx`:

```tsx
import dynamic from 'next/dynamic';

const LegislatureMapPage = dynamic(
  () => import('./components/LegislatureMapPage').then(mod => ({ default: mod.LegislatureMapPage })),
  { ssr: false, loading: () => <p>Loading map...</p> }
);

export default function Page() {
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';
  return <LegislatureMapPage mapboxToken={mapboxToken} />;
}
```

### GeoJSON 404 Error
**Error**: Console shows "Failed to load va_house_districts.geojson"
**Fix**: Verify files are in `public/data/` and restart dev server

### Type Errors
**Error**: TypeScript complains about map types
**Fix**: Make sure `@types/react-map-gl` is installed

### Styling Issues
**Error**: Components look broken or unstyled
**Fix**: Verify Mapbox CSS is imported in layout.tsx

## Next Steps

1. **Deploy to Vercel**
   - Add `NEXT_PUBLIC_MAPBOX_TOKEN` to Vercel environment variables
   - Deploy and test

2. **Customize**
   - Edit `lib/mapStyle.ts` to change colors
   - Edit `components/LegislatureMapPage.tsx` to adjust layout
   - Edit `lib/geocode.ts` to use different geocoding service

3. **Optimize**
   - Consider simplifying GeoJSON geometries (reduce file size)
   - Add loading skeletons
   - Implement error boundaries

## File Structure

After migration, your project should look like:

```
your-nextjs-project/
├── app/
│   ├── (public)/
│   │   └── legislature-map/
│   │       ├── components/
│   │       │   ├── AddressForm.tsx
│   │       │   ├── LegislatorDetails.tsx
│   │       │   ├── LegislatorMap.tsx
│   │       │   └── LegislatureMapPage.tsx
│   │       ├── lib/
│   │       │   ├── geocode.ts
│   │       │   ├── geojson.ts
│   │       │   └── mapStyle.ts
│   │       ├── types/
│   │       │   └── index.ts
│   │       └── page.tsx
│   └── layout.tsx (with Mapbox CSS import)
├── public/
│   └── data/
│       ├── va_house_districts.geojson
│       └── va_senate_districts.geojson
└── .env.local (with NEXT_PUBLIC_MAPBOX_TOKEN)
```

## Support

- **Full documentation**: See `README.md` in migration folder
- **Dependencies**: See `DEPENDENCIES.md`
- **Migration checklist**: See `MIGRATION_CHECKLIST.md`
- **Technical overview**: See `OVERVIEW.md`

## Success!

If you can see the map, click districts, and enter addresses, you're done! 🎉

The Legislature Map is now fully integrated into your Next.js project.

