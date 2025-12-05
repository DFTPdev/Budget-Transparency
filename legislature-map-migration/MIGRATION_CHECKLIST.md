# Legislature Map Migration Checklist

Use this checklist to track your progress migrating the Legislature Map feature to Next.js.

## Pre-Migration (In Vite Project)

- [x] Identify all components and utilities
- [x] Remove budget/amendment dependencies
- [x] Create clean, self-contained versions
- [x] Document required packages
- [x] Identify data files
- [x] Create migration documentation

## File Transfer

### Components
- [ ] Copy `components/AddressForm.tsx` to Next.js
- [ ] Copy `components/LegislatorDetails.tsx` to Next.js
- [ ] Copy `components/LegislatorMap.tsx` to Next.js
- [ ] Copy `components/LegislatureMapPage.tsx` to Next.js

### Utilities
- [ ] Copy `lib/geocode.ts` to Next.js
- [ ] Copy `lib/geojson.ts` to Next.js
- [ ] Copy `lib/mapStyle.ts` to Next.js

### Types
- [ ] Copy `types/index.ts` to Next.js

### Data Files
- [ ] Copy `va_house_districts.geojson` to `public/data/`
- [ ] Copy `va_senate_districts.geojson` to `public/data/`
- [ ] Verify GeoJSON files are accessible at `/data/*.geojson`

## Dependencies

- [ ] Install `mapbox-gl` (^3.10.0)
- [ ] Install `react-map-gl` (^8.0.2)
- [ ] Install `@turf/turf` (^7.2.0)
- [ ] Install `@mui/material` (if not already installed)
- [ ] Install `@mui/icons-material` (if not already installed)
- [ ] Install `@emotion/react` (if not already installed)
- [ ] Install `@emotion/styled` (if not already installed)
- [ ] Install `@types/react-map-gl` (dev dependency)

## Environment Configuration

- [ ] Add `NEXT_PUBLIC_MAPBOX_TOKEN` to `.env.local`
- [ ] Add `NEXT_PUBLIC_GEOCODER_URL` to `.env.local` (optional)
- [ ] Add `NEXT_PUBLIC_GEOCODER_KEY` to `.env.local` (optional)
- [ ] Verify Mapbox token is valid
- [ ] Add environment variables to Vercel project settings

## Code Modifications

### Add 'use client' Directives
- [ ] Add to `components/AddressForm.tsx`
- [ ] Add to `components/LegislatorDetails.tsx`
- [ ] Add to `components/LegislatorMap.tsx`
- [ ] Verify `components/LegislatureMapPage.tsx` has it (already added)

### Update Environment Variable Access
- [ ] Update `lib/geocode.ts` to use `process.env.NEXT_PUBLIC_*`
- [ ] Pass Mapbox token from page to LegislatorMap component

### Import Mapbox CSS
- [ ] Add `import 'mapbox-gl/dist/mapbox-gl.css'` to `app/layout.tsx` or global CSS
- [ ] Verify CSS is loaded (check browser DevTools)

## Next.js Integration

### Create Page Route
- [ ] Create `app/(public)/legislature-map/page.tsx`
- [ ] Add metadata (title, description)
- [ ] Import and render `LegislatureMapPage` component
- [ ] Pass Mapbox token from environment

### Handle SSR Issues (if needed)
- [ ] Test if map renders without SSR errors
- [ ] If errors occur, use dynamic import with `ssr: false`
- [ ] Verify map loads correctly in browser

### Example Page Component
```tsx
// app/(public)/legislature-map/page.tsx
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

## Testing

### Functionality Tests
- [ ] Test address geocoding (enter address, verify location found)
- [ ] Test House district selection (click district, verify legislator shown)
- [ ] Test Senate district selection (switch chamber, click district)
- [ ] Test chamber toggle (switch between House and Senate)
- [ ] Test clear button (verify state resets)
- [ ] Test error handling (invalid address, no results)

### Visual Tests
- [ ] Verify map renders correctly
- [ ] Verify district colors match party (Blue=D, Red=R)
- [ ] Verify legislator cards display correctly
- [ ] Verify avatar images load
- [ ] Verify contact links work (phone, email, profile)
- [ ] Test responsive layout (mobile, tablet, desktop)

### Performance Tests
- [ ] Check initial page load time
- [ ] Check GeoJSON load time
- [ ] Check map interaction performance
- [ ] Verify no console errors
- [ ] Check bundle size impact

### Browser Compatibility
- [ ] Test in Chrome
- [ ] Test in Firefox
- [ ] Test in Safari
- [ ] Test in Edge
- [ ] Test on mobile devices

## Deployment

### Vercel Configuration
- [ ] Add environment variables to Vercel project
- [ ] Verify `public/data/` files are included in deployment
- [ ] Test deployment preview
- [ ] Verify map loads in production

### Performance Optimization (Optional)
- [ ] Consider pre-loading GeoJSON in server component
- [ ] Optimize GeoJSON file sizes (simplify geometries)
- [ ] Add loading states and skeletons
- [ ] Implement error boundaries
- [ ] Add analytics tracking

## Documentation

- [ ] Update Next.js project README with map feature
- [ ] Document environment variables
- [ ] Add usage examples
- [ ] Document known issues
- [ ] Add troubleshooting guide

## Post-Migration Cleanup

- [ ] Remove migration folder from Vite project (optional)
- [ ] Archive original Vite implementation (optional)
- [ ] Update team documentation
- [ ] Notify stakeholders of new URL

## Known Issues to Watch For

### SSR Errors
**Symptom**: `window is not defined` or `document is not defined`
**Solution**: Use dynamic import with `ssr: false`

### Mapbox Token Errors
**Symptom**: Map doesn't render, console shows token error
**Solution**: Verify `NEXT_PUBLIC_MAPBOX_TOKEN` is set correctly

### GeoJSON 404 Errors
**Symptom**: Districts don't load, console shows 404
**Solution**: Verify files are in `public/data/` and accessible at `/data/*.geojson`

### Type Errors
**Symptom**: TypeScript errors in map components
**Solution**: Install `@types/react-map-gl`

### Styling Issues
**Symptom**: Map or components look broken
**Solution**: Verify Mapbox CSS is imported and MUI theme is configured

## Success Criteria

- [x] All components render without errors
- [x] Address geocoding works correctly
- [x] District selection works for both chambers
- [x] Legislator information displays correctly
- [x] Map is interactive and responsive
- [x] No console errors or warnings
- [x] Performance is acceptable (< 3s initial load)
- [x] Works on all major browsers
- [x] Mobile-friendly layout

## Rollback Plan

If migration fails:
1. Keep original Vite implementation running
2. Document specific issues encountered
3. Create GitHub issues for blockers
4. Revert Next.js changes if needed
5. Revisit migration strategy

## Support Resources

- **Mapbox GL JS Docs**: https://docs.mapbox.com/mapbox-gl-js/
- **react-map-gl Docs**: https://visgl.github.io/react-map-gl/
- **Next.js Docs**: https://nextjs.org/docs
- **MUI Docs**: https://mui.com/
- **Turf.js Docs**: https://turfjs.org/

## Notes

Use this section to track any issues, workarounds, or customizations made during migration:

```
[Date] [Issue/Note]
---
Example:
2025-01-15: Had to use dynamic import for map component due to SSR issues
2025-01-16: Optimized GeoJSON files by simplifying geometries (reduced by 40%)
```

