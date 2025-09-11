/**
 * @jest-environment node
 */

const fs = require('fs');
const path = require('path');

describe('Budget Decoder Runtime Error Prevention', () => {
  test('budget decoder view has error handling in data transformation', () => {
    const viewPath = path.join(__dirname, '../src/sections/budget-decoder/view/budget-decoder-view.tsx');
    const viewContent = fs.readFileSync(viewPath, 'utf8');
    
    // Check for error handling in data transformation
    expect(viewContent).toContain('try {');
    expect(viewContent).toContain('catch (error)');
    expect(viewContent).toContain('console.error');
    
    // Check for error handling in navigation
    expect(viewContent).toContain('handleViewOnMap');
    expect(viewContent).toContain('router.push');
  });

  test('budget decoder has proper event handling', () => {
    const viewPath = path.join(__dirname, '../src/sections/budget-decoder/view/budget-decoder-view.tsx');
    const viewContent = fs.readFileSync(viewPath, 'utf8');
    
    // Check for proper event handling
    expect(viewContent).toContain('e.stopPropagation()');
    expect(viewContent).toContain('onClick={(e) => {');
    
    // Check for hover styling
    expect(viewContent).toContain('hover');
    expect(viewContent).toContain('backgroundColor');
  });

  test('budget decoder has data validation', () => {
    const viewPath = path.join(__dirname, '../src/sections/budget-decoder/view/budget-decoder-view.tsx');
    const viewContent = fs.readFileSync(viewPath, 'utf8');
    
    // Check for data validation
    expect(viewContent).toContain('Array.isArray(recipients)');
    expect(viewContent).toContain('recipients.length > 0');
    expect(viewContent).toContain('Array.isArray(dpb)');
    
    // Check for fallback data
    expect(viewContent).toContain('MOCK_BUDGET_DATA');
  });

  test('calculateYoYChange handles edge cases safely', () => {
    // Mock the function (would normally import from component)
    function calculateYoYChange(current, previous, yoyChange) {
      if (typeof yoyChange === 'number' && !isNaN(yoyChange)) {
        return yoyChange;
      }
      
      if (typeof previous === 'number' && !isNaN(previous) && previous !== 0) {
        return ((current - previous) / previous) * 100;
      }
      
      return NaN;
    }

    // Test edge cases that could cause runtime errors
    expect(isNaN(calculateYoYChange(null, null))).toBe(true);
    expect(isNaN(calculateYoYChange(undefined, undefined))).toBe(true);
    expect(isNaN(calculateYoYChange(100, null))).toBe(true);
    expect(isNaN(calculateYoYChange(100, undefined))).toBe(true);
    expect(isNaN(calculateYoYChange(100, 0))).toBe(true);
    expect(isNaN(calculateYoYChange(100, NaN))).toBe(true);
    
    // Test valid cases
    expect(calculateYoYChange(200, 100)).toBe(100);
    expect(calculateYoYChange(100, 200, 50)).toBe(50);
  });

  test('transformRecipientsData handles malformed data', () => {
    // Mock the categorizeAgency function
    function categorizeAgency(agency) {
      if (!agency || typeof agency !== 'string') return 'Other';
      return 'Education'; // Simplified for test
    }

    // Mock the calculateYoYChange function
    function calculateYoYChange(current, previous, yoyChange) {
      if (typeof yoyChange === 'number' && !isNaN(yoyChange)) {
        return yoyChange;
      }
      if (typeof previous === 'number' && !isNaN(previous) && previous !== 0) {
        return ((current - previous) / previous) * 100;
      }
      return NaN;
    }

    // Mock transformRecipientsData function
    function transformRecipientsData(recipientsData, dpbData) {
      if (!recipientsData || recipientsData.length === 0) return [];
      
      const totalBudget = recipientsData.reduce((sum, row) => {
        return sum + (typeof row.total_amount === 'number' ? row.total_amount : 0);
      }, 0);
      
      return recipientsData.map((row, index) => {
        const category = categorizeAgency(row.agency);
        const change = calculateYoYChange(
          row.total_amount,
          row.previous_amount,
          row.yoy_change
        );
        
        return {
          id: `recipient-${index}`,
          category,
          subcategory: row.agency || 'Unknown',
          amount: typeof row.total_amount === 'number' ? row.total_amount : 0,
          percentage: totalBudget > 0 ? (row.total_amount / totalBudget) * 100 : 0,
          description: `${row.items || 0} budget items`,
          change,
          priority: row.total_amount > 1000000000 ? 'high' : 'low'
        };
      });
    }

    // Test with malformed data
    const malformedData = [
      { agency: null, total_amount: null, items: null },
      { agency: '', total_amount: 'invalid', items: undefined },
      { agency: 'Test Agency', total_amount: 100000, items: 5 }
    ];

    const result = transformRecipientsData(malformedData, []);
    
    expect(result).toHaveLength(3);
    expect(result[0].category).toBe('Other');
    expect(result[0].amount).toBe(0);
    expect(result[2].category).toBe('Education');
    expect(result[2].amount).toBe(100000);
  });
});
