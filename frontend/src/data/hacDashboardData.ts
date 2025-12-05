/**
 * HAC Budget Dashboard Data
 *
 * Generated from HAC summary PDFs:
 * - Pre-session: "hac 2025 pre-session summary document - print.pdf"
 * - Post-session: "hac 2025 post session summary document 5-19-25.pdf"
 *
 * Data Sources:
 * - Pre-session PDF p.3: GF resources ($68.5B introduced), biennial budget ($175.3B)
 * - Post-session PDF p.3: Final GF resources ($69.5B), Chapter 725 total ($176.8B)
 * - Pre-session PDF p.4: Revenue composition by source
 * - Pre-session PDF p.5-6: GF spending by function
 * - Throughout: One-time vs ongoing items
 *
 * Last updated: 2025-11-22
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface HacGlobalMetrics {
  totalBiennialBudgetAllFunds: number; // Billions (final Chapter 725)
  totalBiennialGeneralFundResources: number; // Billions (final)
  newGeneralFundSpendingProposed: number; // Billions (above Chapter 2)
  k12AndHhrShareOfGfOperating: number; // Percentage of GF operating budget
}

export interface HacFunctionShare {
  id: string; // "k12", "hhr", "higherEd", "publicSafety", "other"
  label: string; // "K-12 Education"
  sharePercent: number; // Share of GF operating budget, 0–100
}

export interface HacRevenueSource {
  id: string; // "individualIncome", "salesUse", etc.
  label: string; // "Individual Income Tax"
  sharePercent: number; // Share of total GF revenues, 0–100
}

export interface HacSpendingItem {
  id: string;
  label: string;
  amountMillions: number; // Dollar amount in millions
}

export interface HacBudgetSnapshot {
  label: string;
  gfResources: number; // Billions
  totalAllFunds: number; // Billions
  highlights: string[];
  gfByFunction: HacFunctionShare[]; // Spending breakdown by function
}

export interface HacImpactCard {
  id: string;
  title: string;
  summary: string;
  bullets: string[];
  sourceNote: string;
}

export interface HacDashboardData {
  globalMetrics: HacGlobalMetrics;
  introduced: HacBudgetSnapshot;
  final: HacBudgetSnapshot;
  gfRevenueComposition: HacRevenueSource[];
  oneTimeInvestments: HacSpendingItem[];
  ongoingCommitments: HacSpendingItem[];
  impactCards: HacImpactCard[];
}

// ============================================================================
// DASHBOARD DATA
// ============================================================================

export const hacDashboardData: HacDashboardData = {
  // Global metrics (final budget - Chapter 725)
  globalMetrics: {
    totalBiennialBudgetAllFunds: 176.8, // Post-session PDF p.3
    totalBiennialGeneralFundResources: 69.5, // Post-session PDF p.3
    newGeneralFundSpendingProposed: 3.9, // Post-session PDF p.3-4
    k12AndHhrShareOfGfOperating: 61, // Both PDFs
  },

  // Introduced Budget (HB1600) - Governor's proposal
  introduced: {
    label: "Introduced Budget",
    gfResources: 68.5, // Pre-session PDF p.3
    totalAllFunds: 175.3, // Pre-session PDF p.3
    highlights: [
      "Large teacher bonus package and salary increases",
      "Medicaid rate increases and children's coverage expansion",
      "Car tax relief and tax policy adjustments",
    ],
    gfByFunction: [
          {
                "id": "k12",
                "label": "K-12 Education",
                "sharePercent": 31
          },
          {
                "id": "hhr",
                "label": "Health & Human Resources",
                "sharePercent": 30
          },
          {
                "id": "higherEd",
                "label": "Higher Education",
                "sharePercent": 15
          },
          {
                "id": "publicSafety",
                "label": "Public Safety & Corrections",
                "sharePercent": 12
          },
          {
                "id": "other",
                "label": "All Other Functions",
                "sharePercent": 12
          }
    ],
  },

  // Final Budget (Chapter 725) - Adopted May 2025
  final: {
    label: "Final Budget",
    gfResources: 69.5, // Post-session PDF p.3
    totalAllFunds: 176.8, // Post-session PDF p.3
    highlights: [
      "Enhanced HHR funding with additional investments",
      "Unappropriated GF balance of $450M for future needs",
      "Governor vetoed $130M in spending items",
    ],
    gfByFunction: [
          {
                "id": "k12",
                "label": "K-12 Education",
                "sharePercent": 30
          },
          {
                "id": "hhr",
                "label": "Health & Human Resources",
                "sharePercent": 31
          },
          {
                "id": "higherEd",
                "label": "Higher Education",
                "sharePercent": 15
          },
          {
                "id": "publicSafety",
                "label": "Public Safety & Corrections",
                "sharePercent": 12
          },
          {
                "id": "other",
                "label": "All Other Functions",
                "sharePercent": 12
          }
    ],
  },

  // GF Revenue Composition (where the money comes from)
  // Source: Pre-session PDF p.4, Post-session PDF p.14
  gfRevenueComposition: [
      {
          "id": "individualIncome",
          "label": "Individual Income Tax",
          "sharePercent": 62
      },
      {
          "id": "salesUse",
          "label": "Sales & Use Tax",
          "sharePercent": 18
      },
      {
          "id": "corporateIncome",
          "label": "Corporate Income Tax",
          "sharePercent": 6
      },
      {
          "id": "insurance",
          "label": "Insurance Premiums Tax",
          "sharePercent": 3
      },
      {
          "id": "willsSuitsDeeds",
          "label": "Wills, Suits & Deeds",
          "sharePercent": 2
      },
      {
          "id": "transfers",
          "label": "Transfers & Other",
          "sharePercent": 9
      }
  ],

  // One-time GF investments (do not automatically repeat)
  // Source: Throughout both PDFs
  oneTimeInvestments: [
      {
          "id": "carTaxRebates",
          "label": "Car tax rebates (one-time relief)",
          "amountMillions": 950
      },
      {
          "id": "revenueReserve",
          "label": "Revenue reserve deposit",
          "amountMillions": 450
      },
      {
          "id": "teacherBonus",
          "label": "Teacher bonus payments",
          "amountMillions": 400
      },
      {
          "id": "i81Improvements",
          "label": "I-81 corridor improvements",
          "amountMillions": 300
      },
      {
          "id": "taxSystemUpgrade",
          "label": "Tax system technology upgrade",
          "amountMillions": 150
      },
      {
          "id": "employeeBonuses",
          "label": "State employee bonuses",
          "amountMillions": 120
      }
  ],

  // Ongoing GF commitments (baked into future budgets)
  // Source: Throughout both PDFs
  ongoingCommitments: [
      {
          "id": "medicaidInflation",
          "label": "Medicaid inflation & utilization growth",
          "amountMillions": 800
      },
      {
          "id": "k12SupportCap",
          "label": "Removing K-12 support cap",
          "amountMillions": 500
      },
      {
          "id": "specialEdAddon",
          "label": "Special education add-on funding",
          "amountMillions": 300
      },
      {
          "id": "teacherSalaryPath",
          "label": "Teacher salary scale adjustments",
          "amountMillions": 250
      },
      {
          "id": "mentalHealthServices",
          "label": "Behavioral health crisis services",
          "amountMillions": 200
      },
      {
          "id": "childCareSubsidies",
          "label": "Child care subsidy expansion",
          "amountMillions": 150
      }
  ],

  // Impact cards - thematic highlights (POST-SESSION ONLY)
  // Source: HAC 2025 Post-session Summary (Chapter 725, May 19, 2025)
  impactCards: [
      {
          "id": "taxes",
          "title": "Taxes & Take-Home Pay",
          "summary": "Final tax changes affecting Virginia families and businesses",
          "bullets": [
              "Standard deduction increased to $8,750 (single) / $17,500 (married) for tax years 2025-2026",
              "Earned Income Tax Credit refundability increased from 15% to 20% of federal EITC",
              "Estimated tax payment threshold raised from $150 to $1,000 (effective Jan 1, 2026)",
              "One-time tax rebate of $200 (single filers) / $400 (married filers) paid by October 15, 2025"
          ],
          "sourceNote": "HAC 2025 Post-session Summary, pp. 5-6, 32"
      },
      {
          "id": "health",
          "title": "Health & Coverage",
          "summary": "Final budget changes to Medicaid and health services",
          "bullets": [
              "Medicaid forecast funded with $601.8M over biennium to address utilization and inflation",
              "Children's health insurance programs (FAMIS and M-CHIP) funded with $88.3M over biennium",
              "Children's Services Act (CSA) caseload increases funded with $100.3M over biennium",
              "$35.2M provided for private hospitals to employ special conservators of peace for custody orders",
              "$25M in grants to localities for drinking water infrastructure upgrades"
          ],
          "sourceNote": "HAC 2025 Post-session Summary, pp. 8-9, 34-46"
      },
      {
          "id": "schools",
          "title": "Schools & Students",
          "summary": "Final budget changes to K-12 funding and teacher compensation",
          "bullets": [
              "$1,000 one-time bonus for all state-recognized instructional and support staff (no local match required)",
              "Support cap eliminated with $222.9M to increase support positions from 24.0 to 27.89 per 1,000 students",
              "Special education add-on established: 4.75% for Level I students, 5.25% for Level II students ($52.8M)",
              "English Learner support increased by $110.7M over biennium for students requiring intense support",
              "School construction grants increased from $160M to $360M over biennium"
          ],
          "sourceNote": "HAC 2025 Post-session Summary, pp. 9, 26-30"
      },
      {
          "id": "infrastructure",
          "title": "Infrastructure & Capital",
          "summary": "Final capital investments and one-time projects",
          "bullets": [
              "I-81 corridor improvement program funded with $175M in general funds",
              "Total capital outlay of $351.9M authorized (after Governor vetoes)",
              "New state revenue management system funded with $131M for five-year replacement project",
              "$50M for Richmond Combined Sewer Overflow project",
              "$50M for Southwest Virginia flood relief and disaster recovery (Hurricane Helene)"
          ],
          "sourceNote": "HAC 2025 Post-session Summary, pp. 11-12, 32-33, 47, 52, 60-63"
      }
  ],
};
