/**
 * GeoJSON loading and processing utilities
 * Clean version for Next.js migration - NO LIS API calls
 */

import { point, polygon, booleanPointInPolygon } from '@turf/turf';

import type { Legislator, DistrictGeoJSON, DistrictFeature, DistrictProperties } from '../types';

/**
 * Load GeoJSON file from public data directory
 * @param chamber - 'house' or 'senate'
 * @returns Promise resolving to DistrictGeoJSON
 * 
 * NEXT.JS MIGRATION NOTE:
 * - GeoJSON files should be placed in /public/data/
 * - Fetch will work the same way in Next.js client components
 * - For server components, consider importing JSON directly
 */
export async function loadDistrictGeoJSON(chamber: 'house' | 'senate'): Promise<DistrictGeoJSON> {
  const filename = chamber === 'house' ? 'va_house_districts.geojson' : 'va_senate_districts.geojson';
  const url = `/data/${filename}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to load ${filename}: ${response.statusText}`);
    }

    const data: DistrictGeoJSON = await response.json();

    // Validate GeoJSON structure
    if (!data.type || data.type !== 'FeatureCollection' || !Array.isArray(data.features)) {
      throw new Error(`Invalid GeoJSON structure in ${filename}`);
    }

    return data;
  } catch (err) {
    console.error(`Error loading GeoJSON for ${chamber}:`, err);
    throw err;
  }
}

/**
 * Find district feature by point using Turf.js for accurate point-in-polygon
 * @param features - Array of district features
 * @param lat - Latitude
 * @param lng - Longitude
 * @returns Matching DistrictFeature or null
 */
export function findDistrictByPoint(
  features: DistrictFeature[],
  lat: number,
  lng: number
): DistrictFeature | null {
  const testPoint = point([lng, lat]);

  for (const feature of features) {
    try {
      if (feature.geometry.type === 'Polygon') {
        const poly = polygon(feature.geometry.coordinates);
        if (booleanPointInPolygon(testPoint, poly)) {
          return feature;
        }
      } else if (feature.geometry.type === 'MultiPolygon') {
        // For MultiPolygon, check each polygon
        for (const coords of feature.geometry.coordinates) {
          const poly = polygon([coords[0]]);
          if (booleanPointInPolygon(testPoint, poly)) {
            return feature;
          }
        }
      }
    } catch (err) {
      // Skip features with invalid geometry
      console.warn('Invalid geometry for feature:', feature.id, err);
      continue;
    }
  }

  return null;
}

/**
 * Get Virginia bounds for map centering
 */
export function getVirginiaBounds(): [[number, number], [number, number]] {
  // Southwest and Northeast corners of Virginia
  return [
    [36.5, -83.7], // Southwest
    [39.5, -75.2], // Northeast
  ];
}

/**
 * Get center of Virginia
 */
export function getVirginiaCenter(): [number, number] {
  return [37.5, -79.5];
}

/**
 * Extract legislator info from district properties
 * Clean version - NO amendment stats or LIS API calls
 */
export function extractLegislatorInfo(properties: DistrictProperties): Legislator {
  // Convert photo URL to profile page URL
  let profileUrl = properties.memberUrl;
  let lisId: string | undefined;

  if (properties.memberUrl) {
    // House: Photo URL format: https://house.vga.virginia.gov/delegate_photos/H0354.jpg
    // House: Profile URL format: https://house.vga.virginia.gov/members/H0354
    if (properties.memberUrl.includes('delegate_photos')) {
      const match = properties.memberUrl.match(/delegate_photos\/([A-Z0-9]+)\./);
      if (match && match[1]) {
        profileUrl = `https://house.vga.virginia.gov/members/${match[1]}`;
        // Extract LIS ID: H0354 -> H354 (remove leading zeros from district number)
        const lisMatch = match[1].match(/^([A-Z])0*(\d+)$/);
        if (lisMatch) {
          lisId = `${lisMatch[1]}${lisMatch[2]}`;
        }
      }
    }
    // Senate: Photo URL format: https://apps.senate.virginia.gov/Senator/images/member_photos/Favola40
    // Senate: Profile URL format: https://apps.senate.virginia.gov/Senator/memberpage.php?id=S86
    // Use memberNumber from GeoJSON (format: S0086 -> S86)
    else if (properties.memberUrl.includes('member_photos') && properties.memberNumber) {
      // Convert memberNumber from S0086 format to S86 format (remove leading zero)
      const idMatch = properties.memberNumber.match(/^S0*(\d+)$/);
      if (idMatch && idMatch[1]) {
        profileUrl = `https://apps.senate.virginia.gov/Senator/memberpage.php?id=S${idMatch[1]}`;
        lisId = `S${idMatch[1]}`;
      }
    }
  }

  // Fallback: try to extract LIS ID from memberNumber if we didn't get it from URL
  if (!lisId && properties.memberNumber) {
    const match = properties.memberNumber.match(/^([A-Z])0*(\d+)$/);
    if (match) {
      lisId = `${match[1]}${match[2]}`;
    }
  }

  return {
    districtId: properties.districtId,
    chamber: properties.chamber,
    name: properties.memberName,
    party: properties.memberParty,
    url: profileUrl,
    photoUrl: properties.memberPhotoUrl,
    phone: properties.memberPhone,
    email: properties.memberEmail,
    lisId,
  };
}

