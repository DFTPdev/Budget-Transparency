const fs = require('fs');
const pkgPath = 'package.json';
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
pkg.scripts = pkg.scripts || {};

pkg.scripts["lis:delegate-build"] =
  "TS_NODE_TRANSPILE_ONLY=1 ts-node --files scripts/join/build_delegate_totals.ts --year $npm_package_config_year --in out/app/lis_by_district_$npm_package_config_year.json --roster ./scripts/house_delegates_roster_enriched.json --outJson out/app/lis_by_delegate_$npm_package_config_year.json --outCsv out/app/lis_by_delegate_$npm_package_config_year.csv";

pkg.scripts["lis:full-run"] =
  "npm run join:lis-district && npm run lis:district-totals && npm run lis:delegate-build";

pkg.scripts["export:districts"] =
  "cp out/app/lis_by_district_$npm_package_config_year.json out/app/lis_by_district_latest.json && cp out/app/lis_by_district_$npm_package_config_year.csv out/app/lis_by_district_latest.csv";

pkg.scripts["export:delegates"] =
  "cp out/app/lis_by_delegate_$npm_package_config_year.json out/app/lis_by_delegate_latest.json && cp out/app/lis_by_delegate_$npm_package_config_year.csv out/app/lis_by_delegate_latest.csv";

fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
console.log("[ok] package.json updated: lis:delegate-build, lis:full-run, export:*");
