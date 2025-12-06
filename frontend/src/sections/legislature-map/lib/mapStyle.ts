/**
 * Custom Mapbox style for MichiganVotes-style district visualization
 * Minimal style with no basemap, only background and district layers
 */

export const createMinimalMapStyle = () => ({
  version: 8,
  name: 'Minimal Districts',
  metadata: {
    'mapbox:autocomposite': true,
    'mapbox:type': 'template',
  },
  sources: {},
  layers: [
    {
      id: 'background',
      type: 'background',
      paint: {
        'background-color': '#F3F4F6',
      },
    },
  ],
  glyphs: 'mapbox://fonts/mapbox/{fontstack}/{range}.pbf',
  sprite: 'mapbox://sprites/mapbox/bright-v8',
});

/**
 * Get color for a district based on party affiliation
 * D/Democratic = Blue
 * R/Republican = Red
 * Other/Unknown = Gray
 */
export function getPartyColor(party?: string): string {
  if (!party) return '#9CA3AF'; // Gray for unknown

  const normalized = party.toLowerCase();

  if (normalized.includes('democrat') || normalized === 'd') {
    return '#005BBB'; // Democratic blue
  }

  if (normalized.includes('republican') || normalized === 'r') {
    return '#B22222'; // Republican red
  }

  return '#9CA3AF'; // Other/Unknown gray
}

/**
 * Create fill layer for districts with hover and selection states
 */
export function createDistrictFillLayer(chamber: 'house' | 'senate', sourceId: string) {
  return {
    id: `districts-fill-${chamber}`,
    type: 'fill' as const,
    source: sourceId,
    layout: {
      'visibility': 'visible' as const,
    },
    paint: {
      'fill-color': [
        'match',
        ['get', 'memberParty'],
        'Democrat',
        '#005BBB', // Democratic blue
        'Republican',
        '#B22222', // Republican red
        '#9CA3AF', // Other/Unknown gray
      ],
      'fill-opacity': [
        'case',
        ['boolean', ['feature-state', 'selected'], false],
        0.95, // Higher opacity when selected
        ['boolean', ['feature-state', 'hover'], false],
        0.9, // Slightly higher opacity when hovered
        0.75, // Default opacity
      ],
    },
  };
}

/**
 * Create line layer for district borders with hover and selection states
 */
export function createDistrictLineLayer(chamber: 'house' | 'senate', sourceId: string) {
  return {
    id: `districts-line-${chamber}`,
    type: 'line' as const,
    source: sourceId,
    layout: {
      'visibility': 'visible' as const,
      'line-join': 'round' as const,
      'line-cap': 'round' as const,
    },
    paint: {
      'line-color': [
        'case',
        ['boolean', ['feature-state', 'selected'], false],
        '#FF9800', // Orange border when selected
        ['boolean', ['feature-state', 'hover'], false],
        '#2196F3', // Blue border when hovered
        '#FFFFFF', // White border default
      ],
      'line-width': [
        'case',
        ['boolean', ['feature-state', 'selected'], false],
        4, // Thicker border when selected
        ['boolean', ['feature-state', 'hover'], false],
        3, // Slightly thicker when hovered
        1, // Default width
      ],
      'line-opacity': 1,
    },
  };
}

