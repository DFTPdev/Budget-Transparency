/**
 * Amendment Vault - Spending Category Mapping
 * 
 * Maps agency names and secretariat codes to canonical spending categories.
 * This module is shared between the PDF parser and frontend aggregation logic.
 */

import type { SpendingCategoryId } from '../../frontend/src/data/spendingCategories';

// ----------------------------------------------------------------------

/**
 * Map agency name or secretariat code to spending category ID
 * 
 * This is a heuristic-based mapping that can be refined over time.
 * Priority: secretariat code > agency name keywords
 */
export function mapToSpendingCategory(
  agencyName?: string,
  secretariatCode?: string
): SpendingCategoryId {
  const agency = (agencyName || '').toLowerCase().trim();
  const secretariat = (secretariatCode || '').toLowerCase().trim();

  // ===== Secretariat-based mapping (most reliable) =====
  if (secretariat) {
    // Secretariat Code 11 = Independent Agencies (Virginia's Independent Branch - INB)
    // This is the official DPB classification for Independent Branch entities
    if (secretariat === '11' || secretariat.includes('independent')) {
      return 'independent_agencies';
    }

    if (secretariat.includes('education')) {
      // Distinguish K-12 vs Higher Ed
      if (agency.includes('higher') || agency.includes('college') || agency.includes('university')) {
        return 'higher_education';
      }
      return 'k12_education';
    }
    if (secretariat.includes('health')) return 'health_and_human_resources';
    if (secretariat.includes('public safety') || secretariat.includes('homeland')) return 'public_safety_and_homeland_security';
    if (secretariat.includes('transportation')) return 'transportation';
    if (secretariat.includes('natural resource') || secretariat.includes('environment')) return 'natural_resources';
    if (secretariat.includes('commerce') || secretariat.includes('trade')) return 'commerce_and_trade';
    if (secretariat.includes('agriculture') || secretariat.includes('forestry')) return 'agriculture_and_forestry';
    if (secretariat.includes('veteran') || secretariat.includes('defense')) return 'veterans_and_defense_affairs';
    if (secretariat.includes('administration')) return 'administration';
    if (secretariat.includes('finance')) return 'finance';
  }

  // ===== Agency name keyword mapping =====
  
  // K-12 Education
  if (
    agency.includes('department of education') ||
    agency.includes('public education') ||
    agency.includes('k-12') ||
    agency.includes('k12') ||
    agency.includes('elementary') ||
    agency.includes('secondary school')
  ) {
    return 'k12_education';
  }

  // Higher Education
  if (
    agency.includes('higher education') ||
    agency.includes('college') ||
    agency.includes('university') ||
    agency.includes('community college') ||
    agency.includes('schev') ||
    agency.includes('state council of higher')
  ) {
    return 'higher_education';
  }

  // Health & Human Resources
  if (
    agency.includes('health') ||
    agency.includes('human services') ||
    agency.includes('human resources') ||
    agency.includes('medicaid') ||
    agency.includes('dmas') ||
    agency.includes('behavioral health') ||
    agency.includes('mental health') ||
    agency.includes('social services') ||
    agency.includes('aging') ||
    agency.includes('disability')
  ) {
    return 'health_and_human_resources';
  }

  // Public Safety & Homeland Security
  if (
    agency.includes('police') ||
    agency.includes('corrections') ||
    agency.includes('criminal justice') ||
    agency.includes('emergency management') ||
    agency.includes('homeland security') ||
    agency.includes('fire') ||
    agency.includes('public safety')
  ) {
    return 'public_safety_and_homeland_security';
  }

  // Transportation
  if (
    agency.includes('transportation') ||
    agency.includes('vdot') ||
    agency.includes('highway') ||
    agency.includes('transit') ||
    agency.includes('rail') ||
    agency.includes('aviation') ||
    agency.includes('motor vehicle')
  ) {
    return 'transportation';
  }

  // Natural Resources
  if (
    agency.includes('environmental') ||
    agency.includes('conservation') ||
    agency.includes('wildlife') ||
    agency.includes('marine resources') ||
    agency.includes('forestry') ||
    agency.includes('parks') ||
    agency.includes('historic resources') ||
    agency.includes('deq') ||
    agency.includes('dcr')
  ) {
    return 'natural_resources';
  }

  // Commerce & Trade
  if (
    agency.includes('commerce') ||
    agency.includes('trade') ||
    agency.includes('economic development') ||
    agency.includes('business') ||
    agency.includes('tourism') ||
    agency.includes('labor')
  ) {
    return 'commerce_and_trade';
  }

  // Agriculture & Forestry
  if (
    agency.includes('agriculture') ||
    agency.includes('farming') ||
    agency.includes('vdacs')
  ) {
    return 'agriculture_and_forestry';
  }

  // Veterans & Defense Affairs
  if (
    agency.includes('veteran') ||
    agency.includes('military') ||
    agency.includes('defense')
  ) {
    return 'veterans_and_defense_affairs';
  }

  // Judicial
  if (
    agency.includes('court') ||
    agency.includes('judicial') ||
    agency.includes('supreme court') ||
    agency.includes('magistrate')
  ) {
    return 'judicial';
  }

  // Legislative
  if (
    agency.includes('general assembly') ||
    agency.includes('house of delegates') ||
    agency.includes('senate of virginia') ||
    agency.includes('legislative')
  ) {
    return 'legislative';
  }

  // Independent Agencies (Virginia's Independent Branch - INB)
  // Only classify as independent_agencies if explicitly matches known Independent Branch entities
  if (
    agency.includes('virginia lottery') ||
    agency.includes('lottery') ||
    agency.includes('alcoholic beverage control') ||
    agency.includes('abc') ||
    agency.includes('state corporation commission') ||
    agency.includes('workers\' compensation commission') ||
    agency.includes('workers compensation commission') ||
    agency.includes('cannabis control authority') ||
    agency.includes('opioid abatement authority') ||
    agency.includes('commonwealth savers')
  ) {
    return 'independent_agencies';
  }

  // Default fallback: Unclassified
  // This indicates the agency doesn't match any category keywords
  return 'unclassified';
}

