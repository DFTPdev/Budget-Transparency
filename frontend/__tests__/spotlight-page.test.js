/**
 * @jest-environment node
 */

const fs = require('fs');
const path = require('path');

describe('Spotlight Map Page Integration', () => {
  test('page file exists', () => {
    const pagePath = path.join(__dirname, '../src/app/spotlight-map/page.tsx');
    expect(fs.existsSync(pagePath)).toBe(true);
  });

  test('page file contains expected content', () => {
    const pagePath = path.join(__dirname, '../src/app/spotlight-map/page.tsx');
    const content = fs.readFileSync(pagePath, 'utf8');

    expect(content).toContain('SpotlightMap');
    expect(content).toContain('District Spotlight Map');
    expect(content).toContain('export default function Page');
  });

  test('backup file was created', () => {
    const backupPattern = path.join(__dirname, '../src/app/spotlight-map/page.tsx.bak.*');
    const backupFiles = fs.readdirSync(path.join(__dirname, '../src/app/spotlight-map'))
      .filter(file => file.startsWith('page.tsx.bak.'));

    expect(backupFiles.length).toBeGreaterThan(0);
  });

  test('required component files exist', () => {
    const spotlightMapPath = path.join(__dirname, '../src/components/SpotlightMap.tsx');
    const legendPath = path.join(__dirname, '../src/components/MapLegend.tsx');
    const togglePath = path.join(__dirname, '../src/components/LayerToggle.tsx');
    const clientPath = path.join(__dirname, '../src/lib/vaPipelineClient.ts');

    expect(fs.existsSync(spotlightMapPath)).toBe(true);
    expect(fs.existsSync(legendPath)).toBe(true);
    expect(fs.existsSync(togglePath)).toBe(true);
    expect(fs.existsSync(clientPath)).toBe(true);
  });
});
