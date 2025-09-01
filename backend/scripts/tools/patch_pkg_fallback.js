const fs = require('fs');
const pkgPath = 'package.json';
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
pkg.scripts = pkg.scripts || {};

// Fallback: build districts from app totals (no LIS name matching)
pkg.scripts["lis:districts-fallback"] =
  "TS_NODE_TRANSPILE_ONLY=1 ts-node --files scripts/join/build_districts_from_budget.ts --year $npm_package_config_year --in out/app/budget_by_district_$npm_package_config_year.json --outJson out/app/lis_by_district_$npm_package_config_year.json --outCsv out/app/lis_by_district_$npm_package_config_year.csv";

// Keep your delegate builder
pkg.scripts["lis:delegate-build"] = pkg.scripts["lis:delegate-build"] ||
  "TS_NODE_TRANSPILE_ONLY=1 ts-node --files scripts/join/build_delegate_totals.ts --year $npm_package_config_year --in out/app/lis_by_district_$npm_package_config_year.json --roster ./scripts/house_delegates_roster_enriched.json --outJson out/app/lis_by_delegate_$npm_package_config_year.json --outCsv out/app/lis_by_delegate_$npm_package_config_year.csv";

// Minimal run: fallback districts → delegate totals
pkg.scripts["lis:min-run"] =
  "npm run lis:districts-fallback && npm run lis:delegate-build";

// Handy exporters
pkg.scripts["export:districts"] = pkg.scripts["export:districts"] ||
  "cp out/app/lis_by_district_$npm_package_config_year.json out/app/lis_by_district_latest.json && cp out/app/lis_by_district_$npm_package_config_year.csv out/app/lis_by_district_latest.csv";

pkg.scripts["export:delegates"] = pkg.scripts["export:delegates"] ||
  "cp out/app/lis_by_delegate_$npm_package_config_year.json out/app/lis_by_delegate_latest.json && cp out/app/lis_by_delegate_$npm_package_config_year.csv out/app/lis_by_delegate_latest.csv";

fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
console.log("[ok] package.json updated: lis:districts-fallback, lis:min-run, export:*");
