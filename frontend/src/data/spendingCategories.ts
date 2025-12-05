export type SpendingCategoryId =
  | "k12_education"
  | "higher_education"
  | "health_and_human_resources"
  | "public_safety_and_homeland_security"
  | "transportation"
  | "natural_resources"
  | "commerce_and_trade"
  | "agriculture_and_forestry"
  | "veterans_and_defense_affairs"
  | "administration"
  | "finance"
  | "judicial"
  | "legislative"
  | "central_appropriations"
  | "independent_agencies"
  | "capital_outlay"
  | "unclassified";

export interface SpendingCategory {
  id: SpendingCategoryId;
  label: string;
  shortLabel: string; // for legends/tooltips
}

export const SPENDING_CATEGORIES: SpendingCategory[] = [
  {
    id: "k12_education",
    label: "K-12 Education",
    shortLabel: "K-12",
  },
  {
    id: "higher_education",
    label: "Higher Education",
    shortLabel: "Higher Ed",
  },
  {
    id: "health_and_human_resources",
    label: "Health & Human Resources",
    shortLabel: "Health & HHR",
  },
  {
    id: "public_safety_and_homeland_security",
    label: "Public Safety & Homeland Security",
    shortLabel: "Public Safety",
  },
  {
    id: "transportation",
    label: "Transportation",
    shortLabel: "Transportation",
  },
  {
    id: "natural_resources",
    label: "Natural Resources",
    shortLabel: "Natural Resources",
  },
  {
    id: "commerce_and_trade",
    label: "Commerce & Trade",
    shortLabel: "Commerce & Trade",
  },
  {
    id: "agriculture_and_forestry",
    label: "Agriculture & Forestry",
    shortLabel: "Ag & Forestry",
  },
  {
    id: "veterans_and_defense_affairs",
    label: "Veterans & Defense Affairs",
    shortLabel: "Veterans",
  },
  {
    id: "administration",
    label: "Administration",
    shortLabel: "Administration",
  },
  {
    id: "finance",
    label: "Finance",
    shortLabel: "Finance",
  },
  {
    id: "judicial",
    label: "Judicial",
    shortLabel: "Judicial",
  },
  {
    id: "legislative",
    label: "Legislative",
    shortLabel: "Legislative",
  },
  {
    id: "central_appropriations",
    label: "Central Appropriations",
    shortLabel: "Central Approp.",
  },
  {
    id: "independent_agencies",
    label: "Independent Agencies",
    shortLabel: "Independent",
  },
  {
    id: "capital_outlay",
    label: "Capital Outlay",
    shortLabel: "Capital Outlay",
  },
  {
    id: "unclassified",
    label: "Unclassified",
    shortLabel: "Unclassified",
  },
];

export function getSpendingCategoryById(id: SpendingCategoryId): SpendingCategory {
  const found = SPENDING_CATEGORIES.find((c) => c.id === id);
  if (!found) {
    throw new Error(`Unknown spending category: ${id}`);
  }
  return found;
}

