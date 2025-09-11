// Simple fetch wrapper for VA pipeline data
export interface DistrictFeature {
  type: 'Feature';
  geometry: {
    type: string;
    coordinates: number[][][];
  };
  properties: {
    STATEFP: string;
    SLDLST: string;
    GEOID: string;
    NAMELSAD: string;
    district: string;
    budget_total: number;
  };
}

export interface PrecinctFeature {
  type: 'Feature';
  geometry: {
    type: string;
    coordinates: number[][][];
  };
  properties: {
    precinct: string;
    has_data: boolean;
    sp_nbr: number;
    sr_nbr: number;
    sp_amt: number;
    sr_amt: number;
  };
}

export interface DistrictGeoJSON {
  type: 'FeatureCollection';
  features: DistrictFeature[];
}

export interface PrecinctGeoJSON {
  type: 'FeatureCollection';
  features: PrecinctFeature[];
}

export interface BudgetRow {
  sessionYear: number;
  district: number;
  delegate_name: string;
  total_amount: number;
  add_amount: number;
  reduce_amount: number;
  amendments_count: number;
}

export async function fetchDistrictGeoJSON(): Promise<DistrictGeoJSON> {
  const response = await fetch('/data/district-spending.geojson');
  if (!response.ok) {
    throw new Error(`Failed to fetch district GeoJSON: ${response.status}`);
  }
  return response.json();
}

export async function fetchPrecinctGeoJSON(): Promise<PrecinctGeoJSON> {
  const response = await fetch('/data/vpap-precincts.geojson');
  if (!response.ok) {
    throw new Error(`Failed to fetch precinct GeoJSON: ${response.status}`);
  }
  return response.json();
}

export async function fetchBudgetData(): Promise<BudgetRow[]> {
  const response = await fetch('/data/budget_by_district_2025.json');
  if (!response.ok) {
    throw new Error(`Failed to fetch budget data: ${response.status}`);
  }
  return response.json();
}

// Generic pipeline artifact fetcher
export async function fetchPipelineArtifact(filename: string) {
  const res = await fetch(`/data/${filename}`);
  if (!res.ok) throw new Error(`failed to fetch ${filename}: ${res.status}`);
  return res.json();
}

// Recipients data interface
export interface RecipientRow {
  agency: string;
  total_amount: number;
  items: number;
  sources: string[];
}

// DPB data interface
export interface DPBRow {
  id?: string;
  title?: string;
  amount?: number;
  agency?: string;
  url?: string;
  source?: string;
  agencyCode?: string;
  year?: number;
  general_fund_resources?: number;
  uses_operating?: number;
  capital_total_gf?: number;
  reserve_deposits?: number;
  rebates?: number;
  notes?: string[];
}

// Fetch recipients data
export async function fetchRecipientsData(): Promise<RecipientRow[]> {
  const response = await fetch('/data/recipients_2025.json');
  if (!response.ok) {
    throw new Error(`Failed to fetch recipients data: ${response.status}`);
  }
  return response.json();
}

// Fetch DPB data
export async function fetchDPBData(): Promise<DPBRow[]> {
  const response = await fetch('/data/dpb_2025.json');
  if (!response.ok) {
    throw new Error(`Failed to fetch DPB data: ${response.status}`);
  }
  return response.json();
}
