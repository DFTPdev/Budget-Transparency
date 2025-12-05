/**
 * Shared types for the Legislature Map feature
 * Clean version for Next.js migration - NO budget/amendment types
 */

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface DistrictProperties {
  districtId: string | number;
  chamber: 'house' | 'senate';
  memberName: string;
  memberParty?: string;
  memberUrl?: string;
  memberPhotoUrl?: string;
  memberPhone?: string;
  memberEmail?: string;
  memberNumber?: string; // For Senate ID conversion
  [key: string]: any;
}

export interface DistrictFeature {
  type: 'Feature';
  id?: string | number;
  geometry: {
    type: string;
    coordinates: any;
  };
  properties: DistrictProperties;
}

export interface DistrictGeoJSON {
  type: 'FeatureCollection';
  features: DistrictFeature[];
}

export interface Legislator {
  districtId: string | number;
  chamber: 'house' | 'senate';
  name: string;
  party?: string;
  url?: string;
  photoUrl?: string;
  phone?: string;
  email?: string;
  lisId?: string; // LIS member code (e.g., "H336", "S40") for linking to LIS data
}

export interface GeocodingResult {
  lat: number;
  lng: number;
  address: string;
  displayName?: string;
}

export interface GeocodingError {
  code: string;
  message: string;
}

export interface AddressInput {
  street: string;
  city: string;
  zip: string;
}

export interface LegislatorLocatorState {
  activeChamber: 'house' | 'senate';
  geoPoint: GeoPoint | null;
  selectedDistrict: DistrictProperties | null;
  selectedLegislators: Legislator[];
  statusMessage: string | null;
  isLoading: boolean;
  error: string | null;
}

