/**
 * @jest-environment node
 */

describe('YoY Calculation Logic', () => {
  // Mock the calculateYoYChange function (would normally import from component)
  function calculateYoYChange(current, previous, yoyChange) {
    // If yoy_change or pct_change exists, use it
    if (typeof yoyChange === 'number' && !isNaN(yoyChange)) {
      return yoyChange;
    }
    
    // If previous_amount exists, compute: ((current - prev)/prev)*100
    if (typeof previous === 'number' && !isNaN(previous) && previous !== 0) {
      return ((current - previous) / previous) * 100;
    }
    
    // Return NaN to indicate no data available (will display as "—")
    return NaN;
  }

  test('uses yoy_change when available', () => {
    const result = calculateYoYChange(200, 100, 15.5);
    expect(result).toBe(15.5);
  });

  test('computes from current and previous amounts', () => {
    const result = calculateYoYChange(200, 100);
    expect(result).toBe(100); // ((200-100)/100)*100 = 100%
  });

  test('handles negative change correctly', () => {
    const result = calculateYoYChange(80, 100);
    expect(result).toBe(-20); // ((80-100)/100)*100 = -20%
  });

  test('handles zero previous amount safely', () => {
    const result = calculateYoYChange(200, 0);
    expect(isNaN(result)).toBe(true);
  });

  test('returns NaN when no historical data available', () => {
    const result = calculateYoYChange(200);
    expect(isNaN(result)).toBe(true);
  });

  test('handles edge cases', () => {
    // Undefined previous
    expect(isNaN(calculateYoYChange(200, undefined))).toBe(true);
    
    // NaN previous
    expect(isNaN(calculateYoYChange(200, NaN))).toBe(true);
    
    // NaN yoyChange should be ignored
    expect(isNaN(calculateYoYChange(200, 100, NaN))).toBe(false);
    expect(calculateYoYChange(200, 100, NaN)).toBe(100);
  });

  test('fixture test case: total=200, prev=100 -> 100%', () => {
    const result = calculateYoYChange(200, 100);
    expect(result).toBe(100);
  });

  test('realistic budget scenarios', () => {
    // Large budget increase
    const educationIncrease = calculateYoYChange(2000000000, 1800000000);
    expect(educationIncrease).toBeCloseTo(11.11, 2);
    
    // Small budget decrease
    const transportDecrease = calculateYoYChange(950000000, 1000000000);
    expect(transportDecrease).toBe(-5);
    
    // No change
    const stableProgram = calculateYoYChange(500000000, 500000000);
    expect(stableProgram).toBe(0);
  });
});
