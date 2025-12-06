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

  // Remove "HB/SB ####:" prefix for better keyword matching
  // Many amendments are titled like "HB 1234: Description" where Description has the keywords
  const textWithoutBillPrefix = text.replace(/^(hb|sb)\s*\d+\s*[:\-]\s*/i, '');

  // Higher Education (check BEFORE K-12 to avoid false matches)
  // Virginia public universities and colleges
  if (
    textWithoutBillPrefix.includes('higher education') ||
    textWithoutBillPrefix.includes('community college') ||
    textWithoutBillPrefix.includes('schev') ||
    textWithoutBillPrefix.includes('state council of higher') ||
    // Virginia public universities (use word boundaries to avoid false matches)
    textWithoutBillPrefix.match(/\b(vcu|virginia commonwealth)\b/) ||
    textWithoutBillPrefix.match(/\b(uva|u\.?va\.?|university of virginia|uva-wise)\b/) ||
    textWithoutBillPrefix.match(/\b(virginia tech|vt:|vt-|vpi)\b/) ||
    textWithoutBillPrefix.match(/\b(w&m|cwm|william and mary|william & mary)\b/) ||
    textWithoutBillPrefix.match(/\b(gmu|george mason)\b/) ||
    textWithoutBillPrefix.match(/\b(jmu|james madison)\b/) ||
    textWithoutBillPrefix.match(/\b(odu|old dominion)\b/) ||
    textWithoutBillPrefix.match(/\b(vmi|virginia military institute)\b/) ||
    textWithoutBillPrefix.match(/\b(radford|longwood|christopher newport|cnu)\b/) ||
    textWithoutBillPrefix.match(/\b(norfolk state|nsu|virginia state|vsu)\b/) ||
    textWithoutBillPrefix.match(/\b(vccs|virginia community college)\b/) ||
    textWithoutBillPrefix.match(/\b(college|university)\b/) && !textWithoutBillPrefix.includes('school')
  ) {
    return 'higher_education';
  }

  // K-12 Education
  if (
    textWithoutBillPrefix.includes('department of education') ||
    textWithoutBillPrefix.includes('public education') ||
    textWithoutBillPrefix.includes('early childhood education') ||
    textWithoutBillPrefix.includes('k-12') ||
    textWithoutBillPrefix.includes('k12') ||
    textWithoutBillPrefix.includes('elementary') ||
    textWithoutBillPrefix.includes('secondary school') ||
    textWithoutBillPrefix.includes('public school') ||
    textWithoutBillPrefix.includes('school division') ||
    textWithoutBillPrefix.includes('standards of quality') ||
    textWithoutBillPrefix.includes('soq') ||
    textWithoutBillPrefix.match(/\bdoe\b/) && (textWithoutBillPrefix.includes('school') || textWithoutBillPrefix.includes('education')) ||
    textWithoutBillPrefix.includes('school resource officer') ||
    textWithoutBillPrefix.includes('school safety') ||
    textWithoutBillPrefix.includes('restorative school') ||
    textWithoutBillPrefix.includes('teacher') ||
    textWithoutBillPrefix.includes('student') && textWithoutBillPrefix.includes('school') ||
    textWithoutBillPrefix.includes('education of incarcerated')
  ) {
    return 'k12_education';
  }

  // Health & Human Resources
  if (
    textWithoutBillPrefix.includes('health') ||
    textWithoutBillPrefix.includes('hospital') ||
    textWithoutBillPrefix.includes('medical') ||
    textWithoutBillPrefix.includes('medicaid') ||
    textWithoutBillPrefix.includes('medicare') ||
    textWithoutBillPrefix.includes('dmas') ||
    textWithoutBillPrefix.includes('behavioral health') ||
    textWithoutBillPrefix.includes('mental health') ||
    textWithoutBillPrefix.includes('mental') && textWithoutBillPrefix.includes('treatment') ||
    textWithoutBillPrefix.includes('substance abuse') ||
    textWithoutBillPrefix.includes('addiction') ||
    textWithoutBillPrefix.includes('social services') ||
    textWithoutBillPrefix.includes('aging') ||
    textWithoutBillPrefix.includes('disability') ||
    textWithoutBillPrefix.includes('human services') ||
    textWithoutBillPrefix.includes('human resources') ||
    textWithoutBillPrefix.includes('child care') ||
    textWithoutBillPrefix.includes('childcare') ||
    textWithoutBillPrefix.includes('child advocacy') ||
    textWithoutBillPrefix.includes('nursing') ||
    textWithoutBillPrefix.includes('clinic') ||
    textWithoutBillPrefix.includes('homeless') ||
    textWithoutBillPrefix.includes('housing') && (textWithoutBillPrefix.includes('affordable') || textWithoutBillPrefix.includes('supportive') || textWithoutBillPrefix.includes('trust fund')) ||
    textWithoutBillPrefix.includes('shelter') ||
    textWithoutBillPrefix.includes('food bank') ||
    textWithoutBillPrefix.includes('community action') ||
    textWithoutBillPrefix.includes('continuum of care') ||
    textWithoutBillPrefix.includes('treatment program') ||
    textWithoutBillPrefix.includes('gambling treatment') ||
    textWithoutBillPrefix.includes('pregnant') && textWithoutBillPrefix.includes('eligibility') ||
    textWithoutBillPrefix.includes('perinatal') ||
    textWithoutBillPrefix.includes('postpartum') ||
    textWithoutBillPrefix.includes('autism') ||
    textWithoutBillPrefix.includes('pediatric') ||
    textWithoutBillPrefix.includes('physician loan repayment') ||
    textWithoutBillPrefix.includes('supported living') ||
    textWithoutBillPrefix.includes('waiver') && textWithoutBillPrefix.includes('services') ||
    textWithoutBillPrefix.includes('csb') || // Community Services Boards
    textWithoutBillPrefix.includes('family services') ||
    textWithoutBillPrefix.includes('competency restoration') ||
    textWithoutBillPrefix.includes('marcus alert')
  ) {
    return 'health_and_human_resources';
  }

  // Public Safety & Homeland Security
  if (
    textWithoutBillPrefix.includes('police') ||
    textWithoutBillPrefix.includes('corrections') ||
    textWithoutBillPrefix.includes('cor -') || // Department of Corrections abbreviation
    textWithoutBillPrefix.includes('criminal justice') ||
    textWithoutBillPrefix.includes('emergency management') ||
    textWithoutBillPrefix.includes('homeland security') ||
    textWithoutBillPrefix.includes('fire') ||
    textWithoutBillPrefix.includes('ems') && !textWithoutBillPrefix.includes('systems') ||
    textWithoutBillPrefix.includes('emergency medical') ||
    textWithoutBillPrefix.includes('emergency training') ||
    textWithoutBillPrefix.includes('first aid equipment') ||
    textWithoutBillPrefix.includes('public safety') ||
    textWithoutBillPrefix.includes('law enforcement') ||
    textWithoutBillPrefix.includes('sheriff') ||
    textWithoutBillPrefix.includes('jail') ||
    textWithoutBillPrefix.includes('prison') ||
    textWithoutBillPrefix.includes('911') ||
    textWithoutBillPrefix.includes('crime') ||
    textWithoutBillPrefix.includes('victim') ||
    textWithoutBillPrefix.includes('assault') ||
    textWithoutBillPrefix.includes('battery') ||
    textWithoutBillPrefix.includes('theft') ||
    textWithoutBillPrefix.includes('mass violence')
  ) {
    return 'public_safety_and_homeland_security';
  }

  // Transportation
  if (
    textWithoutBillPrefix.includes('transportation') ||
    textWithoutBillPrefix.includes('vdot') ||
    textWithoutBillPrefix.includes('highway') ||
    textWithoutBillPrefix.includes('transit') ||
    textWithoutBillPrefix.includes('rail') ||
    textWithoutBillPrefix.includes('aviation') ||
    textWithoutBillPrefix.includes('motor vehicle') ||
    textWithoutBillPrefix.includes('dmv') ||
    textWithoutBillPrefix.includes('road') ||
    textWithoutBillPrefix.includes('bridge') ||
    textWithoutBillPrefix.includes('sidewalk') ||
    textWithoutBillPrefix.includes('street') && (textWithoutBillPrefix.includes('maintenance') || textWithoutBillPrefix.includes('repair')) ||
    textWithoutBillPrefix.includes('port') && textWithoutBillPrefix.includes('host') ||
    textWithoutBillPrefix.includes('ev charging') ||
    textWithoutBillPrefix.includes('electric vehicle') ||
    textWithoutBillPrefix.includes('flashing beacon') ||
    textWithoutBillPrefix.includes('traffic')
  ) {
    return 'transportation';
  }

  // Natural Resources
  if (
    textWithoutBillPrefix.includes('environmental') ||
    textWithoutBillPrefix.includes('conservation') ||
    textWithoutBillPrefix.includes('wildlife') ||
    textWithoutBillPrefix.includes('marine resources') ||
    textWithoutBillPrefix.includes('vmrc') ||
    textWithoutBillPrefix.includes('vims') ||
    textWithoutBillPrefix.includes('aquatic fauna') ||
    textWithoutBillPrefix.includes('forestry') ||
    textWithoutBillPrefix.includes('parks') ||
    textWithoutBillPrefix.includes('historic resources') ||
    textWithoutBillPrefix.includes('deq') ||
    textWithoutBillPrefix.includes('dcr') ||
    textWithoutBillPrefix.includes('water quality') ||
    textWithoutBillPrefix.includes('chesapeake bay') ||
    textWithoutBillPrefix.includes('water system') ||
    textWithoutBillPrefix.includes('wastewater') ||
    textWithoutBillPrefix.includes('sewer') ||
    textWithoutBillPrefix.includes('stormwater') ||
    textWithoutBillPrefix.includes('cyanobacteria') ||
    textWithoutBillPrefix.includes('algae bloom') ||
    textWithoutBillPrefix.includes('lake anna') && (textWithoutBillPrefix.includes('mitigation') || textWithoutBillPrefix.includes('remediation')) ||
    textWithoutBillPrefix.includes('cemetery') || // Historic African American cemeteries
    textWithoutBillPrefix.includes('graves fund') ||
    textWithoutBillPrefix.includes('solar') ||
    textWithoutBillPrefix.includes('energy') && !textWithoutBillPrefix.includes('science and engineering') ||
    textWithoutBillPrefix.includes('dredging') ||
    textWithoutBillPrefix.includes('living shoreline') ||
    textWithoutBillPrefix.includes('oyster') ||
    textWithoutBillPrefix.includes('pfas testing')
  ) {
    return 'natural_resources';
  }

  // Commerce & Trade
  if (
    textWithoutBillPrefix.includes('commerce') ||
    textWithoutBillPrefix.includes('trade') ||
    textWithoutBillPrefix.includes('economic development') ||
    textWithoutBillPrefix.includes('business') ||
    textWithoutBillPrefix.includes('tourism') ||
    textWithoutBillPrefix.includes('labor') ||
    textWithoutBillPrefix.includes('workforce') ||
    textWithoutBillPrefix.includes('employment') ||
    textWithoutBillPrefix.includes('minimum wage') ||
    textWithoutBillPrefix.includes('paid sick day') ||
    textWithoutBillPrefix.includes('training') && textWithoutBillPrefix.includes('competency') ||
    textWithoutBillPrefix.includes('excel center') ||
    textWithoutBillPrefix.includes('goodwill') ||
    textWithoutBillPrefix.includes('cyber range') ||
    textWithoutBillPrefix.includes('innovation') ||
    textWithoutBillPrefix.includes('technology') && !textWithoutBillPrefix.includes('virginia tech') ||
    textWithoutBillPrefix.includes('broadband') ||
    textWithoutBillPrefix.includes('festival') || // Economic/tourism events
    textWithoutBillPrefix.includes('foundation') && !textWithoutBillPrefix.includes('cemetery') ||
    textWithoutBillPrefix.includes('swam procurement') ||
    textWithoutBillPrefix.includes('cultural organization') ||
    textWithoutBillPrefix.includes('vca -') || // Virginia Commission for the Arts
    textWithoutBillPrefix.includes('boost!') ||
    textWithoutBillPrefix.includes('redevelopment fund')
  ) {
    return 'commerce_and_trade';
  }

  // Agriculture & Forestry
  if (
    textWithoutBillPrefix.includes('agriculture') ||
    textWithoutBillPrefix.includes('farming') ||
    textWithoutBillPrefix.includes('vdacs') ||
    textWithoutBillPrefix.includes('farm') ||
    textWithoutBillPrefix.includes('crop') ||
    textWithoutBillPrefix.match(/\bvt-ext\b/) || // VT Extension
    textWithoutBillPrefix.includes('arec') || // Agricultural Research and Extension Center
    textWithoutBillPrefix.includes('veterinarian') && textWithoutBillPrefix.includes('grant')
  ) {
    return 'agriculture_and_forestry';
  }

  // Veterans & Defense Affairs
  if (
    textWithoutBillPrefix.includes('veteran') ||
    textWithoutBillPrefix.includes('military') ||
    textWithoutBillPrefix.includes('defense') ||
    textWithoutBillPrefix.includes('national guard')
  ) {
    return 'veterans_and_defense_affairs';
  }

  // Judicial
  if (
    textWithoutBillPrefix.includes('court') ||
    textWithoutBillPrefix.includes('judicial') ||
    textWithoutBillPrefix.includes('supreme court') ||
    textWithoutBillPrefix.includes('magistrate') ||
    textWithoutBillPrefix.includes('judge') ||
    textWithoutBillPrefix.includes('judiciary') ||
    textWithoutBillPrefix.includes('law clinic') || // University law clinics
    textWithoutBillPrefix.includes('jury management') ||
    textWithoutBillPrefix.includes('commonwealth') && textWithoutBillPrefix.includes('attorney')
  ) {
    return 'judicial';
  }

  // Legislative
  if (
    textWithoutBillPrefix.includes('general assembly') ||
    textWithoutBillPrefix.includes('house of delegates') ||
    textWithoutBillPrefix.includes('senate of virginia') ||
    textWithoutBillPrefix.includes('legislative') ||
    textWithoutBillPrefix.includes('campaign finance') ||
    textWithoutBillPrefix.match(/\bjchc\b/) || // Joint Commission on Health Care
    textWithoutBillPrefix.includes('voting equipment') ||
    textWithoutBillPrefix.includes('virginia housing commission')
  ) {
    return 'legislative';
  }

  // Administration
  if (
    textWithoutBillPrefix.includes('administration') ||
    textWithoutBillPrefix.includes('secretary of') ||
    textWithoutBillPrefix.includes('governor') ||
    textWithoutBillPrefix.includes('lieutenant governor') ||
    textWithoutBillPrefix.includes('attorney general') ||
    textWithoutBillPrefix.includes('virginia academy of science') ||
    textWithoutBillPrefix.includes('dgs:') || // Department of General Services
    textWithoutBillPrefix.includes('treasurers')
  ) {
    return 'administration';
  }

  // Finance
  if (
    textWithoutBillPrefix.includes('finance') ||
    textWithoutBillPrefix.includes('treasury') ||
    textWithoutBillPrefix.includes('taxation') ||
    textWithoutBillPrefix.includes('revenue') ||
    textWithoutBillPrefix.includes('comptroller')
  ) {
    return 'finance';
  }

  // Central Appropriations
  if (
    textWithoutBillPrefix.includes('central appropriations') ||
    textWithoutBillPrefix.includes('employee benefits') ||
    textWithoutBillPrefix.includes('retirement') ||
    textWithoutBillPrefix.match(/\bvrs\b/) && !textWithoutBillPrefix.includes('hours') ||
    textWithoutBillPrefix.includes('salaries') && textWithoutBillPrefix.includes('entry level')
  ) {
    return 'central_appropriations';
  }

  // Capital Outlay
  if (
    textWithoutBillPrefix.includes('capital outlay') ||
    textWithoutBillPrefix.includes('capital project') ||
    textWithoutBillPrefix.includes('construction') ||
    textWithoutBillPrefix.includes('renovation') ||
    textWithoutBillPrefix.includes('renovate') ||
    textWithoutBillPrefix.includes('facility') && !textWithoutBillPrefix.includes('eligibility') ||
    textWithoutBillPrefix.includes('building') && (textWithoutBillPrefix.includes('planning') || textWithoutBillPrefix.includes('replace')) ||
    textWithoutBillPrefix.includes('deferred maintenance') ||
    textWithoutBillPrefix.includes('pre-planning') ||
    textWithoutBillPrefix.includes('replace') && (textWithoutBillPrefix.includes('library') || textWithoutBillPrefix.includes('hall')) ||
    textWithoutBillPrefix.includes('visitor center') && textWithoutBillPrefix.includes('museum') ||
    textWithoutBillPrefix.includes('gunston hall')
  ) {
    return 'capital_outlay';
  }

  // Independent Agencies (Virginia's Independent Branch - INB)
  // Only classify as independent_agencies if explicitly matches known Independent Branch entities
  if (
    textWithoutBillPrefix.includes('virginia lottery') ||
    textWithoutBillPrefix.match(/\blottery\b/) && !textWithoutBillPrefix.includes('test') ||
    textWithoutBillPrefix.includes('alcoholic beverage control') ||
    textWithoutBillPrefix.includes('abc board') ||
    textWithoutBillPrefix.includes('state corporation commission') ||
    textWithoutBillPrefix.match(/\bscc\b/) && !textWithoutBillPrefix.includes('community college') ||
    textWithoutBillPrefix.includes('virginia retirement system') ||
    textWithoutBillPrefix.includes('workers\' compensation commission') ||
    textWithoutBillPrefix.includes('workers compensation commission') ||
    textWithoutBillPrefix.includes('cannabis') ||
    textWithoutBillPrefix.includes('opioid abatement authority') ||
    textWithoutBillPrefix.includes('commonwealth savers') ||
    textWithoutBillPrefix.includes('dealer discount') // ABC/Lottery related
  ) {
    return 'independent_agencies';
  }

  // Default fallback: Unclassified
  // This indicates the amendment title doesn't match any category keywords
  // and should be manually reviewed or have keywords added
  return 'unclassified';
}


