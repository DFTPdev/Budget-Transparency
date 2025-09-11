#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function formatCurrency(amount) {
  if (amount >= 1e9) return `$${(amount / 1e9).toFixed(1)}B`;
  if (amount >= 1e6) return `$${(amount / 1e6).toFixed(1)}M`;
  if (amount >= 1e3) return `$${(amount / 1e3).toFixed(1)}K`;
  return `$${amount}`;
}

function searchInObject(obj, searchTerm, path = '') {
  const results = [];
  const term = searchTerm.toLowerCase();
  
  if (typeof obj === 'string' && obj.toLowerCase().includes(term)) {
    results.push({ path, value: obj, type: 'string' });
  } else if (typeof obj === 'object' && obj !== null) {
    if (Array.isArray(obj)) {
      obj.forEach((item, index) => {
        results.push(...searchInObject(item, searchTerm, `${path}[${index}]`));
      });
    } else {
      Object.keys(obj).forEach(key => {
        const newPath = path ? `${path}.${key}` : key;
        results.push(...searchInObject(obj[key], searchTerm, newPath));
      });
    }
  }
  
  return results;
}

function searchInFile(filePath, searchTerm) {
  try {
    if (!fs.existsSync(filePath)) {
      return { found: false, error: 'File not found' };
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);
    const results = searchInObject(data, searchTerm);
    
    return { found: results.length > 0, results, data };
  } catch (error) {
    return { found: false, error: error.message };
  }
}

function main() {
  const searchTerm = 'angela graves';
  
  console.log('🔍 SEARCHING FOR ANGELA GRAVES IN ALL DATA');
  console.log('==========================================');
  console.log(`Search term: "${searchTerm}"`);
  console.log('');

  // Files to search
  const filesToSearch = [
    'public/data/budget_by_district_2025.json',
    'public/data/district-spending.geojson',
    'public/data/virginia-districts.geojson',
    'public/data/virginia-senate.geojson',
    'public/data/vpap-precincts.geojson'
  ];

  let totalMatches = 0;
  let angelaData = {};

  filesToSearch.forEach(filePath => {
    console.log(`📁 Searching ${filePath}...`);
    
    const result = searchInFile(filePath, searchTerm);
    
    if (result.found) {
      console.log(`✅ Found ${result.results.length} matches`);
      totalMatches += result.results.length;
      
      result.results.forEach((match, index) => {
        console.log(`   ${index + 1}. ${match.path}: "${match.value}"`);
      });
      
      // Extract specific Angela Graves records
      if (filePath.includes('budget_by_district')) {
        const angelaRecords = result.data.filter(record => 
          record.delegate_name && record.delegate_name.toLowerCase().includes(searchTerm)
        );
        
        if (angelaRecords.length > 0) {
          angelaData.budget = angelaRecords[0];
          console.log('   📊 Budget Record Found:');
          console.log(`      District: ${angelaRecords[0].district}`);
          console.log(`      Total Amount: ${formatCurrency(angelaRecords[0].total_amount || 0)}`);
          console.log(`      Agency: ${angelaRecords[0].agency || 'N/A'}`);
        }
      }
      
      if (filePath.includes('district-spending.geojson')) {
        const angelaFeatures = result.data.features.filter(feature => {
          const props = feature.properties;
          return Object.values(props).some(val => 
            typeof val === 'string' && val.toLowerCase().includes(searchTerm)
          );
        });
        
        if (angelaFeatures.length > 0) {
          angelaData.district = angelaFeatures[0].properties;
          console.log('   🗺️  District Feature Found:');
          console.log(`      District: ${angelaFeatures[0].properties.district}`);
          console.log(`      Budget Total: ${formatCurrency(angelaFeatures[0].properties.budget_total || 0)}`);
        }
      }
      
    } else {
      console.log(`❌ No matches found`);
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    }
    console.log('');
  });

  // Summary
  console.log('📋 SEARCH SUMMARY:');
  console.log('==================');
  console.log(`Total matches found: ${totalMatches}`);
  
  if (Object.keys(angelaData).length > 0) {
    console.log('');
    console.log('👤 ANGELA GRAVES PROFILE:');
    console.log('========================');
    
    if (angelaData.budget) {
      console.log(`Name: ${angelaData.budget.delegate_name}`);
      console.log(`District: HD-${angelaData.budget.district}`);
      console.log(`Total Budget: ${formatCurrency(angelaData.budget.total_amount || 0)}`);
      console.log(`Agency: ${angelaData.budget.agency || 'N/A'}`);
      console.log(`Items: ${angelaData.budget.items || 'N/A'}`);
    }
    
    if (angelaData.district) {
      console.log(`Map District: ${angelaData.district.district}`);
      console.log(`Map Budget Total: ${formatCurrency(angelaData.district.budget_total || 0)}`);
      console.log(`NAMELSAD: ${angelaData.district.NAMELSAD || 'N/A'}`);
    }
    
    // Generate direct links
    if (angelaData.budget && angelaData.budget.district) {
      const district = angelaData.budget.district;
      console.log('');
      console.log('🔗 DIRECT LINKS:');
      console.log('===============');
      console.log(`Budget Decoder: http://localhost:8082/budget-decoder?district=${district}`);
      console.log(`Spotlight Map: http://localhost:8082/spotlight-map?district=${district}`);
    }
  } else {
    console.log('❌ No specific Angela Graves records found in structured data');
  }
  
  // Additional search in text content
  console.log('');
  console.log('🔍 ADDITIONAL TEXT SEARCH:');
  console.log('==========================');
  
  filesToSearch.forEach(filePath => {
    try {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');
        const matchingLines = lines.filter(line => 
          line.toLowerCase().includes(searchTerm)
        );
        
        if (matchingLines.length > 0) {
          console.log(`📄 ${filePath}: ${matchingLines.length} text matches`);
          matchingLines.slice(0, 3).forEach(line => {
            console.log(`   "${line.trim().substring(0, 100)}..."`);
          });
        }
      }
    } catch (error) {
      // Skip files that can't be read as text
    }
  });
}

if (require.main === module) {
  main();
}

module.exports = { main };
