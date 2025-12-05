# Required npm Packages for Legislature Map

This document lists all npm packages required to run the Legislature Map feature in Next.js.

## Installation Command

```bash
npm install mapbox-gl react-map-gl @turf/turf @mui/material @mui/icons-material @emotion/react @emotion/styled
npm install --save-dev @types/react-map-gl
```

## Production Dependencies

### Map & Geospatial

| Package | Version | Purpose |
|---------|---------|---------|
| `mapbox-gl` | ^3.10.0 | Mapbox GL JS - core mapping library |
| `react-map-gl` | ^8.0.2 | React wrapper for Mapbox GL |
| `@turf/turf` | ^7.2.0 | Geospatial analysis (point-in-polygon detection) |

### UI Components

| Package | Version | Purpose |
|---------|---------|---------|
| `@mui/material` | ^7.0.1 | Material-UI core components |
| `@mui/icons-material` | ^7.3.5 | Material-UI icons |
| `@emotion/react` | ^11.14.0 | CSS-in-JS (required by MUI) |
| `@emotion/styled` | ^11.14.0 | Styled components (required by MUI) |

### Already in Next.js

These packages are likely already installed in your Next.js project:
- `react` (^18 or ^19)
- `react-dom` (^18 or ^19)
- `typescript` (^5)

## Development Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `@types/react-map-gl` | ^6.1.7 | TypeScript types for react-map-gl |

## Peer Dependencies

The following are peer dependencies that should already be satisfied:
- `react` >= 18.0.0
- `react-dom` >= 18.0.0
- `mapbox-gl` >= 2.0.0 (for react-map-gl)

## Version Compatibility Notes

### Mapbox GL JS
- **Version 3.x** is recommended for best performance
- Requires WebGL support in browser
- License: BSD-3-Clause (free for most use cases)

### react-map-gl
- **Version 8.x** is the latest major version
- Compatible with Mapbox GL JS 3.x
- Provides React hooks and components

### @turf/turf
- **Version 7.x** is the latest
- Includes all Turf.js modules in one package
- Used for `booleanPointInPolygon` function

### Material-UI (MUI)
- **Version 7.x** is the latest
- Requires React 18+
- Emotion is the default styling engine

## Optional Dependencies

These are NOT required but may be useful:

| Package | Purpose |
|---------|---------|
| `@mapbox/mapbox-gl-geocoder` | Alternative geocoding UI component |
| `mapbox-gl-draw` | Drawing tools for map |
| `@turf/helpers` | Lightweight alternative to full @turf/turf |

## Environment Variables Required

```env
# Required
NEXT_PUBLIC_MAPBOX_TOKEN=pk.ey...

# Optional (defaults to OpenStreetMap Nominatim)
NEXT_PUBLIC_GEOCODER_URL=https://nominatim.openstreetmap.org/search
NEXT_PUBLIC_GEOCODER_KEY=
```

## CSS Imports Required

Add to `app/layout.tsx` or global CSS file:

```tsx
import 'mapbox-gl/dist/mapbox-gl.css';
```

## Bundle Size Impact

Approximate gzipped sizes:
- `mapbox-gl`: ~200 KB
- `react-map-gl`: ~20 KB
- `@turf/turf`: ~80 KB
- `@mui/material`: ~100 KB (if not already installed)

**Total additional size**: ~400 KB gzipped (if MUI already installed: ~300 KB)

## Browser Compatibility

### Mapbox GL JS Requirements
- WebGL support (all modern browsers)
- ES6 support
- Not supported: IE11

### Minimum Browser Versions
- Chrome 60+
- Firefox 60+
- Safari 12+
- Edge 79+

## Known Issues

### Mapbox GL JS in Next.js
- **SSR Issue**: Mapbox GL requires `window` object
- **Solution**: Use dynamic imports with `ssr: false`

```tsx
import dynamic from 'next/dynamic';

const Map = dynamic(
  () => import('./components/LegislatorMap'),
  { ssr: false }
);
```

### react-map-gl Type Errors
- **Issue**: TypeScript may complain about map event types
- **Solution**: Install `@types/react-map-gl` (already listed above)

### Turf.js Tree Shaking
- **Issue**: Full `@turf/turf` package is large
- **Solution**: Import individual modules if bundle size is critical

```tsx
// Instead of:
import { booleanPointInPolygon, point, polygon } from '@turf/turf';

// Use:
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import { point } from '@turf/helpers';
import { polygon } from '@turf/helpers';
```

## License Information

All packages use permissive licenses:
- `mapbox-gl`: BSD-3-Clause
- `react-map-gl`: MIT
- `@turf/turf`: MIT
- `@mui/material`: MIT

**Note**: Mapbox GL JS requires a Mapbox account and API token, but is free for most use cases (up to 50,000 map loads/month).

