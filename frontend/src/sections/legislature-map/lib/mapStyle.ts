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
 * Create fill layer for districts
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
      'fill-opacity': 0.85,
    },
  };
}

/**
 * Create line layer for district borders
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
      'line-color': '#FFFFFF', // White border
      'line-width': 1,
      'line-opacity': 0.8,
    },
  };
}

