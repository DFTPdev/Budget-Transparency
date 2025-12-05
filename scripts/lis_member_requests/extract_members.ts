/**
 * Extract all legislators from GeoJSON files
 * Creates lis_members.json with all House and Senate members
 */

import * as fs from 'fs';
import * as path from 'path';

interface GeoJSONFeature {
  type: string;
  properties: {
    districtId?: string | number;
    memberName?: string;
    memberUrl?: string;
    memberNumber?: string;
    memberParty?: string;
  };
  geometry: any;
}

interface GeoJSON {
  type: string;
  features: GeoJSONFeature[];
}

interface Member {
  id: string;
  fullName: string;
  lastName: string;
  chamber: 'House' | 'Senate';
  district: string;
  party: string;
}

// Extract LIS ID from memberUrl or memberNumber
function extractLisId(feature: GeoJSONFeature): string | null {
  const { memberUrl, memberNumber } = feature.properties;
  
  // House: Extract from URL like "https://house.vga.virginia.gov/delegate_photos/H0354.jpg"
  if (memberUrl && memberUrl.includes('delegate_photos')) {
    const match = memberUrl.match(/H(\d+)/);
    if (match) {
      // Remove leading zeros: H0354 -> H354
      return `H${parseInt(match[1], 10)}`;
    }
  }
  
  // Senate: Extract from memberNumber like "S0086"
  if (memberNumber && memberNumber.startsWith('S')) {
    const match = memberNumber.match(/S0*(\d+)/);
    if (match) {
      return `S${match[1]}`;
    }
  }
  
  return null;
}

// Extract last name from full name
function extractLastName(fullName: string): string {
  const parts = fullName.split(' ');
  return parts[parts.length - 1];
}

// Extract district number from districtId
function extractDistrict(districtId: string | number): string {
  const id = String(districtId);
  // Handle formats like "HD-54" or "SD-40" or just "54"
  const match = id.match(/\d+/);
  return match ? match[0] : id;
}

const houseGeoPath = path.join(__dirname, '../../frontend/public/data/va_house_districts.geojson');
const senateGeoPath = path.join(__dirname, '../../frontend/public/data/va_senate_districts.geojson');
const outputPath = path.join(__dirname, 'lis_members.json');

console.log('Extracting legislators from GeoJSON files...\n');

const members: Member[] = [];

// Process House
console.log('Processing House members...');
const houseGeo: GeoJSON = JSON.parse(fs.readFileSync(houseGeoPath, 'utf-8'));
let houseCount = 0;

for (const feature of houseGeo.features) {
  const lisId = extractLisId(feature);
  const memberName = feature.properties.memberName;
  const districtId = feature.properties.districtId;
  const party = feature.properties.memberParty || 'Unknown';
  
  if (lisId && memberName && districtId) {
    members.push({
      id: lisId,
      fullName: memberName,
      lastName: extractLastName(memberName),
      chamber: 'House',
      district: extractDistrict(districtId),
      party: party,
    });
    houseCount++;
  }
}

console.log(`  Found ${houseCount} House members`);

// Process Senate
console.log('Processing Senate members...');
const senateGeo: GeoJSON = JSON.parse(fs.readFileSync(senateGeoPath, 'utf-8'));
let senateCount = 0;

for (const feature of senateGeo.features) {
  const lisId = extractLisId(feature);
  const memberName = feature.properties.memberName;
  const districtId = feature.properties.districtId;
  const party = feature.properties.memberParty || 'Unknown';
  
  if (lisId && memberName && districtId) {
    members.push({
      id: lisId,
      fullName: memberName,
      lastName: extractLastName(memberName),
      chamber: 'Senate',
      district: extractDistrict(districtId),
      party: party,
    });
    senateCount++;
  }
}

console.log(`  Found ${senateCount} Senate members`);

// Sort by chamber and then by ID
members.sort((a, b) => {
  if (a.chamber !== b.chamber) {
    return a.chamber === 'House' ? -1 : 1;
  }
  return a.id.localeCompare(b.id, undefined, { numeric: true });
});

// Write to file
fs.writeFileSync(outputPath, JSON.stringify(members, null, 2));

console.log(`\n✓ Wrote ${members.length} members to ${outputPath}`);
console.log(`  House: ${houseCount}`);
console.log(`  Senate: ${senateCount}`);

