/**
 * Patron Name Mapping
 * 
 * Maps legislator names from the Spotlight Map to patron names used in
 * Amendment Vault records (from LIS Member Request PDFs).
 * 
 * This is needed because:
 * - Spotlight Map uses full names: "Creigh Deeds"
 * - Amendment PDFs use short forms: "Deeds"
 */

/**
 * Mapping from LIS patron short-form to full legislator name
 * 
 * TODO: Expand this mapping as we discover more name variations
 * This is a seed list based on top patrons from 2025 session
 */
export const PATRON_NAME_MAP: Record<string, string> = {
  // Top patrons from 2025 Member Requests
  "Deeds": "Creigh Deeds",
  "Locke": "Locke",
  "Favola": "Barbara Favola",
  "Sickles": "Mark Sickles",
  "Hashmi": "Ghazala Hashmi",
  "Boysko": "Jennifer Boysko",
  "Willett": "Willett",
  "Carr": "Betsy Carr",
  "Williams Graves": "Angela Williams Graves",
  "Surovell": "Scott Surovell",
  "Cole J.": "Joshua G. Cole",
  "Reid": "Reid",
  "Coyner": "Coyner",
  "Krizek": "Paul Krizek",
  "Jordan": "Jordan",
  "Ballard": "Ballard",
  "Thomas": "Josh Thomas",

  // TODO: Add more mappings as needed
  // Pattern: "LastName" -> "FirstName LastName"
};

/**
 * Normalize a name for case-insensitive matching
 * Removes prefixes like "Del." and "Sen.", trims whitespace
 */
function normalizeName(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/^del\.\s+/i, "")
    .replace(/^sen\.\s+/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Map a legislator name (from Spotlight Map) to a patron name (for Amendment Vault)
 * 
 * This function attempts to match the legislator's name to a known patron name
 * from the PATRON_NAME_MAP. If no match is found, it returns the original name.
 * 
 * @param legislatorName - Full name from Spotlight Map (e.g., "Creigh Deeds")
 * @returns Patron name for Amendment Vault matching (e.g., "Deeds")
 * 
 * @example
 * mapLegislatorToPatronName("Creigh Deeds") // => "Deeds"
 * mapLegislatorToPatronName("Ghazala Hashmi") // => "Hashmi"
 * mapLegislatorToPatronName("Unknown Person") // => "Unknown Person"
 */
export function mapLegislatorToPatronName(legislatorName: string): string {
  const normalized = normalizeName(legislatorName);

  // First try direct mapping from LIS-short-form keys
  for (const [patronKey, fullName] of Object.entries(PATRON_NAME_MAP)) {
    const normalizedKey = normalizeName(patronKey);
    const normalizedFull = normalizeName(fullName);

    // Match either the short form or the full name
    if (normalized === normalizedKey || normalized === normalizedFull) {
      return patronKey; // Return the LIS-style name used in AmendmentVaultRecord.patronName
    }
  }

  // Fallback: try to extract last name from legislator name
  // Pattern: "FirstName LastName" -> "LastName"
  // Handle suffixes like "Jr.", "Sr.", "III", etc.
  const parts = legislatorName.trim().split(/\s+/);
  if (parts.length >= 2) {
    let lastName = parts[parts.length - 1];

    // If last part is a suffix (Jr., Sr., III, etc.), go back one more part
    if (lastName.match(/^(Jr\.?|Sr\.?|III|II|IV|V)$/i)) {
      if (parts.length >= 3) {
        lastName = parts[parts.length - 2];
      }
    }

    // Remove trailing comma (e.g., "Wright," -> "Wright")
    lastName = lastName.replace(/,$/g, '');

    // Check if this last name matches any patron key
    for (const patronKey of Object.keys(PATRON_NAME_MAP)) {
      if (normalizeName(patronKey) === normalizeName(lastName)) {
        return patronKey;
      }
    }

    // If no match, return the last name as best guess
    return lastName;
  }

  // Ultimate fallback: use the original name
  return legislatorName;
}

