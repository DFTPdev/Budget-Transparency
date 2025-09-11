// Virginia Legislative Districts GeoJSON Data
// Simplified district boundaries for demonstration purposes

export interface DistrictFeature {
  type: 'Feature';
  properties: {
    id: string;
    name: string;
    district_number: number;
  };
  geometry: {
    type: 'Polygon';
    coordinates: number[][][];
  };
}

export interface DistrictCollection {
  type: 'FeatureCollection';
  features: DistrictFeature[];
}

// Simplified Virginia legislative district boundaries
// In a real implementation, this would be loaded from official GeoJSON data
export const VIRGINIA_DISTRICTS: DistrictCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {
        id: 'district-1',
        name: 'District 1',
        district_number: 1,
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-77.5, 38.8],
          [-77.3, 38.8],
          [-77.3, 39.0],
          [-77.5, 39.0],
          [-77.5, 38.8]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: {
        id: 'district-2',
        name: 'District 2',
        district_number: 2,
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-77.3, 38.8],
          [-77.1, 38.8],
          [-77.1, 39.0],
          [-77.3, 39.0],
          [-77.3, 38.8]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: {
        id: 'district-3',
        name: 'District 3',
        district_number: 3,
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-77.1, 38.8],
          [-76.9, 38.8],
          [-76.9, 39.0],
          [-77.1, 39.0],
          [-77.1, 38.8]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: {
        id: 'district-4',
        name: 'District 4',
        district_number: 4,
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-76.9, 38.8],
          [-76.7, 38.8],
          [-76.7, 39.0],
          [-76.9, 39.0],
          [-76.9, 38.8]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: {
        id: 'district-5',
        name: 'District 5',
        district_number: 5,
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-77.5, 38.6],
          [-77.3, 38.6],
          [-77.3, 38.8],
          [-77.5, 38.8],
          [-77.5, 38.6]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: {
        id: 'district-6',
        name: 'District 6',
        district_number: 6,
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-77.3, 38.6],
          [-77.1, 38.6],
          [-77.1, 38.8],
          [-77.3, 38.8],
          [-77.3, 38.6]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: {
        id: 'district-7',
        name: 'District 7',
        district_number: 7,
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-77.1, 38.6],
          [-76.9, 38.6],
          [-76.9, 38.8],
          [-77.1, 38.8],
          [-77.1, 38.6]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: {
        id: 'district-8',
        name: 'District 8',
        district_number: 8,
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-76.9, 38.6],
          [-76.7, 38.6],
          [-76.7, 38.8],
          [-76.9, 38.8],
          [-76.9, 38.6]
        ]]
      }
    }
  ]
};

// Calculate centroid of a polygon
export function calculateCentroid(coordinates: number[][][]): [number, number] {
  const polygon = coordinates[0]; // Get the outer ring
  let x = 0;
  let y = 0;
  let area = 0;
  
  for (let i = 0; i < polygon.length - 1; i++) {
    const [x1, y1] = polygon[i];
    const [x2, y2] = polygon[i + 1];
    const a = x1 * y2 - x2 * y1;
    area += a;
    x += (x1 + x2) * a;
    y += (y1 + y2) * a;
  }
  
  area *= 0.5;
  x /= (6 * area);
  y /= (6 * area);
  
  return [x, y];
}

// Get district centroids for circle markers
export function getDistrictCentroids(): Array<{ id: string; name: string; centroid: [number, number] }> {
  return VIRGINIA_DISTRICTS.features.map(feature => ({
    id: feature.properties.id,
    name: feature.properties.name,
    centroid: calculateCentroid(feature.geometry.coordinates)
  }));
}
