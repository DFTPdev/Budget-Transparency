# Legislature Map Feature - Technical Overview

## Feature Description

The Virginia Legislature Map is an interactive web application that allows users to:
1. **Find legislators by address** - Enter a Virginia address to locate House and Senate representatives
2. **Browse districts visually** - Click on map districts to view legislator information
3. **Switch between chambers** - Toggle between House of Delegates (100 districts) and Senate (40 districts)
4. **View legislator details** - See photos, contact info, party affiliation, and profile links

## Architecture

### Component Hierarchy

```
LegislatureMapPage (Main Container)
├── Chamber Toggle (House/Senate)
├── LegislatorMap (Left Column)
│   ├── Mapbox GL Map
│   ├── District Layers (GeoJSON)
│   └── Selected Point Marker
└── Right Column
    ├── AddressForm
    │   ├── Street Input
    │   ├── City Input
    │   └── ZIP Input
    └── LegislatorDetails
        └── Legislator Cards (1 per legislator)
            ├── Avatar
            ├── Name & Party
            ├── Contact Info
            └── Profile Link
```

### Data Flow

```
User Action → State Update → Component Re-render
     ↓              ↓              ↓
Address Submit → Geocode → Find District → Update State → Show Legislator
Map Click → Extract Feature → Update State → Show Legislator
Chamber Toggle → Load GeoJSON → Update State → Re-render Map
```

### State Management

Single state object managed by React `useState`:

```typescript
{
  activeChamber: 'house' | 'senate',
  geoPoint: { lat, lng } | null,
  selectedDistrict: DistrictProperties | null,
  selectedLegislators: Legislator[],
  statusMessage: string | null,
  isLoading: boolean,
  error: string | null
}
```

## Technical Stack

### Core Technologies
- **React 18+** - UI framework
- **TypeScript** - Type safety
- **Mapbox GL JS** - Map rendering
- **react-map-gl** - React wrapper for Mapbox
- **Turf.js** - Geospatial calculations
- **Material-UI (MUI)** - UI components

### Key Libraries

| Library | Purpose | Why Chosen |
|---------|---------|------------|
| Mapbox GL JS | Map rendering | Industry standard, high performance, WebGL-based |
| react-map-gl | React integration | Official React wrapper, hooks support |
| @turf/turf | Point-in-polygon | Accurate geospatial calculations |
| MUI | UI components | Consistent design, accessibility, responsive |

## Data Sources

### GeoJSON Files

**va_house_districts.geojson** (37 MB)
- 100 House of Delegates districts
- Polygon geometries with high detail
- Properties: districtId, memberName, memberParty, memberPhotoUrl, etc.

**va_senate_districts.geojson** (24 MB)
- 40 Senate districts
- Polygon geometries with high detail
- Same property structure as House

### Geocoding Service

**OpenStreetMap Nominatim** (default)
- Free, open-source geocoding
- Rate limit: 1 request/second
- Configurable via environment variables

## Key Features

### 1. Address Geocoding
- Converts street address to lat/lng coordinates
- Uses Nominatim API (configurable)
- Error handling for invalid addresses
- Virginia-specific filtering

### 2. Point-in-Polygon Detection
- Uses Turf.js `booleanPointInPolygon`
- Handles both Polygon and MultiPolygon geometries
- Accurate for complex district boundaries

### 3. Interactive Map
- Click districts to select
- Party-based coloring (Blue=D, Red=R)
- No basemap (minimal style)
- Responsive zoom and pan

### 4. Legislator Information
- Name, party, district
- Photo (from Virginia Legislature)
- Phone, email
- Profile link (official legislature site)

## Design Decisions

### Why No Basemap?
- **Inspiration**: MichiganVotes.org style
- **Benefits**: Faster loading, cleaner look, focus on districts
- **Implementation**: Custom Mapbox style with only background layer

### Why Turf.js?
- **Accuracy**: More reliable than simple bounding box checks
- **Handles edge cases**: Works with complex geometries
- **Industry standard**: Well-tested, maintained

### Why Client-Side Geocoding?
- **Simplicity**: No backend required
- **Privacy**: No user data stored
- **Flexibility**: Easy to swap providers

### Why MUI?
- **Consistency**: Matches existing DFTP design
- **Accessibility**: Built-in ARIA support
- **Responsive**: Mobile-friendly out of the box

## Performance Considerations

### Initial Load
- **GeoJSON size**: 37 MB (House) + 24 MB (Senate) = 61 MB total
- **Optimization**: Only load active chamber (reduces to ~30 MB)
- **Future**: Consider geometry simplification

### Runtime Performance
- **Map rendering**: Hardware-accelerated via WebGL
- **Point-in-polygon**: O(n) where n = number of districts (max 100)
- **State updates**: Minimal re-renders via React hooks

### Bundle Size
- **Mapbox GL**: ~200 KB gzipped
- **Turf.js**: ~80 KB gzipped
- **Total impact**: ~300 KB (if MUI already installed)

## Browser Compatibility

### Requirements
- WebGL support (all modern browsers)
- ES6 support
- Fetch API

### Tested Browsers
- Chrome 60+
- Firefox 60+
- Safari 12+
- Edge 79+

### Not Supported
- Internet Explorer 11 (no WebGL)

## Security Considerations

### API Keys
- **Mapbox token**: Client-side, rate-limited by Mapbox
- **Geocoder key**: Optional, client-side
- **No sensitive data**: All data is public

### Data Validation
- Address input sanitized before geocoding
- GeoJSON structure validated on load
- Error boundaries for component failures

## Accessibility

### Features
- Keyboard navigation (MUI components)
- ARIA labels on interactive elements
- Screen reader support
- High contrast party colors

### Future Improvements
- Add keyboard shortcuts for map navigation
- Improve focus management
- Add skip links

## Future Enhancements

### Potential Features
1. **Multi-legislator support**: Show both House and Senate for one address
2. **District comparison**: Compare multiple districts side-by-side
3. **Search by legislator name**: Find district by representative
4. **Permalink support**: Share specific district via URL
5. **Print-friendly view**: Export legislator info as PDF

### Performance Optimizations
1. **Geometry simplification**: Reduce GeoJSON file sizes
2. **Lazy loading**: Load districts on-demand
3. **Caching**: Cache GeoJSON in browser storage
4. **CDN**: Serve GeoJSON from CDN

### Data Enhancements
1. **Committee assignments**: Show legislator committees
2. **Voting records**: Link to vote history
3. **Contact form**: Direct contact via web form
4. **Social media**: Add Twitter, Facebook links

## Migration to Next.js

### Why Migrate?
- **SSR**: Faster initial page load
- **SEO**: Better search engine indexing
- **Routing**: Integrated with DFTP site
- **Deployment**: Vercel optimization

### Challenges
- **Mapbox SSR**: Requires `window` object (use dynamic imports)
- **Environment variables**: Different pattern in Next.js
- **Data loading**: Consider server-side GeoJSON loading

### Benefits
- **Performance**: Next.js optimizations
- **Integration**: Seamless with DFTP site
- **Maintenance**: Single codebase
- **Analytics**: Integrated tracking

## Testing Strategy

### Unit Tests (Future)
- Geocoding functions
- Point-in-polygon logic
- Data extraction utilities

### Integration Tests (Future)
- Address submission flow
- District selection flow
- Chamber switching

### Manual Testing (Current)
- Visual regression testing
- Cross-browser testing
- Mobile device testing
- Accessibility testing

## Maintenance

### Data Updates
- **Frequency**: After each election (every 2 years)
- **Source**: Virginia Legislature GIS data
- **Process**: Download new GeoJSON, replace files

### Dependency Updates
- **Mapbox GL**: Check for updates quarterly
- **MUI**: Follow major version updates
- **Security patches**: Apply immediately

## Documentation

### For Developers
- README.md - Migration guide
- DEPENDENCIES.md - Package requirements
- MIGRATION_CHECKLIST.md - Step-by-step migration
- OVERVIEW.md - This file

### For Users
- In-app help text
- Error messages
- Placeholder text

## Support

### Common Issues
1. **Map doesn't load**: Check Mapbox token
2. **Address not found**: Verify Virginia address
3. **District not found**: Check GeoJSON files
4. **Slow performance**: Check network, GeoJSON size

### Debugging
- Browser console logs
- Network tab (check GeoJSON loads)
- React DevTools (check state)
- Mapbox GL inspector

## License

All code is proprietary to DFTP. GeoJSON data is public domain (Virginia Legislature).

