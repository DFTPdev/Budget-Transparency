#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const BUDGET_PATH = 'public/data/budget_by_district_2025.json';

function formatCurrency(amount) {
  if (amount >= 1e9) return `$${(amount / 1e9).toFixed(1)}B`;
  if (amount >= 1e6) return `$${(amount / 1e6).toFixed(1)}M`;
  if (amount >= 1e3) return `$${(amount / 1e3).toFixed(1)}K`;
  return `$${amount}`;
}

function main() {
  try {
    console.log('🏛️  VIRGINIA HOUSE LEGISLATORS SPONSORSHIP RANKING');
    console.log('================================================');
    console.log('');

    // Read budget data
    if (!fs.existsSync(BUDGET_PATH)) {
      console.error(`❌ Budget file not found: ${BUDGET_PATH}`);
      process.exit(1);
    }

    const budgetData = JSON.parse(fs.readFileSync(BUDGET_PATH, 'utf8'));
    console.log(`📊 Loaded ${budgetData.length} budget records`);
    console.log('');

    // Group by legislator
    const legislatorStats = {};
    
    budgetData.forEach(row => {
      const delegate = row.delegate_name || 'Unknown';
      const district = row.district || 'Unknown';
      const amount = row.total_amount || 0;
      
      if (!legislatorStats[delegate]) {
        legislatorStats[delegate] = {
          name: delegate,
          district: district,
          totalAmount: 0,
          itemCount: 0,
          agencies: new Set(),
          avgAmount: 0
        };
      }
      
      legislatorStats[delegate].totalAmount += amount;
      legislatorStats[delegate].itemCount += 1;
      if (row.agency) {
        legislatorStats[delegate].agencies.add(row.agency);
      }
    });

    // Calculate averages and convert to array
    const legislators = Object.values(legislatorStats).map(stats => ({
      ...stats,
      avgAmount: stats.itemCount > 0 ? stats.totalAmount / stats.itemCount : 0,
      agencyCount: stats.agencies.size
    }));

    // Sort by total amount (descending)
    const byTotalAmount = [...legislators].sort((a, b) => b.totalAmount - a.totalAmount);
    
    console.log('🥇 TOP 10 BY TOTAL BUDGET AMOUNT:');
    console.log('================================');
    byTotalAmount.slice(0, 10).forEach((leg, index) => {
      console.log(`${(index + 1).toString().padStart(2)}. ${leg.name.padEnd(25)} (HD-${leg.district.toString().padStart(2)}) ${formatCurrency(leg.totalAmount).padStart(8)} (${leg.itemCount} items)`);
    });
    
    console.log('');
    
    // Sort by item count (descending)
    const byItemCount = [...legislators].sort((a, b) => b.itemCount - a.itemCount);
    
    console.log('📈 TOP 10 BY NUMBER OF BUDGET ITEMS:');
    console.log('===================================');
    byItemCount.slice(0, 10).forEach((leg, index) => {
      console.log(`${(index + 1).toString().padStart(2)}. ${leg.name.padEnd(25)} (HD-${leg.district.toString().padStart(2)}) ${leg.itemCount.toString().padStart(3)} items (${formatCurrency(leg.totalAmount)})`);
    });
    
    console.log('');
    
    // Sort by agency diversity (descending)
    const byAgencyCount = [...legislators].sort((a, b) => b.agencyCount - a.agencyCount);
    
    console.log('🏢 TOP 10 BY AGENCY DIVERSITY:');
    console.log('=============================');
    byAgencyCount.slice(0, 10).forEach((leg, index) => {
      console.log(`${(index + 1).toString().padStart(2)}. ${leg.name.padEnd(25)} (HD-${leg.district.toString().padStart(2)}) ${leg.agencyCount.toString().padStart(2)} agencies (${formatCurrency(leg.totalAmount)})`);
    });
    
    console.log('');
    
    // Summary statistics
    const totalBudget = legislators.reduce((sum, leg) => sum + leg.totalAmount, 0);
    const totalItems = legislators.reduce((sum, leg) => sum + leg.itemCount, 0);
    const avgPerLegislator = totalBudget / legislators.length;
    
    console.log('📊 SUMMARY STATISTICS:');
    console.log('======================');
    console.log(`Total Legislators: ${legislators.length}`);
    console.log(`Total Budget: ${formatCurrency(totalBudget)}`);
    console.log(`Total Items: ${totalItems.toLocaleString()}`);
    console.log(`Average per Legislator: ${formatCurrency(avgPerLegislator)}`);
    console.log(`Items per Legislator: ${(totalItems / legislators.length).toFixed(1)}`);
    
    // Top performer
    const topPerformer = byTotalAmount[0];
    console.log('');
    console.log('🏆 TOP PERFORMER:');
    console.log('================');
    console.log(`${topPerformer.name} (HD-${topPerformer.district})`);
    console.log(`Total Budget: ${formatCurrency(topPerformer.totalAmount)}`);
    console.log(`Budget Items: ${topPerformer.itemCount}`);
    console.log(`Agencies: ${topPerformer.agencyCount}`);
    console.log(`Average per Item: ${formatCurrency(topPerformer.avgAmount)}`);
    
  } catch (error) {
    console.error('❌ Error analyzing legislators:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };
