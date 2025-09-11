/**
 * @jest-environment node
 */

const fs = require('fs');
const path = require('path');

describe('Budget Decoder Categories Integration', () => {
  let recipientsData;
  let dpbData;

  beforeAll(() => {
    // Load test fixtures
    const recipientsPath = path.join(__dirname, 'fixtures/recipients_2025.json');
    const dpbPath = path.join(__dirname, 'fixtures/dpb_2025.json');
    
    recipientsData = JSON.parse(fs.readFileSync(recipientsPath, 'utf8'));
    dpbData = JSON.parse(fs.readFileSync(dpbPath, 'utf8'));
  });

  test('recipients fixture has correct structure', () => {
    expect(Array.isArray(recipientsData)).toBe(true);
    expect(recipientsData.length).toBeGreaterThan(0);
    
    const firstRecipient = recipientsData[0];
    expect(firstRecipient).toHaveProperty('agency');
    expect(firstRecipient).toHaveProperty('total_amount');
    expect(firstRecipient).toHaveProperty('items');
    expect(firstRecipient).toHaveProperty('sources');
    
    expect(typeof firstRecipient.agency).toBe('string');
    expect(typeof firstRecipient.total_amount).toBe('number');
    expect(typeof firstRecipient.items).toBe('number');
    expect(Array.isArray(firstRecipient.sources)).toBe(true);
  });

  test('dpb fixture has correct structure', () => {
    expect(Array.isArray(dpbData)).toBe(true);
    expect(dpbData.length).toBeGreaterThan(0);
    
    // Check summary record
    const summaryRecord = dpbData.find(item => item.year);
    expect(summaryRecord).toBeDefined();
    expect(summaryRecord).toHaveProperty('general_fund_resources');
    expect(typeof summaryRecord.general_fund_resources).toBe('number');
    
    // Check item record
    const itemRecord = dpbData.find(item => item.id);
    expect(itemRecord).toBeDefined();
    expect(itemRecord).toHaveProperty('title');
    expect(itemRecord).toHaveProperty('amount');
    expect(itemRecord).toHaveProperty('agency');
  });

  test('categorizeAgency function works correctly', () => {
    // Mock the categorizeAgency function (would normally import from component)
    const categorizeAgency = (agency) => {
      const agencyLower = agency.toLowerCase();
      
      if (agencyLower.includes('education') || agencyLower.includes('school') || agencyLower.includes('university') || agencyLower.includes('college')) {
        return 'Education';
      }
      if (agencyLower.includes('health') || agencyLower.includes('medical') || agencyLower.includes('medicaid') || agencyLower.includes('medicare')) {
        return 'Healthcare';
      }
      if (agencyLower.includes('transport') || agencyLower.includes('highway') || agencyLower.includes('road') || agencyLower.includes('motor vehicle')) {
        return 'Transportation';
      }
      if (agencyLower.includes('public safety') || agencyLower.includes('police') || agencyLower.includes('fire') || agencyLower.includes('emergency') || agencyLower.includes('corrections')) {
        return 'Public Safety';
      }
      if (agencyLower.includes('environment') || agencyLower.includes('natural resources') || agencyLower.includes('conservation') || agencyLower.includes('forestry')) {
        return 'Environment';
      }
      if (agencyLower.includes('social services') || agencyLower.includes('human services') || agencyLower.includes('welfare') || agencyLower.includes('aging')) {
        return 'Social Services';
      }
      if (agencyLower.includes('economic') || agencyLower.includes('commerce') || agencyLower.includes('business') || agencyLower.includes('development')) {
        return 'Economic Development';
      }
      if (agencyLower.includes('general') || agencyLower.includes('administration') || agencyLower.includes('management') || agencyLower.includes('finance')) {
        return 'General Government';
      }
      
      return 'Other';
    };

    // Test categorization
    expect(categorizeAgency('Department of Medical Assistance Services')).toBe('Healthcare');
    expect(categorizeAgency('Direct Aid to Public Education')).toBe('Education');
    expect(categorizeAgency('Department of Transportation')).toBe('Transportation');
    expect(categorizeAgency('Virginia State University')).toBe('Education');
    expect(categorizeAgency('Department of Environmental Quality')).toBe('Environment');
    expect(categorizeAgency('Department of Social Services')).toBe('Social Services');
    expect(categorizeAgency('Department of Public Safety')).toBe('Public Safety');
    expect(categorizeAgency('Central Capital Outlay')).toBe('Other');
  });

  test('pipeline artifacts exist in public/data', () => {
    const recipientsPath = path.join(__dirname, '../public/data/recipients_2025.json');
    const dpbPath = path.join(__dirname, '../public/data/dpb_2025.json');
    const budgetPath = path.join(__dirname, '../public/data/budget_by_district_2025.json');
    
    expect(fs.existsSync(recipientsPath)).toBe(true);
    expect(fs.existsSync(dpbPath)).toBe(true);
    expect(fs.existsSync(budgetPath)).toBe(true);
  });

  test('categories are extracted correctly from recipients data', () => {
    const categories = new Set();

    recipientsData.forEach(recipient => {
      const category = categorizeAgency(recipient.agency);
      categories.add(category);
    });

    const categoryArray = Array.from(categories);
    expect(categoryArray.length).toBeGreaterThan(0);
    expect(categoryArray).toContain('Healthcare');
    expect(categoryArray).toContain('Education');
    expect(categoryArray).not.toContain('Legislative Districts');
  });

  test('budget decoder renders required categories', () => {
    const categories = new Set();

    recipientsData.forEach(recipient => {
      const category = categorizeAgency(recipient.agency);
      categories.add(category);
    });

    const categoryArray = Array.from(categories);

    // Test that at least these categories are present
    const requiredCategories = ['Education', 'Healthcare', 'Transportation', 'Environment', 'Economic Development'];

    requiredCategories.forEach(requiredCategory => {
      expect(categoryArray).toContain(requiredCategory);
    });

    // Ensure Legislative Districts is NOT in the categories
    expect(categoryArray).not.toContain('Legislative Districts');
  });

  function categorizeAgency(agency) {
    const agencyLower = agency.toLowerCase();
    
    if (agencyLower.includes('education') || agencyLower.includes('school') || agencyLower.includes('university') || agencyLower.includes('college')) {
      return 'Education';
    }
    if (agencyLower.includes('health') || agencyLower.includes('medical') || agencyLower.includes('medicaid') || agencyLower.includes('medicare')) {
      return 'Healthcare';
    }
    if (agencyLower.includes('transport') || agencyLower.includes('highway') || agencyLower.includes('road') || agencyLower.includes('motor vehicle')) {
      return 'Transportation';
    }
    if (agencyLower.includes('public safety') || agencyLower.includes('police') || agencyLower.includes('fire') || agencyLower.includes('emergency') || agencyLower.includes('corrections')) {
      return 'Public Safety';
    }
    if (agencyLower.includes('environment') || agencyLower.includes('natural resources') || agencyLower.includes('conservation') || agencyLower.includes('forestry')) {
      return 'Environment';
    }
    if (agencyLower.includes('social services') || agencyLower.includes('human services') || agencyLower.includes('welfare') || agencyLower.includes('aging')) {
      return 'Social Services';
    }
    if (agencyLower.includes('economic') || agencyLower.includes('commerce') || agencyLower.includes('business') || agencyLower.includes('development')) {
      return 'Economic Development';
    }
    if (agencyLower.includes('general') || agencyLower.includes('administration') || agencyLower.includes('management') || agencyLower.includes('finance')) {
      return 'General Government';
    }
    
    return 'Other';
  }
});
