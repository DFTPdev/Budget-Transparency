# LIS Member Requests Scraper

Fetches and parses Member Request amendment data from the Virginia LIS website for integration with the Spotlight Map legislator cards.

## Overview

This scraper:
- Fetches Member Request pages from `budget.lis.virginia.gov` for 2024 (HB30) and 2025 (HB1600)
- Parses amendment tables to extract item numbers, titles, and dollar amounts
- Outputs JSON files compatible with the `LegislatorCardData` interface
- Generates both data/ and frontend/src/data/ copies for easy integration

## Usage

1. **Install dependencies:**
   ```bash
   cd scripts/lis_member_requests
   npm install
   ```

2. **Configure legislators:**
   Edit `lis_members.json` to add/remove legislators. Each entry needs:
   - `id`: LIS member code (e.g., "H336" for House member 336)
   - `fullName`: Full name with middle initial
   - `lastName`: Last name only
   - `chamber`: "House" or "Senate"
   - `district`: District number as string
   - `party`: "D", "R", "I", or "Other"

3. **Run the scraper:**
   ```bash
   npm run scrape
   ```

4. **Output files:**
   - `data/lis_member_requests_2024.json`
   - `data/lis_member_requests_2025.json`
   - `frontend/src/data/lis_member_requests_2024.json`
   - `frontend/src/data/lis_member_requests_2025.json`

## Data Format

Each JSON file is keyed by LIS member ID (e.g., "H336") and contains:

```typescript
{
  "H336": {
    "id": "H336",
    "fullName": "Nadarius E. Clark",
    "lastName": "Clark",
    "chamber": "House",
    "district": "84",
    "party": "D",
    "profileUrl": "https://budget.lis.virginia.gov/mbramendment/2025/1/H336",
    "amendments": {
      "HB1600": {
        "MR": {
          "totals": {
            "count": 11,
            "languageOnlyCount": 0,
            "fyFirstTotal": 0,
            "fySecondTotal": 135353188,
            "largestAmendment": { ... }
          },
          "items": [ ... ],
          "featured": [ ... ]
        }
      }
    },
    "display": {
      "headline": "11 member requests • $135.4M second-year"
    },
    "updatedAt": "2025-11-21T15:00:00Z"
  }
}
```

## Notes

- The scraper adds a 750ms delay between requests to avoid overloading the LIS server
- Empty or missing pages are handled gracefully (returns empty amendments array)
- Currency parsing handles $, commas, parentheses (negative), and em-dashes (null)

