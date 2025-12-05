/**
 * Lightweight CSV parser for decoder data
 * No external dependencies - uses native browser APIs
 */

export type CSVRow = Record<string, string>;

/**
 * Parse CSV text into array of objects
 */
export function parseCSV(csvText: string): CSVRow[] {
  const lines = csvText.split('\n').filter(line => line.trim());
  if (lines.length === 0) return [];

  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const rows: CSVRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === headers.length) {
      const row: CSVRow = {};
      headers.forEach((header, index) => {
        row[header] = values[index];
      });
      rows.push(row);
    }
  }

  return rows;
}

/**
 * Parse a single CSV line handling quoted values and escaped quotes
 */
function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const char = line[i];

    if (char === '"') {
      // Check for escaped quote (two consecutive quotes)
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i += 2; // Skip both quotes
        continue;
      }
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim().replace(/^"|"$/g, ''));
      current = '';
    } else {
      current += char;
    }
    i++;
  }

  values.push(current.trim().replace(/^"|"$/g, ''));
  return values;
}

/**
 * Fetch and parse CSV from URL
 */
export async function fetchCSV(url: string): Promise<CSVRow[]> {
  console.log('Fetching CSV from:', url);
  const response = await fetch(url);
  console.log('CSV fetch response:', response.status, response.statusText);
  if (!response.ok) {
    throw new Error(`Failed to fetch CSV from ${url}: ${response.status} ${response.statusText}`);
  }
  const text = await response.text();
  console.log('CSV text length:', text.length);
  const parsed = parseCSV(text);
  console.log('Parsed CSV rows:', parsed.length);
  return parsed;
}

/**
 * Convert CSV string value to number, handling empty strings
 */
export function toNumber(value: string | undefined): number {
  if (!value || value === '') return 0;
  const num = parseFloat(value);
  return isNaN(num) ? 0 : num;
}

/**
 * Convert CSV string value to integer
 */
export function toInt(value: string | undefined): number {
  if (!value || value === '') return 0;
  const num = parseInt(value, 10);
  return isNaN(num) ? 0 : num;
}

/**
 * Parse JSON string from CSV field, with fallback
 */
export function parseJSONField<T>(value: string | undefined, fallback: T): T {
  if (!value || value === '') return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

