/**
 * LIS Amendment Category Classifier
 * 
 * Classifies LIS amendments into spending categories based on title/description keywords.
 * Uses the same category taxonomy as Amendment Vault for consistency.
 */

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

/**
 * Classify an amendment into a spending category based on its title
 * 
 * @param title - Amendment title from LIS (e.g., "HB 2173: Campaign Finance Reporting")
 * @returns Spending category ID
 */
export function classifyAmendmentCategory(title: string): SpendingCategoryId {
  const text = title.toLowerCase().trim();

  // K-12 Education
  if (
    text.includes('department of education') ||
    text.includes('public education') ||
    text.includes('k-12') ||
    text.includes('k12') ||
    text.includes('elementary') ||
    text.includes('secondary school') ||
    text.includes('public school') ||
    text.includes('school division') ||
    text.includes('standards of quality') ||
    text.includes('soq')
  ) {
    return 'k12_education';
  }

  // Higher Education
  if (
    text.includes('higher education') ||
    text.includes('college') ||
    text.includes('university') ||
    text.includes('community college') ||
    text.includes('schev') ||
    text.includes('state council of higher') ||
    text.includes('vcu') ||
    text.includes('uva') ||
    text.includes('virginia tech') ||
    text.includes('vt ')
  ) {
    return 'higher_education';
  }

  // Health & Human Resources
  if (
    text.includes('health') ||
    text.includes('hospital') ||
    text.includes('medical') ||
    text.includes('medicaid') ||
    text.includes('dmas') ||
    text.includes('behavioral health') ||
    text.includes('mental health') ||
    text.includes('social services') ||
    text.includes('aging') ||
    text.includes('disability') ||
    text.includes('human services') ||
    text.includes('human resources') ||
    text.includes('child care') ||
    text.includes('childcare') ||
    text.includes('nursing')
  ) {
    return 'health_and_human_resources';
  }

  // Public Safety & Homeland Security
  if (
    text.includes('police') ||
    text.includes('corrections') ||
    text.includes('criminal justice') ||
    text.includes('emergency management') ||
    text.includes('homeland security') ||
    text.includes('fire') ||
    text.includes('public safety') ||
    text.includes('law enforcement') ||
    text.includes('sheriff') ||
    text.includes('jail') ||
    text.includes('prison')
  ) {
    return 'public_safety_and_homeland_security';
  }

  // Transportation
  if (
    text.includes('transportation') ||
    text.includes('vdot') ||
    text.includes('highway') ||
    text.includes('transit') ||
    text.includes('rail') ||
    text.includes('aviation') ||
    text.includes('motor vehicle') ||
    text.includes('dmv') ||
    text.includes('road') ||
    text.includes('bridge')
  ) {
    return 'transportation';
  }

  // Natural Resources
  if (
    text.includes('environmental') ||
    text.includes('conservation') ||
    text.includes('wildlife') ||
    text.includes('marine resources') ||
    text.includes('forestry') ||
    text.includes('parks') ||
    text.includes('historic resources') ||
    text.includes('deq') ||
    text.includes('dcr') ||
    text.includes('water quality') ||
    text.includes('chesapeake bay')
  ) {
    return 'natural_resources';
  }

  // Commerce & Trade
  if (
    text.includes('commerce') ||
    text.includes('trade') ||
    text.includes('economic development') ||
    text.includes('business') ||
    text.includes('tourism') ||
    text.includes('labor') ||
    text.includes('workforce')
  ) {
    return 'commerce_and_trade';
  }

  // Agriculture & Forestry
  if (
    text.includes('agriculture') ||
    text.includes('farming') ||
    text.includes('vdacs') ||
    text.includes('farm') ||
    text.includes('crop')
  ) {
    return 'agriculture_and_forestry';
  }

  // Veterans & Defense Affairs
  if (
    text.includes('veteran') ||
    text.includes('military') ||
    text.includes('defense') ||
    text.includes('national guard')
  ) {
    return 'veterans_and_defense_affairs';
  }

  // Judicial
  if (
    text.includes('court') ||
    text.includes('judicial') ||
    text.includes('supreme court') ||
    text.includes('magistrate') ||
    text.includes('judge') ||
    text.includes('judiciary')
  ) {
    return 'judicial';
  }

  // Legislative
  if (
    text.includes('general assembly') ||
    text.includes('house of delegates') ||
    text.includes('senate of virginia') ||
    text.includes('legislative') ||
    text.includes('campaign finance')
  ) {
    return 'legislative';
  }

  // Administration
  if (
    text.includes('administration') ||
    text.includes('secretary of') ||
    text.includes('governor') ||
    text.includes('lieutenant governor') ||
    text.includes('attorney general')
  ) {
    return 'administration';
  }

  // Finance
  if (
    text.includes('finance') ||
    text.includes('treasury') ||
    text.includes('taxation') ||
    text.includes('revenue') ||
    text.includes('comptroller')
  ) {
    return 'finance';
  }

  // Central Appropriations
  if (
    text.includes('central appropriations') ||
    text.includes('employee benefits') ||
    text.includes('retirement') ||
    text.includes('vrs')
  ) {
    return 'central_appropriations';
  }

  // Capital Outlay
  if (
    text.includes('capital outlay') ||
    text.includes('capital project') ||
    text.includes('construction') ||
    text.includes('renovation') ||
    text.includes('facility')
  ) {
    return 'capital_outlay';
  }

  // Independent Agencies (Virginia's Independent Branch - INB)
  // Only classify as independent_agencies if explicitly matches known Independent Branch entities
  if (
    text.includes('virginia lottery') ||
    text.includes('lottery') ||
    text.includes('alcoholic beverage control') ||
    text.includes('abc board') ||
    text.includes('state corporation commission') ||
    text.includes('scc') ||
    text.includes('virginia retirement system') ||
    text.includes('vrs') ||
    text.includes('workers\' compensation commission') ||
    text.includes('workers compensation commission') ||
    text.includes('cannabis control authority') ||
    text.includes('opioid abatement authority') ||
    text.includes('commonwealth savers')
  ) {
    return 'independent_agencies';
  }

  // Default fallback: Unclassified
  // This indicates the amendment title doesn't match any category keywords
  // and should be manually reviewed or have keywords added
  return 'unclassified';
}


