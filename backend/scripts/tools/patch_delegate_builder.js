const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json','utf8'));
pkg.scripts = pkg.scripts || {};
pkg.scripts["lis:delegate-build"] =
  "TS_NODE_TRANSPILE_ONLY=1 ts-node --files scripts/join/build_delegate_totals_from_roster.ts --year $npm_package_config_year --in out/app/lis_by_district_$npm_package_config_year.json --roster ./scripts/house_delegates_roster_enriched.json --outJson out/app/lis_by_delegate_$npm_package_config_year.json --outCsv out/app/lis_by_delegate_$npm_package_config_year.csv";
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
console.log("[ok] package.json updated: lis:delegate-build -> from_roster");
