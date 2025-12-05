#!/usr/bin/env ts-node
/**
 * Debug script to inspect LIS HTML structure
 */

import * as cheerio from 'cheerio';

async function debugParse() {
  const url = 'https://budget.lis.virginia.gov/mbramendment/2025/1/H336';
  
  console.log(`Fetching ${url}...`);
  
  const response = await fetch(url);
  const html = await response.text();
  const $ = cheerio.load(html);
  
  console.log('\n=== Looking for dd elements ===');
  const dds = $('dd');
  console.log(`Found ${dds.length} dd elements`);
  
  dds.each((i, el) => {
    const $el = $(el);
    const text = $el.text().trim().slice(0, 100);
    console.log(`\ndd[${i}]: ${text}...`);
    
    const divs = $el.find('div');
    console.log(`  Contains ${divs.length} divs`);
    
    divs.each((j, div) => {
      const $div = $(div);
      const className = $div.attr('class') || '';
      const divText = $div.text().trim().slice(0, 50);
      console.log(`    div[${j}] class="${className}": ${divText}`);
    });
  });
  
  console.log('\n=== Looking for tables ===');
  const tables = $('table');
  console.log(`Found ${tables.length} tables`);

  tables.each((i, table) => {
    const $table = $(table);
    console.log(`\nTable ${i}:`);

    const headers = $table.find('th');
    console.log(`  Headers: ${headers.length}`);
    headers.each((j, th) => {
      console.log(`    th[${j}]: ${$(th).text().trim()}`);
    });

    const rows = $table.find('tr');
    console.log(`  Rows: ${rows.length}`);

    // Look at first few data rows
    rows.slice(0, 3).each((j, row) => {
      const $row = $(row);
      const cells = $row.find('td');
      console.log(`  Row ${j}: ${cells.length} cells`);
      cells.each((k, cell) => {
        const $cell = $(cell);
        const text = $cell.text().trim().slice(0, 50);
        const colspan = $cell.attr('colspan') || '1';
        const className = $cell.attr('class') || '';
        console.log(`    td[${k}] colspan=${colspan} class="${className}": ${text}`);
      });
    });
  });
  
  console.log('\n=== Looking for specific text patterns ===');
  const bodyText = $('body').text();
  
  if (bodyText.includes('77')) {
    console.log('✓ Found "77" in body text');
  }
  if (bodyText.includes('#4h')) {
    console.log('✓ Found "#4h" in body text');
  }
  if (bodyText.includes('HB 2173')) {
    console.log('✓ Found "HB 2173" in body text');
  }
  if (bodyText.includes('$200,000')) {
    console.log('✓ Found "$200,000" in body text');
  }
}

debugParse().catch(console.error);

