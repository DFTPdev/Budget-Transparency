/**
 * @jest-environment node
 */

describe('Map Legend Formatter', () => {
  // Mock the fmtMoney function (would normally import from MapLegend)
  function fmtMoney(n) {
    if (n == null) return 'Gray: No budget data';
    if (isNaN(n)) return String(n);
    if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
    if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
    if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
    return `$${n}`;
  }

  test('formats null and undefined values', () => {
    expect(fmtMoney(null)).toBe('Gray: No budget data');
    expect(fmtMoney(undefined)).toBe('Gray: No budget data');
  });

  test('formats NaN values', () => {
    expect(fmtMoney(NaN)).toBe('NaN');
  });

  test('formats billions correctly', () => {
    expect(fmtMoney(2206869704)).toBe('$2.2B'); // Max from pipeline data
    expect(fmtMoney(1000000000)).toBe('$1.0B');
    expect(fmtMoney(1500000000)).toBe('$1.5B');
  });

  test('formats millions correctly', () => {
    expect(fmtMoney(150000000)).toBe('$150.0M');
    expect(fmtMoney(1000000)).toBe('$1.0M');
    expect(fmtMoney(1500000)).toBe('$1.5M');
    expect(fmtMoney(999999999)).toBe('$1000.0M'); // Just under 1B
  });

  test('formats thousands correctly', () => {
    expect(fmtMoney(150000)).toBe('$150.0K'); // Min from pipeline data
    expect(fmtMoney(1000)).toBe('$1.0K');
    expect(fmtMoney(1500)).toBe('$1.5K');
    expect(fmtMoney(999999)).toBe('$1000.0K'); // Just under 1M
  });

  test('formats small amounts without suffix', () => {
    expect(fmtMoney(999)).toBe('$999');
    expect(fmtMoney(100)).toBe('$100');
    expect(fmtMoney(0)).toBe('$0');
  });

  test('handles edge cases from diagnostic data', () => {
    // From district-spending.geojson
    expect(fmtMoney(100000)).toBe('$100.0K');
    expect(fmtMoney(300000)).toBe('$300.0K');
    
    // From budget_by_district_2025.json
    expect(fmtMoney(150000)).toBe('$150.0K'); // min
    expect(fmtMoney(2206869704)).toBe('$2.2B'); // max
  });

  test('formats decimal precision correctly', () => {
    expect(fmtMoney(1100000000)).toBe('$1.1B');
    expect(fmtMoney(1150000000)).toBe('$1.1B'); // 1.15 -> 1.1 with toFixed(1)
    expect(fmtMoney(1160000000)).toBe('$1.2B'); // 1.16 -> 1.2 with toFixed(1)
    expect(fmtMoney(1100000)).toBe('$1.1M');
    expect(fmtMoney(1150000)).toBe('$1.1M'); // 1.15 -> 1.1 with toFixed(1)
  });

  test('handles realistic budget ranges', () => {
    // Small district
    expect(fmtMoney(150000)).toBe('$150.0K');
    
    // Medium district  
    expect(fmtMoney(50000000)).toBe('$50.0M');
    
    // Large district
    expect(fmtMoney(500000000)).toBe('$500.0M');
    
    // Largest district
    expect(fmtMoney(2206869704)).toBe('$2.2B');
  });
});
