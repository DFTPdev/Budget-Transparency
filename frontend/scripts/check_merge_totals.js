#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const GEOJSON_PATH = 'public/data/district-spending.geojson';
const BUDGET_PATH = 'public/data/budget_by_district_2025.json';

function main() {
  try {
    console.log('🔍 Checking merge totals...');
    
    // Read GeoJSON file
    if (!fs.existsSync(GEOJSON_PATH)) {
      console.error(`❌ GeoJSON file not found: ${GEOJSON_PATH}`);
      process.exit(1);
    }
    
    const geoData = JSON.parse(fs.readFileSync(GEOJSON_PATH, 'utf8'));
    const geoSum = geoData.features
      .map(f => f.properties.budget_total || 0)
      .reduce((sum, val) => sum + val, 0);
    
    console.log(`📊 GeoJSON sum: $${geoSum.toLocaleString()} (${geoData.features.length} features)`);
    
    // Read budget artifact
    if (!fs.existsSync(BUDGET_PATH)) {
      console.error(`❌ Budget file not found: ${BUDGET_PATH}`);
      process.exit(1);
    }
    
    const budgetData = JSON.parse(fs.readFileSync(BUDGET_PATH, 'utf8'));
    const budgetSum = budgetData
      .map(row => row.total_amount || row.amount || 0)
      .reduce((sum, val) => sum + val, 0);
    
    console.log(`💰 Budget sum: $${budgetSum.toLocaleString()} (${budgetData.length} rows)`);
    
    // Calculate difference
    const difference = Math.abs(geoSum - budgetSum);
    const percentDiff = budgetSum > 0 ? (difference / budgetSum) * 100 : 100;
    
    console.log(`📈 Difference: $${difference.toLocaleString()} (${percentDiff.toFixed(2)}%)`);
    
    // Check threshold
    const THRESHOLD = 5.0; // 5% threshold
    if (percentDiff > THRESHOLD) {
      console.log(`❌ MISMATCH: Difference exceeds ${THRESHOLD}% threshold`);
      console.log(`   Ratio: ${(geoSum / budgetSum * 100).toFixed(3)}%`);
      
      // Show some diagnostic info
      const geoWithBudget = geoData.features.filter(f => (f.properties.budget_total || 0) > 0);
      console.log(`   Districts with budget data: ${geoWithBudget.length}/${geoData.features.length}`);
      
      process.exit(1);
    } else {
      console.log(`✅ MATCH: Totals within ${THRESHOLD}% threshold`);
      process.exit(0);
    }
    
  } catch (error) {
    console.error('❌ Error checking totals:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };
