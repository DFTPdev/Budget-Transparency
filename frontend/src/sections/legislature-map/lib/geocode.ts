/**
 * Geocoding helper for address lookup
 * Supports custom geocoder URL or falls back to OpenStreetMap Nominatim
 * 
 * NEXT.JS MIGRATION NOTE:
 * - Replace import.meta.env with process.env for server-side
 * - For client-side, use next/config or environment variables
 */

import type { AddressInput, GeocodingError, GeocodingResult } from '../types';

const DEFAULT_NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';

interface NominatimResponse {
  lat: string;
  lon: string;
  display_name: string;
  [key: string]: any;
}

/**
 * Get geocoder configuration from environment variables
 * MIGRATION: Update to use Next.js env pattern
 */
function getGeocoderConfig() {
  // For Next.js, replace with:
  // return {
  //   url: process.env.NEXT_PUBLIC_GEOCODER_URL || DEFAULT_NOMINATIM_URL,
  //   key: process.env.NEXT_PUBLIC_GEOCODER_KEY || '',
  // };
  
  return {
    url: (typeof window !== 'undefined' && (window as any).GEOCODER_URL) || DEFAULT_NOMINATIM_URL,
    key: (typeof window !== 'undefined' && (window as any).GEOCODER_KEY) || '',
  };
}

/**
 * Format address input into a query string
 */
function formatAddressQuery(address: AddressInput): string {
  const parts = [address.street, address.city, 'Virginia', address.zip].filter(Boolean);
  return parts.join(', ');
}

/**
 * Geocode an address to coordinates
 * @param address - Address input with street, city, zip
 * @returns Promise resolving to GeocodingResult or rejecting with GeocodingError
 */
export async function geocodeAddress(address: AddressInput): Promise<GeocodingResult> {
  const config = getGeocoderConfig();
  const query = formatAddressQuery(address);

  if (!query.trim()) {
    throw {
      code: 'EMPTY_ADDRESS',
      message: 'Please provide at least a street address or ZIP code',
    } as GeocodingError;
  }

  try {
    const params = new URLSearchParams({
      q: query,
      format: 'json',
      limit: '1',
      countrycodes: 'us',
    });

    // Add API key if available
    if (config.key) {
      params.append('key', config.key);
    }

    const url = `${config.url}?${params.toString()}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'DFTP-Legislature-Map/1.0',
      },
    });

    if (!response.ok) {
      throw new Error(`Geocoding service returned ${response.status}`);
    }

    const results: NominatimResponse[] = await response.json();

    if (!results || results.length === 0) {
      throw {
        code: 'NO_RESULTS',
        message: 'No address found. Please check your entry and try again.',
      } as GeocodingError;
    }

    const result = results[0];
    return {
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
      address: query,
      displayName: result.display_name,
    };
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err) {
      throw err as GeocodingError;
    }

    throw {
      code: 'GEOCODING_ERROR',
      message: err instanceof Error ? err.message : 'Failed to geocode address',
    } as GeocodingError;
  }
}

/**
 * Reverse geocode coordinates to address
 * @param lat - Latitude
 * @param lng - Longitude
 * @returns Promise resolving to address string
 */
export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const config = getGeocoderConfig();

  try {
    const params = new URLSearchParams({
      lat: lat.toString(),
      lon: lng.toString(),
      format: 'json',
    });

    if (config.key) {
      params.append('key', config.key);
    }

    const url = `${config.url.replace('/search', '/reverse')}?${params.toString()}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'DFTP-Legislature-Map/1.0',
      },
    });

    if (!response.ok) {
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }

    const result: NominatimResponse = await response.json();
    return result.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  } catch {
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }
}

