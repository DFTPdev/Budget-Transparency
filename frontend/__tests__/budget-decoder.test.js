/**
 * @jest-environment node
 */

const fs = require('fs');
const path = require('path');

describe('Budget Decoder Integration', () => {
  test('pipeline artifact exists and has correct structure', () => {
    const artifactPath = path.join(__dirname, '../public/data/budget_by_district_2025.json');

    expect(fs.existsSync(artifactPath)).toBe(true);

    const data = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);

    // Check first record has expected structure
    const firstRecord = data[0];
    expect(firstRecord).toHaveProperty('district');
    expect(firstRecord).toHaveProperty('total_amount');

    expect(typeof firstRecord.total_amount).toBe('number');
    expect(typeof firstRecord.district).toBe('number');
  });

  test('budget decoder page file exists and imports correctly', async () => {
    const pagePath = path.join(__dirname, '../src/app/budget-decoder/page.tsx');
    expect(fs.existsSync(pagePath)).toBe(true);

    const pageContent = fs.readFileSync(pagePath, 'utf8');
    expect(pageContent).toContain('BudgetDecoderView');
    expect(pageContent).toContain('Budget Decoder');
  });

  test('vaPipelineClient has fetchPipelineArtifact function', async () => {
    const clientPath = path.join(__dirname, '../src/lib/vaPipelineClient.ts');
    expect(fs.existsSync(clientPath)).toBe(true);

    const clientContent = fs.readFileSync(clientPath, 'utf8');
    expect(clientContent).toContain('fetchPipelineArtifact');
    expect(clientContent).toContain('BudgetRow');
  });

  test('budget decoder view has required functions', async () => {
    const viewPath = path.join(__dirname, '../src/sections/budget-decoder/view/budget-decoder-view.tsx');
    expect(fs.existsSync(viewPath)).toBe(true);

    const viewContent = fs.readFileSync(viewPath, 'utf8');
    expect(viewContent).toContain('BudgetDecoderView');
    expect(viewContent).toContain('calculateYoYChange');
    expect(viewContent).toContain('transformRecipientsData');
  });
});
