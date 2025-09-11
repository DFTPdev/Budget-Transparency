const { execSync } = require('child_process');
const fs = require('fs');

describe('mergeBudgetIntoGeojson', () => {
  beforeEach(() => {
    ['public/data/district-spending.geojson','public/data/merge-diagnostics.json'].forEach(f => { if (fs.existsSync(f)) fs.unlinkSync(f); });
  });

  test('matched case creates output and diagnostics', () => {
    fs.mkdirSync('public/data', { recursive: true });
    fs.copyFileSync('__tests__/fixtures/matched-districts.geojson', 'public/data/virginia-districts.geojson');
    fs.copyFileSync('__tests__/fixtures/matched-budget.json', 'public/data/budget_by_district_2025.json');
    execSync('node scripts/mergeBudgetIntoGeojson.js', { stdio: 'inherit' });
    expect(fs.existsSync('public/data/district-spending.geojson')).toBe(true);
    const diag = JSON.parse(fs.readFileSync('public/data/merge-diagnostics.json','utf8'));
    expect(diag.counts.matched_features).toBeGreaterThan(0);
  });

  test('unmatched case records unmatched features', () => {
    fs.mkdirSync('public/data', { recursive: true });
    fs.copyFileSync('__tests__/fixtures/unmatched-districts.geojson', 'public/data/virginia-districts.geojson');
    fs.copyFileSync('__tests__/fixtures/unmatched-budget.json', 'public/data/budget_by_district_2025.json');
    execSync('node scripts/mergeBudgetIntoGeojson.js', { stdio: 'inherit' });
    const diag = JSON.parse(fs.readFileSync('public/data/merge-diagnostics.json','utf8'));
    expect(diag.counts.unmatched_features).toBeGreaterThan(0);
  });

  test('budget totals are not double-counted (regression test)', () => {
    fs.mkdirSync('public/data', { recursive: true });

    // Create test data with multiple districts
    const testBudget = [
      { "district": 1, "total_amount": 100000 },
      { "district": 2, "total_amount": 200000 },
      { "district": "HD-03", "total_amount": 300000 }
    ];
    const testGeo = {
      "type": "FeatureCollection",
      "features": [
        { "type": "Feature", "properties": { "district": "1" }, "geometry": { "type": "Point", "coordinates": [0, 0] } },
        { "type": "Feature", "properties": { "district": "2" }, "geometry": { "type": "Point", "coordinates": [0, 0] } },
        { "type": "Feature", "properties": { "district": "HD-03" }, "geometry": { "type": "Point", "coordinates": [0, 0] } }
      ]
    };

    fs.writeFileSync('public/data/budget_by_district_2025.json', JSON.stringify(testBudget));
    fs.writeFileSync('public/data/virginia-districts.geojson', JSON.stringify(testGeo));

    execSync('node scripts/mergeBudgetIntoGeojson.js', { stdio: 'inherit' });

    // Verify totals match
    const budgetTotal = testBudget.reduce((sum, row) => sum + row.total_amount, 0);
    const merged = JSON.parse(fs.readFileSync('public/data/district-spending.geojson', 'utf8'));
    const mergedTotal = merged.features.reduce((sum, f) => sum + (f.properties.budget_total || 0), 0);

    expect(mergedTotal).toBe(budgetTotal);
    expect(mergedTotal).toBe(600000); // 100k + 200k + 300k
  });
});
