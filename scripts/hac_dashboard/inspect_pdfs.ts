#!/usr/bin/env ts-node

/**
 * PDF Inspector - Extract and display key sections from HAC PDFs
 */

import * as fs from 'fs';
import * as path from 'path';
import pdf from 'pdf-parse';

const PDF_DIR = '/Users/secretservice/Documents/HAC Summaries';
const PRE_SESSION_PDF = 'hac 2025 pre-session summary document - print.pdf';
const POST_SESSION_PDF = 'hac 2025 post session summary document 5-19-25.pdf';

async function extractPdfText(pdfPath: string): Promise<string> {
  console.log(`📄 Reading PDF: ${pdfPath}`);
  const dataBuffer = fs.readFileSync(pdfPath);
  const data = await pdf(dataBuffer);
  console.log(`✅ Extracted ${data.numpages} pages, ${data.text.length} characters\n`);
  return data.text;
}

function findSection(text: string, pattern: RegExp, contextLines: number = 10): string[] {
  const lines = text.split('\n');
  const results: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    if (pattern.test(lines[i])) {
      const start = Math.max(0, i - contextLines);
      const end = Math.min(lines.length, i + contextLines);
      results.push(`\n=== Match at line ${i}: "${lines[i]}" ===`);
      results.push(lines.slice(start, end).join('\n'));
    }
  }
  
  return results;
}

async function main() {
  const preSessionPath = path.join(PDF_DIR, PRE_SESSION_PDF);
  const postSessionPath = path.join(PDF_DIR, POST_SESSION_PDF);

  const preText = await extractPdfText(preSessionPath);
  const postText = await extractPdfText(postSessionPath);

  console.log('='.repeat(80));
  console.log('PRE-SESSION PDF - First 3000 characters:');
  console.log('='.repeat(80));
  console.log(preText.substring(0, 3000));

  console.log('\n\n');
  console.log('='.repeat(80));
  console.log('POST-SESSION PDF - First 3000 characters:');
  console.log('='.repeat(80));
  console.log(postText.substring(0, 3000));

  console.log('\n\n');
  console.log('='.repeat(80));
  console.log('SEARCHING FOR KEY METRICS IN PRE-SESSION:');
  console.log('='.repeat(80));
  
  const searches = [
    /biennial.*budget/i,
    /general.*fund.*resources/i,
    /chapter\s*2/i,
    /revenue.*composition/i,
    /one-time/i,
    /ongoing/i,
  ];

  for (const pattern of searches) {
    const results = findSection(preText, pattern, 5);
    if (results.length > 0) {
      console.log(`\n--- Pattern: ${pattern} ---`);
      console.log(results.slice(0, 2).join('\n')); // Show first 2 matches
    }
  }
}

main();

